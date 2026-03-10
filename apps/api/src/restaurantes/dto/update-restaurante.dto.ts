import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class UpdateRestauranteDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) categorias?: string[];
  @IsOptional() horario?: Record<string, any>;
  @IsOptional() @IsString() telefono?: string;
  @IsOptional() @IsString() img_portada?: string;
  @IsOptional() @IsBoolean() activo?: boolean;
}
