import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../../../shared/infrastructure/prisma/prisma.service';
import { ReceiptTypeType } from '../../../../domain/entities/service-receipt.entity';
import type { ReceiptNumberGeneratorPort } from '../../../../domain/ports/out/receipt-number-generator.port';

@Injectable()
export class SequentialReceiptNumberGeneratorAdapter implements ReceiptNumberGeneratorPort {
  constructor(private readonly prisma: PrismaService) {}

  async generateReceiptNumber(
    type: ReceiptTypeType,
    locationId: string,
    tx?: unknown,
  ): Promise<{ series: string; correlative: string; fullNumber: string }> {
    const client = (tx as Prisma.TransactionClient) || this.prisma;

    let series = 'BS01';
    if (type === 'BOLETA') {
      series = 'B001';
    } else if (type === 'FACTURA') {
      series = 'F001';
    }

    const lastReceipt = await client.serviceReceipt.findFirst({
      where: { series },
      orderBy: { correlative: 'desc' },
      select: { correlative: true },
    });

    let nextNum = 1;
    if (lastReceipt && lastReceipt.correlative) {
      const parsed = parseInt(lastReceipt.correlative, 10);
      if (!isNaN(parsed)) {
        nextNum = parsed + 1;
      }
    }

    const correlative = String(nextNum).padStart(6, '0');
    const fullNumber = `${series}-${correlative}`;

    return {
      series,
      correlative,
      fullNumber,
    };
  }
}
