import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Wallet } from '../wallet/wallet.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Unique identifier for the user', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @Column({ unique: true })
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  email: string;

  @Column()
  @ApiProperty({ description: 'User password (hashed)', example: 'hashed_password_here' })
  password: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'User full name', example: 'John Doe', required: false })
  name?: string;

  @OneToOne(() => Wallet, wallet => wallet.user)
  @JoinColumn()
  wallet: Wallet;

  @Column({ default: false })
  @ApiProperty({ description: 'Whether the user email is verified', example: false, default: false })
  emailVerified: boolean;

  @CreateDateColumn()
  @ApiProperty({ description: 'User creation timestamp' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'User last update timestamp' })
  updatedAt: Date;
}