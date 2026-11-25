import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { HardwareItemsModule } from '../hardware-items/hardware-items.module';
import { QuantityStockModule } from '../quantity-stock/quantity-stock.module';
import { LocationsModule } from '../locations/locations.module';
import { CatalogModule } from '../catalog/catalog.module';

// Domain Ports
import { SERVICE_ORDER_REPOSITORY } from './domain/ports/out/service-order-repository.port';
import { SERVICE_ORDER_CODE_GENERATOR } from './domain/ports/out/service-order-code-generator.port';
import { RECEIPT_NUMBER_GENERATOR } from './domain/ports/out/receipt-number-generator.port';
import { ELECTRONIC_BILLING_PORT } from './domain/ports/out/electronic-billing.port';

// Adapters
import { PrismaServiceOrderRepository } from './infrastructure/adapters/out/persistence/prisma-service-order.repository';
import { CryptoServiceOrderCodeGeneratorAdapter } from './infrastructure/adapters/out/generators/crypto-service-order-code-generator.adapter';
import { SequentialReceiptNumberGeneratorAdapter } from './infrastructure/adapters/out/generators/sequential-receipt-number-generator.adapter';
import { InternalReceiptBillingAdapter } from './infrastructure/adapters/out/billing/internal-receipt-billing.adapter';

// Use Cases
import { CreateServiceOrderUseCase } from './application/use-cases/create-service-order.use-case';
import { GetServiceOrdersUseCase } from './application/use-cases/get-service-orders.use-case';
import { GetServiceOrderDetailUseCase } from './application/use-cases/get-service-order-detail.use-case';
import { UpdateServiceOrderUseCase } from './application/use-cases/update-service-order.use-case';
import { ChangeServiceOrderStatusUseCase } from './application/use-cases/change-service-order-status.use-case';
import { AddServiceItemUseCase } from './application/use-cases/add-service-item.use-case';
import { RemoveServiceItemUseCase } from './application/use-cases/remove-service-item.use-case';
import { DeliverServiceOrderUseCase } from './application/use-cases/deliver-service-order.use-case';
import { GetServiceReceiptUseCase } from './application/use-cases/get-service-receipt.use-case';

// Controller
import { ServiceOrdersController } from './infrastructure/adapters/in/http/service-orders.controller';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    HardwareItemsModule,
    QuantityStockModule,
    LocationsModule,
    CatalogModule,
  ],
  controllers: [ServiceOrdersController],
  providers: [
    CreateServiceOrderUseCase,
    GetServiceOrdersUseCase,
    GetServiceOrderDetailUseCase,
    UpdateServiceOrderUseCase,
    ChangeServiceOrderStatusUseCase,
    AddServiceItemUseCase,
    RemoveServiceItemUseCase,
    DeliverServiceOrderUseCase,
    GetServiceReceiptUseCase,
    {
      provide: SERVICE_ORDER_REPOSITORY,
      useClass: PrismaServiceOrderRepository,
    },
    {
      provide: SERVICE_ORDER_CODE_GENERATOR,
      useClass: CryptoServiceOrderCodeGeneratorAdapter,
    },
    {
      provide: RECEIPT_NUMBER_GENERATOR,
      useClass: SequentialReceiptNumberGeneratorAdapter,
    },
    {
      provide: ELECTRONIC_BILLING_PORT,
      useClass: InternalReceiptBillingAdapter,
    },
  ],
  exports: [
    SERVICE_ORDER_REPOSITORY,
    CreateServiceOrderUseCase,
    GetServiceOrdersUseCase,
    GetServiceOrderDetailUseCase,
    UpdateServiceOrderUseCase,
    ChangeServiceOrderStatusUseCase,
    AddServiceItemUseCase,
    RemoveServiceItemUseCase,
    DeliverServiceOrderUseCase,
    GetServiceReceiptUseCase,
  ],
})
export class ServiceOrdersModule {}
