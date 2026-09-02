import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// @ts-ignore
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { DEFAULT_USER_ID } from '../src/common/constants';
import { TransactionType, AccountType, DebtPayoffStrategy } from '@repo/shared';

describe('Open Finança End-to-End Financial Flow', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let testAccountId: string;
  let testCardId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);

    // Setup baseline test entities
    const acc = await prisma.account.findFirst({ where: { userId: DEFAULT_USER_ID } });
    testAccountId = acc!.id;

    const card = await prisma.creditCard.findFirst({ where: { userId: DEFAULT_USER_ID } });
    testCardId = card!.id;

    const cat = await prisma.category.findFirst({ where: { userId: DEFAULT_USER_ID } });
    testCategoryId = cat!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/accounts - should return user accounts', async () => {
    const res = await request(app.getHttpServer()).get('/api/accounts').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('2. POST /api/transactions - should create income and update account balance', async () => {
    const initialAcc = await request(app.getHttpServer())
      .get(`/api/accounts/${testAccountId}`)
      .expect(200);
    const prevBalance = initialAcc.body.currentBalance;

    const createTxRes = await request(app.getHttpServer())
      .post('/api/transactions')
      .send({
        accountId: testAccountId,
        description: 'Salário Mensal E2E',
        amount: 5000,
        type: TransactionType.INCOME,
        date: '2026-08-05',
        categoryId: testCategoryId,
      })
      .expect(201);

    expect(createTxRes.body.id).toBeDefined();
    expect(createTxRes.body.amount).toBe(5000);

    const updatedAcc = await request(app.getHttpServer())
      .get(`/api/accounts/${testAccountId}`)
      .expect(200);
    expect(updatedAcc.body.currentBalance).toBe(Number((prevBalance + 5000).toFixed(2)));
  });

  it('3. POST /api/invoices/installments - should split 100 in 3 installments with remainder on 1st', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/invoices/installments')
      .send({
        creditCardId: testCardId,
        description: 'Compra E2E Parcelada',
        totalAmount: 100,
        totalInstallments: 3,
        purchaseDate: '2026-08-10',
        categoryId: testCategoryId,
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.installmentsCreated).toBe(3);

    const invoicesRes = await request(app.getHttpServer())
      .get(`/api/invoices/card/${testCardId}`)
      .expect(200);

    expect(invoicesRes.body.length).toBeGreaterThanOrEqual(1);
  });

  it('4. GET /api/dashboard/summary - should calculate KPIs and cost breakdown', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/dashboard/summary?year=2026&month=8')
      .expect(200);

    expect(res.body.totalBalance).toBeDefined();
    expect(res.body.monthIncome).toBeGreaterThanOrEqual(5000);
    expect(res.body.costBreakdown).toBeDefined();
    expect(res.body.projectedNetCashflow).toBeDefined();
  });

  it('5. GET /api/debt-payoff/timeline & POST /api/debt-payoff/simulate - should project freedom date', async () => {
    const timelineRes = await request(app.getHttpServer())
      .get('/api/debt-payoff/timeline')
      .expect(200);

    expect(timelineRes.body.finalPayoffMonth).toBeDefined();
    expect(timelineRes.body.totalFutureCommitted).toBeGreaterThanOrEqual(0);

    const simRes = await request(app.getHttpServer())
      .post('/api/debt-payoff/simulate')
      .send({
        monthlyContribution: 1000,
        strategy: DebtPayoffStrategy.AVALANCHE,
      })
      .expect(201);

    expect(simRes.body.debtFreeDate).toBeDefined();
    expect(simRes.body.timeline).toBeDefined();
  });

  it('6. POST /api/statement-import/confirm - should batch import transactions with duplicate detection', async () => {
    const confirmRes = await request(app.getHttpServer())
      .post('/api/statement-import/confirm')
      .send({
        accountId: testAccountId,
        transactions: [
          {
            date: '2026-08-15',
            description: 'Importação Teste Lote 1',
            amount: 75.5,
            type: TransactionType.EXPENSE,
            categoryId: testCategoryId,
            externalId: 'E2E-EXT-HASH-001',
          },
          {
            date: '2026-08-16',
            description: 'Importação Teste Lote 2',
            amount: 120.0,
            type: TransactionType.EXPENSE,
            categoryId: testCategoryId,
            externalId: 'E2E-EXT-HASH-002',
          },
        ],
      })
      .expect(201);

    expect(confirmRes.body.importedCount).toBe(2);
  });
});
