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
import { CategoriesService } from './categories.service';
import {
  CreateCategorySchema,
  CreateCategoryDto,
  UpdateCategorySchema,
  UpdateCategoryDto,
  UserPayloadDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories (nested tree or flat list)' })
  async findAll(@CurrentUser() user: UserPayloadDto, @Query('flat') flat?: string) {
    if (flat === 'true') {
      return this.categoriesService.findFlatList(user.id);
    }
    return this.categoriesService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findById(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.categoriesService.findById(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  @UsePipes(new ZodValidationPipe(CreateCategorySchema))
  async create(@CurrentUser() user: UserPayloadDto, @Body() body: CreateCategoryDto) {
    return this.categoriesService.create(user.id, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @UsePipes(new ZodValidationPipe(UpdateCategorySchema))
  async update(
    @CurrentUser() user: UserPayloadDto,
    @Param('id') id: string,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(user.id, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  async delete(@CurrentUser() user: UserPayloadDto, @Param('id') id: string) {
    return this.categoriesService.delete(user.id, id);
  }
}
