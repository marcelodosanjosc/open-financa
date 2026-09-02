import { Module } from '@nestjs/common';
import { StatementImportController } from './statement-import.controller';
import { StatementImportService } from './statement-import.service';
import { OfxParserService } from './ofx-parser.service';
import { CsvParserService } from './csv-parser.service';
import { PdfInvoiceParserService } from './pdf-invoice-parser.service';
import { AiClassifierService } from './ai-classifier.service';
import { AccountsModule } from '../accounts/accounts.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [AccountsModule, InvoicesModule],
  controllers: [StatementImportController],
  providers: [
    StatementImportService,
    OfxParserService,
    CsvParserService,
    PdfInvoiceParserService,
    AiClassifierService,
  ],
  exports: [StatementImportService, AiClassifierService],
})
export class StatementImportModule {}
