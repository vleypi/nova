import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSpaceDto {
  @ApiProperty({ example: 'Моё пространство', description: 'Название пространства' })
  @IsString()
  name: string;
}
