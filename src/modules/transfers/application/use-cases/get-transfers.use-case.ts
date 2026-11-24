import { Inject, Injectable } from '@nestjs/common';
import { TRANSFER_REPOSITORY } from '../../domain/ports/out/transfer-repository.port';
import type { TransferRepositoryPort } from '../../domain/ports/out/transfer-repository.port';
import type { QueryTransfersDto } from '../dto/query-transfers.dto';
import type { TransferResponseDto } from '../dto/transfer-response.dto';
import { Role } from '@prisma/client';

@Injectable()
export class GetTransfersUseCase {
  constructor(
    @Inject(TRANSFER_REPOSITORY)
    private readonly transferRepository: TransferRepositoryPort,
  ) {}

  async execute(
    query: QueryTransfersDto,
    user: { id: string; role: Role; locationId: string | null },
  ): Promise<TransferResponseDto[]> {
    let locationIdFilter = query.locationId;

    // VENDEDOR y TECNICO solo pueden ver transferencias asociadas a su puesto
    if (user.role === Role.VENDEDOR || user.role === Role.TECNICO) {
      locationIdFilter = user.locationId ?? undefined;
    }

    const transfers = await this.transferRepository.findAll({
      fromLocationId: query.fromLocationId,
      toLocationId: query.toLocationId,
      locationId: locationIdFilter,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });

    return transfers.map((t) => ({
      id: t.id,
      code: t.code,
      type: t.type,
      status: t.status,
      fromLocationId: t.fromLocationId,
      fromLocationName: t.fromLocationName,
      toLocationId: t.toLocationId,
      toLocationName: t.toLocationName,
      createdById: t.createdById,
      createdByName: t.createdByName,
      notes: t.notes,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      itemsCount: t.items.length,
    }));
  }
}
