import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { TransactionType, ParsedTransactionPreviewDto } from '@repo/shared';

@Injectable()
export class OfxParserService {
  parse(content: string): ParsedTransactionPreviewDto[] {
    const transactions: ParsedTransactionPreviewDto[] = [];

    // Match STMTTRN blocks
    const stmtRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let match: RegExpExecArray | null;

    while ((match = stmtRegex.exec(content)) !== null) {
      const block = match[1];

      const typeMatch = /<TRNTYPE>(.*)/i.exec(block);
      const postedMatch = /<DTPOSTED>(\d{8})/i.exec(block);
      const amountMatch = /<TRNAMT>([-\d\.,]+)/i.exec(block);
      const fitidMatch = /<FITID>(.*)/i.exec(block);
      const memoMatch = /<MEMO>(.*)/i.exec(block) || /<NAME>(.*)/i.exec(block);

      if (!postedMatch || !amountMatch) {
        continue;
      }

      // Parse date: YYYYMMDD -> YYYY-MM-DD
      const rawDate = postedMatch[1];
      const year = rawDate.slice(0, 4);
      const month = rawDate.slice(4, 6);
      const day = rawDate.slice(6, 8);
      const dateStr = `${year}-${month}-${day}`;

      // Parse amount
      const rawAmount = amountMatch[1].replace(',', '.').trim();
      const numAmount = parseFloat(rawAmount);
      const absAmount = Math.abs(numAmount);
      const isExpense = numAmount < 0;

      const fitid = fitidMatch ? fitidMatch[1].trim() : null;
      const memo = memoMatch ? memoMatch[1].trim() : 'Transação Bancária';

      const type = isExpense ? TransactionType.EXPENSE : TransactionType.INCOME;

      // SHA-256 hash
      const hash = crypto
        .createHash('sha256')
        .update(`OFX:${fitid || ''}:${dateStr}:${numAmount}:${memo}`)
        .digest('hex');

      transactions.push({
        tempId: crypto.randomUUID(),
        date: dateStr,
        description: memo,
        amount: absAmount,
        type,
        fitid,
        hash,
        isDuplicate: false,
      });
    }

    return transactions;
  }
}
