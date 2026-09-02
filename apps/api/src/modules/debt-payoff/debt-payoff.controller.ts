import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DebtPayoffService } from './debt-payoff.service';
import { DebtPayoffStrategy, DebtItem } from '@repo/shared';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Debt Payoff')
@Controller('debt-payoff')
export class DebtPayoffController {
  constructor(private readonly debtPayoffService: DebtPayoffService) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Get committed future invoices timeline' })
  async getFutureTimeline() {
    return this.debtPayoffService.getFutureTimeline(DEFAULT_USER_ID);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Run debt freedom payoff simulation' })
  async simulate(
    @Body()
    body: {
      debts?: DebtItem[];
      monthlyContribution: number;
      strategy?: DebtPayoffStrategy;
    },
  ) {
    return this.debtPayoffService.simulate(DEFAULT_USER_ID, body);
  }
}
