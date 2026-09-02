import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoiceCronService } from './invoice-cron.service';
import { AccountsModule } from '../accounts/accounts.module';

@Module({
  imports: [AccountsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoiceCronService],
  exports: [InvoicesService, InvoiceCronService],
})
export class InvoicesModule {}
