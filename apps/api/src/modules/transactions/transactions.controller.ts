import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UsePipes,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import {
  CreateTransactionSchema,
  CreateTransactionDto,
  UpdateTransactionSchema,
  UpdateTransactionDto,
  TransactionType,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions with optional filters' })
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('accountId') accountId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: TransactionType,
    @Query('isReconciled') isReconciled?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.transactionsService.findAll(DEFAULT_USER_ID, {
      startDate,
      endDate,
      accountId,
      categoryId,
      type,
      isReconciled: isReconciled !== undefined ? isReconciled === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findById(@Param('id') id: string) {
    return this.transactionsService.findById(DEFAULT_USER_ID, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new transaction' })
  @UsePipes(new ZodValidationPipe(CreateTransactionSchema))
  async create(@Body() body: CreateTransactionDto) {
    return this.transactionsService.create(DEFAULT_USER_ID, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update transaction' })
  @UsePipes(new ZodValidationPipe(UpdateTransactionSchema))
  async update(@Param('id') id: string, @Body() body: UpdateTransactionDto) {
    return this.transactionsService.update(DEFAULT_USER_ID, id, body);
  }

  @Patch(':id/reconcile')
  @ApiOperation({ summary: 'Toggle reconciliation status' })
  async toggleReconcile(
    @Param('id') id: string,
    @Body('isReconciled') isReconciled: boolean,
  ) {
    return this.transactionsService.toggleReconciled(DEFAULT_USER_ID, id, isReconciled ?? true);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete transaction' })
  async delete(@Param('id') id: string) {
    return this.transactionsService.delete(DEFAULT_USER_ID, id);
  }
}
