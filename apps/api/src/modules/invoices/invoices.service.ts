import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import {
  CreateInstallmentPurchaseDto,
  PayInvoiceDto,
  InvoiceStatus,
  TransactionType,
  FinancialMathUtils,
} from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async findByCard(userId: string, creditCardId: string) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
    });
    if (!card) {
      throw new NotFoundException(`Cartão não encontrado`);
    }

    const invoices = await this.prisma.invoice.findMany({
      where: { creditCardId },
      include: {
        expenses: {
          include: { category: true, installmentGroup: true },
          orderBy: { transactionDate: 'asc' },
        },
      },
      orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
    });

    return invoices.map((inv) => ({
      id: inv.id,
      creditCardId: inv.creditCardId,
      creditCardName: card.name,
      referenceYear: inv.referenceYear,
      referenceMonth: inv.referenceMonth,
      closingDate: inv.closingDate.toISOString().slice(0, 10),
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      status: inv.status,
      totalAmount: Number(inv.totalAmount),
      expenses: inv.expenses.map((exp) => ({
        id: exp.id,
        invoiceId: exp.invoiceId,
        categoryId: exp.categoryId,
        categoryName: exp.category?.name || null,
        installmentGroupId: exp.installmentGroupId,
        description: exp.description,
        amount: Number(exp.amount),
        transactionDate: exp.transactionDate.toISOString().slice(0, 10),
        installmentNumber: exp.installmentNumber,
        totalInstallments: exp.installmentGroup?.totalInstallments || 1,
        createdAt: exp.createdAt.toISOString(),
      })),
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    }));
  }

  async findById(userId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, creditCard: { userId } },
      include: {
        creditCard: true,
        expenses: {
          include: { category: true, installmentGroup: true },
          orderBy: { transactionDate: 'asc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura com ID ${id} não encontrada`);
    }

    return {
      id: invoice.id,
      creditCardId: invoice.creditCardId,
      creditCardName: invoice.creditCard.name,
      referenceYear: invoice.referenceYear,
      referenceMonth: invoice.referenceMonth,
      closingDate: invoice.closingDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      status: invoice.status,
      totalAmount: Number(invoice.totalAmount),
      expenses: invoice.expenses.map((exp) => ({
        id: exp.id,
        invoiceId: exp.invoiceId,
        categoryId: exp.categoryId,
        categoryName: exp.category?.name || null,
        installmentGroupId: exp.installmentGroupId,
        description: exp.description,
        amount: Number(exp.amount),
        transactionDate: exp.transactionDate.toISOString().slice(0, 10),
        installmentNumber: exp.installmentNumber,
        totalInstallments: exp.installmentGroup?.totalInstallments || 1,
        createdAt: exp.createdAt.toISOString(),
      })),
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  async getOrCreateInvoice(
    creditCardId: string,
    year: number,
    month: number,
    closingDate: Date,
    dueDate: Date,
  ) {
    let invoice = await this.prisma.invoice.findUnique({
      where: {
        uq_card_invoice_period: {
          creditCardId,
          referenceYear: year,
          referenceMonth: month,
        },
      },
    });

    if (!invoice) {
      invoice = await this.prisma.invoice.create({
        data: {
          creditCardId,
          referenceYear: year,
          referenceMonth: month,
          closingDate,
          dueDate,
          status: InvoiceStatus.OPEN,
          totalAmount: new Prisma.Decimal(0),
        },
      });
    }

    return invoice;
  }

  async createInstallmentPurchase(userId: string, data: CreateInstallmentPurchaseDto) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id: data.creditCardId, userId },
    });

    if (!card) {
      throw new NotFoundException(`Cartão de crédito não encontrado`);
    }

    const totalInstallments = data.totalInstallments || 1;
    const amounts = FinancialMathUtils.splitAmount(data.totalAmount, totalInstallments);
    const periods = FinancialMathUtils.calculateConsecutiveInvoicePeriods(
      data.purchaseDate,
      totalInstallments,
      card.closingDay,
      card.dueDay,
    );

    const purchaseDate = new Date(data.purchaseDate);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create InstallmentGroup
      const installmentGroup = await tx.installmentGroup.create({
        data: {
          userId,
          description: data.description,
          totalAmount: new Prisma.Decimal(data.totalAmount),
          totalInstallments,
          purchaseDate,
        },
      });

      // 2. Create expenses in corresponding invoices
      for (let i = 0; i < totalInstallments; i++) {
        const period = periods[i];
        const installmentAmount = amounts[i];
        const installmentNum = i + 1;

        let invoice = await tx.invoice.findUnique({
          where: {
            uq_card_invoice_period: {
              creditCardId: card.id,
              referenceYear: period.referenceYear,
              referenceMonth: period.referenceMonth,
            },
          },
        });

        if (!invoice) {
          invoice = await tx.invoice.create({
            data: {
              creditCardId: card.id,
              referenceYear: period.referenceYear,
              referenceMonth: period.referenceMonth,
              closingDate: period.closingDate,
              dueDate: period.dueDate,
              status: InvoiceStatus.OPEN,
              totalAmount: new Prisma.Decimal(0),
            },
          });
        }

        const formattedDesc =
          totalInstallments > 1
            ? `${data.description} (${installmentNum}/${totalInstallments})`
            : data.description;

        await tx.creditCardExpense.create({
          data: {
            invoiceId: invoice.id,
            categoryId: data.categoryId,
            installmentGroupId: installmentGroup.id,
            description: formattedDesc,
            amount: new Prisma.Decimal(installmentAmount),
            transactionDate: purchaseDate,
            installmentNumber: installmentNum,
          },
        });

        // Increment invoice totalAmount
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            totalAmount: { increment: new Prisma.Decimal(installmentAmount) },
          },
        });
      }

      return installmentGroup;
    });

    return {
      id: result.id,
      description: result.description,
      totalAmount: Number(result.totalAmount),
      totalInstallments: result.totalInstallments,
      purchaseDate: result.purchaseDate.toISOString().slice(0, 10),
      installmentsCreated: totalInstallments,
    };
  }

  async payInvoice(userId: string, invoiceId: string, data: PayInvoiceDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, creditCard: { userId } },
      include: { creditCard: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura não encontrada`);
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Esta fatura já foi paga');
    }

    const account = await this.accountsService.findById(userId, data.accountId);
    const payAmount = data.amount ? new Prisma.Decimal(data.amount) : invoice.totalAmount;
    const payDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

    const paymentTx = await this.prisma.$transaction(async (tx) => {
      // 1. Create Transaction INVOICE_PAYMENT
      const transaction = await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          invoiceId: invoice.id,
          description: `Pagamento Fatura ${invoice.creditCard.name} (${invoice.referenceMonth}/${invoice.referenceYear})`,
          amount: payAmount,
          type: TransactionType.INVOICE_PAYMENT,
          date: payDate,
          competenceDate: payDate,
          isReconciled: true,
        },
      });

      // 2. Mark invoice as PAID
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID },
      });

      // 3. Decrement account balance
      await tx.account.update({
        where: { id: account.id },
        data: { currentBalance: { decrement: payAmount } },
      });

      return transaction;
    });

    return {
      success: true,
      invoiceId: invoice.id,
      status: InvoiceStatus.PAID,
      transactionId: paymentTx.id,
      amountPaid: Number(payAmount),
    };
  }
}
