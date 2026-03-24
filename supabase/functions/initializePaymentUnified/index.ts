import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

interface InitPaymentRequest {
  membershipType: 'creator' | 'member'; // Platform membership, not per-creator
  userId: string;
  targetTier: string;
  previousTier: string;
  amount: number;
  billingCycle: string;
  paymentMethod: string;
  email: string;
  phoneNumber: string;
  userName: string;
  idempotencyKey: string;
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body: InitPaymentRequest = await req.json();

    // Validate request
    if (
      !body.membershipType ||
      !body.userId ||
      !body.targetTier ||
      !body.amount ||
      !body.paymentMethod ||
      !body.idempotencyKey
    ) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Determine table based on membership type
    const tableName =
      body.membershipType === 'creator' ? 'creators_membership' : 'members_membership';
    const gateway =
      body.paymentMethod === "express_pay" ? "flutterwave" : "eversend";

    // Check for existing transaction (idempotency)
    const { data: existingTx } = await supabase
      .from(tableName)
      .select("*")
      .eq("idempotency_key", body.idempotencyKey)
      .single();

    if (existingTx) {
      return new Response(
        JSON.stringify({ success: true, transactionId: existingTx.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Prepare transaction data
    const transactionData: any = {
      user_id: body.userId,
      previous_tier: body.previousTier,
      new_tier: body.targetTier,
      amount: body.amount,
      currency: "USD",
      billing_cycle: body.billingCycle,
      payment_method: body.paymentMethod,
      gateway: gateway,
      idempotency_key: body.idempotencyKey,
      status: "pending",
      payment_status: "pending",
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    };

    // Create pending transaction
    const { data: transaction, error: txError } = await supabase
      .from(tableName)
      .insert(transactionData)
      .select("id")
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: "Failed to create transaction" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Call payment gateway
    let paymentResult;

    if (gateway === "eversend") {
      paymentResult = await initializeEversendPayment(body, transaction.id);
    } else {
      paymentResult = await initializeFlutterwavePayment(body, transaction.id);
    }

    if (!paymentResult.success) {
      await supabase
        .from(tableName)
        .update({
          status: "failed",
          payment_status: "failed",
          error_message: paymentResult.error,
        })
        .eq("id", transaction.id);

      return new Response(JSON.stringify(paymentResult), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update transaction with gateway details
    await supabase
      .from(tableName)
      .update({
        transaction_id: paymentResult.transactionId,
        reference_id: paymentResult.referenceId,
        status: "processing",
      })
      .eq("id", transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        checkoutUrl: paymentResult.checkoutUrl,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
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

async function initializeEversendPayment(
  body: InitPaymentRequest,
  transactionId: string
): Promise<{
  success: boolean;
  error?: string;
  transactionId?: string;
  referenceId?: string;
  checkoutUrl?: string;
}> {
  const eversendKey = Deno.env.get("EVERSEND_API_KEY");
  if (!eversendKey) {
    return { success: false, error: "Eversend API key not configured" };
  }

  try {
    const response = await fetch("https://api.eversend.co/send/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${eversendKey}`,
      },
      body: JSON.stringify({
        amount: body.amount,
        currency: "USD",
        phoneNumber: body.phoneNumber,
        email: body.email,
        description: `${body.membershipType === 'creator' ? 'Creator' : 'Member'} Membership - ${body.previousTier} to ${body.targetTier}`,
        externalId: `membership-${body.membershipType}-${body.userId}-${transactionId}`,
        redirectUrl: `${Deno.env.get("APP_URL")}/membership-callback?type=${body.membershipType}`,
        metadata: {
          membershipType: body.membershipType,
          userId: body.userId,
          transactionId: transactionId,
          currentTier: body.previousTier,
          targetTier: body.targetTier,
          billingCycle: body.billingCycle,
          type: "membership-upgrade",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Eversend initialization failed",
      };
    }

    return {
      success: true,
      transactionId: data.reference,
      referenceId: data.reference,
      checkoutUrl: data.checkoutLink || data.paymentLink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Eversend error",
    };
  }
}

async function initializeFlutterwavePayment(
  body: InitPaymentRequest,
  transactionId: string
): Promise<{
  success: boolean;
  error?: string;
  transactionId?: string;
  referenceId?: string;
  checkoutUrl?: string;
}> {
  const flutterwaveKey = Deno.env.get("FLUTTERWAVE_SECRET_KEY");
  if (!flutterwaveKey) {
    return { success: false, error: "Flutterwave secret key not configured" };
  }

  try {
    const response = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${flutterwaveKey}`,
      },
      body: JSON.stringify({
        tx_ref: `membership-${body.membershipType}-${body.userId}-${transactionId}`,
        amount: body.amount,
        currency: "USD",
        payment_options: "card,mobilemoney,ussd",
        customer: {
          email: body.email,
          name: body.userName,
          phonenumber: body.phoneNumber,
        },
        customizations: {
          title: `${body.membershipType === 'creator' ? 'Creator' : 'Member'} Membership`,
          description: `Upgrade from ${body.previousTier} to ${body.targetTier}`,
        },
        redirect_url: `${Deno.env.get("APP_URL")}/membership-callback?type=${body.membershipType}`,
        meta: {
          membershipType: body.membershipType,
          userId: body.userId,
          transactionId: transactionId,
          currentTier: body.previousTier,
          targetTier: body.targetTier,
          billingCycle: body.billingCycle,
          type: "membership-upgrade",
        },
      }),
    });

    const data = await response.json();

    if (data.status !== "success") {
      return {
        success: false,
        error: data.message || "Flutterwave initialization failed",
      };
    }

    return {
      success: true,
      transactionId: data.data.reference,
      referenceId: data.data.reference,
      checkoutUrl: data.data.link,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Flutterwave error",
    };
  }
}
