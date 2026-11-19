import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QUANTITY_STOCK_REPOSITORY } from '../../domain/ports/out/quantity-stock-repository.port';
import type { QuantityStockRepositoryPort } from '../../domain/ports/out/quantity-stock-repository.port';
import { AUDIT_LOG_PORT } from '../../../../shared/domain/ports/audit-log.port';
import type { AuditLogPort } from '../../../../shared/domain/ports/audit-log.port';
import type { DecreaseQuantityStockCommandDto } from '../dto/decrease-quantity-stock-command.dto';
import type { QuantityStockResponseDto } from '../dto/quantity-stock-response.dto';

@Injectable()
export class DecreaseQuantityStockUseCase {
  constructor(
    @Inject(QUANTITY_STOCK_REPOSITORY)
    private readonly quantityStockRepository: QuantityStockRepositoryPort,
    @Inject(AUDIT_LOG_PORT)
    private readonly auditLogPort: AuditLogPort,
  ) {}

  async execute(
    dto: DecreaseQuantityStockCommandDto,
    authorUserId?: string,
    ipAddress?: string,
    actionContext = 'DECREASE_QUANTITY_STOCK',
  ): Promise<QuantityStockResponseDto> {
    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity to deduct must be greater than zero');
    }

    const stock = await this.quantityStockRepository.findByCatalogAndLocation(
      dto.catalogId,
      dto.locationId,
    );

    if (!stock) {
      throw new NotFoundException(
        `No stock record found for catalog "${dto.catalogId}" at location "${dto.locationId}"`,
      );
    }

    const updated = stock.decrease(dto.quantity);
    const saved = await this.quantityStockRepository.update(updated);

    await this.auditLogPort.record({
      userId: authorUserId,
      action: actionContext,
      module: 'quantity-stock',
      payload: {
        id: saved.id,
        catalogId: dto.catalogId,
        locationId: dto.locationId,
        deductedQuantity: dto.quantity,
        remainingQuantity: saved.quantity,
      },
      ipAddress,
    });

    return {
      id: saved.id,
      catalogId: saved.catalogId,
      locationId: saved.locationId,
      quantity: saved.quantity,
      costPrice: saved.costPrice,
      salePrice: saved.salePrice,
      updatedAt: saved.updatedAt,
    };
  }
}
