import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import {
  CreateBudgetSchema,
  CreateBudgetDto,
  UpdateBudgetSchema,
  UpdateBudgetDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Budgets')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'List budgets for a specific month and year' })
  async findAll(@Query('year') year?: string, @Query('month') month?: string) {
    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.budgetsService.findAll(DEFAULT_USER_ID, targetYear, targetMonth);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget by ID' })
  async findById(@Param('id') id: string) {
    return this.budgetsService.findById(DEFAULT_USER_ID, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update budget for category and month' })
  @UsePipes(new ZodValidationPipe(CreateBudgetSchema))
  async createOrUpdate(@Body() body: CreateBudgetDto) {
    return this.budgetsService.createOrUpdate(DEFAULT_USER_ID, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update budget limit' })
  @UsePipes(new ZodValidationPipe(UpdateBudgetSchema))
  async update(@Param('id') id: string, @Body() body: UpdateBudgetDto) {
    return this.budgetsService.update(DEFAULT_USER_ID, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete budget' })
  async delete(@Param('id') id: string) {
    return this.budgetsService.delete(DEFAULT_USER_ID, id);
  }
}
