import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = process.env.DATABASE_URL || process.env.DIRECT_URL;
    super({
      datasources: {
        db: {
          url,
        },
      },
    });

    if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
      this.logger.warn(
        'DATABASE_URL no está definida. Se está usando DIRECT_URL como fallback (modo sesión limitado a pool_size: 15).',
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
