import { Inject, Injectable } from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import type {
  ValidateSerialsCommandDto,
  ValidateSerialsResponseDto,
} from '../dto/validate-serials-command.dto';

@Injectable()
export class ValidateSerialsUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
  ) {}

  async execute(dto: ValidateSerialsCommandDto): Promise<ValidateSerialsResponseDto> {
    if (!dto.serialNumbers || dto.serialNumbers.length === 0) {
      return { existingSerials: [], allValid: true };
    }

    const cleanSerials = dto.serialNumbers.map((s) => s.trim().toUpperCase());
    const existing = await this.hardwareItemRepository.findExistingSerials(cleanSerials);

    return {
      existingSerials: existing,
      allValid: existing.length === 0,
    };
  }
}
