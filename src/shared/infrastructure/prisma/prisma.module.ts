import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TRANSACTION_MANAGER_PORT } from '../../domain/ports/transaction-manager.port';
import { PrismaTransactionManagerAdapter } from '../adapters/prisma-transaction-manager.adapter';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: TRANSACTION_MANAGER_PORT,
      useClass: PrismaTransactionManagerAdapter,
    },
  ],
  exports: [PrismaService, TRANSACTION_MANAGER_PORT],
})
export class PrismaModule {}

