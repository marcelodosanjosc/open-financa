import { PrismaClient, CostClassification, AccountType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

async function main() {
  console.log('Seeding database for Open Finança...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  // 1. Create or upsert default user
  const user = await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      id: DEFAULT_USER_ID,
      email: 'usuario@openfinanca.local',
      fullName: 'Usuário Open Finança',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log(`✓ User ready: ${user.fullName} (${user.id}) [Role: ${user.role}]`);

  // 2. Create baseline categories
  const categoriesData = [
    {
      name: 'Alimentação',
      icon: 'Utensils',
      color: '#f97316',
      classification: CostClassification.ESSENTIAL,
      subs: [
        { name: 'Supermercado', icon: 'ShoppingCart', classification: CostClassification.ESSENTIAL },
        { name: 'Restaurantes & Delivery', icon: 'Coffee', classification: CostClassification.DISCRETIONARY },
      ],
    },
    {
      name: 'Moradia',
      icon: 'Home',
      color: '#3b82f6',
      classification: CostClassification.FIXED,
      subs: [
        { name: 'Aluguel & Condomínio', icon: 'Key', classification: CostClassification.FIXED },
        { name: 'Energia & Água', icon: 'Zap', classification: CostClassification.VARIABLE },
        { name: 'Internet & Telefonia', icon: 'Wifi', classification: CostClassification.FIXED },
      ],
    },
    {
      name: 'Transporte',
      icon: 'Car',
      color: '#eab308',
      classification: CostClassification.ESSENTIAL,
      subs: [
        { name: 'Combustível', icon: 'Fuel', classification: CostClassification.VARIABLE },
        { name: 'Transporte Público & Apps', icon: 'Bus', classification: CostClassification.VARIABLE },
      ],
    },
    {
      name: 'Lazer & Estilo de Vida',
      icon: 'Smile',
      color: '#ec4899',
      classification: CostClassification.DISCRETIONARY,
      subs: [
        { name: 'Streaming & Assinaturas', icon: 'Tv', classification: CostClassification.FIXED },
        { name: 'Viagens & Passeios', icon: 'Plane', classification: CostClassification.VARIABLE },
      ],
    },
    {
      name: 'Saúde & Cuidados',
      icon: 'HeartPulse',
      color: '#10b981',
      classification: CostClassification.ESSENTIAL,
      subs: [
        { name: 'Farmácia', icon: 'Pill', classification: CostClassification.VARIABLE },
        { name: 'Plano de Saúde', icon: 'ShieldPlus', classification: CostClassification.FIXED },
      ],
    },
    {
      name: 'Renda & Entradas',
      icon: 'TrendingUp',
      color: '#14b8a6',
      classification: CostClassification.FIXED,
      subs: [
        { name: 'Salário', icon: 'Briefcase', classification: CostClassification.FIXED },
        { name: 'Rendimentos & Extras', icon: 'Coins', classification: CostClassification.DISCRETIONARY },
      ],
    },
  ];

  for (const cat of categoriesData) {
    let parent = await prisma.category.findFirst({
      where: { userId: user.id, name: cat.name, parentId: null },
    });

    if (!parent) {
      parent = await prisma.category.create({
        data: {
          userId: user.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          classification: cat.classification,
        },
      });
    }

    for (const sub of cat.subs) {
      const existingSub = await prisma.category.findFirst({
        where: { userId: user.id, name: sub.name, parentId: parent.id },
      });

      if (!existingSub) {
        await prisma.category.create({
          data: {
            userId: user.id,
            name: sub.name,
            icon: sub.icon,
            classification: sub.classification,
            parentId: parent.id,
          },
        });
      }
    }
  }
  console.log('✓ Baseline categories created');

  // 3. Create default accounts
  const checkingAccount = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      userId: user.id,
      name: 'Conta Corrente Principal',
      type: AccountType.CHECKING,
      initialBalance: 3200.0,
      currentBalance: 3200.0,
    },
  });

  const savingsAccount = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      userId: user.id,
      name: 'Reserva de Emergência',
      type: AccountType.SAVINGS,
      initialBalance: 12500.0,
      currentBalance: 12500.0,
    },
  });
  console.log('✓ Default accounts created');

  // 4. Create default credit cards
  const nubankCard = await prisma.creditCard.upsert({
    where: { id: '00000000-0000-0000-0000-000000000020' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000020',
      userId: user.id,
      name: 'Nubank Mastercard Platinum',
      lastFourDigits: '8492',
      creditLimit: 7500.0,
      closingDay: 25,
      dueDay: 5,
      interestRate: 2.25,
      defaultAccountId: checkingAccount.id,
    },
  });

  const itauCard = await prisma.creditCard.upsert({
    where: { id: '00000000-0000-0000-0000-000000000021' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000021',
      userId: user.id,
      name: 'Itaú Uniclass Visa',
      lastFourDigits: '3104',
      creditLimit: 5000.0,
      closingDay: 12,
      dueDay: 22,
      interestRate: 3.5,
      defaultAccountId: checkingAccount.id,
    },
  });
  console.log('✓ Default credit cards created');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
