import { IsString, Length } from 'class-validator';

export class ConfirmDto {
  @IsString()
  @Length(36, 36)
  assetId: string;
}
