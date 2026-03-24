import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as crypto from "https://deno.land/std@0.208.0/crypto/mod.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const source = new URL(req.url).searchParams.get("source") || "unknown";
    const signature = req.headers.get("x-eversend-signature") || 
                     req.headers.get("veriff-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.text();
    const webhook = JSON.parse(body);

    // Verify signature based on source
    const secret =
      source === "eversend"
        ? Deno.env.get("EVERSEND_WEBHOOK_SECRET")
        : Deno.env.get("FLUTTERWAVE_WEBHOOK_SECRET");

    if (!secret) {
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const computed = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      ),
      new TextEncoder().encode(body)
    );

    const computedSignature = Array.from(new Uint8Array(computed))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!constantTimeCompare(signature, computedSignature)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine membership type from metadata
    let membershipType = webhook.meta?.membershipType || 'creator';
    let transaction = null;
    let tableName = membershipType === 'member' ? 'members_membership' : 'creators_membership';

    // Find transaction by reference
    const referenceId = source === "eversend" 
      ? webhook.data.reference 
      : webhook.data.flw_ref;

    // Try to find transaction
    const { data: txData } = await supabase
      .from(tableName)
      .select("*")
      .eq(source === "eversend" ? "reference_id" : "transaction_id", referenceId)
      .single()
      .catch(() => ({ data: null }));

    transaction = txData;

    if (!transaction) {
      // Try the other table if not found in determined table
      const otherTableName = membershipType === 'member' ? 'creators_membership' : 'members_membership';
      const { data: otherTxData } = await supabase
        .from(otherTableName)
        .select("*")
        .eq(source === "eversend" ? "reference_id" : "transaction_id", referenceId)
        .single()
        .catch(() => ({ data: null }));

      if (otherTxData) {
        transaction = otherTxData;
        membershipType = membershipType === 'member' ? 'creator' : 'member';
        tableName = membershipType === 'member' ? 'members_membership' : 'creators_membership';
      }
    }

    if (!transaction) {
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Record webhook event to consolidated webhook_events table
    await supabase.from('webhook_events').insert({
      membership_type: membershipType,
      transaction_id: transaction.id,
      event_id: referenceId,
      event_type: source === "eversend" ? webhook.event : webhook.event,
      source: source,
      payload: webhook,
      signature: signature,
      signature_verified: true,
      status: "processing",
    });

    // Handle payment completion
    const isCompleted =
      (source === "eversend" && 
        (webhook.event === "payment.completed" || webhook.data.status === "completed")) ||
      (source === "flutterwave" &&
        webhook.event === "charge.completed" &&
        webhook.data.status === "successful");

    if (isCompleted) {
      await supabase
        .from(tableName)
        .update({
          status: "completed",
          payment_status: "completed",
          webhook_received_at: new Date().toISOString(),
          webhook_verified: true,
          webhook_signature: signature,
          completed_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      // Update user tier in profiles
      await supabase
        .from("profiles")
        .update({
          tier: transaction.new_tier,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.user_id);

      // Log audit to consolidated payment_audit_log table
      await supabase.from('payment_audit_log').insert({
        membership_type: membershipType,
        transaction_id: transaction.id,
        user_id: transaction.user_id,
        action: `${source === 'eversend' ? 'Eversend' : 'Flutterwave'} webhook payment completed`,
        action_type: "complete",
        previous_status: "processing",
        new_status: "completed",
      });
    } else if (
      (source === "eversend" && webhook.event === "payment.failed") ||
      (source === "flutterwave" && webhook.data.status === "failed")
    ) {
      await supabase
        .from(tableName)
        .update({
          status: "failed",
          payment_status: "failed",
          webhook_received_at: new Date().toISOString(),
          webhook_verified: true,
          error_message: `Payment failed on ${source}`,
        })
        .eq("id", transaction.id);

      // Log audit to consolidated payment_audit_log table
      await supabase.from('payment_audit_log').insert({
        membership_type: membershipType,
        transaction_id: transaction.id,
        user_id: transaction.user_id,
        action: `${source === 'eversend' ? 'Eversend' : 'Flutterwave'} webhook payment failed`,
        action_type: "fail",
        previous_status: "processing",
        new_status: "failed",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
