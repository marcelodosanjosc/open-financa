# Open Finança - Especificação Técnica e Plano Arquitetural

Este documento consolida as especificações arquiteturais, modelo de banco de dados, regras de negócio financeiras, motor de projeção de quitação de dívidas e o plano de implementação passo a passo alinhado nas decisões do projeto.

---

## 1. Visão Geral da Arquitetura

```mermaid
graph TD
    Client[Next.js App Router - Web] -->|HTTP / REST| API[NestJS Backend API]
    API -->|Prisma ORM| DB[(PostgreSQL Database)]
    API -->|Cron Jobs| Scheduler[@nestjs/schedule]
    API -->|Parsers| Parsers[OFX / CSV / PDF Invoice Parsers]
    Client -->|Dashboard / Gráficos| Charts[Recharts / Shadcn UI]
    Client -->|Simulador| PayoffEngine[Motor de Quitação de Dívidas]
    
    subgraph Monorepo [Turborepo + pnpm Workspaces]
        API
        Client
        SharedPkg["@repo/shared (DTOs, Zod, Math Utils)"]
        TsConfigPkg["@repo/tsconfig"]
    end
```

### 1.1 Stack Tecnológica
- **Monorepo:** Turborepo + pnpm Workspaces
- **Backend (`apps/api`):** NestJS, Prisma ORM, `@nestjs/schedule` (Crons para fechamento automático de faturas), Multer, `pdf-parse`, `node-ofx-parser`, `csv-parse`.
- **Frontend Web (`apps/web`):** Next.js (App Router), Tailwind CSS, Shadcn/ui, Recharts (Shadcn Charts), React Dropzone, Lucide Icons, TanStack React Table.
- **Banco de Dados:** PostgreSQL 16 executando via Docker Compose.
- **Pacotes Compartilhados:**
  - `@repo/shared`: Tipos TypeScript, Enums, Zod Schemas, Utilitários matemáticos financeiros (`FinancialMathUtils`).
  - `@repo/tsconfig`: Configurações TypeScript padronizadas.

---

## 2. Modelagem Relacional de Dados (Prisma Schema)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum AccountType {
  CHECKING
  SAVINGS
  INVESTMENT
  CASH
}

enum TransactionType {
  INCOME
  EXPENSE
  TRANSFER
  INVOICE_PAYMENT
}

enum InvoiceStatus {
  OPEN
  CLOSED
  PAID
  OVERDUE
}

enum CostClassification {
  FIXED
  VARIABLE
  ESSENTIAL
  DISCRETIONARY
}

model User {
  id           String      @id @default(uuid()) @db.Uuid
  email        String      @unique @db.VarChar(255)
  passwordHash String      @map("password_hash") @db.VarChar(255)
  fullName     String      @map("full_name") @db.VarChar(150)
  createdAt    DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime    @updatedAt @map("updated_at") @db.Timestamptz

  accounts          Account[]
  categories        Category[]
  creditCards       CreditCard[]
  installmentGroups InstallmentGroup[]
  transactions      Transaction[]
  budgets           Budget[]

  @@map("users")
}

model Category {
  id             String              @id @default(uuid()) @db.Uuid
  userId         String              @map("user_id") @db.Uuid
  name           String              @db.VarChar(100)
  icon           String?             @db.VarChar(50)
  color          String?             @db.VarChar(20)
  classification CostClassification  @default(VARIABLE)
  parentId       String?             @map("parent_id") @db.Uuid
  createdAt      DateTime            @default(now()) @map("created_at") @db.Timestamptz

  user               User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  parent             Category?           @relation("CategoryHierarchy", fields: [parentId], references: [id], onDelete: SetNull)
  subcategories      Category[]          @relation("CategoryHierarchy")
  transactions       Transaction[]
  creditCardExpenses CreditCardExpense[]
  budgets            Budget[]

  @@map("categories")
}

model Budget {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  categoryId     String   @map("category_id") @db.Uuid
  monthlyLimit   Decimal  @map("monthly_limit") @db.Decimal(14, 2)
  referenceMonth Int      @map("reference_month") @db.SmallInt
  referenceYear  Int      @map("reference_year") @db.SmallInt
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  category Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([userId, categoryId, referenceYear, referenceMonth])
  @@map("budgets")
}

model Account {
  id             String      @id @default(uuid()) @db.Uuid
  userId         String      @map("user_id") @db.Uuid
  name           String      @db.VarChar(100)
  type           AccountType @default(CHECKING)
  initialBalance Decimal     @default(0.00) @map("initial_balance") @db.Decimal(14, 2)
  currentBalance Decimal     @default(0.00) @map("current_balance") @db.Decimal(14, 2)
  currency       String      @default("BRL") @db.VarChar(3)
  isActive       Boolean     @default(true) @map("is_active")
  createdAt      DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime    @updatedAt @map("updated_at") @db.Timestamptz

  user                    User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  creditCardsAsDefault    CreditCard[]  @relation("DefaultCardAccount")
  transactions            Transaction[] @relation("AccountTransactions")
  destinationTransactions Transaction[] @relation("DestinationAccountTransactions")

  @@map("accounts")
}

