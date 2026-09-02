import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoiceStatus, FinancialMathUtils } from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvoiceCronService {
  private readonly logger = new Logger(InvoiceCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyInvoiceClosing() {
    this.logger.log('Executing daily invoice closing verification...');
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // 1. Find OPEN invoices where closingDate <= today
    const invoicesToClose = await this.prisma.invoice.findMany({
      where: {
        status: InvoiceStatus.OPEN,
        closingDate: { lte: today },
      },
      include: { creditCard: true },
    });

    for (const inv of invoicesToClose) {
      await this.prisma.invoice.update({
        where: { id: inv.id },
        data: { status: InvoiceStatus.CLOSED },
      });
      this.logger.log(`Invoice ${inv.id} for card ${inv.creditCard.name} is now CLOSED`);

      // Ensure next cycle's invoice exists
      const nextDate = new Date(Date.UTC(inv.referenceYear, inv.referenceMonth, 1)); // Next month
      const period = FinancialMathUtils.calculateInvoicePeriod(
        nextDate,
        inv.creditCard.closingDay,
        inv.creditCard.dueDay,
      );

      const existingNext = await this.prisma.invoice.findUnique({
        where: {
          uq_card_invoice_period: {
            creditCardId: inv.creditCardId,
            referenceYear: period.referenceYear,
            referenceMonth: period.referenceMonth,
          },
        },
      });

      if (!existingNext) {
        await this.prisma.invoice.create({
          data: {
            creditCardId: inv.creditCardId,
            referenceYear: period.referenceYear,
            referenceMonth: period.referenceMonth,
            closingDate: period.closingDate,
            dueDate: period.dueDate,
            status: InvoiceStatus.OPEN,
            totalAmount: new Prisma.Decimal(0),
          },
        });
        this.logger.log(`Opened new cycle invoice for card ${inv.creditCard.name} (${period.referenceMonth}/${period.referenceYear})`);
      }
    }
  }

  async runManualClosing() {
    return this.handleDailyInvoiceClosing();
  }
}
