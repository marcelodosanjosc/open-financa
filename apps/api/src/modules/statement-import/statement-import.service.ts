import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { InvoicesService } from '../invoices/invoices.service';
import { OfxParserService } from './ofx-parser.service';
import { CsvParserService } from './csv-parser.service';
import { PdfInvoiceParserService } from './pdf-invoice-parser.service';
import { AiClassifierService } from './ai-classifier.service';
import {
  BatchParseResultDto,
  ParsedTransactionPreviewDto,
  ConfirmImportDto,
  AiClassifyInputDto,
  TransactionType,
  FinancialMathUtils,
} from '@repo/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class StatementImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly invoicesService: InvoicesService,
    private readonly ofxParser: OfxParserService,
    private readonly csvParser: CsvParserService,
    private readonly pdfParser: PdfInvoiceParserService,
    private readonly aiClassifier: AiClassifierService,
  ) {}

  async classifyTransactions(userId: string, data: AiClassifyInputDto) {
    return this.aiClassifier.classifyBatch(userId, data.transactions);
  }

  async parseFile(
    userId: string,
    file: Express.Multer.File,
  ): Promise<BatchParseResultDto> {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado');
    }

    const fileName = file.originalname;
    const lowerName = fileName.toLowerCase();

    let format: 'OFX' | 'CSV' | 'PDF';
    let rawTransactions: ParsedTransactionPreviewDto[] = [];

    if (lowerName.endsWith('.ofx')) {
      format = 'OFX';
      const text = file.buffer.toString('utf-8');
      rawTransactions = this.ofxParser.parse(text);
    } else if (lowerName.endsWith('.csv')) {
      format = 'CSV';
      const text = file.buffer.toString('utf-8');
      rawTransactions = this.csvParser.parse(text);
    } else if (lowerName.endsWith('.pdf')) {
      format = 'PDF';
      rawTransactions = await this.pdfParser.parse(file.buffer);
    } else {
      throw new BadRequestException(
        'Formato de arquivo não suportado. Envie .ofx, .csv ou .pdf',
      );
    }

    // Check duplicate external IDs
    const externalIdsToCheck = rawTransactions
      .map((t) => t.fitid || t.hash)
      .filter(Boolean);

    const existingTx = await this.prisma.transaction.findMany({
      where: {
        userId,
        externalId: { in: externalIdsToCheck },
      },
      select: { externalId: true },
    });

    const existingIdSet = new Set(existingTx.map((t) => t.externalId));

    let duplicateCount = 0;
    const transactions = rawTransactions.map((tx) => {
      const idToCheck = tx.fitid || tx.hash;
      const isDuplicate = existingIdSet.has(idToCheck);
      if (isDuplicate) duplicateCount++;
      return {
        ...tx,
        isDuplicate,
      };
    });

    return {
      fileName,
      format,
      totalFound: transactions.length,
      newCount: transactions.length - duplicateCount,
      duplicateCount,
      transactions,
    };
  }

  async confirmImport(userId: string, data: ConfirmImportDto) {
    if (data.transactions.length === 0) {
      return { importedCount: 0, message: 'Nenhuma transação selecionada' };
    }

    let importedCount = 0;

    if (data.accountId) {
      // Import directly into Bank Account Transactions
      const account = await this.accountsService.findById(userId, data.accountId);

      await this.prisma.$transaction(async (tx) => {
        for (const item of data.transactions) {
          const txDate = new Date(item.date);
          const amountDecimal = new Prisma.Decimal(item.amount);

          await tx.transaction.create({
            data: {
              userId,
              accountId: account.id,
              categoryId: item.categoryId,
              description: item.description,
              amount: amountDecimal,
              type: item.type,
              date: txDate,
              competenceDate: txDate,
              isReconciled: true,
              externalId: item.externalId,
            },
          });

          if (item.type === TransactionType.INCOME) {
            await tx.account.update({
              where: { id: account.id },
              data: { currentBalance: { increment: amountDecimal } },
            });
          } else {
            await tx.account.update({
              where: { id: account.id },
              data: { currentBalance: { decrement: amountDecimal } },
            });
          }

          importedCount++;
        }
      });
    } else if (data.creditCardId) {
      // Import into Credit Card Invoices
      const card = await this.prisma.creditCard.findFirst({
        where: { id: data.creditCardId, userId },
      });

      if (!card) {
        throw new BadRequestException('Cartão de crédito não encontrado');
      }

      await this.prisma.$transaction(async (tx) => {
        for (const item of data.transactions) {
          const txDate = new Date(item.date);
          const period = FinancialMathUtils.calculateInvoicePeriod(
            txDate,
            card.closingDay,
            card.dueDay,
          );

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
                status: 'OPEN',
                totalAmount: new Prisma.Decimal(0),
              },
            });
          }

          const amountDecimal = new Prisma.Decimal(item.amount);

          await tx.creditCardExpense.create({
            data: {
              invoiceId: invoice.id,
              categoryId: item.categoryId,
              description: item.description,
              amount: amountDecimal,
              transactionDate: txDate,
              installmentNumber: item.installmentNumber || 1,
            },
          });

          await tx.invoice.update({
            where: { id: invoice.id },
            data: { totalAmount: { increment: amountDecimal } },
          });

          importedCount++;
        }
      });
    } else {
      throw new BadRequestException('Informe accountId ou creditCardId para confirmar a importação');
    }

    return {
      importedCount,
      message: `${importedCount} transações importadas com sucesso`,
    };
  }
}
