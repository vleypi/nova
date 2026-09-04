import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveBoardDto {
  @ApiProperty({ example: 'space-id', description: 'ID целевого пространства' })
  @IsString()
  targetSpaceId: string;
}
