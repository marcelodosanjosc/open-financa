import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// @ts-ignore
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Statement Import AI Classification Endpoint', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authCookies: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'usuario@openfinanca.local',
        password: 'admin123',
      })
      .expect(200);

    authCookies = loginRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/statement-import/ai-classify - should classify Brazilian merchants with high confidence', async () => {
    const sampleBatch = [
      { tempId: 'tx-1', description: 'DL*UberRidesSao PauloBR', amount: 32.75 },
      { tempId: 'tx-2', description: 'IFD*RVS RESTAURANTE LTM', amount: 27.98 },
      { tempId: 'tx-3', description: 'PAGUEMENOS00704MANAUSBR', amount: 53.79 },
      { tempId: 'tx-4', description: 'Google OneSAO PAULOBRA', amount: 9.99 },
      { tempId: 'tx-5', description: 'VMT*TEMPUS SUPERMERCADO', amount: 85.0 },
    ];

    const res = await request(app.getHttpServer())
      .post('/api/statement-import/ai-classify')
      .set('Cookie', authCookies)
      .send({ transactions: sampleBatch })
      .expect(201);

    expect(res.body.classifications).toBeDefined();
    expect(res.body.classifications.length).toBe(5);

    const uber = res.body.classifications.find((c: any) => c.tempId === 'tx-1');
    expect(uber).toBeDefined();
    expect(uber.categoryName.toLowerCase()).toContain('transporte');

    const ifood = res.body.classifications.find((c: any) => c.tempId === 'tx-2');
    expect(ifood).toBeDefined();
    expect(
      ifood.categoryName.toLowerCase().includes('alimentação') ||
        ifood.categoryName.toLowerCase().includes('restaurante'),
    ).toBe(true);

    const farmacia = res.body.classifications.find((c: any) => c.tempId === 'tx-3');
    expect(farmacia).toBeDefined();
    expect(
      farmacia.categoryName.toLowerCase().includes('farmácia') ||
        farmacia.categoryName.toLowerCase().includes('saúde'),
    ).toBe(true);
  });
});
