import { PdfInvoiceParserService } from '../src/modules/statement-import/pdf-invoice-parser.service';
import * as fs from 'fs';
import * as path from 'path';

describe('PdfInvoiceParserService', () => {
  let service: PdfInvoiceParserService;

  beforeEach(() => {
    service = new PdfInvoiceParserService();
  });

  it('should parse real conta-fatura-itau.pdf and extract all actual transactions', async () => {
    const filePath = path.resolve(__dirname, '../../../conta-fatura-itau.pdf');
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      const result = await service.parse(buffer);

      console.log(`[REAL PDF TEST] Found ${result.length} transactions from Itaú invoice.`);

      expect(result.length).toBeGreaterThanOrEqual(40);

      // Verify specific transactions
      const uber = result.find((t) => t.description.includes('UberRidesSao PauloBR'));
      expect(uber).toBeDefined();

      const innerai = result.find((t) => t.description.includes('INNERAI'));
      expect(innerai).toBeDefined();
      expect(innerai?.installmentNumber).toBe(12);
      expect(innerai?.totalInstallments).toBe(12);
      expect(innerai?.amount).toBe(89.9);

      const pagueMenos = result.find((t) => t.description.includes('PAGUE MENOS'));
      expect(pagueMenos).toBeDefined();

      const pixDenise = result.find((t) => t.description.includes('PIX DENISE MON'));
      expect(pixDenise).toBeDefined();
    }
  });
});
