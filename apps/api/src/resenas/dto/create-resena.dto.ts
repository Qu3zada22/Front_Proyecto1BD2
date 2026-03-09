import { IsString, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResenaDto {
    @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1', description: 'ID del usuario' })
    @IsString() usuario_id: string;

    @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e2', description: 'ID del restaurante' })
    @IsOptional() @IsString() restaurante_id?: string;

    @ApiPropertyOptional({ example: '64a1b2c3d4e5f6a7b8c9d0e3', description: 'ID de la orden (opcional)' })
    @IsOptional() @IsString() orden_id?: string;

    @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Calificación de 1 a 5 estrellas' })
    @IsNumber() @Min(1) @Max(5) calificacion: number;

    @ApiPropertyOptional({ example: 'Excelente servicio' })
    @IsOptional() @IsString() titulo?: string;

    @ApiPropertyOptional({ example: 'La comida llegó caliente y bien presentada' })
    @IsOptional() @IsString() comentario?: string;

    @ApiPropertyOptional({ example: ['rapido', 'sabroso'], type: [String] })
    @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
}
