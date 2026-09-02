import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FinancialMathUtils,
  DebtPayoffStrategy,
  DebtItem,
  InvoiceStatus,
  FutureTimelineResponseDto,
  FutureInvoiceMonthSummaryDto,
} from '@repo/shared';

@Injectable()
export class DebtPayoffService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates linear timeline of committed future installments across all credit cards.
   */
  async getFutureTimeline(userId: string): Promise<FutureTimelineResponseDto> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Fetch all invoices from current month onwards that are not PAID
    const invoices = await this.prisma.invoice.findMany({
      where: {
        creditCard: { userId },
        status: { in: [InvoiceStatus.OPEN, InvoiceStatus.CLOSED, InvoiceStatus.OVERDUE] },
        OR: [
          { referenceYear: { gt: currentYear } },
          {
            referenceYear: currentYear,
            referenceMonth: { gte: currentMonth },
          },
        ],
      },
      include: { creditCard: true },
      orderBy: [{ referenceYear: 'asc' }, { referenceMonth: 'asc' }],
    });

    const monthMap = new Map<string, { year: number; month: number; total: number; count: number }>();

    for (const inv of invoices) {
      const periodKey = `${inv.referenceYear}-${String(inv.referenceMonth).padStart(2, '0')}`;
      const existing = monthMap.get(periodKey) || {
        year: inv.referenceYear,
        month: inv.referenceMonth,
        total: 0,
        count: 0,
      };

      existing.total += Number(inv.totalAmount);
      existing.count += 1;
      monthMap.set(periodKey, existing);
    }

    const sortedPeriods = Array.from(monthMap.keys()).sort();
    const months: FutureInvoiceMonthSummaryDto[] = sortedPeriods.map((periodKey) => {
      const data = monthMap.get(periodKey)!;
      return {
        year: data.year,
        month: data.month,
        period: periodKey,
        totalCommitted: Number(data.total.toFixed(2)),
        invoiceCount: data.count,
        isProjected: false,
      };
    });

    const totalFutureCommitted = months.reduce((acc, curr) => acc + curr.totalCommitted, 0);
    const finalPayoffMonth =
      months.length > 0 ? months[months.length - 1].period : `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    return {
      finalPayoffMonth,
      totalFutureCommitted: Number(totalFutureCommitted.toFixed(2)),
      months,
    };
  }

  /**
   * Simulates debt payoff using Snowball, Avalanche, or Fixed Monthly Contribution.
   * Auto-populates debts from active credit cards with open balance if no debts provided.
   */
  async simulate(
    userId: string,
    params: {
      debts?: DebtItem[];
      monthlyContribution: number;
      strategy?: DebtPayoffStrategy;
    },
  ) {
    let debtItems = params.debts;

    if (!debtItems || debtItems.length === 0) {
      // Auto-populate from user's credit cards
      const cards = await this.prisma.creditCard.findMany({
        where: { userId },
        include: {
          invoices: {
            where: {
              status: { in: [InvoiceStatus.OPEN, InvoiceStatus.CLOSED, InvoiceStatus.OVERDUE] },
            },
          },
        },
      });

      debtItems = cards
        .map((card) => {
          const totalBalance = card.invoices.reduce(
            (acc, inv) => acc + Number(inv.totalAmount),
            0,
          );
          const monthlyRate = Number(card.interestRate || 2.5);
          const minPay = Math.max(50, Number((totalBalance * 0.15).toFixed(2))); // 15% minimum standard

          return {
            id: card.id,
            name: card.name,
            currentBalance: Number(totalBalance.toFixed(2)),
            interestRateMonthly: monthlyRate,
            minimumPayment: minPay,
          };
        })
        .filter((d) => d.currentBalance > 0);
    }

    const strategy = params.strategy || DebtPayoffStrategy.AVALANCHE;
    const monthlyContribution = params.monthlyContribution || 500;

    return FinancialMathUtils.simulateDebtPayoff({
      debts: debtItems,
      monthlyContribution,
      strategy,
    });
  }
}
