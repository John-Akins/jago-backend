import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../user/user.entity';

@Entity("wallets")
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  @ApiProperty({ description: "Unique identifier for the wallet", example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @Column({ unique: true })
  @ApiProperty({ description: "User ID associated with this wallet", example: "550e8400-e29b-41d4-a716-446655440000" })
  userId: string;

  @OneToOne(() => User, user => user.wallet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: "integer", default: 0 })
  @ApiProperty({ description: "Wallet balance in kobo (smallest unit)", example: 500000, default: 0 })
  balance: number;

  @Column({ default: "NGN" })
  @ApiProperty({ description: "Currency of the wallet", example: "NGN", default: "NGN" })
  currency: string;

  @CreateDateColumn()
  @ApiProperty({ description: "Wallet creation timestamp" })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: "Wallet last update timestamp" })
  updatedAt: Date;
}