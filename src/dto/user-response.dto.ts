import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ description: 'Unique identifier for the user', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'User full name', example: 'John Doe', required: false })
  name?: string;

  @ApiProperty({ description: 'Whether the user email is verified', example: false, default: false })
  emailVerified: boolean;

  @ApiProperty({ description: 'User creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'User last update timestamp' })
  updatedAt: Date;
}