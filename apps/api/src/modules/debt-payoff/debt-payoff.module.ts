import { Module } from '@nestjs/common';
import { DebtPayoffController } from './debt-payoff.controller';
import { DebtPayoffService } from './debt-payoff.service';

@Module({
  controllers: [DebtPayoffController],
  providers: [DebtPayoffService],
  exports: [DebtPayoffService],
})
export class DebtPayoffModule {}
