import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { DebtPayoffService } from './debt-payoff.service';
import { DebtPayoffStrategy, DebtItem, UserPayloadDto } from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Debt Payoff')
@Controller('debt-payoff')
export class DebtPayoffController {
  constructor(private readonly debtPayoffService: DebtPayoffService) {}

  @Get('timeline')
  @ApiOperation({ summary: 'Get committed future invoices timeline' })
  async getFutureTimeline(@CurrentUser() user: UserPayloadDto) {
    return this.debtPayoffService.getFutureTimeline(user.id);
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Run debt freedom payoff simulation' })
  async simulate(
    @CurrentUser() user: UserPayloadDto,
    @Body()
    body: {
      debts?: DebtItem[];
      monthlyContribution: number;
      strategy?: DebtPayoffStrategy;
    },
  ) {
    return this.debtPayoffService.simulate(user.id, body);
  }
}
