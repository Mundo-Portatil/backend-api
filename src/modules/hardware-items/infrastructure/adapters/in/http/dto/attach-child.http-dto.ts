import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';
import type { AttachChildrenCommandDto } from '../../../../../application/dto/attach-child-command.dto';

export class AttachChildrenHttpDto implements AttachChildrenCommandDto {
  @ApiProperty({
    example: ['123e4567-e89b-12d3-a456-426614174000'],
    description: 'Arreglo de UUIDs de componentes hijos a acoplar al equipo padre',
  })
  @IsArray()
  @IsUUID('4', { each: true })
  childIds: string[];
}
