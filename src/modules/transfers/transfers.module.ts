import { Module } from '@nestjs/common';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { HardwareItemsModule } from '../hardware-items/hardware-items.module';
import { QuantityStockModule } from '../quantity-stock/quantity-stock.module';
import { LocationsModule } from '../locations/locations.module';
import { UsersModule } from '../users/users.module';

import { TRANSFER_REPOSITORY } from './domain/ports/out/transfer-repository.port';
import { TRANSFER_CODE_GENERATOR } from './domain/ports/out/transfer-code-generator.port';
import { PrismaTransferRepository } from './infrastructure/adapters/out/persistence/prisma-transfer.repository';
import { CryptoTransferCodeGeneratorAdapter } from './infrastructure/adapters/out/generators/crypto-transfer-code-generator.adapter';

import { CreateDirectTransferUseCase } from './application/use-cases/create-direct-transfer.use-case';
import { GetTransfersUseCase } from './application/use-cases/get-transfers.use-case';
import { GetTransferDetailUseCase } from './application/use-cases/get-transfer-detail.use-case';

import { TransfersController } from './infrastructure/adapters/in/http/transfers.controller';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
    HardwareItemsModule,
    QuantityStockModule,
    LocationsModule,
    UsersModule,
  ],
  controllers: [TransfersController],
  providers: [
    CreateDirectTransferUseCase,
    GetTransfersUseCase,
    GetTransferDetailUseCase,
    {
      provide: TRANSFER_REPOSITORY,
      useClass: PrismaTransferRepository,
    },
    {
      provide: TRANSFER_CODE_GENERATOR,
      useClass: CryptoTransferCodeGeneratorAdapter,
    },
  ],
  exports: [
    TRANSFER_REPOSITORY,
    CreateDirectTransferUseCase,
    GetTransfersUseCase,
    GetTransferDetailUseCase,
  ],
})
export class TransfersModule {}
