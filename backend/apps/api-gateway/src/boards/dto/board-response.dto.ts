import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BoardCreatorDto {
  @ApiProperty({ description: 'ID создателя' })
  id: string;

  @ApiProperty({ description: 'Имя создателя (пусто если не задано)' })
  name: string;

  @ApiProperty({ description: 'URL аватара создателя (пусто если не задано)' })
  avatar: string;
}

export class BoardResponseDto {
  @ApiProperty({ description: 'Короткий ID доски (12 символов)' })
  id: string;

  @ApiProperty({ description: 'Название доски' })
  name: string;

  @ApiProperty({ description: 'ID пространства' })
  spaceId: string;

  @ApiProperty({ description: 'Приватная доска' })
  isPrivate: boolean;

  @ApiPropertyOptional({ description: 'URL миниатюры' })
  thumbnail: string;

  @ApiProperty({ description: 'Добавлена в избранное' })
  isFavorite: boolean;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: string;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: string;

  @ApiPropertyOptional({ type: BoardCreatorDto, description: 'Данные создателя доски' })
  createdByUser: BoardCreatorDto | null;
}
