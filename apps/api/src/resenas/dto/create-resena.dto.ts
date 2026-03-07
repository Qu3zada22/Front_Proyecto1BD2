import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class CreateResenaDto {
  @IsString() cliente_id: string;
  @IsString() restaurante_id: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  calificacion: number;

  @IsOptional() @IsString() comentario?: string;
}
