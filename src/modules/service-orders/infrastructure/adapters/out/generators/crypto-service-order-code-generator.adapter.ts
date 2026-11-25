import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { ServiceOrderCodeGeneratorPort } from '../../../../domain/ports/out/service-order-code-generator.port';

@Injectable()
export class CryptoServiceOrderCodeGeneratorAdapter implements ServiceOrderCodeGeneratorPort {
  async generateCode(): Promise<string> {
    const randomHex = randomBytes(3).toString('hex').toUpperCase();
    return `OS-${randomHex}`;
  }
}
