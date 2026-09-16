import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UserPayloadDto } from '@repo/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get current month dashboard summary KPIs and cost classification' })
  async getSummary(
    @CurrentUser() user: UserPayloadDto,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? parseInt(year, 10) : undefined;
    const m = month ? parseInt(month, 10) : undefined;
    return this.dashboardService.getSummary(user.id, y, m);
  }

  @Get('recent-transactions')
  @ApiOperation({ summary: 'Get recent transactions for dashboard preview' })
  async getRecent(@CurrentUser() user: UserPayloadDto) {
    return this.dashboardService.getRecentTransactions(user.id);
  }
}
