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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CoordsDto {
  @ApiProperty({ example: [-90.5064, 14.6048], type: [Number] })
  @IsNumber({}, { each: true })
  coordinates: [number, number];
}

export class DireccionUsuarioDto {
  @ApiProperty({ example: 'Casa' }) @IsString() alias: string;
  @ApiProperty({ example: '4a Avenida 8-32 Zona 10' })
  @IsString()
  calle: string;
  @ApiProperty({ example: 'Guatemala City' }) @IsString() ciudad: string;
  @ApiProperty({ example: 'Guatemala' }) @IsString() pais: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  es_principal?: boolean;

  @ApiPropertyOptional({ type: CoordsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordsDto)
  coords?: CoordsDto;
}

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Ana García Mendoza' })
  @IsString()
  nombre: string;

  @ApiProperty({ example: 'ana.garcia@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+502 5555-0001' })
  @IsOptional()
  @IsString()
  telefono?: string;

  @ApiPropertyOptional({
    enum: ['cliente', 'propietario', 'admin'],
    example: 'cliente',
  })
  @IsOptional()
  @IsEnum(['cliente', 'propietario', 'admin'])
  rol?: string;

  @ApiPropertyOptional({ example: ['sin_gluten', 'saludable'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferencias?: string[];

  @ApiPropertyOptional({ type: [DireccionUsuarioDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DireccionUsuarioDto)
  direcciones?: DireccionUsuarioDto[];
}
