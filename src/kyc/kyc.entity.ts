import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../user/user.entity';
import { IdentificationType } from '../dto/kyc.dto';

@Entity('kyc_details')
export class Kyc {
  @PrimaryGeneratedColumn('uuid')
  @ApiProperty({ description: 'Unique identifier for the KYC record', example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @Column({ unique: true })
  @ApiProperty({ description: 'User ID associated with this KYC record', example: '550e8400-e29b-41d4-a716-446655440000' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Bank Verification Number (BVN)', example: '12345678901', required: false })
  bvn?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'User\'s first name (retrieved from BVN verification)', example: 'John', required: false })
  firstName?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'User\'s last name (retrieved from BVN verification)', example: 'Doe', required: false })
  lastName?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'User\'s date of birth (retrieved from BVN verification)', example: '1990-01-01', required: false })
  dateOfBirth?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'User\'s phone number (retrieved from BVN verification)', example: '+2348012345678', required: false })
  phoneNumber?: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Type of identification document (for future extensibility)', enum: IdentificationType, example: IdentificationType.NATIONAL_ID, required: false })
  identificationType?: IdentificationType;

  @Column({ default: 'PENDING' })
  @ApiProperty({ 
    description: 'KYC verification status', 
    example: 'PENDING', 
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING'
  })
  status: string;

  @Column({ nullable: true })
  @ApiProperty({ description: 'Reason for rejection if status is REJECTED', example: 'Invalid BVN', required: false })
  rejectionReason?: string;

  @CreateDateColumn()
  @ApiProperty({ description: 'KYC record creation timestamp' })
  createdAt: Date;

  @UpdateDateColumn()
  @ApiProperty({ description: 'KYC record last update timestamp' })
  updatedAt: Date;
}
