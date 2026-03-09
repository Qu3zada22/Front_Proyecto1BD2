import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResenaDto {
    @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1', description: 'ID del cliente' })
    @IsString() cliente_id: string;

    @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e2', description: 'ID del restaurante' })
    @IsString() restaurante_id: string;

    @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Calificación de 1 a 5 estrellas' })
    @IsNumber() @Min(1) @Max(5) calificacion: number;

    @ApiPropertyOptional({ example: 'Excelente comida y servicio rápido' })
    @IsOptional() @IsString() comentario?: string;
}
