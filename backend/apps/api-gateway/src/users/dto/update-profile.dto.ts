import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Иван Иванов', description: 'Имя пользователя' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', description: 'URL аватара' })
  @IsOptional()
  @IsString()
  avatar?: string;
}
