import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResenaDto {
  @ApiProperty({
    example: '64a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ID del usuario',
  })
  @IsString()
  usuario_id: string;

  @ApiPropertyOptional({
    example: '64a1b2c3d4e5f6a7b8c9d0e2',
    description: 'ID del restaurante (requerido si no se provee orden_id)',
  })
  @ValidateIf((o) => !o.orden_id)
  @IsString()
  restaurante_id?: string;

  @ApiPropertyOptional({
    example: '64a1b2c3d4e5f6a7b8c9d0e3',
    description: 'ID de la orden (requerido si no se provee restaurante_id)',
  })
  @ValidateIf((o) => !o.restaurante_id)
  @IsString()
  orden_id?: string;

  @ApiProperty({
    example: 5,
    minimum: 1,
    maximum: 5,
    description: 'Calificación de 1 a 5 estrellas',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  calificacion: number;

  @ApiPropertyOptional({ example: 'Excelente servicio', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  titulo?: string;

  @ApiPropertyOptional({
    example: 'La comida llegó caliente y bien presentada',
    minLength: 10,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  comentario?: string;

  @ApiPropertyOptional({ example: ['rapido', 'sabroso'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
