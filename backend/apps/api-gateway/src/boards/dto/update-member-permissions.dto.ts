import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberPermissionsDto {
  @ApiProperty({ example: true, description: 'Может создавать доски' })
  @IsBoolean()
  canCreateBoards: boolean;

  @ApiProperty({ example: true, description: 'Может редактировать доски' })
  @IsBoolean()
  canEditBoards: boolean;

  @ApiProperty({ example: true, description: 'Может рисовать' })
  @IsBoolean()
  canDraw: boolean;

  @ApiProperty({ example: false, description: 'Может удалять доски' })
  @IsBoolean()
  canDeleteBoards: boolean;
}
