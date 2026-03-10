import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class QueryRestaurantesDto extends PaginationDto {
  @IsOptional() @IsString() categoria?: string;
  @IsOptional() @IsString() busqueda?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activo?: boolean;
}
