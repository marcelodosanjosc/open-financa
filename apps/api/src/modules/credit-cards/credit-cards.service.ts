import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCreditCardDto, UpdateCreditCardDto, InvoiceStatus } from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class CreditCardsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const cards = await this.prisma.creditCard.findMany({
      where: { userId },
      include: {
        defaultAccount: true,
        invoices: {
          where: { status: InvoiceStatus.OPEN },
        },
      },
      orderBy: { name: 'asc' },
    });

    return cards.map((card) => {
      const openInvoice = card.invoices[0];
      const currentInvoiceAmount = openInvoice ? Number(openInvoice.totalAmount) : 0;
      const creditLimit = Number(card.creditLimit);
      const availableLimit = Number((creditLimit - currentInvoiceAmount).toFixed(2));

      return {
        id: card.id,
        userId: card.userId,
        name: card.name,
        lastFourDigits: card.lastFourDigits,
        creditLimit,
        closingDay: card.closingDay,
        dueDay: card.dueDay,
        interestRate: Number(card.interestRate || 0),
        defaultAccountId: card.defaultAccountId,
        defaultAccountName: card.defaultAccount?.name || null,
        currentInvoiceAmount,
        availableLimit,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
      };
    });
  }

  async findById(userId: string, id: string) {
    const card = await this.prisma.creditCard.findFirst({
      where: { id, userId },
      include: {
        defaultAccount: true,
        invoices: {
          orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
          take: 12,
        },
      },
    });

    if (!card) {
      throw new NotFoundException(`Cartão de crédito com ID ${id} não encontrado`);
    }

    const openInvoice = card.invoices.find((i) => i.status === InvoiceStatus.OPEN);
    const currentInvoiceAmount = openInvoice ? Number(openInvoice.totalAmount) : 0;
    const creditLimit = Number(card.creditLimit);
    const availableLimit = Number((creditLimit - currentInvoiceAmount).toFixed(2));

    return {
      id: card.id,
      userId: card.userId,
      name: card.name,
      lastFourDigits: card.lastFourDigits,
      creditLimit,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      interestRate: Number(card.interestRate || 0),
      defaultAccountId: card.defaultAccountId,
      defaultAccountName: card.defaultAccount?.name || null,
      currentInvoiceAmount,
      availableLimit,
      invoices: card.invoices.map((inv) => ({
        id: inv.id,
        referenceYear: inv.referenceYear,
        referenceMonth: inv.referenceMonth,
        closingDate: inv.closingDate.toISOString().slice(0, 10),
        dueDate: inv.dueDate.toISOString().slice(0, 10),
        status: inv.status,
        totalAmount: Number(inv.totalAmount),
      })),
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }

  async create(userId: string, data: CreateCreditCardDto) {
    const card = await this.prisma.creditCard.create({
      data: {
        userId,
        name: data.name,
        lastFourDigits: data.lastFourDigits,
        creditLimit: new Prisma.Decimal(data.creditLimit),
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        interestRate: new Prisma.Decimal(data.interestRate || 0),
        defaultAccountId: data.defaultAccountId,
      },
    });

    return {
      id: card.id,
      userId: card.userId,
      name: card.name,
      lastFourDigits: card.lastFourDigits,
      creditLimit: Number(card.creditLimit),
      closingDay: card.closingDay,
      dueDay: card.dueDay,
      interestRate: Number(card.interestRate),
      defaultAccountId: card.defaultAccountId,
      currentInvoiceAmount: 0,
      availableLimit: Number(card.creditLimit),
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }

  async update(userId: string, id: string, data: UpdateCreditCardDto) {
    await this.findById(userId, id);

    const updated = await this.prisma.creditCard.update({
      where: { id },
      data: {
        name: data.name,
        lastFourDigits: data.lastFourDigits,
        creditLimit: data.creditLimit !== undefined ? new Prisma.Decimal(data.creditLimit) : undefined,
        closingDay: data.closingDay,
        dueDay: data.dueDay,
        interestRate:
          data.interestRate !== undefined ? new Prisma.Decimal(data.interestRate) : undefined,
        defaultAccountId: data.defaultAccountId,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      lastFourDigits: updated.lastFourDigits,
      creditLimit: Number(updated.creditLimit),
      closingDay: updated.closingDay,
      dueDay: updated.dueDay,
      interestRate: Number(updated.interestRate),
      defaultAccountId: updated.defaultAccountId,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);
    await this.prisma.creditCard.delete({ where: { id } });
    return { success: true };
  }
}
