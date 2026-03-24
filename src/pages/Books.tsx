import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Zap } from 'lucide-react';
import { getZohoBooksAuthUrl } from '../lib/zohoBooksService';
import { useToast } from '../hooks/useToast';
import { useZohoBooksConnection } from '../hooks/useZohoBooksConnection';
import { useBooksDataManagement } from '../hooks/useBooksDataManagement';

// Components
import ConnectionScreen from '../components/ConnectionScreen';
import NewInvoiceModal from '../components/NewInvoiceModal';
import NewCustomerModal from '../components/NewCustomerModal';
import NewVendorModal from '../components/NewVendorModal';
import NewExpenseModal from '../components/NewExpenseModal';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import CustomerDetailModal from '../components/CustomerDetailModal';
import VendorDetailModal from '../components/VendorDetailModal';
import ExpenseDetailModal from '../components/ExpenseDetailModal';
import DashboardTab from '../components/DashboardTab';
import InvoicesTab from '../components/InvoicesTab';
import CustomersTab from '../components/CustomersTab';
import VendorsTab from '../components/VendorsTab';
import ExpensesTab from '../components/ExpensesTab';
import ReportsTab from '../components/ReportsTab';

export default function Books() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Use Zoho Books connection hook
  const {
    isConnected,
    organizationId,
    currency,
    loading,
    isProcessingCallback,
    handleDisconnect,
  } = useZohoBooksConnection();

  // Use Books data management hook
  const {
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
    loadingInvoices,
    loadingCustomers,
    loadingVendors,
    loadingExpenses,
    loadingReports,
    loadInvoicesData,
    loadCustomersData,
    loadVendorsData,
    loadExpensesData,
    loadReportsData,
    loadExpenseAccountsData,
    loadDashboardData,
    handleCreateInvoice: createInvoiceHandler,
    handleCreateCustomer: createCustomerHandler,
    handleCreateVendor: createVendorHandler,
    handleCreateExpense: createExpenseHandler,
    handleViewInvoice: viewInvoiceHandler,
    handleUpdateInvoice: updateInvoiceHandler,
    handleDeleteInvoice: deleteInvoiceHandler,
    handleViewCustomer: viewCustomerHandler,
    handleUpdateCustomer: updateCustomerHandler,
    handleViewExpense: viewExpenseHandler,
    handleUpdateExpense: updateExpenseHandler,
    handleDeleteExpense: deleteExpenseHandler,
    handleDeleteCustomer: deleteCustomerHandler,
    handleViewVendor: viewVendorHandler,
    handleUpdateVendor: updateVendorHandler,
    handleDeleteVendor: deleteVendorHandler,
  } = useBooksDataManagement(organizationId, isConnected);

  // Tabs and modals state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'customers' | 'expenses' | 'vendors' | 'reports'>('dashboard');
  const [showNewInvoiceModal, setShowNewInvoiceModal] = useState(false);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showNewVendorModal, setShowNewVendorModal] = useState(false);
  const [showNewExpenseModal, setShowNewExpenseModal] = useState(false);
  const [showInvoiceDetailModal, setShowInvoiceDetailModal] = useState(false);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [showVendorDetailModal, setShowVendorDetailModal] = useState(false);
  const [showExpenseDetailModal, setShowExpenseDetailModal] = useState(false);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    customer_id: '',
    description: '',
    quantity: 1,
    rate: 0,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  const [customerForm, setCustomerForm] = useState({
    contact_name: '',
    email: '',
    phone: '',
    company_name: '',
  });

  const [vendorForm, setVendorForm] = useState({
    contact_name: '',
    email: '',
    phone: '',
    company_name: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    vendor_id: '',
    account_id: '',
    reference_number: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Saving states
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  // Load data when tab changes
  useEffect(() => {
    if (!isConnected || !user?.id || !organizationId) return;

    if (activeTab === 'invoices') {
      loadInvoicesData();
    } else if (activeTab === 'customers') {
      loadCustomersData();
    } else if (activeTab === 'vendors') {
      loadVendorsData();
    } else if (activeTab === 'expenses') {
      loadExpensesData();
    } else if (activeTab === 'dashboard') {
      loadDashboardData();
    } else if (activeTab === 'reports') {
      loadReportsData();
    }
  }, [activeTab, isConnected, organizationId, user?.id]);

  // Load expense accounts when modal is opened
  useEffect(() => {
    if (showNewExpenseModal && isConnected && user?.id && organizationId && expenseAccounts.length === 0) {
      loadExpenseAccountsData();
    }
  }, [showNewExpenseModal, isConnected, user?.id, organizationId]);

  // Handle create invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInvoice(true);
    try {
      const success = await createInvoiceHandler(invoiceForm, () => {
        setShowNewInvoiceModal(false);
        setInvoiceForm({
          customer_id: '',
          description: '',
          quantity: 1,
          rate: 0,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: '',
        });
      });
    } finally {
      setSavingInvoice(false);
    }
  };

  // Handle create customer
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCustomer(true);
    try {
      const success = await createCustomerHandler(customerForm, () => {
        setShowNewCustomerModal(false);
        setCustomerForm({
          contact_name: '',
          email: '',
          phone: '',
          company_name: '',
        });
      });
    } finally {
      setSavingCustomer(false);
    }
  };

  // Handle create vendor
  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingVendor(true);
    try {
      const success = await createVendorHandler(vendorForm, () => {
        setShowNewVendorModal(false);
        setVendorForm({
          contact_name: '',
          email: '',
          phone: '',
          company_name: '',
        });
      });
    } finally {
      setSavingVendor(false);
    }
  };

  // Handle create expense
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingExpense(true);
    try {
      const success = await createExpenseHandler(expenseForm, () => {
        setShowNewExpenseModal(false);
        setExpenseForm({
          vendor_id: '',
          account_id: expenseAccounts.length > 0 ? expenseAccounts[0].account_id : '',
          reference_number: '',
          amount: 0,
          expense_date: new Date().toISOString().split('T')[0],
          notes: '',
        });
      });
    } finally {
      setSavingExpense(false);
    }
  };

  // Handle view expense
  const handleViewExpense = async (expenseId: string) => {
    await viewExpenseHandler(expenseId, currency);
    setShowExpenseDetailModal(true);
  };

  // Handle delete expense
  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpenseHandler(expenseId);
  };

  // Get OAuth URL for the connect link
  const getConnectUrl = () => {
    try {
      return getZohoBooksAuthUrl();
    } catch (error) {
      console.error('🔴 Error generating OAuth URL:', error);
      addToast(error instanceof Error ? error.message : 'Failed to generate OAuth URL', 'error');
      return '#';
    }
  };

  // Show loading screen during auth process
  if (loading || isProcessingCallback) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 pt-20 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="inline-block animate-spin">
              <Zap className="w-8 h-8 text-rose-400" />
            </div>
            <p className="mt-4 text-gray-300">
              {isProcessingCallback ? 'Connecting to Books...' : 'Loading Books...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show connection screen if not connected
  if (!isConnected) {
    return <ConnectionScreen onConnect={() => {}} connectUrl={getConnectUrl()} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 pt-20">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Books</h1>
            <p className="text-gray-400">Manage your financial operations with Books</p>
          </div>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['dashboard', 'invoices', 'customers', 'vendors', 'expenses', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <DashboardTab invoices={invoices} customers={customers} expenses={expenses} />
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <InvoicesTab
            invoices={invoices}
            isLoading={loadingInvoices}
            onNewClick={() => setShowNewInvoiceModal(true)}
            onView={viewInvoiceHandler}
            onUpdate={updateInvoiceHandler}
            onDelete={deleteInvoiceHandler}
          />
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <CustomersTab
            customers={customers}
            isLoading={loadingCustomers}
            onNewClick={() => setShowNewCustomerModal(true)}
            onDelete={deleteCustomerHandler}
            onView={viewCustomerHandler}
            onUpdate={updateCustomerHandler}
          />
        )}

        {/* Vendors Tab */}
        {activeTab === 'vendors' && (
          <VendorsTab
            vendors={vendors}
            isLoading={loadingVendors}
            onNewClick={() => setShowNewVendorModal(true)}
            onDelete={deleteVendorHandler}
            onView={viewVendorHandler}
            onUpdate={updateVendorHandler}
          />
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={expenses}
            isLoading={loadingExpenses}
            currency={currency}
            onNewClick={() => setShowNewExpenseModal(true)}
            onView={(expenseId) => {
              viewExpenseHandler(expenseId, currency);
              setShowExpenseDetailModal(true);
            }}
            onEdit={(expenseId) => {
              const expense = expenses.find(e => e.expense_id === expenseId);
              if (expense) {
                setSelectedExpense(expense);
                setShowExpenseDetailModal(true);
              }
            }}
            onDelete={deleteExpenseHandler}
          />
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <ReportsTab reports={reports} isLoading={loadingReports} />
        )}

        {/* Modals */}
        <NewInvoiceModal
          isOpen={showNewInvoiceModal}
          onClose={() => setShowNewInvoiceModal(false)}
          onSubmit={handleCreateInvoice}
          invoiceForm={invoiceForm}
          onFormChange={setInvoiceForm}
          customers={customers}
          isSaving={savingInvoice}
        />

        <NewCustomerModal
          isOpen={showNewCustomerModal}
          onClose={() => setShowNewCustomerModal(false)}
          onSubmit={handleCreateCustomer}
          customerForm={customerForm}
          onFormChange={setCustomerForm}
          isSaving={savingCustomer}
        />

        <NewVendorModal
          isOpen={showNewVendorModal}
          onClose={() => setShowNewVendorModal(false)}
          onSubmit={handleCreateVendor}
          vendorForm={vendorForm}
          onFormChange={setVendorForm}
          isSaving={savingVendor}
        />

        <NewExpenseModal
          isOpen={showNewExpenseModal}
          onClose={(resetForm) => {
            setShowNewExpenseModal(false);
            if (resetForm) {
              setExpenseForm({
                vendor_id: '',
                account_id: expenseAccounts.length > 0 ? expenseAccounts[0].account_id : '',
                reference_number: '',
                amount: 0,
                expense_date: new Date().toISOString().split('T')[0],
                notes: '',
              });
            }
          }}
          onSubmit={handleCreateExpense}
          expenseForm={expenseForm}
          onFormChange={setExpenseForm}
          vendors={vendors}
          expenseAccounts={expenseAccounts}
          isSaving={savingExpense}
          isLoading={loadingExpenses}
        />

        <InvoiceDetailModal
          isOpen={showInvoiceDetailModal}
          onClose={() => setShowInvoiceDetailModal(false)}
          invoice={selectedInvoice}
          onDelete={deleteInvoiceHandler}
          onUpdate={updateInvoiceHandler}
        />

        <CustomerDetailModal
          isOpen={showCustomerDetailModal}
          onClose={() => setShowCustomerDetailModal(false)}
          customer={selectedCustomer}
          onDelete={deleteCustomerHandler}
          onUpdate={updateCustomerHandler}
        />

        <VendorDetailModal
          isOpen={showVendorDetailModal}
          onClose={() => setShowVendorDetailModal(false)}
          vendor={selectedVendor}
          onDelete={deleteVendorHandler}
          onUpdate={updateVendorHandler}
        />

        <ExpenseDetailModal
          isOpen={showExpenseDetailModal}
          onClose={() => setShowExpenseDetailModal(false)}
          expense={selectedExpense}
          currencyDefault={currency}
          onDelete={deleteExpenseHandler}
          onUpdate={updateExpenseHandler}
        />
      </div>
    </div>
  );
}
