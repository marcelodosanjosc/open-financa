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
  UserPayloadDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Budgets')
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  @ApiOperation({ summary: 'List budgets for a specific month and year' })
  async findAll(
    @CurrentUser() user: UserPayloadDto,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    return this.budgetsService.findAll(user.id, targetYear, targetMonth);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget by ID' })
  async findById(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.budgetsService.findById(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update budget for category and month' })
  @UsePipes(new ZodValidationPipe(CreateBudgetSchema))
  async createOrUpdate(@CurrentUser() user: UserPayloadDto, @Body() body: CreateBudgetDto) {
    return this.budgetsService.createOrUpdate(user.id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update budget limit' })
  @UsePipes(new ZodValidationPipe(UpdateBudgetSchema))
  async update(
    @CurrentUser() user: UserPayloadDto,
    @Param('id') id: string,
    @Body() body: UpdateBudgetDto,
  ) {
    return this.budgetsService.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete budget' })
  async delete(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.budgetsService.delete(user.id, id);
  }
}
