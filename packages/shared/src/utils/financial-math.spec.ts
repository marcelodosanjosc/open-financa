import { FinancialMathUtils, DebtPayoffStrategy } from '../index';

describe('FinancialMathUtils', () => {
  describe('splitAmount', () => {
    it('should split 100 into 3 installments with remainder on first installment', () => {
      const result = FinancialMathUtils.splitAmount(100, 3);
      expect(result).toEqual([33.34, 33.33, 33.33]);
      const sum = Number(result.reduce((a, b) => a + b, 0).toFixed(2));
      expect(sum).toBe(100);
    });

    it('should split 100 into 1 installment', () => {
      const result = FinancialMathUtils.splitAmount(100, 1);
      expect(result).toEqual([100]);
    });

    it('should split 250.55 into 4 installments', () => {
      const result = FinancialMathUtils.splitAmount(250.55, 4);
      // 25055 / 4 = 6263 cents base, remainder 3 cents
      // [62.66, 62.63, 62.63, 62.63]
      expect(result).toEqual([62.66, 62.63, 62.63, 62.63]);
      const sum = Number(result.reduce((a, b) => a + b, 0).toFixed(2));
      expect(sum).toBe(250.55);
    });

    it('should throw error for 0 or negative installments', () => {
      expect(() => FinancialMathUtils.splitAmount(100, 0)).toThrow();
      expect(() => FinancialMathUtils.splitAmount(100, -2)).toThrow();
    });
  });

  describe('calculateInvoicePeriod', () => {
    it('should assign transaction on day <= closingDay to the current month invoice', () => {
      // Date: 2026-08-10, closing: 25, due: 5 (next month)
      const period = FinancialMathUtils.calculateInvoicePeriod('2026-08-10', 25, 5);
      expect(period.referenceYear).toBe(2026);
      expect(period.referenceMonth).toBe(8);
      expect(period.closingDate.toISOString().slice(0, 10)).toBe('2026-08-25');
      expect(period.dueDate.toISOString().slice(0, 10)).toBe('2026-09-05');
    });

    it('should assign transaction on day > closingDay to the next month invoice', () => {
      // Date: 2026-08-26, closing: 25, due: 5 (next month)
      const period = FinancialMathUtils.calculateInvoicePeriod('2026-08-26', 25, 5);
      expect(period.referenceYear).toBe(2026);
      expect(period.referenceMonth).toBe(9);
      expect(period.closingDate.toISOString().slice(0, 10)).toBe('2026-09-25');
      expect(period.dueDate.toISOString().slice(0, 10)).toBe('2026-10-05');
    });

    it('should handle year boundary correctly when day > closingDay in December', () => {
      // Date: 2026-12-28, closing: 25, due: 5
      const period = FinancialMathUtils.calculateInvoicePeriod('2026-12-28', 25, 5);
      expect(period.referenceYear).toBe(2027);
      expect(period.referenceMonth).toBe(1);
      expect(period.closingDate.toISOString().slice(0, 10)).toBe('2027-01-25');
      expect(period.dueDate.toISOString().slice(0, 10)).toBe('2027-02-05');
    });
  });

  describe('calculateConsecutiveInvoicePeriods', () => {
    it('should calculate 3 consecutive invoice periods correctly', () => {
      const periods = FinancialMathUtils.calculateConsecutiveInvoicePeriods('2026-08-10', 3, 25, 5);
      expect(periods).toHaveLength(3);
      expect(periods[0].referenceMonth).toBe(8);
      expect(periods[0].referenceYear).toBe(2026);
      expect(periods[1].referenceMonth).toBe(9);
      expect(periods[1].referenceYear).toBe(2026);
      expect(periods[2].referenceMonth).toBe(10);
      expect(periods[2].referenceYear).toBe(2026);
    });
  });

  describe('simulateDebtPayoff', () => {
    it('should simulate debt freedom correctly with extra monthly contribution', () => {
      const result = FinancialMathUtils.simulateDebtPayoff({
        debts: [
          {
            id: 'card-1',
            name: 'Cartão Nubank',
            currentBalance: 3000,
            interestRateMonthly: 2.0,
            minimumPayment: 150,
          },
          {
            id: 'card-2',
            name: 'Cartão Itaú',
            currentBalance: 2000,
            interestRateMonthly: 3.5,
            minimumPayment: 100,
          },
        ],
        monthlyContribution: 800,
        strategy: DebtPayoffStrategy.AVALANCHE,
      });

      expect(result.monthsToDebtFree).toBeGreaterThan(0);
      expect(result.monthsToDebtFree).toBeLessThan(20);
      expect(result.totalPaid).toBeGreaterThan(5000);
      expect(result.timeline.length).toBe(result.monthsToDebtFree);
      expect(result.timeline[result.timeline.length - 1].totalRemainingBalance).toBe(0);
    });
  });
});
