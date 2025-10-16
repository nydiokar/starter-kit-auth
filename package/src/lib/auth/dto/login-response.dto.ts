import { IsString, IsEmail, IsBoolean, IsOptional } from 'class-validator';

export class LoginResponseDto {
  @IsString()
  id!: string;

  @IsEmail()
  email!: string;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;
}
