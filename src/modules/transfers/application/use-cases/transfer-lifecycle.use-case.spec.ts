import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DispatchTransferUseCase } from './dispatch-transfer.use-case';
import { ConfirmTransferUseCase } from './confirm-transfer.use-case';
import { CancelTransferUseCase } from './cancel-transfer.use-case';
import { InternalTransferEntity } from '../../domain/entities/internal-transfer.entity';
import { InternalTransferItemEntity } from '../../domain/entities/internal-transfer-item.entity';
import { HardwareItemEntity } from '../../../hardware-items/domain/entities/hardware-item.entity';
import { QuantityStockEntity } from '../../../quantity-stock/domain/entities/quantity-stock.entity';
import { Role } from '@prisma/client';

describe('Transfer Lifecycle (Dispatch, Confirm with Barcode, Cancel Rollback)', () => {
  let mockTransferRepo: any;
  let mockHardwareRepo: any;
  let mockQuantityRepo: any;
  let mockTxManager: any;
  let mockAuditLog: any;

  let dispatchUseCase: DispatchTransferUseCase;
  let confirmUseCase: ConfirmTransferUseCase;
  let cancelUseCase: CancelTransferUseCase;

  beforeEach(() => {
    mockTransferRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    mockHardwareRepo = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    mockQuantityRepo = {
      findByCatalogAndLocation: jest.fn(),
      upsert: jest.fn(),
    };
    mockTxManager = {
      runInTransaction: jest.fn().mockImplementation(async (cb: any) => cb({})),
    };
    mockAuditLog = {
      record: jest.fn().mockImplementation(async () => {}),
    };

    dispatchUseCase = new DispatchTransferUseCase(
      mockTransferRepo,
      mockHardwareRepo,
      mockQuantityRepo,
      mockTxManager,
      mockAuditLog,
    );

    confirmUseCase = new ConfirmTransferUseCase(
      mockTransferRepo,
      mockHardwareRepo,
      mockQuantityRepo,
      mockTxManager,
      mockAuditLog,
    );

    cancelUseCase = new CancelTransferUseCase(
      mockTransferRepo,
      mockHardwareRepo,
      mockQuantityRepo,
      mockTxManager,
      mockAuditLog,
    );
  });

  describe('DispatchTransferUseCase', () => {
    it('debe pasar series a EN_TRANSITO y descontar stock cuantitativo en origen', async () => {
      const draft = new InternalTransferEntity(
        'transfer-1',
        'TR-000001',
        'ENTRE_PUESTOS',
        'DRAFT',
        'puesto-origin',
        'puesto-dest',
        'user-1',
        null,
        'Notas',
        null,
        null,
        null,
        new Date(),
        new Date(),
        [
          new InternalTransferItemEntity('item-1', 'transfer-1', 'cat-1', 'hw-1', 1, 'SER-001'),
          new InternalTransferItemEntity('item-2', 'transfer-1', 'cat-qty', null, 3),
        ],
      );
      mockTransferRepo.findById.mockResolvedValue(draft);

      const hw = new HardwareItemEntity('hw-1', 'SER-001', 'cat-1', 'puesto-origin', 'EN_STOCK', null, 100, 200, new Date(), new Date());
      mockHardwareRepo.findById.mockResolvedValue(hw);

      const stock = new QuantityStockEntity('st-1', 'cat-qty', 'puesto-origin', 10, 5, 8, new Date());
      mockQuantityRepo.findByCatalogAndLocation.mockResolvedValue(stock);

      await dispatchUseCase.execute('transfer-1', { id: 'user-1', role: Role.VENDEDOR, locationId: 'puesto-origin' });

      expect(mockHardwareRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'hw-1',
          status: 'EN_TRANSITO',
        }),
        expect.anything(),
      );

      expect(mockQuantityRepo.upsert).toHaveBeenCalledWith(
        'cat-qty',
        'puesto-origin',
        -3,
        undefined,
        undefined,
        expect.anything(),
      );

      expect(mockTransferRepo.update).toHaveBeenCalledWith(
        'transfer-1',
        expect.objectContaining({
          status: 'EN_TRANSITO',
        }),
        expect.anything(),
      );
    });
  });

  describe('ConfirmTransferUseCase', () => {
    it('debe rechazar con 400 si scannedSerials contiene duplicados', async () => {
      const inTransit = new InternalTransferEntity(
        'transfer-1',
        'TR-000001',
        'ENTRE_PUESTOS',
        'EN_TRANSITO',
        'puesto-origin',
        'puesto-dest',
        'user-1',
        null,
        null,
        null,
        new Date(),
        null,
        new Date(),
        new Date(),
        [new InternalTransferItemEntity('item-1', 'transfer-1', 'cat-1', 'hw-1', 1, 'SER-001')],
      );
      mockTransferRepo.findById.mockResolvedValue(inTransit);

      await expect(
        confirmUseCase.execute(
          'transfer-1',
          { scannedSerials: ['SER-001', 'SER-001'] },
          { id: 'dest-user', role: Role.VENDEDOR, locationId: 'puesto-dest' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar con 400 si scannedSerials no coincide exactamente con las series despachadas', async () => {
      const inTransit = new InternalTransferEntity(
        'transfer-1',
        'TR-000001',
        'ENTRE_PUESTOS',
        'EN_TRANSITO',
        'puesto-origin',
        'puesto-dest',
        'user-1',
        null,
        null,
        null,
        new Date(),
        null,
        new Date(),
        new Date(),
        [new InternalTransferItemEntity('item-1', 'transfer-1', 'cat-1', 'hw-1', 1, 'SER-001')],
      );
      mockTransferRepo.findById.mockResolvedValue(inTransit);

      await expect(
        confirmUseCase.execute(
          'transfer-1',
          { scannedSerials: ['SER-WRONG'] },
          { id: 'dest-user', role: Role.VENDEDOR, locationId: 'puesto-dest' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar con 403 si un vendedor ajeno al puesto destino intenta confirmar', async () => {
      const inTransit = new InternalTransferEntity(
        'transfer-1',
        'TR-000001',
        'ENTRE_PUESTOS',
        'EN_TRANSITO',
        'puesto-origin',
        'puesto-dest',
        'user-1',
        null,
        null,
        null,
        new Date(),
        null,
        new Date(),
        new Date(),
        [new InternalTransferItemEntity('item-1', 'transfer-1', 'cat-1', 'hw-1', 1, 'SER-001')],
      );
      mockTransferRepo.findById.mockResolvedValue(inTransit);

      await expect(
        confirmUseCase.execute(
          'transfer-1',
          { scannedSerials: ['SER-001'] },
          { id: 'other-user', role: Role.VENDEDOR, locationId: 'puesto-other' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe confirmar exitosamente y pasar series a EN_STOCK en destino', async () => {
      const inTransit = new InternalTransferEntity(
        'transfer-1',
        'TR-000001',
        'ENTRE_PUESTOS',
        'EN_TRANSITO',
        'puesto-origin',
        'puesto-dest',
        'user-1',
        null,
        null,
        null,
        new Date(),
        null,
        new Date(),
        new Date(),
        [
          new InternalTransferItemEntity('item-1', 'transfer-1', 'cat-1', 'hw-1', 1, 'SER-001'),
          new InternalTransferItemEntity('item-2', 'transfer-1', 'cat-qty', null, 5),
        ],
      );
      mockTransferRepo.findById.mockResolvedValue(inTransit);

      const hw = new HardwareItemEntity('hw-1', 'SER-001', 'cat-1', 'puesto-origin', 'EN_TRANSITO', null, 100, 200, new Date(), new Date());
      mockHardwareRepo.findById.mockResolvedValue(hw);

      const fromStock = new QuantityStockEntity('st-1', 'cat-qty', 'puesto-origin', 5, 20, 30, new Date());
      mockQuantityRepo.findByCatalogAndLocation.mockResolvedValue(fromStock);

      const result = await confirmUseCase.execute(
        'transfer-1',
        { scannedSerials: [' ser-001 '] }, // Test trimming & case insensitivity
        { id: 'dest-user', role: Role.VENDEDOR, locationId: 'puesto-dest' },
      );

      expect(mockHardwareRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'hw-1',
          locationId: 'puesto-dest',
          status: 'EN_STOCK',
        }),
        expect.anything(),
      );

      expect(mockQuantityRepo.upsert).toHaveBeenCalledWith(
        'cat-qty',
        'puesto-dest',
        5,
        20,
        30,
        expect.anything(),
      );

      expect(mockTransferRepo.update).toHaveBeenCalledWith(
        'transfer-1',
        expect.objectContaining({
          status: 'COMPLETED',
          receivedById: 'dest-user',
        }),
        expect.anything(),
      );
    });
  });

  describe('CancelTransferUseCase', () => {
    it('debe revertir series y cantidades a EN_STOCK en origen al cancelar desde EN_TRANSITO', async () => {
      const inTransit = new InternalTransferEntity(
        'transfer-1',
        'TR-000001',
        'ENTRE_PUESTOS',
        'EN_TRANSITO',
        'puesto-origin',
        'puesto-dest',
        'user-1',
        null,
        null,
        null,
        new Date(),
        null,
        new Date(),
        new Date(),
        [
          new InternalTransferItemEntity('item-1', 'transfer-1', 'cat-1', 'hw-1', 1, 'SER-001'),
          new InternalTransferItemEntity('item-2', 'transfer-1', 'cat-qty', null, 5),
        ],
      );
      mockTransferRepo.findById.mockResolvedValue(inTransit);

      const hw = new HardwareItemEntity('hw-1', 'SER-001', 'cat-1', 'puesto-origin', 'EN_TRANSITO', null, 100, 200, new Date(), new Date());
      mockHardwareRepo.findById.mockResolvedValue(hw);

      await cancelUseCase.execute(
        'transfer-1',
        { reason: 'Cliente canceló el pedido en el puesto destino' },
        { id: 'user-1', role: Role.VENDEDOR, locationId: 'puesto-origin' },
      );

      // Revert series to EN_STOCK at origin
      expect(mockHardwareRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'hw-1',
          locationId: 'puesto-origin',
          status: 'EN_STOCK',
        }),
        expect.anything(),
      );

      // Re-credit quantity stock in origin
      expect(mockQuantityRepo.upsert).toHaveBeenCalledWith(
        'cat-qty',
        'puesto-origin',
        5,
        undefined,
        undefined,
        expect.anything(),
      );

      expect(mockTransferRepo.update).toHaveBeenCalledWith(
        'transfer-1',
        expect.objectContaining({
          status: 'CANCELLED',
          cancelReason: 'Cliente canceló el pedido en el puesto destino',
        }),
        expect.anything(),
      );
    });

    it('debe rechazar cancelar una transferencia que ya fue completada', async () => {
      const completed = new InternalTransferEntity(
        'transfer-1',
        'TR-000001',
        'ENTRE_PUESTOS',
        'COMPLETED',
        'puesto-origin',
        'puesto-dest',
        'user-1',
        'dest-user',
        null,
        null,
        new Date(),
        new Date(),
        new Date(),
        new Date(),
        [],
      );
      mockTransferRepo.findById.mockResolvedValue(completed);

      await expect(
        cancelUseCase.execute(
          'transfer-1',
          { reason: 'Intento tardío' },
          { id: 'admin', role: Role.ADMIN, locationId: null },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
