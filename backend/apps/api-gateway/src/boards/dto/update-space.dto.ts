import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSpaceDto {
  @ApiProperty({ example: 'Новое название', description: 'Новое название пространства' })
  @IsString()
  name: string;
}
