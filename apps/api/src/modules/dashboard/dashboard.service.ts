import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardSummaryDto, CostClassification, InvoiceStatus } from '@repo/shared';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string, year?: number, month?: number): Promise<DashboardSummaryDto> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;

    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59));

    // 1. Total Net Balance across active accounts
    const accounts = await this.prisma.account.findMany({
      where: { userId, isActive: true },
    });
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.currentBalance), 0);

    // 2. Month Income
    const incomeAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'INCOME',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    const monthIncome = Number(incomeAgg._sum.amount || 0);

    // 3. Month Direct Expense
    const expenseAgg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    const monthExpense = Number(expenseAgg._sum.amount || 0);

    // 4. Open Invoices for the month
    const openInvoices = await this.prisma.invoice.findMany({
      where: {
        creditCard: { userId },
        referenceYear: targetYear,
        referenceMonth: targetMonth,
        status: { in: [InvoiceStatus.OPEN, InvoiceStatus.CLOSED] },
      },
    });
    const monthInvoicesOpen = openInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount),
      0,
    );

    // Projected Net Cashflow for the month = Income - Expenses - Open Invoices
    const projectedNetCashflow = Number((monthIncome - monthExpense - monthInvoicesOpen).toFixed(2));

    // 5. Cost Classification Breakdown (combining regular expenses and card expenses)
    const txExpensesWithCat = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
      include: { category: true },
    });

    const cardExpensesWithCat = await this.prisma.creditCardExpense.findMany({
      where: {
        invoice: {
          creditCard: { userId },
          referenceYear: targetYear,
          referenceMonth: targetMonth,
        },
      },
      include: { category: true },
    });

    let fixed = 0;
    let variable = 0;
    let essential = 0;
    let discretionary = 0;

    const processItem = (amount: number, classification?: string | null) => {
      const cls = classification || 'VARIABLE';
      if (cls === 'FIXED') {
        fixed += amount;
        essential += amount;
      } else if (cls === 'VARIABLE') {
        variable += amount;
        essential += amount;
      } else if (cls === 'ESSENTIAL') {
        essential += amount;
        variable += amount;
      } else if (cls === 'DISCRETIONARY') {
        discretionary += amount;
        variable += amount;
      }
    };

    for (const tx of txExpensesWithCat) {
      processItem(Number(tx.amount), tx.category?.classification);
    }
    for (const cx of cardExpensesWithCat) {
      processItem(Number(cx.amount), cx.category?.classification);
    }

    // 6. Monthly Budgets Summary
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        referenceYear: targetYear,
        referenceMonth: targetMonth,
      },
    });

    const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.monthlyLimit), 0);
    const totalSpent = monthExpense + monthInvoicesOpen;
    const overallConsumedPercentage =
      totalBudgeted > 0 ? Number(((totalSpent / totalBudgeted) * 100).toFixed(1)) : 0;

    return {
      totalBalance: Number(totalBalance.toFixed(2)),
      monthIncome: Number(monthIncome.toFixed(2)),
      monthExpense: Number(monthExpense.toFixed(2)),
      monthInvoicesOpen: Number(monthInvoicesOpen.toFixed(2)),
      projectedNetCashflow,
      costBreakdown: {
        fixed: Number(fixed.toFixed(2)),
        variable: Number(variable.toFixed(2)),
        essential: Number(essential.toFixed(2)),
        discretionary: Number(discretionary.toFixed(2)),
      },
      monthlyBudgetsSummary: {
        totalBudgeted: Number(totalBudgeted.toFixed(2)),
        totalSpent: Number(totalSpent.toFixed(2)),
        overallConsumedPercentage,
      },
    };
  }

  async getRecentTransactions(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      include: { account: true, category: true },
      orderBy: { date: 'desc' },
      take: 6,
    });

    return transactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      date: t.date.toISOString().slice(0, 10),
      accountName: t.account?.name,
      categoryName: t.category?.name,
      categoryClassification: t.category?.classification,
    }));
  }
}
