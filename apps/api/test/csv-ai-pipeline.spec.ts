import { CsvParserService } from '../src/modules/statement-import/csv-parser.service';
import { AiClassifierService } from '../src/modules/statement-import/ai-classifier.service';

describe('CSV Ingestion & AI Classification Pipeline', () => {
  let csvParser: CsvParserService;
  let aiClassifier: AiClassifierService;

  const mockCategories = [
    { id: 'cat-transporte-apps', name: 'Transporte Público & Apps', classification: 'VARIABLE' },
    { id: 'cat-restaurantes', name: 'Restaurantes & Delivery', classification: 'DISCRETIONARY' },
    { id: 'cat-supermercado', name: 'Supermercado', classification: 'ESSENTIAL' },
    { id: 'cat-farmacia', name: 'Farmácia', classification: 'VARIABLE' },
    { id: 'cat-agua-luz', name: 'Energia & Água', classification: 'VARIABLE' },
    { id: 'cat-internet-tel', name: 'Internet & Telefonia', classification: 'FIXED' },
    { id: 'cat-renda', name: 'Salário', classification: 'FIXED' },
    { id: 'cat-renda-extra', name: 'Rendimentos & Extras', classification: 'DISCRETIONARY' },
    { id: 'cat-alimentacao-gen', name: 'Alimentação', classification: 'ESSENTIAL' },
  ];

  beforeEach(() => {
    csvParser = new CsvParserService();
    aiClassifier = new AiClassifierService(null as any);
  });

  it('should correctly extract Movimentação column and classify all CSV transactions with AI heuristics', () => {
    const rawCsv = `Data,Hora,Movimentação,Valor,Meio de Pagamento,Saldo
01/09/2026,07:28,DL *UberRides Sao Paulo BRA,"-R$ 54,77",Cartão,"R$ 100,44"
31/08/2026,22:46,IFD*TAPAJOS COMERCIO D MANAUS BRA,"-R$ 59,53",Cartão,"R$ 155,21"
30/08/2026,16:08,IFD*DROGARIA BOM PRECO MANAUS BRA,"-R$ 57,17",Cartão,"R$ 407,92"
28/08/2026,10:41,Pagamento de Concessionária - AGUAS DE MANAUS,"-R$ 226,95",Boleto,"R$ 809,73"
28/08/2026,10:38,Crédito adicionado via pix,"R$ 27,00",Recebimento PIX,"R$ 1.036,68"
28/08/2026,09:16,ASSAI ATACADISTA MANAUS BRA,"-R$ 1.196,39",Cartão,"R$ 1.046,58"
17/08/2026,08:36,Pagamento de Concessionária - TIM CELULAR SA,"-R$ 139,99",Boleto,"R$ 58,57"
16/08/2026,20:22,"Vivo AM  R$ 30,00","-R$ 30,00",Voucher,"R$ 114,36"
04/07/2026,21:06,DROGARIA MEGA POPULAR MANAUS BRA,"-R$ 79,93",Cartão,"R$ 190,79"
05/07/2026,12:34,TUPI SUPERMERCADO MANAUS BRA,"-R$ 53,67",Cartão,"R$ 137,12"`;

    const parsedTxs = csvParser.parse(rawCsv);

    expect(parsedTxs.length).toBe(10);
    expect(parsedTxs[0].description).toBe('DL *UberRides Sao Paulo BRA');
    expect(parsedTxs[0].amount).toBe(54.77);

    const classified = aiClassifier.classifyWithHeuristics(mockCategories, parsedTxs);

    expect(classified.length).toBe(10);

    // 1. Uber -> Transporte Público & Apps
    const uber = classified.find((c) => c.tempId === parsedTxs[0].tempId);
    expect(uber?.categoryName).toBe('Transporte Público & Apps');

    // 2. IFD Tapajós -> Restaurantes & Delivery
    const ifd = classified.find((c) => c.tempId === parsedTxs[1].tempId);
    expect(ifd?.categoryName).toBe('Restaurantes & Delivery');

    // 3. IFD Drogaria Bom Preco -> Farmácia
    const drogariaBomPreco = classified.find((c) => c.tempId === parsedTxs[2].tempId);
    expect(drogariaBomPreco?.categoryName).toBe('Farmácia');

    // 4. Águas de Manaus -> Energia & Água
    const aguas = classified.find((c) => c.tempId === parsedTxs[3].tempId);
    expect(aguas?.categoryName).toBe('Energia & Água');

    // 5. Crédito Pix -> Salário / Rendimentos
    const pix = classified.find((c) => c.tempId === parsedTxs[4].tempId);
    expect(pix?.categoryName.includes('Salário') || pix?.categoryName.includes('Rendimentos')).toBe(true);

    // 6. Assaí Atacadista -> Supermercado
    const assai = classified.find((c) => c.tempId === parsedTxs[5].tempId);
    expect(assai?.categoryName).toBe('Supermercado');

    // 7. TIM Celular -> Internet & Telefonia
    const tim = classified.find((c) => c.tempId === parsedTxs[6].tempId);
    expect(tim?.categoryName).toBe('Internet & Telefonia');

    // 8. Vivo -> Internet & Telefonia
    const vivo = classified.find((c) => c.tempId === parsedTxs[7].tempId);
    expect(vivo?.categoryName).toBe('Internet & Telefonia');

    // 9. Drogaria Mega Popular -> Farmácia
    const megaPop = classified.find((c) => c.tempId === parsedTxs[8].tempId);
    expect(megaPop?.categoryName).toBe('Farmácia');

    // 10. Tupi Supermercado -> Supermercado
    const tupi = classified.find((c) => c.tempId === parsedTxs[9].tempId);
    expect(tupi?.categoryName).toBe('Supermercado');
  });
});
