import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TransactionManagerPort } from '../../domain/ports/transaction-manager.port';

@Injectable()
export class PrismaTransactionManagerAdapter implements TransactionManagerPort {
  constructor(private readonly prisma: PrismaService) {}

  async runInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async () => {
      return operation();
    });
  }
}
