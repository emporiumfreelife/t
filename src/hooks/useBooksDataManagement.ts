import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './useToast';
import {
  getInvoices,
  getCustomers,
  getExpenses,
  getProfitAndLoss,
  getVendors,
  createInvoice,
  createCustomer,
  createExpense,
  createVendor,
  getExpense,
  updateExpense,
  deleteExpense,
  deleteCustomer,
  deleteVendor,
  getExpenseAccounts,
  getInvoice,
  updateInvoice,
  deleteInvoice,
  getCustomer,
  updateCustomer,
  getVendor,
  updateVendor,
} from '../lib/zohoBooksService';

interface LineItem {
  item_id?: string;
  line_item_id?: string;
  description: string;
  quantity: number;
  rate: number;
}

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_id?: string;
  total: number;
  status: string;
  invoice_date: string;
  due_date: string;
  notes?: string;
  reference_number?: string;
  line_items?: LineItem[];
}

interface Customer {
  contact_id: string;
  contact_name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

interface Vendor {
  contact_id: string;
  contact_name: string;
  email: string;
  company_name?: string;
  phone?: string;
}

interface Expense {
  expense_id: string;
  vendor_name: string;
  vendor_id?: string;
  amount: number;
  status: string;
  expense_date: string;
  reference_number?: string;
  customer_name?: string;
  paid_through?: string;
  account_name?: string;
  account_id?: string;
  currency?: string;
}

export function useBooksDataManagement(organizationId: string | null, isConnected: boolean) {
  const { user } = useAuth();
  const { addToast } = useToast();

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<Array<{ account_id: string; account_name: string; account_type: string }>>([]);
  const [reports, setReports] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Loading states
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);

