import { DebtPayoffStrategy } from '../enums';

export interface InvoicePeriodResult {
  referenceYear: number;
  referenceMonth: number; // 1-12
  closingDate: Date;
  dueDate: Date;
}

export interface DebtItem {
  id: string;
  name: string;
  currentBalance: number;
  interestRateMonthly: number; // Percentage e.g. 2.5 for 2.5%
  minimumPayment: number;
}

export interface DebtPayoffSimulationInput {
  debts: DebtItem[];
  monthlyContribution: number;
  strategy: DebtPayoffStrategy;
  maxMonths?: number;
}

export interface DebtMonthSnapshot {
  monthIndex: number;
  date: string; // YYYY-MM
  totalRemainingBalance: number;
  totalInterestPaidMonth: number;
  totalPrincipalPaidMonth: number;
  debtBalances: Record<string, number>;
}

export interface DebtPayoffSimulationResult {
  strategy: DebtPayoffStrategy;
  monthlyContribution: number;
  monthsToDebtFree: number;
  debtFreeDate: string; // YYYY-MM
  totalInterestPaid: number;
  totalPaid: number;
  interestSavedComparedToMinimum: number;
  timeline: DebtMonthSnapshot[];
}

export class FinancialMathUtils {
  /**
   * Splits a monetary amount into exact installments.
   * Any cent remainder from division is allocated entirely to the 1st installment.
   * Example: 100.00 in 3 installments => [33.34, 33.33, 33.33]
   */
  public static splitAmount(totalAmount: number, totalInstallments: number): number[] {
    if (totalInstallments <= 0) {
      throw new Error('Total installments must be greater than 0');
    }
    if (totalInstallments === 1) {
      return [Number(totalAmount.toFixed(2))];
    }

    const totalCents = Math.round(Number(totalAmount.toFixed(2)) * 100);
    const baseCents = Math.floor(totalCents / totalInstallments);
    const remainderCents = totalCents % totalInstallments;

    const installments: number[] = [];
    for (let i = 0; i < totalInstallments; i++) {
      const cents = i === 0 ? baseCents + remainderCents : baseCents;
      installments.push(cents / 100);
    }

    return installments;
  }

  /**
   * Calculates the invoice reference period, closing date, and due date for a transaction date.
   * If the transaction occurs AFTER the closingDay of the current month, it moves to the subsequent month's invoice.
   */
  public static calculateInvoicePeriod(
    transactionDateInput: Date | string,
    closingDay: number,
    dueDay: number,
  ): InvoicePeriodResult {
    const txDate = new Date(transactionDateInput);
    const txYear = txDate.getUTCFullYear();
    const txMonth = txDate.getUTCMonth(); // 0-indexed (0 = Jan)
    const txDay = txDate.getUTCDate();

    let targetYear = txYear;
    let targetMonth = txMonth; // 0-indexed

    // If purchase day > closing day, it belongs to the next month's invoice cycle
    if (txDay > closingDay) {
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }

    // Days in targetMonth
    const daysInClosingMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const effectiveClosingDay = Math.min(closingDay, daysInClosingMonth);
    const closingDate = new Date(Date.UTC(targetYear, targetMonth, effectiveClosingDay));

    // Calculate due date
    let dueYear = targetYear;
    let dueMonth = targetMonth;
    if (dueDay <= closingDay) {
      // Due date is in the month following the closing date
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }

    const daysInDueMonth = new Date(Date.UTC(dueYear, dueMonth + 1, 0)).getUTCDate();
    const effectiveDueDay = Math.min(dueDay, daysInDueMonth);
    const dueDate = new Date(Date.UTC(dueYear, dueMonth, effectiveDueDay));

    return {
      referenceYear: targetYear,
      referenceMonth: targetMonth + 1, // 1-indexed (1-12)
      closingDate,
      dueDate,
    };
  }

