/**
 * Zoho Books Utility Functions
 * Formatting, caching, error handling, and helper functions
 */

import { supabase } from './supabase';

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

export const formatCurrency = (amount: number, currencyCode = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatInvoiceStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    partially_paid: 'Partially Paid',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };
  return statusMap[status.toLowerCase()] || status;
};

export const formatExpenseStatus = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    draft: 'Draft',
    submitted: 'Submitted',
    approved: 'Approved',
    paid: 'Paid',
    reimbursed: 'Reimbursed',
  };
  return statusMap[status.toLowerCase()] || status;
};

export const getStatusColor = (status: string, type: 'invoice' | 'expense' = 'invoice'): string => {
  if (type === 'invoice') {
    const colorMap: { [key: string]: string } = {
      draft: 'bg-gray-500/20 text-gray-300',
      sent: 'bg-blue-500/20 text-blue-300',
      viewed: 'bg-cyan-500/20 text-cyan-300',
      partially_paid: 'bg-yellow-500/20 text-yellow-300',
      paid: 'bg-emerald-500/20 text-emerald-300',
      overdue: 'bg-red-500/20 text-red-300',
      cancelled: 'bg-slate-500/20 text-slate-300',
    };
    return colorMap[status.toLowerCase()] || 'bg-gray-500/20 text-gray-300';
  } else {
    const colorMap: { [key: string]: string } = {
      draft: 'bg-gray-500/20 text-gray-300',
      submitted: 'bg-blue-500/20 text-blue-300',
      approved: 'bg-yellow-500/20 text-yellow-300',
      paid: 'bg-emerald-500/20 text-emerald-300',
      reimbursed: 'bg-purple-500/20 text-purple-300',
    };
    return colorMap[status.toLowerCase()] || 'bg-gray-500/20 text-gray-300';
  }
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 7;
};