model CreditCard {
  id               String   @id @default(uuid()) @db.Uuid
  userId           String   @map("user_id") @db.Uuid
  name             String   @db.VarChar(100)
  lastFourDigits   String?  @map("last_four_digits") @db.VarChar(4)
  creditLimit      Decimal  @map("credit_limit") @db.Decimal(14, 2)
  closingDay       Int      @map("closing_day") @db.SmallInt
  dueDay           Int      @map("due_day") @db.SmallInt
  interestRate     Decimal? @default(0.00) @map("interest_rate") @db.Decimal(5, 2) // Taxa de juros do rotativo mensal (%)
  defaultAccountId String?  @map("default_account_id") @db.Uuid
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime @updatedAt @map("updated_at") @db.Timestamptz

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  defaultAccount Account?  @relation("DefaultCardAccount", fields: [defaultAccountId], references: [id], onDelete: SetNull)
  invoices       Invoice[]

  @@map("credit_cards")
}

model Invoice {
  id             String        @id @default(uuid()) @db.Uuid
  creditCardId   String        @map("credit_card_id") @db.Uuid
  referenceYear  Int           @map("reference_year") @db.SmallInt
  referenceMonth Int           @map("reference_month") @db.SmallInt
  closingDate    DateTime      @map("closing_date") @db.Date
  dueDate        DateTime      @map("due_date") @db.Date
  status         InvoiceStatus @default(OPEN)
  totalAmount    Decimal       @default(0.00) @map("total_amount") @db.Decimal(14, 2)
  createdAt      DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  creditCard   CreditCard          @relation(fields: [creditCardId], references: [id], onDelete: Cascade)
  expenses     CreditCardExpense[]
  transactions Transaction[]

  @@unique([creditCardId, referenceYear, referenceMonth], name: "uq_card_invoice_period")
  @@map("invoices")
}

model InstallmentGroup {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @map("user_id") @db.Uuid
  description       String   @db.VarChar(255)
  totalAmount       Decimal  @map("total_amount") @db.Decimal(14, 2)
  totalInstallments Int      @map("total_installments") @db.SmallInt
  purchaseDate      DateTime @map("purchase_date") @db.Date
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz

  user     User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses CreditCardExpense[]

  @@map("installment_groups")
}

