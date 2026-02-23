import { IsEmail, IsString, IsOptional, MinLength, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number)',
    example: 'Password123'
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  })
  password: string;

  @ApiProperty({
    description: 'User full name (optional)',
    example: 'John Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: '4-digit shortcode for transactions',
    example: '1234',
    minLength: 4,
    maxLength: 4,
  })
  @IsString()
  @Length(4, 4, { message: 'Shortcode must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'Shortcode must be a 4-digit number' })
  shortcode: string;
}
