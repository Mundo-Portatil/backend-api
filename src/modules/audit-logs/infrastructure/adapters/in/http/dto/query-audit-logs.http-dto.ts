import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryAuditLogsHttpDto {
  @ApiPropertyOptional({ description: 'Filter by module name (e.g. users, auth, locations)' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Filter by user UUID' })
  @IsOptional()
  @IsUUID('4')
  userId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Number of records per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
