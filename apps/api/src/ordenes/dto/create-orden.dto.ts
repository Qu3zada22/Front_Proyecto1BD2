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

class ItemOrdenDto {
    @IsString() menu_item_id: string;
    @IsString() nombre: string;
    @IsNumber() @Min(0) precio: number;
    @IsNumber() @Min(1) cantidad: number;
    @IsOptional() @IsString() notas?: string;
}

class DireccionEntregaDto {
    @IsString() calle: string;
    @IsString() ciudad: string;
    @IsString() pais: string;
}

export class CreateOrdenDto {
    @IsString() cliente_id: string;
    @IsString() restaurante_id: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => ItemOrdenDto)
    items: ItemOrdenDto[];

    @ValidateNested()
    @Type(() => DireccionEntregaDto)
    direccion_entrega: DireccionEntregaDto;

    @IsOptional() @IsString() notas?: string;
}
