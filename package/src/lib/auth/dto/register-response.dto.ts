import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class RegisterResponseDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsBoolean()
  @IsOptional()
  requiresVerification?: boolean;

  @IsBoolean()
  @IsOptional()
  verificationSent?: boolean;
}
