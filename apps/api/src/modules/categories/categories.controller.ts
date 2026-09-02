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
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DEFAULT_USER_ID } from '../../common/constants';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories (nested tree or flat list)' })
  async findAll(@Query('flat') flat?: string) {
    if (flat === 'true') {
      return this.categoriesService.findFlatList(DEFAULT_USER_ID);
    }
    return this.categoriesService.findAll(DEFAULT_USER_ID);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(DEFAULT_USER_ID, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  @UsePipes(new ZodValidationPipe(CreateCategorySchema))
  async create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(DEFAULT_USER_ID, body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @UsePipes(new ZodValidationPipe(UpdateCategorySchema))
  async update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.update(DEFAULT_USER_ID, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(DEFAULT_USER_ID, id);
  }
}
