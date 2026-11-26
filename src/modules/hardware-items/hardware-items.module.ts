import { Module, forwardRef } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { LocationsModule } from '../locations/locations.module';
import { CompaniesModule } from '../companies/companies.module';
import { QuantityStockModule } from '../quantity-stock/quantity-stock.module';
import { HARDWARE_ITEM_REPOSITORY } from './domain/ports/out/hardware-item-repository.port';
import { SERIAL_GENERATOR_PORT } from './domain/ports/out/serial-generator.port';
import { PrismaHardwareItemRepository } from './infrastructure/adapters/out/persistence/prisma-hardware-item.repository';
import { CryptoSerialGeneratorAdapter } from './infrastructure/adapters/out/generator/crypto-serial-generator.adapter';
import { CreateHardwareItemUseCase } from './application/use-cases/create-hardware-item.use-case';
import { ValidateSerialsUseCase } from './application/use-cases/validate-serials.use-case';
import { GetHardwareItemsUseCase } from './application/use-cases/get-hardware-items.use-case';
import { GetAvailableSerialsUseCase } from './application/use-cases/get-available-serials.use-case';
import { ScanHardwareItemUseCase } from './application/use-cases/scan-hardware-item.use-case';
import { GetHardwareItemDetailUseCase } from './application/use-cases/get-hardware-item-detail.use-case';
import { GetHardwareLifecycleUseCase } from './application/use-cases/get-hardware-lifecycle.use-case';
import { GetBarcodeLabelUseCase } from './application/use-cases/get-barcode-label.use-case';
import { GetBatchBarcodeLabelsUseCase } from './application/use-cases/get-batch-barcode-labels.use-case';
import { UpdateHardwareItemUseCase } from './application/use-cases/update-hardware-item.use-case';
import { DecommissionHardwareItemUseCase } from './application/use-cases/decommission-hardware-item.use-case';
import { ApproveUsedComponentUseCase } from './application/use-cases/approve-used-component.use-case';
import { HardwareItemsController } from './infrastructure/adapters/in/http/hardware-items.controller';

@Module({
  imports: [
    CatalogModule,
    LocationsModule,
    CompaniesModule,
    forwardRef(() => QuantityStockModule),
  ],
  controllers: [HardwareItemsController],
  providers: [
    CreateHardwareItemUseCase,
    ValidateSerialsUseCase,
    GetHardwareItemsUseCase,
    GetAvailableSerialsUseCase,
    ScanHardwareItemUseCase,
    GetHardwareItemDetailUseCase,
    GetHardwareLifecycleUseCase,
    GetBarcodeLabelUseCase,
    GetBatchBarcodeLabelsUseCase,
    UpdateHardwareItemUseCase,
    DecommissionHardwareItemUseCase,
    ApproveUsedComponentUseCase,
    {
      provide: HARDWARE_ITEM_REPOSITORY,
      useClass: PrismaHardwareItemRepository,
    },
    {
      provide: SERIAL_GENERATOR_PORT,
      useClass: CryptoSerialGeneratorAdapter,
    },
  ],
  exports: [
    HARDWARE_ITEM_REPOSITORY,
    ApproveUsedComponentUseCase,
    ScanHardwareItemUseCase,
    GetHardwareItemDetailUseCase,
    GetAvailableSerialsUseCase,
  ],
})
export class HardwareItemsModule {}
