import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UsePipes,
} from '@nestjs/common';
import { CreditCardsService } from './credit-cards.service';
import {
  CreateCreditCardSchema,
  CreateCreditCardDto,
  UpdateCreditCardSchema,
  UpdateCreditCardDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Credit Cards')
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Get()
  @ApiOperation({ summary: 'List all credit cards' })
  async findAll() {
    return this.creditCardsService.findAll(DEFAULT_USER_ID);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credit card details by ID' })
  async findById(@Param('id') id: string) {
    return this.creditCardsService.findById(DEFAULT_USER_ID, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new credit card' })
  @UsePipes(new ZodValidationPipe(CreateCreditCardSchema))
  async create(@Body() body: CreateCreditCardDto) {
    return this.creditCardsService.create(DEFAULT_USER_ID, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update credit card' })
  @UsePipes(new ZodValidationPipe(UpdateCreditCardSchema))
  async update(@Param('id') id: string, @Body() body: UpdateCreditCardDto) {
    return this.creditCardsService.update(DEFAULT_USER_ID, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete credit card' })
  async delete(@Param('id') id: string) {
    return this.creditCardsService.delete(DEFAULT_USER_ID, id);
  }
}
