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
      case 'SERVICE_ORDER_ADD_ITEM': {
        const orderCode = payload.orderCode ? String(payload.orderCode) : '';
        const locName = payload.sourceLocationName ? String(payload.sourceLocationName) : '';
        return locName
          ? `Repuesto utilizado en orden de servicio técnico ${orderCode} en puesto "${locName}"`
          : `Repuesto utilizado en orden de servicio técnico ${orderCode}`;
      }
      case 'SERVICE_ORDER_REMOVE_ITEM': {
        const orderCode = payload.orderCode ? String(payload.orderCode) : '';
        return `Repuesto retirado de orden de servicio técnico ${orderCode} y devuelto a stock`;
      }
      case 'SERVICE_ORDER_CANCELLED': {
        const orderCode = payload.orderCode ? String(payload.orderCode) : '';
        const cancelReason = payload.cancelReason ? String(payload.cancelReason) : '';
        return cancelReason
          ? `Orden de servicio técnico ${orderCode} cancelada; repuesto retornado a stock (Motivo: ${cancelReason})`
          : `Orden de servicio técnico ${orderCode} cancelada; repuesto retornado a stock`;
      }
      default:
        return `Acción registrada: ${event.action}`;
    }
  }
}
