import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { LocationsModule } from '../locations/locations.module';
import { HardwareItemsModule } from '../hardware-items/hardware-items.module';
import { QuantityStockModule } from '../quantity-stock/quantity-stock.module';
import { UnifiedInventoryInboundUseCase } from './application/use-cases/unified-inventory-inbound.use-case';
import { PrintModelBarcodeLabelsUseCase } from './application/use-cases/print-model-barcode-labels.use-case';
import { InventoryController } from './infrastructure/adapters/in/http/inventory.controller';

@Module({
  imports: [
    CatalogModule,
    LocationsModule,
    HardwareItemsModule,
    QuantityStockModule,
  ],
  controllers: [InventoryController],
  providers: [
    UnifiedInventoryInboundUseCase,
    PrintModelBarcodeLabelsUseCase,
  ],
  exports: [
    UnifiedInventoryInboundUseCase,
    PrintModelBarcodeLabelsUseCase,
  ],
})
export class InventoryModule {}
