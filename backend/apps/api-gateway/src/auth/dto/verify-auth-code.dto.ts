import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyAuthCodeDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234567', description: 'Код подтверждения (7 символов)' })
  @IsString()
  @Length(7, 7)
  code: string;
}
