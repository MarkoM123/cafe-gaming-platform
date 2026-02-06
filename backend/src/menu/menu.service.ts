import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  getMenu() {
    return this.prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  getMenuPublic() {
    return this.getMenu();
  }

  getMenuAll() {
    return this.prisma.menuCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        items: {
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  createCategory(data: { name: string; sortOrder?: number }) {
    return this.prisma.menuCategory.create({
      data: {
        name: data.name,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  createItem(data: {
    categoryId: string;
    name: string;
    description?: string;
    priceCents: number;
  }) {
    return this.prisma.menuItem.create({
      data: {
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        priceCents: data.priceCents,
      },
    });
  }

  setItemAvailability(itemId: string, isActive: boolean) {
    return this.prisma.menuItem.update({
      where: { id: itemId },
      data: { isActive },
    });
  }

  updateItem(
    itemId: string,
    data: {
      name?: string;
      description?: string;
      priceCents?: number;
      categoryId?: string;
      isActive?: boolean;
    },
  ) {
    return this.prisma.menuItem.update({
      where: { id: itemId },
      data,
    });
  }
}
