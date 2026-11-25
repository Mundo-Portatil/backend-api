import type { HardwareLifecycleEvent } from '../../domain/ports/out/hardware-item-repository.port';

export interface HardwareLifecycleResponseDto {
  hardwareItemId: string;
  serialNumber: string;
  catalogName?: string;
  events: HardwareLifecycleEvent[];
}
