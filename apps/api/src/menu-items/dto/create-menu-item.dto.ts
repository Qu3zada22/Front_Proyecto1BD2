import { IsString, IsNumber, IsEnum, IsOptional, IsArray, IsBoolean, Min } from 'class-validator';

export class CreateMenuItemDto {
    @IsString() restaurante_id: string;
    @IsString() nombre: string;
    @IsOptional() @IsString() descripcion?: string;

    @IsNumber()
    @Min(0)
    precio: number;

    @IsEnum(['entrada', 'principal', 'postre', 'bebida', 'extra'])
    categoria: string;

    @IsOptional() @IsArray() @IsString({ each: true }) etiquetas?: string[];
    @IsOptional() @IsString() imagen?: string;
    @IsOptional() @IsBoolean() disponible?: boolean;
}
