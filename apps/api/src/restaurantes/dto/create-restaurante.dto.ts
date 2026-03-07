import {
    IsString,
    IsOptional,
    IsArray,
    IsNumber,
    ValidateNested,
    IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class UbicacionDto {
    @IsNumber({}, { each: true })
    coordinates: [number, number];
}

class DireccionDto {
    @IsString() calle: string;
    @IsString() ciudad: string;
    @IsString() pais: string;
    @IsOptional() @IsString() codigo_postal?: string;
}

export class CreateRestauranteDto {
    @IsString()
    propietario_id: string;

    @IsString()
    nombre: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @ValidateNested()
    @Type(() => UbicacionDto)
    ubicacion: UbicacionDto;

    @ValidateNested()
    @Type(() => DireccionDto)
    direccion: DireccionDto;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categorias?: string[];

    @IsOptional()
    horario?: Record<string, any>;

    @IsOptional() @IsString() telefono?: string;
    @IsOptional() @IsString() img_portada?: string;
}
