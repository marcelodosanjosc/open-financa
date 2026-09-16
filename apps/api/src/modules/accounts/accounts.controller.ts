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
  UserPayloadDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List all accounts' })
  async findAll(@CurrentUser() user: UserPayloadDto) {
    return this.accountsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get account by ID' })
  async findById(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.accountsService.findById(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create new account' })
  @UsePipes(new ZodValidationPipe(CreateAccountSchema))
  async create(@CurrentUser() user: UserPayloadDto, @Body() body: CreateAccountDto) {
    return this.accountsService.create(user.id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update account' })
  @UsePipes(new ZodValidationPipe(UpdateAccountSchema))
  async update(
    @CurrentUser() user: UserPayloadDto,
    @Param('id') id: string,
    @Body() body: UpdateAccountDto,
  ) {
    return this.accountsService.update(user.id, id, body);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate account' })
  async deactivate(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.accountsService.deactivate(user.id, id);
  }
}
