import {
    IsString,
    IsOptional,
    IsArray,
    IsNumber,
    ValidateNested,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UbicacionDto {
    @ApiProperty({ example: [-90.5064, 14.6048], type: [Number] })
    @IsNumber({}, { each: true })
    coordinates: [number, number];
}

class DireccionDto {
    @ApiProperty({ example: '4a Avenida 8-32 Zona 10' }) @IsString() calle: string;
    @ApiProperty({ example: 'Guatemala City' }) @IsString() ciudad: string;
    @ApiProperty({ example: 'Guatemala' }) @IsString() pais: string;
    @ApiPropertyOptional({ example: '01010' }) @IsOptional() @IsString() codigo_postal?: string;
}

export class CreateRestauranteDto {
    @ApiProperty({ example: '64a1b2c3d4e5f6a7b8c9d0e1', description: 'ID del propietario (usuario)' })
    @IsString() propietario_id: string;

    @ApiProperty({ example: 'Burger House' })
    @IsString() nombre: string;

    @ApiPropertyOptional({ example: 'Las mejores hamburguesas de la ciudad' })
    @IsOptional() @IsString() descripcion?: string;

    @ApiProperty({ type: UbicacionDto, description: 'Punto GeoJSON para búsqueda geoespacial' })
    @ValidateNested() @Type(() => UbicacionDto) ubicacion: UbicacionDto;

    @ApiProperty({ type: DireccionDto })
    @ValidateNested() @Type(() => DireccionDto) direccion: DireccionDto;

    @ApiPropertyOptional({ example: ['hamburguesas', 'americana'], type: [String] })
    @IsOptional() @IsArray() @IsString({ each: true }) categorias?: string[];

    @ApiPropertyOptional({ example: { lunes: { abre: '08:00', cierra: '22:00', cerrado: false } } })
    @IsOptional() horario?: Record<string, any>;

    @ApiPropertyOptional({ example: '+502 2222-3333' })
    @IsOptional() @IsString() telefono?: string;

    @ApiPropertyOptional({ example: 'https://example.com/portada.jpg' })
    @IsOptional() @IsString() img_portada?: string;
}
