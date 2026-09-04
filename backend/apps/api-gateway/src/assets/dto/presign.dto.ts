import { IsIn, IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';

export class PresignDto {
  @IsString()
  @Length(1, 64)
  boardId: string;

  @IsIn(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
  mime: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes: number;

  @Matches(/^[a-f0-9]{64}$/, { message: 'sha256 must be 64 lowercase hex chars' })
  sha256: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  width: number;

  @IsInt()
  @Min(1)
  @Max(100000)
  height: number;
}
