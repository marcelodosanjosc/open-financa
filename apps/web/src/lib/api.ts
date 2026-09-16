import {
  DashboardSummaryDto,
  AccountResponseDto,
  CreateAccountDto,
  UpdateAccountDto,
  CategoryResponseDto,
  CreateCategoryDto,
  BudgetResponseDto,
  CreateBudgetDto,
  TransactionResponseDto,
  CreateTransactionDto,
  UpdateTransactionDto,
  CreditCardResponseDto,
  CreateCreditCardDto,
  InvoiceResponseDto,
  CreateInstallmentPurchaseDto,
  PayInvoiceDto,
  FutureTimelineResponseDto,
  DebtPayoffSimulationResult,
  DebtPayoffStrategy,
  DebtItem,
  BatchParseResultDto,
  ConfirmImportDto,
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  UserPayloadDto,
} from '@repo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let isRefreshing = false;

async function fetchApi<T>(path: string, options?: RequestInit, isRetry = false): Promise<T> {
  const url = `${API_BASE}/api${path}`;
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (response.status === 401 && !isRetry && !path.startsWith('/auth/')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        isRefreshing = false;
        if (refreshRes.ok) {
          return fetchApi<T>(path, options, true);
        }
      } catch {
        isRefreshing = false;
      }
    }

    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
  }

  if (!response.ok) {
    let errorMessage = `Erro na requisição (${response.status})`;
    try {
      const errJson = await response.json();
      errorMessage = errJson.message || errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  // Dashboard
  getDashboardSummary: (year?: number, month?: number) => {
    const query = year && month ? `?year=${year}&month=${month}` : '';
    return fetchApi<DashboardSummaryDto>(`/dashboard/summary${query}`);
  },
  getRecentTransactions: () =>
    fetchApi<
      Array<{
        id: string;
        description: string;
        amount: number;
        type: string;
        date: string;
        accountName?: string;
        categoryName?: string;
        categoryClassification?: string;
      }>
    >('/dashboard/recent-transactions'),

  // Accounts
  getAccounts: () => fetchApi<AccountResponseDto[]>('/accounts'),
  getAccountById: (id: string) => fetchApi<AccountResponseDto>(`/accounts/${id}`),
  createAccount: (data: CreateAccountDto) =>
    fetchApi<AccountResponseDto>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAccount: (id: string, data: UpdateAccountDto) =>
    fetchApi<AccountResponseDto>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deactivateAccount: (id: string) =>
    fetchApi<AccountResponseDto>(`/accounts/${id}/deactivate`, {
      method: 'PATCH',
    }),

  // Categories
  getCategories: (flat = false) =>
    fetchApi<CategoryResponseDto[]>(`/categories${flat ? '?flat=true' : ''}`),
  createCategory: (data: CreateCategoryDto) =>
    fetchApi<CategoryResponseDto>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    fetchApi<{ success: boolean }>(`/categories/${id}`, {
      method: 'DELETE',
    }),

  // Budgets
  getBudgets: (year?: number, month?: number) => {
    const query = year && month ? `?year=${year}&month=${month}` : '';
    return fetchApi<BudgetResponseDto[]>(`/budgets${query}`);
  },
  saveBudget: (data: CreateBudgetDto) =>
    fetchApi<BudgetResponseDto>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBudget: (id: string) =>
    fetchApi<{ success: boolean }>(`/budgets/${id}`, {
      method: 'DELETE',
    }),

  // Transactions
  getTransactions: (filters?: Record<string, any>) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params.append(key, String(val));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchApi<{ total: number; data: TransactionResponseDto[] }>(`/transactions${query}`);
  },
  createTransaction: (data: CreateTransactionDto) =>
    fetchApi<TransactionResponseDto>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTransaction: (id: string, data: UpdateTransactionDto) =>
    fetchApi<TransactionResponseDto>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  toggleReconcile: (id: string, isReconciled: boolean) =>
    fetchApi<{ id: string; isReconciled: boolean }>(`/transactions/${id}/reconcile`, {
      method: 'PATCH',
      body: JSON.stringify({ isReconciled }),
    }),
  deleteTransaction: (id: string) =>
    fetchApi<{ success: boolean }>(`/transactions/${id}`, {
      method: 'DELETE',
    }),

  // Credit Cards
  getCreditCards: () => fetchApi<CreditCardResponseDto[]>('/credit-cards'),
  getCreditCardById: (id: string) => fetchApi<CreditCardResponseDto>(`/credit-cards/${id}`),
  createCreditCard: (data: CreateCreditCardDto) =>
    fetchApi<CreditCardResponseDto>('/credit-cards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteCreditCard: (id: string) =>
    fetchApi<{ success: boolean }>(`/credit-cards/${id}`, {
      method: 'DELETE',
    }),

  // Invoices & Card Expenses
  getCardInvoices: (cardId: string) => fetchApi<InvoiceResponseDto[]>(`/invoices/card/${cardId}`),
  getInvoiceById: (id: string) => fetchApi<InvoiceResponseDto>(`/invoices/${id}`),
  createInstallmentPurchase: (data: CreateInstallmentPurchaseDto) =>
    fetchApi<any>('/invoices/installments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  payInvoice: (invoiceId: string, data: PayInvoiceDto) =>
    fetchApi<any>(`/invoices/${invoiceId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Debt Payoff Simulator & Timeline
  getDebtTimeline: () => fetchApi<FutureTimelineResponseDto>('/debt-payoff/timeline'),
  simulateDebtPayoff: (body: {
    debts?: DebtItem[];
    monthlyContribution: number;
    strategy?: DebtPayoffStrategy;
  }) =>
    fetchApi<DebtPayoffSimulationResult>('/debt-payoff/simulate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Statement Batch Import
  previewImportFile: async (file: File): Promise<BatchParseResultDto> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/statement-import/preview`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Falha ao processar arquivo');
    }
    return res.json();
  },
  aiClassifyTransactions: (transactions: Array<{ tempId: string; description: string; amount: number; type?: string }>) =>
    fetchApi<{
      classifications: Array<{ tempId: string; categoryId: string; categoryName: string; confidence: number }>;
      source: 'ollama' | 'heuristics';
      totalClassified: number;
    }>('/statement-import/ai-classify', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    }),
  confirmImport: (data: ConfirmImportDto) =>
    fetchApi<{ importedCount: number; message: string }>('/statement-import/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Authentication
  login: (data: LoginDto) =>
    fetchApi<AuthResponseDto>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: RegisterDto) =>
    fetchApi<AuthResponseDto>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),
  getMe: () => fetchApi<UserPayloadDto>('/auth/me'),
};
