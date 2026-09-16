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
  UserPayloadDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Credit Cards')
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Get()
  @ApiOperation({ summary: 'List all credit cards' })
  async findAll(@CurrentUser() user: UserPayloadDto) {
    return this.creditCardsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credit card details by ID' })
  async findById(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.creditCardsService.findById(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new credit card' })
  @UsePipes(new ZodValidationPipe(CreateCreditCardSchema))
  async create(@CurrentUser() user: UserPayloadDto, @Body() body: CreateCreditCardDto) {
    return this.creditCardsService.create(user.id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update credit card' })
  @UsePipes(new ZodValidationPipe(UpdateCreditCardSchema))
  async update(
    @CurrentUser() user: UserPayloadDto,
    @Param('id') id: string,
    @Body() body: UpdateCreditCardDto,
  ) {
    return this.creditCardsService.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete credit card' })
  async delete(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.creditCardsService.delete(user.id, id);
  }
}
