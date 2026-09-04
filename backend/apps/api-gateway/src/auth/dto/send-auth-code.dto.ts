import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendAuthCodeDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @IsEmail()
  email: string;
}
