import { IsArray, ArrayMinSize, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteOrdenesDto {
    @ApiProperty({ example: ['64a1b2c3d4e5f6a7b8c9d0e1', '64a1b2c3d4e5f6a7b8c9d0e2'], description: 'Array de ObjectIds de órdenes a eliminar' })
    @IsArray() @ArrayMinSize(1) @IsString({ each: true })
    ids: string[];
}
