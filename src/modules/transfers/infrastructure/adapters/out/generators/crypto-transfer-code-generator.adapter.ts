import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { TransferCodeGeneratorPort } from '../../../../domain/ports/out/transfer-code-generator.port';

@Injectable()
export class CryptoTransferCodeGeneratorAdapter implements TransferCodeGeneratorPort {
  async generateCode(): Promise<string> {
    const randomHex = randomBytes(3).toString('hex').toUpperCase();
    return `TR-${randomHex}`;
  }
}
