import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { HARDWARE_ITEM_REPOSITORY } from '../../domain/ports/out/hardware-item-repository.port';
import type { HardwareItemRepositoryPort, HardwareLifecycleEvent } from '../../domain/ports/out/hardware-item-repository.port';
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

    const rawEvents = await this.hardwareItemRepository.findLifecycleEvents(
      item.id,
      item.serialNumber,
    );

    const events = rawEvents.map((event) => ({
      ...event,
      description: this.formatDescription(event),
    }));

    return {
      hardwareItemId: item.id,
      serialNumber: item.serialNumber,
      events,
    };
  }

  private formatDescription(event: HardwareLifecycleEvent): string {
    const payload = (event.payload as Record<string, unknown>) || {};
    const code = payload.code ? String(payload.code) : '';
    const fromLoc = payload.fromLocationName ? String(payload.fromLocationName) : (payload.fromLocationId ? String(payload.fromLocationId) : '');
    const toLoc = payload.toLocationName ? String(payload.toLocationName) : (payload.toLocationId ? String(payload.toLocationId) : '');

    switch (event.action) {
      case 'TRANSFER_DIRECT_COMPLETED':
        return `Traslado directo ${code}: de "${fromLoc}" a "${toLoc}"`;
      case 'INBOUND_INVENTORY':
      case 'INBOUND_BATCH':
        return `Ingreso a inventario en ${payload.locationName || 'almacén'}`;
      case 'APPROVE_USED_COMPONENT':
        return `Aprobación de componente de segunda mano (N/S: ${payload.serialNumber || 'N/A'})`;
      case 'DECOMMISSION_HARDWARE_ITEM':
        return `Baja definitiva de inventario: ${payload.reason || 'Sin motivo especificado'}`;
      default:
        return `Acción registrada: ${event.action}`;
    }
  }
}
