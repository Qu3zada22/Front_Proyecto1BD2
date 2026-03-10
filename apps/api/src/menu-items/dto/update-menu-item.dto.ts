import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class UpdateMenuItemDto {
  @IsOptional() @IsString() nombre?: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsNumber() @Min(0) precio?: number;
  @IsOptional()
  @IsEnum(['entrada', 'principal', 'postre', 'bebida', 'extra'])
  categoria?: string;
  @IsOptional() @IsString() imagen?: string;
  @IsOptional() @IsBoolean() disponible?: boolean;
}
