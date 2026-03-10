import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
} from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
  @IsOptional() @IsEnum(['cliente', 'propietario', 'admin']) rol?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) preferencias?: string[];
}
