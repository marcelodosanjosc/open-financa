import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import { TransactionType, ParsedTransactionPreviewDto } from '@repo/shared';

@Injectable()
export class CsvParserService {
  parse(content: string): ParsedTransactionPreviewDto[] {
    const transactions: ParsedTransactionPreviewDto[] = [];
    if (!content || !content.trim()) return transactions;

    // Detect delimiter (; or , or \t)
    const firstLine = content.split('\n')[0] || '';
    let delimiter = ',';
    if (firstLine.includes(';') && !firstLine.includes(',')) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    const records: string[][] = parse(content, {
      delimiter,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    });

    if (records.length < 2) {
      return transactions;
    }

    const normalizeHeader = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const headers = records[0].map(normalizeHeader);

    // Map column indices
    const dateIdx = headers.findIndex((h) =>
      ['data', 'date', 'data da transacao', 'data lancamento', 'data do evento'].some((k) =>
        h.includes(k),
      ),
    );

    const descIdx = headers.findIndex((h) =>
      [
        'movimentacao',
        'movimento',
        'descricao',
        'description',
        'historico',
        'estabelecimento',
        'titulo',
        'lancamento',
        'transacao',
        'detalhes',
        'origem',
        'destino',
        'identificacao',
      ].some((k) => h.includes(k)),
    );

    const amountIdx = headers.findIndex((h) =>
      ['valor', 'amount', 'quantia', 'valor r$', 'debito/credito', 'total'].some((k) =>
        h.includes(k),
      ),
    );

    const actualDateIdx = dateIdx >= 0 ? dateIdx : 0;
    const actualDescIdx = descIdx >= 0 ? descIdx : (headers.length > 2 ? 2 : 1);
    const actualAmountIdx = amountIdx >= 0 ? amountIdx : (headers.length > 3 ? 3 : 2);

    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length <= Math.max(actualDateIdx, actualDescIdx, actualAmountIdx)) {
        continue;
      }

      const rawDate = row[actualDateIdx]?.trim();
      let rawDesc = row[actualDescIdx]?.trim() || 'Transação CSV';
      const rawAmount = row[actualAmountIdx]?.trim();

      if (!rawDate || !rawAmount) continue;

      const dateStr = this.normalizeDate(rawDate);
      if (!dateStr) continue;

      const numAmount = this.normalizeCurrency(rawAmount);
      if (isNaN(numAmount) || numAmount === 0) continue;

      // Clean non-breaking spaces or double quotes from description
      rawDesc = rawDesc.replace(/\u00A0/g, ' ').replace(/^["']|["']$/g, '').trim();

      const absAmount = Math.abs(numAmount);
      const isExpense = numAmount < 0;
      const type = isExpense ? TransactionType.EXPENSE : TransactionType.INCOME;

      const hash = crypto
        .createHash('sha256')
        .update(`CSV:${dateStr}:${numAmount}:${rawDesc}`)
        .digest('hex');

      transactions.push({
        tempId: crypto.randomUUID(),
        date: dateStr,
        description: rawDesc,
        amount: absAmount,
        type,
        hash,
        isDuplicate: false,
      });
    }

    return transactions;
  }

  private normalizeDate(raw: string): string | null {
    const clean = raw.trim();
    // DD/MM/YYYY
    const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(clean);
    if (brMatch) {
      return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }
    // YYYY-MM-DD
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean);
    if (isoMatch) {
      return clean;
    }
    // DD-MM-YYYY
    const dashMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(clean);
    if (dashMatch) {
      return `${dashMatch[3]}-${dashMatch[2]}-${dashMatch[1]}`;
    }
    return null;
  }

  private normalizeCurrency(raw: string): number {
    // Check if contains negative sign
    const isNegative = raw.includes('-');
    let clean = raw.replace(/[^\d,\.]/g, '');

    // If formatted as 1.234,56
    if (clean.includes(',') && clean.includes('.')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }

    const val = parseFloat(clean);
    if (isNaN(val)) return 0;
    return isNegative ? -Math.abs(val) : Math.abs(val);
  }
}
