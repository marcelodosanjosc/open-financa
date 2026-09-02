import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBudgetDto, UpdateBudgetDto } from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, year: number, month: number) {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        referenceYear: year,
        referenceMonth: month,
      },
      include: {
        category: {
          include: {
            subcategories: true,
          },
        },
      },
      orderBy: { category: { name: 'asc' } },
    });

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const result = await Promise.all(
      budgets.map(async (b) => {
        // Collect category ID and all subcategory IDs
        const subIds = b.category.subcategories.map((s) => s.id);
        const categoryIds = [b.categoryId, ...subIds];

        // Sum transaction expenses in period
        const txSum = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: { in: categoryIds },
            type: 'EXPENSE',
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { amount: true },
        });

        // Sum card expenses in period
        const cardSum = await this.prisma.creditCardExpense.aggregate({
          where: {
            categoryId: { in: categoryIds },
            transactionDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          _sum: { amount: true },
        });

        const totalSpent = Number(txSum._sum.amount || 0) + Number(cardSum._sum.amount || 0);
        const monthlyLimit = Number(b.monthlyLimit);
        const consumedPercentage =
          monthlyLimit > 0 ? Number(((totalSpent / monthlyLimit) * 100).toFixed(1)) : 0;
        const remainingAmount = Number((monthlyLimit - totalSpent).toFixed(2));
        const isExceeded = totalSpent > monthlyLimit;

        return {
          id: b.id,
          userId: b.userId,
          categoryId: b.categoryId,
          categoryName: b.category.name,
          categoryClassification: b.category.classification,
          monthlyLimit,
          referenceMonth: b.referenceMonth,
          referenceYear: b.referenceYear,
          spentAmount: Number(totalSpent.toFixed(2)),
          consumedPercentage,
          remainingAmount,
          isExceeded,
          createdAt: b.createdAt.toISOString(),
        };
      }),
    );

    return result;
  }

  async findById(userId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!budget) {
      throw new NotFoundException(`Orçamento com ID ${id} não encontrado`);
    }

    return {
      id: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      monthlyLimit: Number(budget.monthlyLimit),
      referenceMonth: budget.referenceMonth,
      referenceYear: budget.referenceYear,
      createdAt: budget.createdAt.toISOString(),
    };
  }

  async createOrUpdate(userId: string, data: CreateBudgetDto) {
    const limitDecimal = new Prisma.Decimal(data.monthlyLimit);

    const budget = await this.prisma.budget.upsert({
      where: {
        userId_categoryId_referenceYear_referenceMonth: {
          userId,
          categoryId: data.categoryId,
          referenceYear: data.referenceYear,
          referenceMonth: data.referenceMonth,
        },
      },
      update: {
        monthlyLimit: limitDecimal,
      },
      create: {
        userId,
        categoryId: data.categoryId,
        monthlyLimit: limitDecimal,
        referenceYear: data.referenceYear,
        referenceMonth: data.referenceMonth,
      },
      include: { category: true },
    });

    return {
      id: budget.id,
      userId: budget.userId,
      categoryId: budget.categoryId,
      categoryName: budget.category.name,
      monthlyLimit: Number(budget.monthlyLimit),
      referenceMonth: budget.referenceMonth,
      referenceYear: budget.referenceYear,
      createdAt: budget.createdAt.toISOString(),
    };
  }

  async update(userId: string, id: string, data: UpdateBudgetDto) {
    await this.findById(userId, id);

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        monthlyLimit: new Prisma.Decimal(data.monthlyLimit),
      },
      include: { category: true },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      categoryId: updated.categoryId,
      categoryName: updated.category.name,
      monthlyLimit: Number(updated.monthlyLimit),
      referenceMonth: updated.referenceMonth,
      referenceYear: updated.referenceYear,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);
    await this.prisma.budget.delete({ where: { id } });
    return { success: true };
  }
}
