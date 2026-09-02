import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UsePipes,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoiceCronService } from './invoice-cron.service';
import {
  CreateInstallmentPurchaseSchema,
  CreateInstallmentPurchaseDto,
  PayInvoiceSchema,
  PayInvoiceDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoiceCronService: InvoiceCronService,
  ) {}

  @Get('card/:cardId')
  @ApiOperation({ summary: 'List invoices for a credit card' })
  async findByCard(@Param('cardId') cardId: string) {
    return this.invoicesService.findByCard(DEFAULT_USER_ID, cardId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details and expenses by ID' })
  async findById(@Param('id') id: string) {
    return this.invoicesService.findById(DEFAULT_USER_ID, id);
  }

  @Post('installments')
  @ApiOperation({ summary: 'Record a multi-installment credit card purchase' })
  @UsePipes(new ZodValidationPipe(CreateInstallmentPurchaseSchema))
  async createInstallment(@Body() body: CreateInstallmentPurchaseDto) {
    return this.invoicesService.createInstallmentPurchase(DEFAULT_USER_ID, body);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pay an invoice from an account' })
  @UsePipes(new ZodValidationPipe(PayInvoiceSchema))
  async payInvoice(@Param('id') id: string, @Body() body: PayInvoiceDto) {
    return this.invoicesService.payInvoice(DEFAULT_USER_ID, id, body);
  }

  @Post('cron/trigger')
  @ApiOperation({ summary: 'Manually trigger invoice closing verification' })
  async triggerCron() {
    await this.invoiceCronService.runManualClosing();
    return { success: true, message: 'Invoice closing verification executed' };
  }
}
