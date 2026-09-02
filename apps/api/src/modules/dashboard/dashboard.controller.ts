import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get current month dashboard summary KPIs and cost classification' })
  async getSummary(@Query('year') year?: string, @Query('month') month?: string) {
    const y = year ? parseInt(year, 10) : undefined;
    const m = month ? parseInt(month, 10) : undefined;
    return this.dashboardService.getSummary(DEFAULT_USER_ID, y, m);
  }

  @Get('recent-transactions')
  @ApiOperation({ summary: 'Get recent transactions for dashboard preview' })
  async getRecent() {
    return this.dashboardService.getRecentTransactions(DEFAULT_USER_ID);
  }
}
