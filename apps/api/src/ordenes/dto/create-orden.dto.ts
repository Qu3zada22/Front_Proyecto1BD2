import {
  IsString,
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ItemOrdenDto {
  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ID del MenuItem',
  })
  @IsString()
  menu_item_id: string;

  @ApiPropertyOptional({
    example: 'Clásica Burger',
    description: 'Ignorado — el nombre real se lee de la BD',
  })
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    example: 45.0,
    minimum: 0,
    description: 'Ignorado — el precio real se lee de la BD',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  precio?: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  cantidad: number;

  @ApiPropertyOptional({ example: 'Sin cebolla' })
  @IsOptional()
  @IsString()
  notas?: string;
}

class DireccionEntregaDto {
  @ApiProperty({ example: '4a Avenida 8-32 Zona 10' })
  @IsString()
  calle: string;
  @ApiProperty({ example: 'Guatemala City' }) @IsString() ciudad: string;
  @ApiProperty({ example: 'Guatemala' }) @IsString() pais: string;
}

export class CreateOrdenDto {
  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ID del cliente (usuario)',
  })
  @IsString()
  usuario_id: string;

  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e2',
    description: 'ID del restaurante',
  })
  @IsString()
  restaurante_id: string;

  @ApiProperty({ type: [ItemOrdenDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemOrdenDto)
  items: ItemOrdenDto[];

  @ApiProperty({ type: DireccionEntregaDto })
  @ValidateNested()
  @Type(() => DireccionEntregaDto)
  direccion_entrega: DireccionEntregaDto;

  @ApiPropertyOptional({ example: 'Tocar el timbre dos veces' })
  @IsOptional()
  @IsString()
  notas?: string;
}
