import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class BlockUserDto {
  @ApiProperty({ example: true, description: 'true — заблокировать, false — разблокировать' })
  @IsBoolean()
  isBlocked: boolean;
}
