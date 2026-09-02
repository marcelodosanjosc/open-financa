# 🪙 Open Finança — Gestão & Liberdade Financeira

> **Open Finança** é uma plataforma moderna e inteligente de gestão financeira pessoal e empresarial leve, focada em conciliação bancária, controle rigoroso de cartões de crédito e parcelamentos, classificação de custos em 4 quadrantes e um motor interativo de quitação acelerada de dívidas com IA.

---

## 🚀 Tecnologias & Ferramentas Utilizadas

O projeto foi construído como um **Monorepo Turborepo** robusto com TypeScript fim a fim:

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Monorepo** | [Turborepo](https://turbo.build/) + [pnpm](https://pnpm.io/) | Orquestração de builds rápidos, pipeline paralelo e workspaces |
| **Frontend** | [Next.js 15 (App Router)](https://nextjs.org/) + React 19 | Interface moderna com SSR, layout escuro/emerald e navegação fluida |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/) + Lucide Icons + Recharts | Glassmorphism, dashboards interativos e gráficos de alta performance |
| **Backend API** | [NestJS 10](https://nestjs.com/) | API modular, arquitetura limpa, pipes globais Zod e documentação OpenAPI |
| **Documentação API** | [Swagger / OpenAPI](https://swagger.io/) | Interface interativa disponível em `/api/docs` |
| **ORM & Banco** | [Prisma ORM](https://www.prisma.io/) + [PostgreSQL 16](https://www.postgresql.org/) | Modelagem com `Decimal(14,2)` para precisão financeira sem erros de arredondamento |
| **Inteligência Artificial** | [Ollama](https://ollama.ai/) + Motor Heurístico Híbrido | Classificação automática de extratos e faturas em lote com fallback resiliente |
| **Parsers** | `pdf-parse` + `node-ofx-parser` + `csv-parser` | Ingestão de extratos bancários e faturas de cartão (.OFX, .CSV, .PDF) |
| **Testes** | [Jest](https://jestjs.io/) + Supertest | Testes unitários para matemática financeira e testes de integração E2E |
| **Containers** | [Docker](https://www.docker.com/) & Docker Compose | Instância PostgreSQL 16 isolada e pronta para execução |

---

## 📁 Estrutura do Monorepo

```
open-financa/
├── apps/
│   ├── api/                     # Backend NestJS (REST API + Prisma + Swagger)
│   │   ├── prisma/              # Schema do banco de dados e script de seed
│   │   ├── src/
│   │   │   ├── modules/         # Módulos: accounts, categories, budgets, transactions,
│   │   │   │                    # credit-cards, invoices, debt-payoff, statement-import, dashboard
│   │   │   └── common/          # Filtros globais, pipes Zod e constantes
│   │   └── test/                # Testes de integração e E2E
│   └── web/                     # Frontend Next.js 15 (App Router + Tailwind)
│       ├── src/
│       │   ├── app/             # Rotas: /, /transacoes, /contas, /cartoes, /orcamentos,
│       │   │                    # /simulador-dividas, /importacao
│       │   ├── components/      # UI components (dashboard, modais, gráficos, uploader)
│       │   └── lib/             # Cliente de API e utilitários de formatação
├── packages/
│   ├── shared/                  # DTOs, Enums, Zod Schemas e FinancialMathUtils
│   └── tsconfig/                # Configurações TypeScript base, NestJS e Next.js
├── docker-compose.yml           # PostgreSQL 16 Alpine
├── package.json                 # Scripts raiz do Turborepo
└── pnpm-workspace.yaml          # Definição dos workspaces pnpm
```

---

## ⚡ Como Subir o Ambiente

### 1. Pré-requisitos
- **Node.js** >= 18.x
- **pnpm** >= 9.x (`npm install -g pnpm`)
- **Docker** e **Docker Compose**

### 2. Clonar e Instalar Dependências

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd open-financa

# Instale todas as dependências do monorepo
pnpm install
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo para `.env` na raiz e no `apps/api`:

```bash
cp .env.example .env
cp .env.example apps/api/.env
```

Conteúdo padrão do `.env`:
```env
# Database
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/open_financa?schema=public"

# API & Web Ports
PORT=3001
NEXT_PUBLIC_API_URL="http://localhost:3001"

# AI Classification (Ollama Local)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2"
```

---

## 🐳 Subindo o Banco de Dados (Docker)

Inicie o container do banco de dados PostgreSQL 16:

```bash
# Iniciar o PostgreSQL em segundo plano
docker compose up -d

# Verificar se o container está saudável
docker compose ps
```

---

## 🗄️ Executando Migrations e Seed Inicial

Gere o cliente do Prisma e popule o banco de dados com usuário, contas e categorias padrão:

```bash
# Gerar Prisma Client e aplicar schema no PostgreSQL
pnpm --filter @repo/api db:push

# Executar script de Seed com dados iniciais
pnpm --filter @repo/api db:seed
```

---

## 💻 Executando em Modo Desenvolvimento

Você pode iniciar todos os projetos (API + Web) simultaneamente usando o Turborepo:

```bash
# Iniciar Monorepo completo (API + Web)
pnpm dev
```

Ou iniciar cada aplicação individualmente:

```bash
# Iniciar apenas o Backend API (Porta 3001)
pnpm --filter @repo/api dev

# Iniciar apenas o Frontend Web (Porta 3000)
pnpm --filter @repo/web dev
```

---

## 🌐 URLs de Acesso

| Serviço | URL | Descrição |
| :--- | :--- | :--- |
| 🖥️ **Frontend Web** | [http://localhost:3000](http://localhost:3000) | Dashboard e todas as interfaces do usuário |
| 🔌 **API REST** | [http://localhost:3001/api](http://localhost:3001/api) | Endpoints RESTful |
| 📖 **Swagger Docs** | [http://localhost:3001/api/docs](http://localhost:3001/api/docs) | Documentação OpenAPI interativa |
| 🗄️ **PostgreSQL** | `localhost:5432` | Banco de dados relacional (`open_financa`) |

---

## 🧪 Executando Testes

```bash
# Executar todos os testes do monorepo
pnpm test

# Testes unitários da lógica matemática (@repo/shared)
pnpm --filter @repo/shared test

# Testes de integração e E2E da API (@repo/api)
pnpm --filter @repo/api test
```

---

## 📦 Build de Produção

```bash
# Compilar todos os pacotes e aplicações
pnpm build

# Iniciar o frontend em modo produção
pnpm --filter @repo/web start
```

---

## 📖 Manual de Uso Completo

Para uma explicação aprofundada da matemática financeira, motor de IA e guia de cada funcionalidade com exemplos passo a passo, consulte o [**Manual do Sistema (MANUAL_DO_SISTEMA.md)**](./MANUAL_DO_SISTEMA.md).
