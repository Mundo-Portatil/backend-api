import { Module, forwardRef } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { LocationsModule } from '../locations/locations.module';
import { CompaniesModule } from '../companies/companies.module';
import { HardwareItemsModule } from '../hardware-items/hardware-items.module';
import { QUANTITY_STOCK_REPOSITORY } from './domain/ports/out/quantity-stock-repository.port';
import { PrismaQuantityStockRepository } from './infrastructure/adapters/out/persistence/prisma-quantity-stock.repository';
import { InboundQuantityStockUseCase } from './application/use-cases/inbound-quantity-stock.use-case';
import { AdjustQuantityStockUseCase } from './application/use-cases/adjust-quantity-stock.use-case';
import { DecreaseQuantityStockUseCase } from './application/use-cases/decrease-quantity-stock.use-case';
import { GetQuantityStocksUseCase } from './application/use-cases/get-quantity-stocks.use-case';
import { QuantityStockController } from './infrastructure/adapters/in/http/quantity-stock.controller';

@Module({
  imports: [
    CatalogModule,
    LocationsModule,
    CompaniesModule,
    forwardRef(() => HardwareItemsModule),
  ],
  controllers: [QuantityStockController],
  providers: [
    InboundQuantityStockUseCase,
    AdjustQuantityStockUseCase,
    DecreaseQuantityStockUseCase,
    GetQuantityStocksUseCase,
    {
      provide: QUANTITY_STOCK_REPOSITORY,
      useClass: PrismaQuantityStockRepository,
    },
  ],
  exports: [
    QUANTITY_STOCK_REPOSITORY,
    InboundQuantityStockUseCase,
    DecreaseQuantityStockUseCase,
    AdjustQuantityStockUseCase,
  ],
})
export class QuantityStockModule {}
