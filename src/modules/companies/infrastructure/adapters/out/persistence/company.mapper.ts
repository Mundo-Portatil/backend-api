import type { Company } from '@prisma/client';
import { CompanyEntity } from '../../../../domain/entities/company.entity';

export class CompanyMapper {
  static toDomain(raw: Company): CompanyEntity {
    return new CompanyEntity(
      raw.id,
      raw.name,
      raw.ruc,
      raw.address,
      raw.active,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistence(entity: CompanyEntity): {
    name: string;
    ruc: string;
    address: string;
    active: boolean;
  } {
    return {
      name: entity.name,
      ruc: entity.ruc,
      address: entity.address,
      active: entity.active,
    };
  }
}
