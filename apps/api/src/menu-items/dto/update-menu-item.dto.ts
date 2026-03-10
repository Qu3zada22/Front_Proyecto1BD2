import { IsString, IsNumber, IsArray, IsEnum, IsOptional, IsBoolean, Min } from 'class-validator';

export class UpdateMenuItemDto {
    @IsOptional() @IsString() nombre?: string;
    @IsOptional() @IsString() descripcion?: string;
    @IsOptional() @IsNumber() @Min(0) precio?: number;
    @IsOptional() @IsEnum(['entrada', 'principal', 'postre', 'bebida', 'extra']) categoria?: string;
    @IsOptional() @IsArray() @IsString({ each: true }) etiquetas?: string[];
    @IsOptional() @IsString() imagen?: string;
    @IsOptional() @IsString() imagen_id?: string;
    @IsOptional() @IsBoolean() disponible?: boolean;
    @IsOptional() @IsNumber() @Min(0) orden_display?: number;
}