export const validateInvoiceData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.customer_id) {
    errors.push('Customer is required');
  }

  if (!data.line_items || data.line_items.length === 0) {
    errors.push('At least one line item is required');
  }

  if (data.line_items) {
    data.line_items.forEach((item: any, index: number) => {
      if (!item.item_id) {
        errors.push(`Line item ${index + 1}: Item is required`);
      }
      if (item.quantity && item.quantity <= 0) {
        errors.push(`Line item ${index + 1}: Quantity must be greater than 0`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateCustomerData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.contact_name || data.contact_name.trim() === '') {
    errors.push('Customer name is required');
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email address');
  }

  if (data.phone && !validatePhone(data.phone)) {
    errors.push('Invalid phone number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateExpenseData = (data: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.account_id) {
    errors.push('Account is required');
  }

  if (!data.expense_date) {
    errors.push('Expense date is required');
  }

  if (!data.total || data.total <= 0) {
    errors.push('Amount must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// CACHING UTILITIES
// ============================================================================

export const cacheInvoices = async (userId: string, invoices: any[]): Promise<void> => {
  const invoicesToCache = invoices.map((inv) => ({
    user_id: userId,
    zoho_invoice_id: inv.invoice_id,
    customer_id: inv.customer_id,
    customer_name: inv.customer_name,
    invoice_number: inv.invoice_number,
    reference_number: inv.reference_number,
    status: inv.status,
    invoice_date: inv.invoice_date,
    due_date: inv.due_date,
    amount: inv.amount,
    tax_amount: inv.tax_amount,
    total: inv.total,
    currency_code: inv.currency_code,
    notes: inv.notes,
    email_sent: inv.email_sent,
    payment_status: inv.payment_status,
    last_synced_at: new Date().toISOString(),
    raw_data: inv,
  }));

  const { error } = await supabase
    .from('zoho_books_invoices')
    .upsert(invoicesToCache, {
      onConflict: 'user_id,zoho_invoice_id',
    });

  if (error) {
    console.error('Error caching invoices:', error);
  }
};

export const cacheCustomers = async (userId: string, customers: any[]): Promise<void> => {
  const customersToCache = customers.map((cust) => ({
    user_id: userId,
    zoho_contact_id: cust.contact_id,
    contact_name: cust.contact_name,
    company_name: cust.company_name,
    email: cust.email,
    phone: cust.phone,
    mobile: cust.mobile,
    website: cust.website,
    fax: cust.fax,
    status: cust.status,
    currency_code: cust.currency_code,
    billing_address: JSON.stringify(cust.billing_address),
    shipping_address: JSON.stringify(cust.shipping_address),
    notes: cust.notes,
    last_synced_at: new Date().toISOString(),
    raw_data: cust,
  }));

  const { error } = await supabase
    .from('zoho_books_customers')
    .upsert(customersToCache, {
      onConflict: 'user_id,zoho_contact_id',
    });

  if (error) {
    console.error('Error caching customers:', error);
  }
};

export const cacheExpenses = async (userId: string, expenses: any[]): Promise<void> => {
  const expensesToCache = expenses.map((exp) => ({
    user_id: userId,
    zoho_expense_id: exp.expense_id,
    vendor_id: exp.vendor_id,
    vendor_name: exp.vendor_name,
    expense_date: exp.expense_date,
    reference_number: exp.reference_number,
    account: exp.account,
    amount: exp.amount,
    currency_code: exp.currency_code,
    status: exp.status,
    notes: exp.notes,
    last_synced_at: new Date().toISOString(),
    raw_data: exp,
  }));

  const { error } = await supabase
    .from('zoho_books_expenses')
    .upsert(expensesToCache, {
      onConflict: 'user_id,zoho_expense_id',
    });

  if (error) {
    console.error('Error caching expenses:', error);
  }
};

// ============================================================================
// CALCULATION UTILITIES
// ============================================================================

export const calculateInvoiceTotal = (lineItems: any[]): number => {
  return lineItems.reduce((sum, item) => {
    const itemTotal = (item.quantity || 0) * (item.rate || 0);
    return sum + itemTotal;
  }, 0);
};

export const calculateTax = (subtotal: number, taxRate: number): number => {
  return subtotal * (taxRate / 100);
};

export const calculateNetProfit = (income: number, expenses: number): number => {
  return income - expenses;
};

export const calculateMetrics = (invoices: any[], expenses: any[]): {
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  totalExpenses: number;
  netProfit: number;
} => {
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const paidAmount = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingAmount = totalRevenue - paidAmount;
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    paidAmount,
    pendingAmount,
    totalExpenses,
    netProfit,
  };
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

export class ZohoBooksError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ZohoBooksError';
  }
}

export const handleApiError = (error: any): { message: string; code: string; statusCode?: number } => {
  if (error.message === 'No Zoho Books integration found') {
    return {
      message: 'Please connect your Zoho Books account first',
      code: 'NOT_CONNECTED',
    };
  }

  if (error.message?.includes('Token refresh failed')) {
    return {
      message: 'Your connection has expired. Please reconnect your Zoho Books account.',
      code: 'TOKEN_EXPIRED',
    };
  }

  if (error.message?.includes('401')) {
    return {
      message: 'Unauthorized. Please reconnect your Zoho Books account.',
      code: 'UNAUTHORIZED',
      statusCode: 401,
    };
  }

  if (error.message?.includes('403')) {
    return {
      message: 'Access denied. Check your Zoho Books account permissions.',
      code: 'FORBIDDEN',
      statusCode: 403,
    };
  }

  if (error.message?.includes('404')) {
    return {
      message: 'Resource not found in Zoho Books.',
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  if (error.message?.includes('429')) {
    return {
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'RATE_LIMITED',
      statusCode: 429,
    };
  }

  if (error.message?.includes('Network')) {
    return {
      message: 'Network error. Please check your connection and try again.',
      code: 'NETWORK_ERROR',
    };
  }

  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
};

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

export const transformInvoiceData = (zohoInvoice: any) => {
  return {
    id: zohoInvoice.invoice_id,
    number: zohoInvoice.invoice_number,
    customer: zohoInvoice.customer_name,
    amount: zohoInvoice.total,
    status: formatInvoiceStatus(zohoInvoice.status),
    date: formatDate(zohoInvoice.invoice_date),
    dueDate: formatDate(zohoInvoice.due_date),
    raw: zohoInvoice,
  };
};

export const transformCustomerData = (zohoCustomer: any) => {
  return {
    id: zohoCustomer.contact_id,
    name: zohoCustomer.contact_name,
    company: zohoCustomer.company_name,
    email: zohoCustomer.email,
    phone: zohoCustomer.phone,
    mobile: zohoCustomer.mobile,
    website: zohoCustomer.website,
    raw: zohoCustomer,
  };
};

export const transformExpenseData = (zohoExpense: any) => {
  return {
    id: zohoExpense.expense_id,
    vendor: zohoExpense.vendor_name,
    amount: zohoExpense.amount,
    status: formatExpenseStatus(zohoExpense.status),
    date: formatDate(zohoExpense.expense_date),
    raw: zohoExpense,
  };
};

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

export const getPaginationParams = (page: number = 1, limit: number = 20) => {
  return {
    offset: (page - 1) * limit,
    limit,
  };
};

export const calculatePages = (total: number, limit: number): number => {
  return Math.ceil(total / limit);
};

// ============================================================================
// SYNC UTILITIES
// ============================================================================

export const markLastSync = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('zoho_books_integrations')
    .update({ last_sync: new Date().toISOString() })
    .eq('user_id', userId);

  if (error) {
    console.error('Error marking sync:', error);
  }
};

export const getLastSyncTime = async (userId: string): Promise<Date | null> => {
  const { data, error } = await supabase
    .from('zoho_books_integrations')
    .select('last_sync')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error getting last sync:', error);
    return null;
  }

  return data?.last_sync ? new Date(data.last_sync) : null;
};

export const shouldRefreshData = (lastSync: Date | null, minutes: number = 5): boolean => {
  if (!lastSync) return true;
  const now = new Date();
  const timeDiff = (now.getTime() - lastSync.getTime()) / (1000 * 60);
  return timeDiff >= minutes;
};
