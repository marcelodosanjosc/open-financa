import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CreditCardsModule } from './modules/credit-cards/credit-cards.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { DebtPayoffModule } from './modules/debt-payoff/debt-payoff.module';
import { StatementImportModule } from './modules/statement-import/statement-import.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AccountsModule,
    CategoriesModule,
    BudgetsModule,
    TransactionsModule,
    CreditCardsModule,
    InvoicesModule,
    DebtPayoffModule,
    StatementImportModule,
    DashboardModule,
  ],
})
export class AppModule {}
