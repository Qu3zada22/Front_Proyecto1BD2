import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ID del restaurante',
  })
  @IsString()
  restaurante_id: string;

  @ApiProperty({ example: 'Clásica Burger' })
  @IsString()
  nombre: string;

  @ApiPropertyOptional({ example: 'Carne de res 200g con lechuga y tomate' })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ example: 45.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  precio: number;

  @ApiProperty({
    enum: ['entrada', 'principal', 'postre', 'bebida', 'extra'],
    example: 'principal',
  })
  @IsEnum(['entrada', 'principal', 'postre', 'bebida', 'extra'])
  categoria: string;

  @ApiPropertyOptional({ example: ['carne', 'popular'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  etiquetas?: string[];

  @ApiPropertyOptional({ example: 'https://example.com/burger.jpg' })
  @IsOptional()
  @IsString()
  imagen?: string;

  @ApiPropertyOptional({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ObjectId del archivo en GridFS',
  })
  @IsOptional()
  @IsString()
  imagen_id?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  disponible?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orden_display?: number;
}
