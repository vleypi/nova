import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBoardDto {
  @ApiPropertyOptional({ example: 'Новая доска', description: 'Название доски' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'space-uuid', description: 'ID пространства' })
  @IsString()
  spaceId: string;
}
