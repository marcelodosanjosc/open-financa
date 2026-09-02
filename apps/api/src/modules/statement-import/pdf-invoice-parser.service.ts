import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import pdf from 'pdf-parse';
import { TransactionType, ParsedTransactionPreviewDto } from '@repo/shared';

@Injectable()
export class PdfInvoiceParserService {
  private readonly logger = new Logger(PdfInvoiceParserService.name);

  async parse(pdfBuffer: Buffer): Promise<ParsedTransactionPreviewDto[]> {
    try {
      const data = await pdf(pdfBuffer);
      const text = data.text || '';
      return this.parseText(text);
    } catch (err) {
      this.logger.error(`Error parsing PDF buffer: ${(err as Error).message}`);
      return [];
    }
  }

  public parseText(rawText: string): ParsedTransactionPreviewDto[] {
    const transactions: ParsedTransactionPreviewDto[] = [];
    if (!rawText || !rawText.trim()) return transactions;

    // 1. Normalize unicode spaces, non-breaking spaces, and newlines
    const normalizedText = rawText
      .replace(/\u00A0/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // 2. Extract reference year and reference month from invoice header (e.g. "Emissão: 28/08/2026", "Vencimento: 08/09/2026")
    let referenceYear = new Date().getFullYear();
    let invoiceMonth = 8;
    const yearMatch =
      /(?:Emiss[aã]o|Vencimento|Postagem)[:\s]+(?:\d{2}\/(\d{2})\/)(\d{4})/i.exec(
        normalizedText,
      );
    if (yearMatch) {
      invoiceMonth = parseInt(yearMatch[1], 10);
      referenceYear = parseInt(yearMatch[2], 10);
    }

    // Blacklist words that indicate summary headers, boletos or bank totals
    const summaryBlacklist = [
      'total da fatura',
      'total desta fatura',
      'total dos pagamentos',
      'total dos lançamentos',
      'total no cartão',
      'lançamentos no cartão',
      'lançamentos produtos e serviços',
      'pagamentos efetuados',
      'pagamento via conta',
      'pagamento efetuado',
      'pagamento mínimo',
      'saldo financiado',
      'lançamentos atuais',
      'limite total de crédito',
      'limite disponível',
      'limite total utilizado',
      'próxima fatura',
      'demais faturas',
      'total para próximas',
      'juros do rotativo',
      'juros de mora',
      'multa por atraso',
      'iof de financiamento',
      'valor total financiado',
      'valor solicitado',
      'total a pagar',
      'cet máximo',
      'recibo do pagador',
      'autenticação mecânica',
      'ficha de compensação',
      'agência/código',
      'nosso número',
      'marcelo dos a caldas',
    ];

    // Regex to capture transactions:
    // 1. Date: (\d{2}/\d{2})
    // 2. Optional space
    // 3. Description: merchant text
    // 4. Optional Installments (XX/YY)
    // 5. Amount at end: ([-+]?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})
    const lineRegex =
      /^(\d{2}\/\d{2}(?:\/\d{4})?)\s*([A-Za-z0-9\*\.\-_#@&+\(\)\/ ']+?)(?:(?:\s+|(?<=[A-Za-z\*\-_]))(\d{1,2})\/(\d{1,2}))?\s*([-\+]?(?:\d{1,3}(?:\.\d{3})*|\d+),\d{2})$/;

    const lines = normalizedText.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const lower = line.toLowerCase();
      if (summaryBlacklist.some((b) => lower.includes(b))) {
        continue;
      }
      if (lower.startsWith('data') && (lower.includes('estabelecimento') || lower.includes('produtos/serviços'))) {
        continue;
      }
      if (lower.includes('compras parceladas - próximas faturas')) {
        // Future installments section
        continue;
      }

      const match = lineRegex.exec(line);
      if (match) {
        const rawDate = match[1];
        let desc = match[2].trim();
        const instNumStr = match[3];
        const instTotalStr = match[4];
        const rawAmount = match[5];

        // Clean trailing hyphens or symbols from description
        desc = desc.replace(/[\s\-_]+$/, '').trim();
        if (!desc || desc.length < 2) continue;

        const lowerDesc = desc.toLowerCase();
        if (summaryBlacklist.some((b) => lowerDesc.includes(b))) continue;

        const numAmount = this.normalizeCurrency(rawAmount);
        if (isNaN(numAmount) || numAmount <= 0) continue;

        const absAmount = Math.abs(numAmount);

        // Date calculation: Handle purchases from previous months or year transitions
        let txYear = referenceYear;
        let dateStr: string;

        if (rawDate.length === 5) {
          const [day, monthStr] = rawDate.split('/');
          const txMonth = parseInt(monthStr, 10);
          // If invoice is in Jan/Feb (e.g. month 1) and purchase was in Nov/Dec (month 11/12), it was previous year
          if (invoiceMonth <= 2 && txMonth >= 11) {
            txYear = referenceYear - 1;
          }
          // If invoice is in Aug (month 8) and purchase was in Sept/Oct of previous year (e.g. 12/12 installment from Sep 2025)
          if (txMonth > invoiceMonth && instNumStr && parseInt(instNumStr, 10) > 1) {
            txYear = referenceYear - 1;
          }
          dateStr = `${txYear}-${monthStr}-${day}`;
        } else {
          const parts = rawDate.split('/');
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          dateStr = `${year}-${parts[1]}-${parts[0]}`;
        }

        const instNum = instNumStr ? parseInt(instNumStr, 10) : undefined;
        const instTotal = instTotalStr ? parseInt(instTotalStr, 10) : undefined;

        const hash = crypto
          .createHash('sha256')
          .update(`PDF:${dateStr}:${absAmount}:${desc}:${instNum || 1}:${instTotal || 1}`)
          .digest('hex');

        // Check if already present in this parse run
        const isDuplicateInBatch = transactions.some(
          (t) =>
            t.date === dateStr &&
            t.description === desc &&
            t.amount === absAmount &&
            t.installmentNumber === instNum,
        );

        if (!isDuplicateInBatch) {
          transactions.push({
            tempId: crypto.randomUUID(),
            date: dateStr,
            description: desc,
            amount: absAmount,
            type: TransactionType.EXPENSE,
            hash,
            isDuplicate: false,
            installmentNumber: instNum,
            totalInstallments: instTotal,
          });
        }
      }
    }

    return transactions;
  }

  private normalizeCurrency(raw: string): number {
    let clean = raw.replace(/[^\d,\.-]/g, '');
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    return parseFloat(clean);
  }
}
