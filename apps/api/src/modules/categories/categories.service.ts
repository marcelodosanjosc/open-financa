import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from '@repo/shared';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const parentCategories = await this.prisma.category.findMany({
      where: { userId, parentId: null },
      include: {
        subcategories: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return parentCategories.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      icon: p.icon,
      color: p.color,
      classification: p.classification,
      parentId: p.parentId,
      createdAt: p.createdAt.toISOString(),
      subcategories: p.subcategories.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.name,
        icon: s.icon,
        color: s.color,
        classification: s.classification,
        parentId: s.parentId,
        createdAt: s.createdAt.toISOString(),
      })),
    }));
  }

  async findFlatList(userId: string) {
    const categories = await this.prisma.category.findMany({
      where: { userId },
      include: { parent: true },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.name,
      icon: c.icon,
      color: c.color,
      classification: c.classification,
      parentId: c.parentId,
      parentName: c.parent ? c.parent.name : null,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  async findById(userId: string, id: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, userId },
      include: { subcategories: true, parent: true },
    });

    if (!cat) {
      throw new NotFoundException(`Categoria com ID ${id} não encontrada`);
    }

    return {
      id: cat.id,
      userId: cat.userId,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      classification: cat.classification,
      parentId: cat.parentId,
      parentName: cat.parent ? cat.parent.name : null,
      createdAt: cat.createdAt.toISOString(),
      subcategories: cat.subcategories.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.name,
        icon: s.icon,
        color: s.color,
        classification: s.classification,
        parentId: s.parentId,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  }

  async create(userId: string, data: CreateCategoryDto) {
    const created = await this.prisma.category.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        classification: data.classification,
        parentId: data.parentId,
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      name: created.name,
      icon: created.icon,
      color: created.color,
      classification: created.classification,
      parentId: created.parentId,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async update(userId: string, id: string, data: UpdateCategoryDto) {
    await this.findById(userId, id);

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        classification: data.classification,
        parentId: data.parentId,
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      icon: updated.icon,
      color: updated.color,
      classification: updated.classification,
      parentId: updated.parentId,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async delete(userId: string, id: string) {
    await this.findById(userId, id);
    await this.prisma.category.delete({
      where: { id },
    });
    return { success: true };
  }
}
