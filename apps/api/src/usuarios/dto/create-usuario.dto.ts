import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MinLength,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

class CoordsDto {
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class DireccionUsuarioDto {
  @IsString() alias: string;
  @IsString() calle: string;
  @IsString() ciudad: string;
  @IsString() pais: string;

  @IsOptional()
  @IsBoolean()
  es_principal?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordsDto)
  coords?: CoordsDto;
}

export class CreateUsuarioDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEnum(['cliente', 'propietario', 'admin'])
  rol?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferencias?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DireccionUsuarioDto)
  direcciones?: DireccionUsuarioDto[];
}
