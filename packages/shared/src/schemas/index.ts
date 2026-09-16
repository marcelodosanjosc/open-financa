import { z } from 'zod';
import {
  AccountType,
  TransactionType,
  InvoiceStatus,
  CostClassification,
  DebtPayoffStrategy,
  UserRole,
} from '../enums';

// -------------------------------------------------------------
// Account Schemas
// -------------------------------------------------------------
export const CreateAccountSchema = z.object({
  name: z.string().min(1, 'Nome da conta é obrigatório').max(100),
  type: z.nativeEnum(AccountType).optional().default(AccountType.CHECKING),
  initialBalance: z.number().optional().default(0),
  currency: z.string().length(3).optional().default('BRL'),
});
export type CreateAccountDto = z.input<typeof CreateAccountSchema>;

export const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.nativeEnum(AccountType).optional(),
  isActive: z.boolean().optional(),
  currency: z.string().length(3).optional(),
});
export type UpdateAccountDto = z.infer<typeof UpdateAccountSchema>;

export interface AccountResponseDto {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Category Schemas
// -------------------------------------------------------------
export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Nome da categoria é obrigatório').max(100),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().max(20).optional().nullable(),
  classification: z.nativeEnum(CostClassification).optional().default(CostClassification.VARIABLE),
  parentId: z.string().uuid().optional().nullable(),
});
export type CreateCategoryDto = z.input<typeof CreateCategorySchema>;

export const UpdateCategorySchema = CreateCategorySchema.partial();
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

export interface CategoryResponseDto {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  classification: CostClassification;
  parentId: string | null;
  parentName?: string | null;
  createdAt: string;
  subcategories?: CategoryResponseDto[];
}

// -------------------------------------------------------------
// Budget Schemas
// -------------------------------------------------------------
export const CreateBudgetSchema = z.object({
  categoryId: z.string().uuid('ID de categoria inválido'),
  monthlyLimit: z.number().positive('Limite orçamentário deve ser maior que zero'),
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2000).max(2100),
});
export type CreateBudgetDto = z.infer<typeof CreateBudgetSchema>;

export const UpdateBudgetSchema = z.object({
  monthlyLimit: z.number().positive('Limite orçamentário deve ser maior que zero'),
});
export type UpdateBudgetDto = z.infer<typeof UpdateBudgetSchema>;

export interface BudgetResponseDto {
  id: string;
  userId: string;
  categoryId: string;
  categoryName?: string;
  categoryClassification?: CostClassification;
  monthlyLimit: number;
  referenceMonth: number;
  referenceYear: number;
  spentAmount: number;
  consumedPercentage: number;
  remainingAmount: number;
  isExceeded: boolean;
  createdAt: string;
}

// -------------------------------------------------------------
// Transaction Schemas
// -------------------------------------------------------------
export const CreateTransactionSchema = z.object({
  accountId: z.string().uuid('ID da conta inválido'),
  categoryId: z.string().uuid().optional().nullable(),
  destinationAccountId: z.string().uuid().optional().nullable(),
  invoiceId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  amount: z.number().positive('Valor da transação deve ser positivo'),
  type: z.nativeEnum(TransactionType),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
  competenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data de competência no formato YYYY-MM-DD').optional(),
  isReconciled: z.boolean().optional().default(false),
  externalId: z.string().max(255).optional().nullable(),
});
export type CreateTransactionDto = z.input<typeof CreateTransactionSchema>;

export const UpdateTransactionSchema = CreateTransactionSchema.partial();
export type UpdateTransactionDto = z.infer<typeof UpdateTransactionSchema>;

