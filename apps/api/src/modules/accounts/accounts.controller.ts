import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UsePipes,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import {
  CreateAccountSchema,
  CreateAccountDto,
  UpdateAccountSchema,
  UpdateAccountDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts' })
  async findAll() {
    return this.accountsService.findAll(DEFAULT_USER_ID);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  async findById(@Param('id') id: string) {
    return this.accountsService.findById(DEFAULT_USER_ID, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new account' })
  @UsePipes(new ZodValidationPipe(CreateAccountSchema))
  async create(@Body() body: CreateAccountDto) {
    return this.accountsService.create(DEFAULT_USER_ID, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update account' })
  @UsePipes(new ZodValidationPipe(UpdateAccountSchema))
  async update(@Param('id') id: string, @Body() body: UpdateAccountDto) {
    return this.accountsService.update(DEFAULT_USER_ID, id, body);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate account' })
  async deactivate(@Param('id') id: string) {
    return this.accountsService.deactivate(DEFAULT_USER_ID, id);
  }
}
