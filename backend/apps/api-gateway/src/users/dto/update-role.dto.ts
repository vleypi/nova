import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@app/common';

export class UpdateRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.MANAGER,
    description: 'Новая роль пользователя',
  })
  @IsEnum(Role)
  role: Role;
}
