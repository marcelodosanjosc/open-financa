import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAccountDto, UpdateAccountDto } from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((acc) => ({
      id: acc.id,
      userId: acc.userId,
      name: acc.name,
      type: acc.type,
      initialBalance: Number(acc.initialBalance),
      currentBalance: Number(acc.currentBalance),
      currency: acc.currency,
      isActive: acc.isActive,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    }));
  }

  async findById(userId: string, id: string) {
    const acc = await this.prisma.account.findFirst({
      where: { id, userId },
    });

    if (!acc) {
      throw new NotFoundException(`Conta com ID ${id} não encontrada`);
    }

    return {
      id: acc.id,
      userId: acc.userId,
      name: acc.name,
      type: acc.type,
      initialBalance: Number(acc.initialBalance),
      currentBalance: Number(acc.currentBalance),
      currency: acc.currency,
      isActive: acc.isActive,
      createdAt: acc.createdAt.toISOString(),
      updatedAt: acc.updatedAt.toISOString(),
    };
  }

  async create(userId: string, data: CreateAccountDto) {
    const initialDecimal = new Prisma.Decimal(data.initialBalance || 0);

    const created = await this.prisma.account.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        initialBalance: initialDecimal,
        currentBalance: initialDecimal,
        currency: data.currency || 'BRL',
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      type: created.type,
      initialBalance: Number(created.initialBalance),
      currentBalance: Number(created.currentBalance),
      currency: created.currency,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async update(userId: string, id: string, data: UpdateAccountDto) {
    await this.findById(userId, id);

    const updatePayload: Prisma.AccountUpdateInput = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.type !== undefined) updatePayload.type = data.type;
    if (data.isActive !== undefined) updatePayload.isActive = data.isActive;
    if (data.currency !== undefined) updatePayload.currency = data.currency;

    const updated = await this.prisma.account.update({
      where: { id },
      data: updatePayload,
    });

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      type: updated.type,
      initialBalance: Number(updated.initialBalance),
      currentBalance: Number(updated.currentBalance),
      currency: updated.currency,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deactivate(userId: string, id: string) {
    return this.update(userId, id, { isActive: false });
  }

  async recalculateBalance(userId: string, accountId: string) {
    const account = await this.findById(userId, accountId);

    const incomeSum = await this.prisma.transaction.aggregate({
      where: {
        userId,
        accountId,
        type: { in: ['INCOME', 'TRANSFER'] },
      },
      _sum: { amount: true },
    });

    const destinationTransferSum = await this.prisma.transaction.aggregate({
      where: {
        userId,
        destinationAccountId: accountId,
        type: 'TRANSFER',
      },
      _sum: { amount: true },
    });

    const expenseSum = await this.prisma.transaction.aggregate({
      where: {
        userId,
        accountId,
        type: { in: ['EXPENSE', 'INVOICE_PAYMENT', 'TRANSFER'] },
      },
      _sum: { amount: true },
    });

    // Net balance = initial + income + transfer-in - expense - transfer-out - invoice_payments
    const initial = account.initialBalance;
    const directIncome = Number(incomeSum._sum.amount || 0);
    const transferIn = Number(destinationTransferSum._sum.amount || 0);
    const totalOut = Number(expenseSum._sum.amount || 0);

    const newBalance = Number((initial + directIncome + transferIn - totalOut).toFixed(2));

    await this.prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: new Prisma.Decimal(newBalance) },
    });

    return newBalance;
  }
}