  // Data loading functions
  const loadInvoicesData = async () => {
    if (!user?.id || !organizationId) return;
    setLoadingInvoices(true);
    try {
      const data = await getInvoices(user.id, organizationId);
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      addToast('Failed to load invoices', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const loadCustomersData = async () => {
    if (!user?.id || !organizationId) return;
    setLoadingCustomers(true);
    try {
      const data = await getCustomers(user.id, organizationId);
      setCustomers(data.contacts || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      addToast('Failed to load customers', 'error');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadVendorsData = async () => {
    if (!user?.id || !organizationId) return;
    setLoadingVendors(true);
    try {
      const data = await getVendors(user.id, organizationId);
      setVendors(data.contacts || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
      addToast('Failed to load vendors', 'error');
    } finally {
      setLoadingVendors(false);
    }
  };

  const loadExpensesData = async () => {
    if (!user?.id || !organizationId) return;
    setLoadingExpenses(true);
    try {
      const [expensesData, accountsData] = await Promise.all([
        getExpenses(user.id, organizationId),
        getExpenseAccounts(user.id, organizationId),
      ]);

      const expensesList = expensesData.expenses || [];

      // Create a map of account_id to account_name for quick lookup
      const accountMap = new Map<string, string>();
      accountsData.forEach(account => {
        accountMap.set(account.account_id, account.account_name);
      });

      // Populate account_name from account_id if not already set
      const enrichedExpenses = expensesList.map(expense => ({
        ...expense,
        account_name: expense.account_name || (expense.account_id ? accountMap.get(expense.account_id) || '' : ''),
      }));

      console.log('📊 Loaded expenses:', {
        count: enrichedExpenses.length,
        firstExpense: enrichedExpenses[0],
        allFieldsPresent: enrichedExpenses.map(e => ({
          hasExpenseId: !!e.expense_id,
          hasVendorName: !!e.vendor_name,
          hasAmount: typeof e.amount === 'number',
          hasStatus: !!e.status,
          hasExpenseDate: !!e.expense_date,
          hasAccountName: !!e.account_name,
        }))
      });
      setExpenses(enrichedExpenses);
    } catch (error) {
      console.error('Error loading expenses:', error);
      addToast('Failed to load expenses', 'error');
    } finally {
      setLoadingExpenses(false);
    }
  };

  const loadReportsData = async () => {
    if (!user?.id || !organizationId) return;
    setLoadingReports(true);
    try {
      const data = await getProfitAndLoss(user.id, organizationId);
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
      addToast('Failed to load reports', 'error');
    } finally {
      setLoadingReports(false);
    }
  };

  const loadExpenseAccountsData = async () => {
    if (!user?.id || !organizationId) return;
    try {
      const data = await getExpenseAccounts(user.id, organizationId);
      setExpenseAccounts(data || []);
    } catch (error) {
      console.error('Error loading expense accounts:', error);
      addToast('Failed to load expense accounts', 'error');
    }
  };

  const loadDashboardData = async () => {
    if (!user?.id || !organizationId) return;
    try {
      const [invoicesData, customersData, vendorsData, expensesData, accountsData] = await Promise.all([
        getInvoices(user.id, organizationId, { limit: 5 }),
        getCustomers(user.id, organizationId, { limit: 5 }),
        getVendors(user.id, organizationId, { limit: 5 }),
        getExpenses(user.id, organizationId, { limit: 5 }),
        getExpenseAccounts(user.id, organizationId),
      ]);

      // Create a map of account_id to account_name for quick lookup
      const accountMap = new Map<string, string>();
      accountsData.forEach(account => {
        accountMap.set(account.account_id, account.account_name);
      });

      // Populate account_name from account_id if not already set
      const expensesList = expensesData.expenses || [];
      const enrichedExpenses = expensesList.map(expense => ({
        ...expense,
        account_name: expense.account_name || (expense.account_id ? accountMap.get(expense.account_id) || '' : ''),
      }));

      setInvoices(invoicesData.invoices || []);
      setCustomers(customersData.contacts || []);
      setVendors(vendorsData.contacts || []);
      setExpenses(enrichedExpenses);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  // CRUD operations
  const handleCreateInvoice = async (
    invoiceForm: any,
    onSuccess?: () => void
  ) => {
    if (!user?.id || !organizationId) {
      addToast('User or organization not found', 'error');
      return false;
    }

    if (!invoiceForm.customer_id) {
      addToast('Please select a customer', 'error');
      return false;
    }

    if (!invoiceForm.description) {
      addToast('Please enter an item description', 'error');
      return false;
    }

    if (invoiceForm.quantity <= 0) {
      addToast('Quantity must be greater than 0', 'error');
      return false;
    }

    if (invoiceForm.rate <= 0) {
      addToast('Rate must be greater than 0', 'error');
      return false;
    }

    try {
      console.log('Creating invoice with data:', {
        customer_id: invoiceForm.customer_id,
        invoice_date: invoiceForm.invoice_date,
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes,
        line_items: [
          {
            item_id: '1',
            description: invoiceForm.description,
            quantity: invoiceForm.quantity,
            rate: invoiceForm.rate,
          },
        ],
      });

      const result = await createInvoice(user.id, organizationId, {
        customer_id: invoiceForm.customer_id,
        invoice_date: invoiceForm.invoice_date,
        due_date: invoiceForm.due_date,
        notes: invoiceForm.notes,
        line_items: [
          {
            description: invoiceForm.description,
            quantity: invoiceForm.quantity,
            rate: invoiceForm.rate,
          },
        ],
      });

      console.log('Invoice creation result:', result);
      addToast('Invoice created successfully!', 'success');
      await loadInvoicesData();
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('🔴 Error creating invoice:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create invoice';
      console.error('Error details:', { errorMsg, fullError: error });
      addToast(errorMsg, 'error');
      return false;
    }
  };

  const handleCreateCustomer = async (
    customerForm: any,
    onSuccess?: () => void
  ) => {
    if (!user?.id || !organizationId) {
      console.error('❌ User or organization missing:', { userId: user?.id, orgId: organizationId });
      addToast('User or organization not found', 'error');
      return false;
    }

    if (!customerForm.contact_name) {
      console.error('❌ Customer name is empty');
      addToast('Customer name is required', 'error');
      return false;
    }

    console.log('📝 Calling createCustomer API with data:', {
      contact_name: customerForm.contact_name,
      email: customerForm.email || undefined,
      phone: customerForm.phone || undefined,
      company_name: customerForm.company_name || undefined,
    });

    try {
      console.log('Creating customer with data:', {
        contact_name: customerForm.contact_name,
        email: customerForm.email || undefined,
        phone: customerForm.phone || undefined,
        company_name: customerForm.company_name || undefined,
      });

      console.log('✅ About to call createCustomer...');

      const result = await createCustomer(user.id, organizationId, {
        contact_name: customerForm.contact_name,
        email: customerForm.email || undefined,
        phone: customerForm.phone || undefined,
        company_name: customerForm.company_name || undefined,
      });

      console.log('✅ Customer created! Result:', result);
      addToast('Customer created successfully!', 'success');
      console.log('📚 Loading customers data...');
      await loadCustomersData();
      console.log('✅ Customers loaded!');
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('🔴 Error creating customer:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create customer';
      console.error('Error details:', {
        errorMsg,
        fullError: error,
        type: error instanceof Error ? error.constructor.name : typeof error
      });
      addToast(errorMsg, 'error');
      return false;
    }
  };

  const handleCreateVendor = async (
    vendorForm: any,
    onSuccess?: () => void
  ) => {
    if (!user?.id || !organizationId) {
      console.error('❌ User or organization missing:', { userId: user?.id, orgId: organizationId });
      addToast('User or organization not found', 'error');
      return false;
    }

    if (!vendorForm.contact_name) {
      console.error('❌ Vendor name is empty');
      addToast('Vendor name is required', 'error');
      return false;
    }

    console.log('📝 Calling createVendor API with data:', {
      contact_name: vendorForm.contact_name,
      email: vendorForm.email || undefined,
      phone: vendorForm.phone || undefined,
      company_name: vendorForm.company_name || undefined,
    });

    try {
      const result = await createVendor(user.id, organizationId, {
        contact_name: vendorForm.contact_name,
        email: vendorForm.email || undefined,
        phone: vendorForm.phone || undefined,
        company_name: vendorForm.company_name || undefined,
      });

      console.log('✅ Vendor created! Result:', result);
      addToast('Vendor created successfully!', 'success');
      console.log('📚 Loading vendors data...');
      await loadVendorsData();
      console.log('✅ Vendors loaded!');
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('🔴 Error creating vendor:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create vendor';
      console.error('Error details:', {
        errorMsg,
        fullError: error,
        type: error instanceof Error ? error.constructor.name : typeof error
      });
      addToast(errorMsg, 'error');
      return false;
    }
  };

  const handleCreateExpense = async (
    expenseForm: any,
    onSuccess?: () => void
  ) => {
    if (!user?.id || !organizationId) {
      addToast('User or organization not found', 'error');
      return false;
    }

    if (!expenseForm.vendor_id) {
      addToast('Please select a vendor', 'error');
      return false;
    }

    if (!expenseForm.account_id) {
      addToast('Please select an expense account', 'error');
      return false;
    }

    if (expenseForm.amount <= 0) {
      addToast('Amount must be greater than 0', 'error');
      return false;
    }

    try {
      const selectedVendor = vendors.find(v => v.contact_id === expenseForm.vendor_id);
      const vendorName = selectedVendor?.contact_name || 'Vendor';

      const expenseData = {
        vendor_id: expenseForm.vendor_id,
        vendor_name: vendorName,
        account_id: expenseForm.account_id,
        expense_date: expenseForm.expense_date,
        total: expenseForm.amount,
        reference_number: expenseForm.reference_number || undefined,
        notes: expenseForm.notes || undefined,
      };

      console.log('🔵 Creating expense with data:', expenseData);

      const result = await createExpense(user.id, organizationId, expenseData);

      console.log('✅ Expense creation result:', result);
      addToast('Expense created successfully!', 'success');
      await loadExpensesData();
      onSuccess?.();
      return true;
    } catch (error) {
      console.error('🔴 Error creating expense:', error);
      let errorMsg = 'Failed to create expense';

      if (error instanceof Error) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.message) {
            errorMsg = `Zoho Books Error: ${parsedError.message}`;
            if (parsedError.code) {
              errorMsg += ` (Code: ${parsedError.code})`;
            }
          } else {
            errorMsg = error.message;
          }
        } catch (e) {
          errorMsg = error.message;
        }
      }

      console.error('Error details:', { errorMsg, fullError: error });
      addToast(errorMsg, 'error');
      return false;
    }
  };

  const handleViewExpense = async (expenseId: string, currency: string) => {
    if (!user?.id || !organizationId) return;
    try {
      const expense = await getExpense(user.id, organizationId, expenseId);
      const expenseData = expense?.expense || expense;
      if (expenseData) {
        setSelectedExpense({
          expense_id: expenseData.expense_id || expenseId,
          vendor_name: expenseData.vendor_name || '',
          vendor_id: expenseData.vendor_id,
          amount: expenseData.amount || 0,
          status: expenseData.status || '',
          expense_date: expenseData.expense_date || '',
          reference_number: expenseData.reference_number,
          customer_name: expenseData.customer_name,
          paid_through: expenseData.paid_through,
          account_name: expenseData.account?.account_name || '',
          account_id: expenseData.account_id,
          currency: expenseData.currency_code || currency,
        });
      }
    } catch (error) {
      console.error('Error fetching expense:', error);
      addToast('Failed to load expense details', 'error');
    }
  };

  const handleUpdateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    if (!user?.id || !organizationId) return;
    try {
      console.log('📝 Updating expense:', { expenseId, updates });
      await updateExpense(user.id, organizationId, expenseId, {
        amount: updates.amount,
        reference_number: updates.reference_number,
        customer_name: updates.customer_name,
        expense_date: updates.expense_date,
      });
      addToast('Expense updated successfully!', 'success');
      await loadExpensesData();
      // Update selectedExpense if it's the one being edited
      if (selectedExpense?.expense_id === expenseId) {
        setSelectedExpense({
          ...selectedExpense,
          ...updates,
        });
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      addToast('Failed to update expense', 'error');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!user?.id || !organizationId) return;
    if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteExpense(user.id, organizationId, expenseId);
      addToast('Expense deleted successfully!', 'success');
      setSelectedExpense(null);
      await loadExpensesData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      addToast('Failed to delete expense', 'error');
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!user?.id || !organizationId) return;
    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteCustomer(user.id, organizationId, customerId);
      addToast('Customer deleted successfully!', 'success');
      await loadCustomersData();
    } catch (error) {
      console.error('Error deleting customer:', error);
      let errorMsg = 'Failed to delete customer';

      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.message) {
            errorMsg = `Delete failed: ${parsed.message}`;
          } else if (parsed.status === 403) {
            errorMsg = 'Permission denied. Customer may be linked to active transactions.';
          } else if (parsed.status === 404) {
            errorMsg = 'Customer not found in Zoho Books.';
          }
        } catch (e) {
          errorMsg = `Delete error: ${error.message}`;
        }
      }

      addToast(errorMsg, 'error');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!user?.id || !organizationId) return;
    if (!window.confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteVendor(user.id, organizationId, vendorId);
      addToast('Vendor deleted successfully!', 'success');
      await loadVendorsData();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      let errorMsg = 'Failed to delete vendor';

      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message);
          if (parsed.message) {
            errorMsg = `Delete failed: ${parsed.message}`;
          } else if (parsed.status === 403) {
            errorMsg = 'Permission denied. Vendor may be linked to active transactions.';
          } else if (parsed.status === 404) {
            errorMsg = 'Vendor not found in Zoho Books.';
          }
        } catch (e) {
          errorMsg = `Delete error: ${error.message}`;
        }
      }

      addToast(errorMsg, 'error');
    }
  };

  // Invoice handlers
  const handleViewInvoice = async (invoiceId: string) => {
    if (!user?.id || !organizationId) return;
    try {
      const invoice = await getInvoice(user.id, organizationId, invoiceId);
      const invoiceData = invoice?.invoice || invoice;
      if (invoiceData) {
        // Extract and normalize line items
        let lineItems: LineItem[] = [];
        if (invoiceData.line_items && Array.isArray(invoiceData.line_items)) {
          lineItems = invoiceData.line_items.map((item: any) => ({
            item_id: item.item_id,
            line_item_id: item.line_item_id,
            description: item.description || item.item_name || '',
            quantity: parseFloat(item.quantity) || 0,
            rate: parseFloat(item.rate) || 0,
          }));
        }

        setSelectedInvoice({
          invoice_id: invoiceData.invoice_id || invoiceId,
          invoice_number: invoiceData.invoice_number || '',
          customer_name: invoiceData.customer_name || '',
          customer_id: invoiceData.customer_id,
          total: invoiceData.total || 0,
          status: invoiceData.status || '',
          invoice_date: invoiceData.invoice_date || '',
          due_date: invoiceData.due_date || '',
          notes: invoiceData.notes,
          reference_number: invoiceData.reference_number,
          line_items: lineItems,
        });
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      addToast('Failed to load invoice details', 'error');
    }
  };

  const handleUpdateInvoice = async (invoiceId: string, updates: Partial<Invoice>) => {
    if (!user?.id || !organizationId) return;
    try {
      // Prepare line items for API - filter out empty items
      const lineItems = updates.line_items
        ?.filter(item => item.description && item.quantity > 0 && item.rate > 0)
        .map(item => ({
          line_item_id: item.line_item_id,
          item_id: item.item_id,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
        })) || [];

      await updateInvoice(user.id, organizationId, invoiceId, {
        invoice_date: updates.invoice_date,
        due_date: updates.due_date,
        notes: updates.notes,
        reference_number: updates.reference_number,
        line_items: lineItems.length > 0 ? lineItems : undefined,
      });
      addToast('Invoice updated successfully!', 'success');
      await loadInvoicesData();
      if (selectedInvoice?.invoice_id === invoiceId) {
        setSelectedInvoice({
          ...selectedInvoice,
          ...updates,
        });
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      addToast('Failed to update invoice', 'error');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!user?.id || !organizationId) return;
    if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteInvoice(user.id, organizationId, invoiceId);
      addToast('Invoice deleted successfully!', 'success');
      setSelectedInvoice(null);
      await loadInvoicesData();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      addToast('Failed to delete invoice', 'error');
    }
  };

  // Customer handlers
  const handleViewCustomer = async (customerId: string) => {
    if (!user?.id || !organizationId) return;
    try {
      const customer = await getCustomer(user.id, organizationId, customerId);
      const customerData = customer?.contact || customer;
      if (customerData) {
        setSelectedCustomer({
          contact_id: customerData.contact_id || customerId,
          contact_name: customerData.contact_name || '',
          email: customerData.email || '',
          company_name: customerData.company_name,
          phone: customerData.phone,
        });
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
      addToast('Failed to load customer details', 'error');
    }
  };

  const handleUpdateCustomer = async (customerId: string, updates: Partial<Customer>) => {
    if (!user?.id || !organizationId) return;
    try {
      await updateCustomer(user.id, organizationId, customerId, {
        contact_name: updates.contact_name,
        email: updates.email,
        phone: updates.phone,
        company_name: updates.company_name,
      });
      addToast('Customer updated successfully!', 'success');
      await loadCustomersData();
      if (selectedCustomer?.contact_id === customerId) {
        setSelectedCustomer({
          ...selectedCustomer,
          ...updates,
        });
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      addToast('Failed to update customer', 'error');
    }
  };

  // Vendor handlers
  const handleViewVendor = async (vendorId: string) => {
    if (!user?.id || !organizationId) return;
    try {
      const vendor = await getVendor(user.id, organizationId, vendorId);
      const vendorData = vendor?.contact || vendor;
      if (vendorData) {
        setSelectedVendor({
          contact_id: vendorData.contact_id || vendorId,
          contact_name: vendorData.contact_name || '',
          email: vendorData.email || '',
          company_name: vendorData.company_name,
          phone: vendorData.phone,
        });
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
      addToast('Failed to load vendor details', 'error');
    }
  };

  const handleUpdateVendor = async (vendorId: string, updates: Partial<Vendor>) => {
    if (!user?.id || !organizationId) return;
    try {
      await updateVendor(user.id, organizationId, vendorId, {
        contact_name: updates.contact_name,
        email: updates.email,
        phone: updates.phone,
        company_name: updates.company_name,
      });
      addToast('Vendor updated successfully!', 'success');
      await loadVendorsData();
      if (selectedVendor?.contact_id === vendorId) {
        setSelectedVendor({
          ...selectedVendor,
          ...updates,
        });
      }
    } catch (error) {
      console.error('Error updating vendor:', error);
      addToast('Failed to update vendor', 'error');
    }
  };

  return {
    // Data
    invoices,
    customers,
    vendors,
    expenses,
    expenseAccounts,
    reports,
    selectedInvoice,
    setSelectedInvoice,
    selectedCustomer,
    setSelectedCustomer,
    selectedVendor,
    setSelectedVendor,
    selectedExpense,
    setSelectedExpense,

    // Loading states
    loadingInvoices,
    loadingCustomers,
    loadingVendors,
    loadingExpenses,
    loadingReports,

    // Data loading functions
    loadInvoicesData,
    loadCustomersData,
    loadVendorsData,
    loadExpensesData,
    loadReportsData,
    loadExpenseAccountsData,
    loadDashboardData,

    // CRUD operations
    handleCreateInvoice,
    handleCreateCustomer,
    handleCreateVendor,
    handleCreateExpense,
    handleViewInvoice,
    handleUpdateInvoice,
    handleDeleteInvoice,
    handleViewCustomer,
    handleUpdateCustomer,
    handleViewExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleDeleteCustomer,
    handleViewVendor,
    handleUpdateVendor,
    handleDeleteVendor,
  };
}
