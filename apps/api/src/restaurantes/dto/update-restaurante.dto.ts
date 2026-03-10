import { IsString, IsOptional, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class DireccionDto {
    @IsOptional() @IsString() calle?: string;
    @IsOptional() @IsString() ciudad?: string;
    @IsOptional() @IsString() pais?: string;
    @IsOptional() @IsString() codigo_postal?: string;
}

class UbicacionDto {
    @IsOptional() @IsString() type?: string;
    @IsOptional() @IsArray() coordinates?: [number, number];
}

export class UpdateRestauranteDto {
    @IsOptional() @IsString() nombre?: string;
    @IsOptional() @IsString() descripcion?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) categorias?: string[];
    @IsOptional() horario?: Record<string, any>;
    @IsOptional() @IsString() telefono?: string;
    @IsOptional() @IsString() img_portada?: string;
    @IsOptional() @IsString() img_portada_id?: string;
    @IsOptional() @IsBoolean() activo?: boolean;
    @IsOptional() @ValidateNested() @Type(() => DireccionDto) direccion?: DireccionDto;
    @IsOptional() @ValidateNested() @Type(() => UbicacionDto) ubicacion?: UbicacionDto;
}
