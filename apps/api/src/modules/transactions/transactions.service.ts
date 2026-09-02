import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionType } from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async findAll(
    userId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      accountId?: string;
      categoryId?: string;
      type?: TransactionType;
      isReconciled?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    const andConditions: Prisma.TransactionWhereInput[] = [{ userId }];

    if (filters?.startDate && filters?.endDate) {
      andConditions.push({
        date: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      });
    } else if (filters?.startDate) {
      andConditions.push({ date: { gte: new Date(filters.startDate) } });
    } else if (filters?.endDate) {
      andConditions.push({ date: { lte: new Date(filters.endDate) } });
    }

    if (filters?.accountId) {
      andConditions.push({
        OR: [
          { accountId: filters.accountId },
          { destinationAccountId: filters.accountId },
        ],
      });
    }

    if (filters?.categoryId) {
      andConditions.push({
        OR: [
          { categoryId: filters.categoryId },
          { category: { parentId: filters.categoryId } },
        ],
      });
    }

    if (filters?.type) {
      andConditions.push({ type: filters.type });
    }

    if (filters?.isReconciled !== undefined) {
      andConditions.push({ isReconciled: filters.isReconciled });
    }

    const whereClause: Prisma.TransactionWhereInput = {
      AND: andConditions,
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: whereClause,
        include: {
          account: true,
          destinationAccount: true,
          category: true,
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: filters?.limit ? Number(filters.limit) : 50,
        skip: filters?.offset ? Number(filters.offset) : 0,
      }),
      this.prisma.transaction.count({ where: whereClause }),
    ]);

    return {
      total,
      data: transactions.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        accountId: tx.accountId,
        accountName: tx.account?.name,
        categoryId: tx.categoryId,
        categoryName: tx.category?.name,
        categoryClassification: tx.category?.classification,
        destinationAccountId: tx.destinationAccountId,
        destinationAccountName: tx.destinationAccount?.name,
        invoiceId: tx.invoiceId,
        description: tx.description,
        amount: Number(tx.amount),
        type: tx.type,
        date: tx.date.toISOString().slice(0, 10),
        competenceDate: tx.competenceDate.toISOString().slice(0, 10),
        isReconciled: tx.isReconciled,
        externalId: tx.externalId,
        createdAt: tx.createdAt.toISOString(),
        updatedAt: tx.updatedAt.toISOString(),
      })),
    };
  }

  async findById(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        account: true,
        destinationAccount: true,
        category: true,
      },
    });

    if (!tx) {
      throw new NotFoundException(`Transação com ID ${id} não encontrada`);
    }

    return {
      id: tx.id,
      userId: tx.userId,
      accountId: tx.accountId,
      accountName: tx.account?.name,
      categoryId: tx.categoryId,
      categoryName: tx.category?.name,
      categoryClassification: tx.category?.classification,
      destinationAccountId: tx.destinationAccountId,
      destinationAccountName: tx.destinationAccount?.name,
      invoiceId: tx.invoiceId,
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type,
      date: tx.date.toISOString().slice(0, 10),
      competenceDate: tx.competenceDate.toISOString().slice(0, 10),
      isReconciled: tx.isReconciled,
      externalId: tx.externalId,
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
    };
  }

  async create(userId: string, data: CreateTransactionDto) {
    // Validate account belongs to user
    await this.accountsService.findById(userId, data.accountId);

    if (data.type === TransactionType.TRANSFER && !data.destinationAccountId) {
      throw new BadRequestException('Transferências exigem uma conta de destino');
    }

    if (data.destinationAccountId) {
      await this.accountsService.findById(userId, data.destinationAccountId);
    }

    const txDate = new Date(data.date);
    const compDate = data.competenceDate ? new Date(data.competenceDate) : txDate;

    // Check duplicate if externalId is supplied
    if (data.externalId) {
      const existing = await this.prisma.transaction.findFirst({
        where: { userId, externalId: data.externalId },
      });
      if (existing) {
        throw new BadRequestException(`Transação duplicada detectada (externalId: ${data.externalId})`);
      }
    }

    const amountDecimal = new Prisma.Decimal(data.amount);

    const transaction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          destinationAccountId: data.destinationAccountId,
          invoiceId: data.invoiceId,
          description: data.description,
          amount: amountDecimal,
          type: data.type,
          date: txDate,
          competenceDate: compDate,
          isReconciled: data.isReconciled ?? false,
          externalId: data.externalId,
        },
        include: {
          account: true,
          destinationAccount: true,
          category: true,
        },
      });

      // Update balances
      if (data.type === TransactionType.INCOME) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { increment: amountDecimal } },
        });
      } else if (
        data.type === TransactionType.EXPENSE ||
        data.type === TransactionType.INVOICE_PAYMENT
      ) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: amountDecimal } },
        });
      } else if (data.type === TransactionType.TRANSFER && data.destinationAccountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: amountDecimal } },
        });
        await tx.account.update({
          where: { id: data.destinationAccountId },
          data: { currentBalance: { increment: amountDecimal } },
        });
      }

      return created;
    });

    return {
      id: transaction.id,
      userId: transaction.userId,
      accountId: transaction.accountId,
      accountName: transaction.account?.name,
      categoryId: transaction.categoryId,
      categoryName: transaction.category?.name,
      categoryClassification: transaction.category?.classification,
      destinationAccountId: transaction.destinationAccountId,
      destinationAccountName: transaction.destinationAccount?.name,
      invoiceId: transaction.invoiceId,
      description: transaction.description,
      amount: Number(transaction.amount),
      type: transaction.type,
      date: transaction.date.toISOString().slice(0, 10),
      competenceDate: transaction.competenceDate.toISOString().slice(0, 10),
      isReconciled: transaction.isReconciled,
      externalId: transaction.externalId,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    };
  }

  async update(userId: string, id: string, data: UpdateTransactionDto) {
    const existing = await this.findById(userId, id);

    const txDate = data.date ? new Date(data.date) : new Date(existing.date);
    const compDate = data.competenceDate
      ? new Date(data.competenceDate)
      : data.date
        ? txDate
        : new Date(existing.competenceDate);

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        description: data.description,
        categoryId: data.categoryId,
        amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
        type: data.type,
        date: txDate,
        competenceDate: compDate,
        isReconciled: data.isReconciled,
      },
      include: {
        account: true,
        destinationAccount: true,
        category: true,
      },
    });

    // Recalculate affected accounts
    await this.accountsService.recalculateBalance(userId, existing.accountId);
    if (existing.destinationAccountId) {
      await this.accountsService.recalculateBalance(userId, existing.destinationAccountId);
    }

    return {
      id: updated.id,
      userId: updated.userId,
      accountId: updated.accountId,
      accountName: updated.account?.name,
      categoryId: updated.categoryId,
      categoryName: updated.category?.name,
      categoryClassification: updated.category?.classification,
      destinationAccountId: updated.destinationAccountId,
      destinationAccountName: updated.destinationAccount?.name,
      invoiceId: updated.invoiceId,
      description: updated.description,
      amount: Number(updated.amount),
      type: updated.type,
      date: updated.date.toISOString().slice(0, 10),
      competenceDate: updated.competenceDate.toISOString().slice(0, 10),
      isReconciled: updated.isReconciled,
      externalId: updated.externalId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async toggleReconciled(userId: string, id: string, isReconciled: boolean) {
    await this.findById(userId, id);
    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { isReconciled },
    });
    return { id: updated.id, isReconciled: updated.isReconciled };
  }

  async delete(userId: string, id: string) {
    const existing = await this.findById(userId, id);
    await this.prisma.transaction.delete({ where: { id } });

    await this.accountsService.recalculateBalance(userId, existing.accountId);
    if (existing.destinationAccountId) {
      await this.accountsService.recalculateBalance(userId, existing.destinationAccountId);
    }

    return { success: true };
  }
}
