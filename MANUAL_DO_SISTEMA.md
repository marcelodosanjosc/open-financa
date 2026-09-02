# 📘 Open Finança — Manual Completo do Sistema & Guia Prático

Este documento apresenta a arquitetura funcional, as regras de negócio, a matemática financeira e um guia passo a passo com exemplos práticos de uso do **Open Finança**.

---

## 📑 Sumário

1. [Visão Geral e Conceito](#1-visão-geral-e-conceito)
2. [Arquitetura dos Módulos Funcionais](#2-arquitetura-dos-módulos-funcionais)
   - [2.1 Livro-Razão & Contas Bancárias](#21-livro-razão--contas-bancárias)
   - [2.2 Classificação de Custos em 4 Quadrantes](#22-classificação-de-custos-em-4-quadrantes)
   - [2.3 Orçamentos & Metas Mensais](#23-orçamentos--metas-mensais)
   - [2.4 Motor de Cartões de Crédito & Parcelamentos](#24-motor-de-cartões-de-crédito--parcelamentos)
   - [2.5 Motor de Quitação Acelerada de Dívidas](#25-motor-de-quitação-acelerada-de-dívidas)
   - [2.6 Ingestão em Lote & Classificação com IA](#26-ingestão-em-lote--classificação-com-ia)
3. [Guia Prático com Exemplos Passo a Passo](#3-guia-prático-com-exemplos-passo-a-passo)
   - [Exemplo 1: Cadastrar Conta e Lançar Receita](#exemplo-1-cadastrar-conta-e-lançar-receita)
   - [Exemplo 2: Registrar Compra Parcelada no Cartão](#exemplo-2-registrar-compra-parcelada-no-cartão)
   - [Exemplo 3: Pagar Fatura de Cartão](#exemplo-3-pagar-fatura-de-cartão)
   - [Exemplo 4: Importar Fatura PDF com IA](#exemplo-4-importar-fatura-pdf-com-ia)
   - [Exemplo 5: Simular Quitação de Dívidas](#exemplo-5-simular-quitação-de-dívidas)
4. [Referência da API REST & Swagger](#4-referência-da-api-rest--swagger)

---

## 1. Visão Geral e Conceito

O **Open Finança** foi projetado para resolver as principais limitações das planilhas manuais e aplicativos convencionais:
- **Precisão Financeira Estrita**: Todos os cálculos monetários utilizam tipos decimais exatos (`Prisma.Decimal(14,2)`), eliminando perdas de centavos por arredondamento de ponto flutuante em JavaScript.
- **Divisão Exata de Parcelas**: O resto da divisão em centavos é somado integralmente à **primeira parcela** (ex: R$ 100,00 em 3x = 1x R$ 33,34 + 2x R$ 33,33).
- **Conciliação e Deduplicação Atômica**: Extratos OFX, CSVs e faturas em PDF utilizam chaves únicas `<FITID>` e hashes criptográficos SHA-256 para impedir transações duplicadas.
- **Classificação de Custos 4-Quadrantes**: Separa gastos entre Fixos vs Variáveis e Essenciais vs Supérfluos para clareza sobre onde cortar despesas.
- **Previsibilidade & Quitação de Dívidas**: Gráficos da linha do tempo futura e simulações matemáticas dos métodos Avalanche e Bola de Neve.

---

## 2. Arquitetura dos Módulos Funcionais

### 2.1 Livro-Razão & Contas Bancárias

O módulo de contas gerencia o saldo das contas correntes, poupanças e investimentos.

- **Tipos de Transação Suportados**:
  - `INCOME`: Receitas (Salário, Dividendos, Vendas) -> Incrementa o saldo da conta.
  - `EXPENSE`: Despesas (Mercado, Combustível, Aluguel) -> Decrementa o saldo da conta.
  - `TRANSFER`: Transferência entre contas -> Operação atômica em transação de banco de dados (`$transaction`), debitando a conta origem e creditando a conta destino.
  - `INVOICE_PAYMENT`: Liquidação de fatura de cartão -> Debita a conta bancária e altera o status da fatura para `PAID`.
- **Conciliação Bancária**: Cada transação possui uma flag booleana `isReconciled`. Permite ao usuário bater o extrato real com o sistema item a item.

---

### 2.2 Classificação de Custos em 4 Quadrantes

Toda categoria de despesa pertence a uma das classificações:

```
                  ESSENCIAL                      SUPÉRFLUO / DISCRICIONÁRIO
          ┌──────────────────────────────┬────────────────────────────────────┐
   FIXO   │  Aluguel, Condomínio,        │  Streaming (Netflix, Spotify),     │
          │  Internet, Energia Elétrica  │  Assinaturas de Academia           │
          ├──────────────────────────────┼────────────────────────────────────┤
 VARIÁVEL │  Supermercado, Farmácia,     │  Restaurantes caros, Baladas,      │
          │  Combustível diário          │  Compras por impulso / Roupas      │
          └──────────────────────────────┴────────────────────────────────────┘
```

O dashboard exibe dinamicamente o total consumido em cada quadrante, permitindo saber instantaneamente qual proporção da renda está comprometida com obrigações fixas versus despesas flexíveis.

---

### 2.3 Orçamentos & Metas Mensais

Permite definir limites de gastos por categoria para cada mês/ano.
- **Acompanhamento em Tempo Real**: Calcula a soma de despesas da categoria na competência e o percentual consumido.
- **Alertas Visuais**:
  - `< 80%`: Barra verde (Normal).
  - `80% - 99%`: Barra amarela (Atenção).
  - `>= 100%`: Barra vermelha com selo de **"Estourado"** e indicação do valor ultrapassado.

---

### 2.4 Motor de Cartões de Crédito & Parcelamentos

O módulo de cartões de crédito opera com regras bancárias reais brasileiras:

#### 1. Cálculo de Ciclos de Fatura
Cada cartão possui `closingDay` (dia de corte) e `dueDay` (dia de vencimento).
- Se a compra foi feita em um dia **<= closingDay**: ela entra na fatura do mês atual.
- Se a compra foi feita em um dia **> closingDay**: ela entra na fatura do mês seguinte (o chamado "melhor dia de compra").

#### 2. Regra Matemática da Divisão de Centavos
Ao registrar uma compra parcelada em $N$ vezes, o valor base por parcela é:
$$\text{parcelaBase} = \lfloor \frac{\text{valorTotal}}{N} \times 100 \rfloor \div 100$$
$$\text{restoCentavos} = \text{valorTotal} - (\text{parcelaBase} \times N)$$

- A **Parcela 1** recebe $\text{parcelaBase} + \text{restoCentavos}$.
- As **Parcelas 2 a N** recebem $\text{parcelaBase}$.

#### Exemplo Prático de Divisão:
Para uma compra de **R$ 100,00** em **3x**:
- Parcela Base: $\lfloor 100 / 3 \times 100 \rfloor / 100 = 33,33$
- Resto em centavos: $100,00 - (33,33 \times 3) = 100,00 - 99,99 = \mathbf{0,01}$
- **Parcela 1/3**: R$ 33,34
- **Parcela 2/3**: R$ 33,33
- **Parcela 3/3**: R$ 33,33
- **Soma Total**: R$ 33,34 + R$ 33,33 + R$ 33,33 = **R$ 100,00 exatos**.

---

### 2.5 Motor de Quitação Acelerada de Dívidas

O sistema analisa todas as faturas futuras abertas e dívidas cadastradas para simular a liberdade financeira:

1. **Estratégia Avalanche (Maior Taxa de Juros Primeiro)**:
   - Direciona o aporte extra prioritariamente para a dívida com a maior taxa de juros mensal (ex: Rotativo de Cartão a 15,4% a.m.).
   - **Objetivo**: Minimizar o montante total pago em juros aos bancos.
2. **Estratégia Bola de Neve (Menor Saldo Primeiro)**:
   - Direciona o aporte extra para a dívida de menor saldo devedor.
   - **Objetivo**: Eliminar linhas de dívida mais rápido, gerando vitórias psicológicas imediatas.
3. **Economia em Juros Calculada**:
   - Compara o total pago nas estratégias aceleradas versus o pagamento apenas do mínimo, apresentando a economia real em Reais (R$) e a data exata em que você estará livre de dívidas.

---

### 2.6 Ingestão em Lote & Classificação com IA

O módulo de importação permite arrastar arquivos nos formatos:
- **`.OFX` (Open Financial Exchange)**: Extração bancária de fitids, datas e valores com deduplicação nativa.
- **`.CSV` (Planilhas e Extratos)**: Detecção flexível de colunas com hash SHA-256 por linha.
- **`.PDF` (Faturas de Cartão - Itaú, Nubank, Bradesco, etc.)**: Leitura inteligente de colunas compactadas, extração de parcelas (`04/07`, `12/12`) e exclusão automática de resumos de fatura.

#### Motor de IA Híbrido:
```
                      ┌────────────────────────────┐
                      │  Transações do Arquivo PDF │
                      └──────────────┬─────────────┘
                                     │
                        POST /api/.../ai-classify
                                     │
                       ┌─────────────▼─────────────┐
                       │  Ollama Local Disponível? │
                       └──────┬─────────────┬──────┘
                              │ SIM         │ NÃO (ou timeout > 6s)
                              ▼             ▼
              ┌──────────────────────┐   ┌───────────────────────────┐
              │ Modelo Local         │   │ Motor Heurístico          │
              │ (ex: Llama 3 / Mist) │   │ Regras de Alta Precisão   │
              │ Prompt com Contexto  │   │ Dicionário de Termos BR   │
              │ Histórico do Usuário │   │ Confiança: 85% a 98%      │
              └──────────────┬───────┘   └─────────────┬─────────────┘
                             │                         │
                             └───────────►◄────────────┘
                                         │
                        [{ tempId, categoryId, confidence }]
                                         │
                             Tabela de Pré-visualização
                             com badges "✨ IA (96%)"
```

---

## 3. Guia Prático com Exemplos Passo a Passo

### Exemplo 1: Cadastrar Conta e Lançar Receita

1. Acesse **Contas Bancárias** (`http://localhost:3000/contas`).
2. Clique em **"Nova Conta"**.
3. Preencha:
   - **Nome**: *Banco Inter*
   - **Tipo**: *Conta Corrente*
   - **Saldo Inicial**: *R$ 2.500,00*
4. Clique em **Salvar Conta**.
5. Acesse **Lançamentos** (`/transacoes`) e clique em **"Nova Transação"**:
   - **Conta**: *Banco Inter*
   - **Tipo**: *Receita (+)*
   - **Descrição**: *Salário Mensal*
   - **Valor**: *R$ 6.000,00*
   - **Categoria**: *Salário (Renda)*
   - **Data**: *Hoje*
6. Clique em **Salvar Lançamento**. O saldo do Banco Inter será atualizado instantaneamente para **R$ 8.500,00**.

---

### Exemplo 2: Registrar Compra Parcelada no Cartão

1. Acesse **Cartões & Faturas** (`http://localhost:3000/cartoes`).
2. Clique no botão **"Nova Compra Parcelada"** no cabeçalho.
3. Preencha:
   - **Cartão**: *Itaú Uniclass Visa (Fechamento dia 28 / Vencimento dia 08)*
   - **Descrição**: *Geladeira Frost Free*
   - **Valor Total**: *R$ 3.500,00*
   - **Número de Parcelas**: *10*
   - **Categoria**: *Eletrodomésticos & Casa*
   - **Data da Compra**: *15/08/2026*
4. Clique em **Salvar Lançamento**.
5. O sistema distribuirá automaticamente 10 parcelas de **R$ 350,00** nos meses consecutivos (Agosto/2026 até Maio/2027), criando as faturas correspondentes no banco de dados e debitando o limite disponível do cartão.

---

### Exemplo 3: Pagar Fatura de Cartão

1. Acesse **Cartões & Faturas** (`/cartoes`).
2. Na lista de faturas do cartão, localize a fatura com status **Aberta** ou **Fechada**.
3. Clique no botão **"Pagar Fatura"**.
4. Selecione a **Conta Bancária de Débito** (ex: *Banco Inter*) e confirme a data do pagamento.
5. Clique em **Confirmar Pagamento**.
6. **O que o sistema faz automaticamente:**
   - Altera o status da fatura para `PAID` (Paga).
   - Cria uma transação do tipo `INVOICE_PAYMENT` debitando o valor da fatura do saldo da conta bancária.
   - Restabelece o limite de crédito disponível no cartão.

---

### Exemplo 4: Importar Fatura PDF com IA

1. Acesse **Importação em Lote** (`http://localhost:3000/importacao`).
2. Arraste o arquivo `conta-fatura-itau.pdf` para o painel de upload.
3. O parser processará o arquivo e exibirá a contagem de transações (ex: *127 transações encontradas*).
4. No topo da tabela, clique no botão **"✨ Classificar com IA"**.
5. Em instantes, o motor de inteligência categorizará todos os lançamentos:
   - `DL*UberRides` -> **Transporte**
   - `IFD*Restaurante` -> **Restaurantes & Delivery**
   - `PAGUEMENOS` -> **Farmácia**
   - `Google One` -> **Streaming & Assinaturas**
6. Revise as categorias e desmarque qualquer linha duplicada que não deseje importar.
7. Selecione o **Destino** (*Cartão de Crédito -> Itaú Uniclass*) e clique em **"Confirmar Importação"**.

---

### Exemplo 5: Simular Quitação de Dívidas

1. Acesse **Quitação de Dívidas** (`http://localhost:3000/simulador-dividas`).
2. No painel principal:
   - Ajuste o controle de **Aporte Mensal Extra** (ex: *R$ 800,00*).
   - Alterne entre as estratégias **Avalanche (Maior Taxa de Juros)** e **Bola de Neve (Menor Saldo)**.
3. O gráfico de amortização recalcula em tempo real:
   - Mostra a data exata de liberdade de dívidas.
   - Exibe a economia líquida comparada ao pagamento de juros mínimos.
4. Você também pode cadastrar dívidas externas adicionais (como financiamento de carro ou consignado) na tabela inferior para planejar a quitação de todo o seu endividamento.

---

## 4. Referência da API REST & Swagger

A documentação interativa Swagger está disponível em:  
👉 **[http://localhost:3001/api/docs](http://localhost:3001/api/docs)**

### Principais Endpoints da API:

| Módulo | Método | Rota | Descrição |
| :--- | :--- | :--- | :--- |
| **Dashboard** | `GET` | `/api/dashboard/summary?year=2026&month=8` | Métricas de KPIs, fluxo de caixa e 4 quadrantes |
| **Contas** | `GET` | `/api/accounts` | Lista contas ativas com saldos atualizados |
| | `POST` | `/api/accounts` | Cria nova conta bancária |
| **Transações** | `GET` | `/api/transactions` | Lista lançamentos com filtros de conta, tipo e data |
| | `POST` | `/api/transactions` | Cria receita, despesa ou transferência |
| | `PATCH` | `/api/transactions/:id/reconcile` | Alterna status de conciliação bancária |
| **Cartões** | `GET` | `/api/credit-cards` | Lista cartões, limites e faturas atuais |
| | `POST` | `/api/invoices/installments` | Lança compra parcelada com divisão exata |
| | `POST` | `/api/invoices/:id/pay` | Liquida fatura com débito em conta |
| **Dívidas** | `GET` | `/api/debt-payoff/timeline` | Linha do tempo de faturas futuras comprometidas |
| | `POST` | `/api/debt-payoff/simulate` | Simula estratégias Avalanche e Bola de Neve |
| **Importação**| `POST` | `/api/statement-import/preview` | Upload e pré-visualização de OFX, CSV ou PDF |
| | `POST` | `/api/statement-import/ai-classify` | Classificação inteligente em lote com IA |
| | `POST` | `/api/statement-import/confirm` | Persistência das transações conciliadas |
| **Orçamentos**| `GET` | `/api/budgets?year=2026&month=8` | Metas mensais e percentual consumido |
| | `POST` | `/api/budgets` | Cria ou atualiza teto orçamentário por categoria |