  /**
   * Generates consecutive invoice periods for multi-installment purchases.
   */
  public static calculateConsecutiveInvoicePeriods(
    startDateInput: Date | string,
    installmentCount: number,
    closingDay: number,
    dueDay: number,
  ): InvoicePeriodResult[] {
    const firstPeriod = this.calculateInvoicePeriod(startDateInput, closingDay, dueDay);
    const periods: InvoicePeriodResult[] = [firstPeriod];

    let currentYear = firstPeriod.referenceYear;
    let currentMonth = firstPeriod.referenceMonth - 1; // 0-indexed

    for (let i = 1; i < installmentCount; i++) {
      currentMonth += 1;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear += 1;
      }

      const daysInClosingMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0)).getUTCDate();
      const effectiveClosingDay = Math.min(closingDay, daysInClosingMonth);
      const closingDate = new Date(Date.UTC(currentYear, currentMonth, effectiveClosingDay));

      let dueYear = currentYear;
      let dueMonth = currentMonth;
      if (dueDay <= closingDay) {
        dueMonth += 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear += 1;
        }
      }

      const daysInDueMonth = new Date(Date.UTC(dueYear, dueMonth + 1, 0)).getUTCDate();
      const effectiveDueDay = Math.min(dueDay, daysInDueMonth);
      const dueDate = new Date(Date.UTC(dueYear, dueMonth, effectiveDueDay));

      periods.push({
        referenceYear: currentYear,
        referenceMonth: currentMonth + 1,
        closingDate,
        dueDate,
      });
    }

    return periods;
  }

  /**
   * Simulates debt payoff using Snowball, Avalanche, or Fixed Monthly Contribution strategies.
   */
  public static simulateDebtPayoff(input: DebtPayoffSimulationInput): DebtPayoffSimulationResult {
    const { debts, monthlyContribution, strategy, maxMonths = 360 } = input;

    if (debts.length === 0) {
      const now = new Date();
      const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return {
        strategy,
        monthlyContribution,
        monthsToDebtFree: 0,
        debtFreeDate: currentPeriod,
        totalInterestPaid: 0,
        totalPaid: 0,
        interestSavedComparedToMinimum: 0,
        timeline: [],
      };
    }

    // Baseline minimum simulation for comparison
    const minSimResult = this.runSimulationLoop(debts, 0, DebtPayoffStrategy.FIXED_CONTRIBUTION, maxMonths, true);

    // Actual strategy simulation
    const stratResult = this.runSimulationLoop(debts, monthlyContribution, strategy, maxMonths, false);

    const interestSaved = Math.max(0, Number((minSimResult.totalInterestPaid - stratResult.totalInterestPaid).toFixed(2)));

    return {
      strategy,
      monthlyContribution,
      monthsToDebtFree: stratResult.months,
      debtFreeDate: stratResult.debtFreeDate,
      totalInterestPaid: stratResult.totalInterestPaid,
      totalPaid: stratResult.totalPaid,
      interestSavedComparedToMinimum: interestSaved,
      timeline: stratResult.timeline,
    };
  }

  private static runSimulationLoop(
    initialDebts: DebtItem[],
    extraMonthlyContribution: number,
    strategy: DebtPayoffStrategy,
    maxMonths: number,
    onlyMinimum: boolean,
  ) {
    let currentDebts = initialDebts.map((d) => ({
      ...d,
      balance: d.currentBalance,
    }));

    const timeline: DebtMonthSnapshot[] = [];
    let totalInterestPaid = 0;
    let totalPrincipalPaid = 0;
    let month = 0;

    const startDate = new Date();

    while (month < maxMonths) {
      const activeDebts = currentDebts.filter((d) => d.balance > 0.01);
      if (activeDebts.length === 0) {
        break;
      }

      month++;
      const snapshotDate = new Date(startDate.getFullYear(), startDate.getMonth() + month - 1, 1);
      const dateStr = `${snapshotDate.getFullYear()}-${String(snapshotDate.getMonth() + 1).padStart(2, '0')}`;

      let monthInterest = 0;
      let monthPrincipal = 0;

      // 1. Accrue monthly interest
      for (const d of activeDebts) {
        const monthlyRate = d.interestRateMonthly / 100;
        const interest = Number((d.balance * monthlyRate).toFixed(2));
        d.balance += interest;
        monthInterest += interest;
      }

      // 2. Pay minimum payments
      let availableExtra = onlyMinimum ? 0 : extraMonthlyContribution;

      for (const d of activeDebts) {
        const minDue = Math.min(d.balance, d.minimumPayment);
        d.balance = Math.max(0, Number((d.balance - minDue).toFixed(2)));
        monthPrincipal += minDue;
      }

      // 3. Sort active debts for priority extra payment allocation
      if (!onlyMinimum && availableExtra > 0) {
        const priorityDebts = currentDebts.filter((d) => d.balance > 0.01);
        if (strategy === DebtPayoffStrategy.SNOWBALL) {
          priorityDebts.sort((a, b) => a.balance - b.balance);
        } else if (strategy === DebtPayoffStrategy.AVALANCHE) {
          priorityDebts.sort((a, b) => b.interestRateMonthly - a.interestRateMonthly);
        }

        for (const d of priorityDebts) {
          if (availableExtra <= 0) break;
          const pay = Math.min(d.balance, availableExtra);
          d.balance = Math.max(0, Number((d.balance - pay).toFixed(2)));
          availableExtra -= pay;
          monthPrincipal += pay;
        }
      }

      totalInterestPaid += monthInterest;
      totalPrincipalPaid += monthPrincipal;

      const debtBalancesMap: Record<string, number> = {};
      let totalRemaining = 0;
      for (const d of currentDebts) {
        debtBalancesMap[d.id] = Number(d.balance.toFixed(2));
        totalRemaining += d.balance;
      }

      timeline.push({
        monthIndex: month,
        date: dateStr,
        totalRemainingBalance: Number(totalRemaining.toFixed(2)),
        totalInterestPaidMonth: Number(monthInterest.toFixed(2)),
        totalPrincipalPaidMonth: Number(monthPrincipal.toFixed(2)),
        debtBalances: debtBalancesMap,
      });
    }

    const finalDate = new Date(startDate.getFullYear(), startDate.getMonth() + month, 1);
    const debtFreeDateStr = `${finalDate.getFullYear()}-${String(finalDate.getMonth() + 1).padStart(2, '0')}`;

    return {
      months: month,
      debtFreeDate: debtFreeDateStr,
      totalInterestPaid: Number(totalInterestPaid.toFixed(2)),
      totalPaid: Number((totalPrincipalPaid + totalInterestPaid).toFixed(2)),
      timeline,
    };
  }
}
