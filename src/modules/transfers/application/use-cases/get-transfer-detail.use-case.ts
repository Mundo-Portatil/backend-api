import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TRANSFER_REPOSITORY } from '../../domain/ports/out/transfer-repository.port';
import type { TransferRepositoryPort } from '../../domain/ports/out/transfer-repository.port';
import type { TransferDetailResponseDto } from '../dto/transfer-detail-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class GetTransferDetailUseCase {
  constructor(
    @Inject(TRANSFER_REPOSITORY)
    private readonly transferRepository: TransferRepositoryPort,
  ) {}

  async execute(
    idOrCode: string,
    user: { id: string; role: Role; locationId: string | null },
  ): Promise<TransferDetailResponseDto> {
    let transfer = await this.transferRepository.findById(idOrCode);
    if (!transfer) {
      transfer = await this.transferRepository.findByCode(idOrCode);
    }

    if (!transfer) {
      throw new NotFoundException(`Transferencia "${idOrCode}" no encontrada`);
    }

    // Validación de permisos para vendedores y técnicos
    if (user.role === Role.VENDEDOR || user.role === Role.TECNICO) {
      const isRelated =
        user.locationId === transfer.fromLocationId || user.locationId === transfer.toLocationId;
      if (!isRelated) {
        throw new ForbiddenException('No tiene permisos para consultar esta transferencia');
      }
    }

    return {
      id: transfer.id,
      code: transfer.code,
      type: transfer.type,
      status: transfer.status,
      fromLocationId: transfer.fromLocationId,
      fromLocationName: transfer.fromLocationName,
      toLocationId: transfer.toLocationId,
      toLocationName: transfer.toLocationName,
      createdById: transfer.createdById,
      createdByName: transfer.createdByName,
      receivedById: transfer.receivedById,
      receivedByName: transfer.receivedByName,
      notes: transfer.notes,
      cancelReason: transfer.cancelReason,
      dispatchedAt: transfer.dispatchedAt,
      receivedAt: transfer.receivedAt,
      createdAt: transfer.createdAt,
      updatedAt: transfer.updatedAt,
      itemsCount: transfer.items.length,
      items: transfer.items.map((i) => ({
        id: i.id,
        catalogId: i.catalogId,
        hardwareItemId: i.hardwareItemId,
        serialNumber: i.serialNumber,
        quantity: i.quantity,
        sku: i.sku,
        model: i.model,
        brand: i.brand,
      })),
    };
  }
}
