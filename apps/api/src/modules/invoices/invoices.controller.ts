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
  UserPayloadDto,
} from '@repo/shared';
import { UserRole } from '@prisma/client';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
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
  async findByCard(@CurrentUser() user: UserPayloadDto, @Param('cardId') cardId: string) {
    return this.invoicesService.findByCard(user.id, cardId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details and expenses by ID' })
  async findById(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.invoicesService.findById(user.id, id);
  }

  @Post('installments')
  @ApiOperation({ summary: 'Record a multi-installment credit card purchase' })
  @UsePipes(new ZodValidationPipe(CreateInstallmentPurchaseSchema))
  async createInstallment(
    @CurrentUser() user: UserPayloadDto,
    @Body() body: CreateInstallmentPurchaseDto,
  ) {
    return this.invoicesService.createInstallmentPurchase(user.id, body);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: 'Pay an invoice from an account' })
  @UsePipes(new ZodValidationPipe(PayInvoiceSchema))
  async payInvoice(
    @CurrentUser() user: UserPayloadDto,
    @Param('id') id: string,
    @Body() body: PayInvoiceDto,
  ) {
    return this.invoicesService.payInvoice(user.id, id, body);
  }

  @Roles(UserRole.ADMIN)
  @Post('cron/trigger')
  @ApiOperation({ summary: 'Manually trigger invoice closing verification (Admin only)' })
  async triggerCron() {
    await this.invoiceCronService.runManualClosing();
    return { success: true, message: 'Invoice closing verification executed' };
  }
}
