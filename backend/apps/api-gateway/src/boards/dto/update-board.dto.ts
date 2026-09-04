import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBoardDto {
  @ApiPropertyOptional({ example: 'Переименованная доска', description: 'Новое название' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: false, description: 'Приватная ли доска' })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;

  @ApiPropertyOptional({ example: 'gradient-1', description: 'Идентификатор обложки' })
  @IsOptional()
  @IsString()
  thumbnail?: string;
}
