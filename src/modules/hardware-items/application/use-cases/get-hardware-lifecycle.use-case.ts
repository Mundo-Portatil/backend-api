import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareLifecycleResponseDto } from '../dto/hardware-lifecycle-response.dto';

@Injectable()
export class GetHardwareLifecycleUseCase {
  constructor(
    @Inject(HARDWARE_ITEM_REPOSITORY)
    private readonly hardwareItemRepository: HardwareItemRepositoryPort,
  ) {}

  async execute(id: string): Promise<HardwareLifecycleResponseDto> {
    const item = await this.hardwareItemRepository.findById(id);
    if (!item) {
      throw new NotFoundException(`Hardware item with ID "${id}" not found`);
    }

    const events = await this.hardwareItemRepository.findLifecycleEvents(
      item.id,
      item.serialNumber,
    );

    return {
      hardwareItemId: item.id,
      serialNumber: item.serialNumber,
      events,
    };
  }
}
