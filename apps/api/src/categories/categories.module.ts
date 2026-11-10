import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { GetCategoryByIdHandler } from './handlers/get-category-by-id.handler';

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, GetCategoryByIdHandler],
})
export class CategoriesModule {}