export interface TransactionResponseDto {
  id: string;
  userId: string;
  accountId: string;
  accountName?: string;
  categoryId: string | null;
  categoryName?: string;
  categoryClassification?: CostClassification | null;
  destinationAccountId: string | null;
  destinationAccountName?: string | null;
  invoiceId: string | null;
  description: string;
  amount: number;
  type: TransactionType;
  date: string;
  competenceDate: string;
  isReconciled: boolean;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Credit Card Schemas
// -------------------------------------------------------------
export const CreateCreditCardSchema = z.object({
  name: z.string().min(1, 'Nome do cartão é obrigatório').max(100),
  lastFourDigits: z.string().length(4).optional().nullable(),
  creditLimit: z.number().positive('Limite deve ser maior que zero'),
  closingDay: z.number().int().min(1).max(31),
  dueDay: z.number().int().min(1).max(31),
  interestRate: z.number().min(0).max(100).optional().default(0.0),
  defaultAccountId: z.string().uuid().optional().nullable(),
});
export type CreateCreditCardDto = z.input<typeof CreateCreditCardSchema>;

export const UpdateCreditCardSchema = CreateCreditCardSchema.partial();
export type UpdateCreditCardDto = z.infer<typeof UpdateCreditCardSchema>;

export interface CreditCardResponseDto {
  id: string;
  userId: string;
  name: string;
  lastFourDigits: string | null;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  interestRate: number;
  defaultAccountId: string | null;
  defaultAccountName?: string | null;
  currentInvoiceAmount: number;
  availableLimit: number;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Installment / Card Expense Schemas
// -------------------------------------------------------------
export const CreateInstallmentPurchaseSchema = z.object({
  creditCardId: z.string().uuid('ID do cartão inválido'),
  categoryId: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Descrição é obrigatória').max(255),
  totalAmount: z.number().positive('Valor total deve ser positivo'),
  totalInstallments: z.number().int().min(1).max(120).optional().default(1),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD'),
});
export type CreateInstallmentPurchaseDto = z.input<typeof CreateInstallmentPurchaseSchema>;

export interface CreditCardExpenseResponseDto {
  id: string;
  invoiceId: string;
  categoryId: string | null;
  categoryName?: string;
  installmentGroupId: string | null;
  description: string;
  amount: number;
  transactionDate: string;
  installmentNumber: number;
  totalInstallments?: number;
  createdAt: string;
}

export interface InvoiceResponseDto {
  id: string;
  creditCardId: string;
  creditCardName?: string;
  referenceYear: number;
  referenceMonth: number;
  closingDate: string;
  dueDate: string;
  status: InvoiceStatus;
  totalAmount: number;
  expenses?: CreditCardExpenseResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export const PayInvoiceSchema = z.object({
  accountId: z.string().uuid('ID da conta para débito inválido'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data no formato YYYY-MM-DD').optional(),
  amount: z.number().positive().optional(),
});
export type PayInvoiceDto = z.infer<typeof PayInvoiceSchema>;

// -------------------------------------------------------------
// Statement & Batch Parser Schemas
// -------------------------------------------------------------
export interface ParsedTransactionPreviewDto {
  tempId: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  fitid?: string | null;
  hash: string;
  isDuplicate: boolean;
  suggestedCategoryId?: string | null;
  isAiSuggested?: boolean;
  confidence?: number;
  installmentNumber?: number;
  totalInstallments?: number;
}

export interface BatchParseResultDto {
  fileName: string;
  format: 'OFX' | 'CSV' | 'PDF';
  totalFound: number;
  newCount: number;
  duplicateCount: number;
  transactions: ParsedTransactionPreviewDto[];
}

export const ConfirmImportSchema = z.object({
  accountId: z.string().uuid().optional().nullable(),
  creditCardId: z.string().uuid().optional().nullable(),
  transactions: z.array(
    z.object({
      date: z.string(),
      description: z.string(),
      amount: z.number(),
      type: z.nativeEnum(TransactionType),
      categoryId: z.string().uuid().optional().nullable(),
      externalId: z.string().optional().nullable(),
      installmentNumber: z.number().optional(),
      totalInstallments: z.number().optional(),
    }),
  ),
});
export type ConfirmImportDto = z.infer<typeof ConfirmImportSchema>;

export const AiClassifyInputSchema = z.object({
  transactions: z.array(
    z.object({
      tempId: z.string(),
      description: z.string(),
      amount: z.number(),
      type: z.string().optional(),
    }),
  ),
});
export type AiClassifyInputDto = z.infer<typeof AiClassifyInputSchema>;

export interface AiClassificationItemDto {
  tempId: string;
  categoryId: string;
  categoryName: string;
  confidence: number;
}

export interface AiClassifyResultDto {
  classifications: AiClassificationItemDto[];
  source: 'ollama' | 'heuristics';
  totalClassified: number;
}

// -------------------------------------------------------------
// Dashboard & Debt Simulator Schemas
// -------------------------------------------------------------
export interface DashboardSummaryDto {
  totalBalance: number;
  monthIncome: number;
  monthExpense: number;
  monthInvoicesOpen: number;
  projectedNetCashflow: number;
  costBreakdown: {
    fixed: number;
    variable: number;
    essential: number;
    discretionary: number;
  };
  monthlyBudgetsSummary: {
    totalBudgeted: number;
    totalSpent: number;
    overallConsumedPercentage: number;
  };
}

export interface FutureInvoiceMonthSummaryDto {
  year: number;
  month: number;
  period: string; // YYYY-MM
  totalCommitted: number;
  invoiceCount: number;
  isProjected: boolean;
}

export interface FutureTimelineResponseDto {
  finalPayoffMonth: string; // YYYY-MM
  totalFutureCommitted: number;
  months: FutureInvoiceMonthSummaryDto[];
}

// -------------------------------------------------------------
// Auth Schemas & DTOs
// -------------------------------------------------------------
export const RegisterSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  fullName: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres').max(150),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export interface UserPayloadDto {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthResponseDto {
  user: UserPayloadDto;
  message?: string;
}