model CreditCardExpense {
  id                 String   @id @default(uuid()) @db.Uuid
  invoiceId          String   @map("invoice_id") @db.Uuid
  categoryId         String?  @map("category_id") @db.Uuid
  installmentGroupId String?  @map("installment_group_id") @db.Uuid
  description        String   @db.VarChar(255)
  amount             Decimal  @db.Decimal(14, 2)
  transactionDate    DateTime @map("transaction_date") @db.Date
  installmentNumber  Int      @default(1) @map("installment_number") @db.SmallInt
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz

  invoice          Invoice           @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  category         Category?         @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  installmentGroup InstallmentGroup? @relation(fields: [installmentGroupId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@map("credit_card_expenses")
}

model Transaction {
  id                   String          @id @default(uuid()) @db.Uuid
  userId               String          @map("user_id") @db.Uuid
  accountId            String          @map("account_id") @db.Uuid
  categoryId           String?         @map("category_id") @db.Uuid
  destinationAccountId String?         @map("destination_account_id") @db.Uuid
  invoiceId            String?         @map("invoice_id") @db.Uuid
  description          String          @db.VarChar(255)
  amount               Decimal         @db.Decimal(14, 2)
  type                 TransactionType
  date                 DateTime        @db.Date
  competenceDate       DateTime        @map("competence_date") @db.Date
  isReconciled         Boolean         @default(false) @map("is_reconciled")
  externalId           String?         @map("external_id") @db.VarChar(255)
  createdAt            DateTime        @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime        @updatedAt @map("updated_at") @db.Timestamptz

  user               User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  account            Account   @relation("AccountTransactions", fields: [accountId], references: [id], onDelete: Cascade)
  category           Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  destinationAccount Account?  @relation("DestinationAccountTransactions", fields: [destinationAccountId], references: [id], onDelete: SetNull)
  invoice            Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)

  @@index([userId, date])
  @@index([userId, competenceDate])
  @@index([externalId])
  @@map("transactions")
}
```

---

## 3. Motor Financeiro e Projeção de Quitação de Dívidas

### 3.1 Projeção Linear de Parcelamentos Futuros
O sistema analisa todas as faturas futuras e compras parceladas cadastradas nos cartões para gerar a curva temporal decrescente das faturas:
- Identifica o valor comprometido em cada mês futuro $M_1, M_2, \dots, M_k$.
- Exibe o mês exato em que a última parcela já contratada será quitada.

### 3.2 Simulador Híbrido de Quitação de Dívidas (Debt Payoff Engine)
Permite ao usuário testar estratégias de aporte mensal e visualizar o gráfico de amortização:

1. **Entrada de Parâmetros:**
   - **Sobra Mensal Estimada / Aporte Dedicado:** Valor disponível por mês para abater dívidas (ex: $R\$\ 1.000,00$).
   - **Saldo Devedor / Rotativo Atual:** Se houver faturas atrasadas ou valores com juros.
   - **Taxa de Juros do Cartão / Empréstimo (% a.m.).**
   - **Estratégia:** Bola de Neve (menor saldo primeiro) ou Avalanche (maior taxa de juros primeiro).

2. **Cálculo da Projeção de Quitação:**
$$\text{Saldo}_{m+1} = \text{Saldo}_m \times (1 + i) + \text{Fatura Fixa}_m - \text{Aporte}_m$$
O motor itera mês a mês até que $\text{Saldo}_n \le 0$, retornando:
- Mês e Ano exatos da liberdade de dívidas.
- Total economizado em juros.
- Gráfico de barras da evolução do saldo devedor até zero.

---

## 4. Parsers e Importação de Arquivos em Lote

### 4.1 Parser OFX (Bancos Brasileiros)
- Leitura de tags `<STMTTRN>`, extração de `<DTPOSTED>`, `<TRNAMT>`, `<FITID>` e `<MEMO>`.
- Deduplicação direta via `<FITID>` gravado em `externalId`.

### 4.2 Parser CSV
- Suporte a cabeçalhos padrão de extrato bancário e faturas (Data, Descrição, Valor, Categoria).
- Conversão de formato de moeda brasileira (R$ `1.234,56`) para `Decimal`.

### 4.3 Parser PDF de Faturas de Cartão
- Leitura de buffers de texto com `pdf-parse`.
- Regex otimizado para identificar compras à vista e parceladas:
  `^(\d{2}\/\d{2})\s+(.+?)(?:\s+(\d{1,2})\/(\d{1,2}))?\s+([\d\.,]+)$`
- Criação automática de `InstallmentGroup` e distribuição nas faturas corretas conforme o `closingDay`.

### 4.4 Hash de Deduplicação (SHA-256)
Para transações originadas de CSV/PDF sem ID bancário único:
$$\text{Hash} = \text{SHA256}(\text{accountId/invoiceId} + \text{date} + \text{amount} + \text{description})$$

---

## 5. Interface Web & Visualizações (Dashboard Next.js)

1. **Cards de Visão Geral (KPIs):**
   - Saldo Total das Contas.
   - Entradas do Mês vs Gastos do Mês.
   - Faturas Abertas do Mês Atual.
   - Saldo Líquido Projetado no Mês.

2. **Gráfico de Fluxo de Custos (Donut / Pie Chart):**
   - Divisão de Gastos por Classificação: **Custos Fixos**, **Custos Variáveis**, **Essenciais** e **Supérfluos**.
   - Progresso das Metas Orçamentárias por Categoria com barras coloridas (Verde / Amarelo / Vermelho).

3. **Linha do Tempo de Faturas Futuras (Bar Chart):**
   - Gráfico mês a mês com o valor total comprometido de parcelas futuras.

4. **Painel Interativo "Quando Fico Livre das Dívidas?":**
   - Sliders interativos para ajustar o aporte mensal.
   - Gráfico de redução acelerada da dívida.
   - Badge com a data estimada da quitação total.

5. **Módulo de Importação Drag-and-Drop:**
   - Upload de arquivos `.ofx`, `.csv` e `.pdf`.
   - Tabela de pré-visualização para conferência antes de salvar no banco.

---

## 6. Plano de Execução Passo a Passo

1. **Fase 1: Fundação do Monorepo & Infraestrutura**
   - Inicializar Turborepo com pnpm (`apps/api`, `apps/web`, `packages/shared`, `packages/tsconfig`).
   - Configurar `docker-compose.yml` com PostgreSQL.
   - Configurar Prisma ORM na API com migrations e seed do usuário padrão.

2. **Fase 2: Pacote Compartilhado & Backend Core**
   - Implementar `@repo/shared` com DTOs, Zod schemas e `FinancialMathUtils`.
   - Criar módulos NestJS: `Accounts`, `Categories`, `Transactions`, `CreditCards`, `Invoices`.
   - Implementar Cron de fechamento diário de faturas e liquidação de faturas.

3. **Fase 3: Motor de Dívidas & Importadores de Arquivos**
   - Implementar o serviço de projeção e simulação de quitação de dívidas (`PayoffService`).
   - Implementar os parsers de upload em lote: `OfxParserService`, `CsvParserService`, `PdfInvoiceParserService` com deduplicação por hash SHA-256.

4. **Fase 4: Frontend Next.js (App Router + Shadcn/ui)**
   - Configurar tema Tailwind, Shadcn/ui e componentes base.
   - Construir o Dashboard principal com KPIs, Gráfico de Custos Fixos vs Variáveis e Linha do Tempo de Faturas.
   - Construir a Calculadora/Simulador interativo de quitação de dívidas.
   - Construir as telas de Gerenciamento de Transações, Contas, Cartões e Faturas.
   - Construir a tela de Upload de Extratos e Faturas com pré-visualização.

5. **Fase 5: Testes e Validação Integrada**
   - Testes unitários do motor de parcelamento e simulador de dívidas.
   - Teste de ponta a ponta: upload de arquivo -> parsing -> conciliação -> atualização de gráficos e simulador de quitação.
