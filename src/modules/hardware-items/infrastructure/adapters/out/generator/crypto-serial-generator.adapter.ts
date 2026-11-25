import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import type { SerialGeneratorPort } from '../../../../domain/ports/out/serial-generator.port';

@Injectable()
export class CryptoSerialGeneratorAdapter implements SerialGeneratorPort {
  generateInternalSerial(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateSegment = `${year}${month}${day}`;

    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();

    return `MP-${dateSegment}-${randomSuffix}`;
  }
}
