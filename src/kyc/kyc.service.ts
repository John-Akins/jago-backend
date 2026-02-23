import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kyc } from './kyc.entity';
import { KycDto } from '../dto/kyc.dto';
import { User } from '../user/user.entity';
import { IdentificationType } from '../dto/kyc.dto';

// Simple deterministic data generator based on BVN seed
class MockDataGenerator {
  private seed: number;

  constructor(seedString: string) {
    // Create a numeric seed from the string
    this.seed = 0;
    for (let i = 0; i < seedString.length; i++) {
      this.seed = ((this.seed << 5) - this.seed) + seedString.charCodeAt(i);
      this.seed = this.seed & this.seed; // Convert to 32bit integer
    }
  }

  // Simple seeded random number generator
  private random(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  private pickFromArray<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }

  firstName(): string {
    const firstNames = [
      'Ade', 'Ngozi', 'Chinedu', 'Fatima', 'Oluwaseun', 'Amina', 'Emeka', 
      'Ifeoma', 'Tunde', 'Nneka', 'Olumide', 'Hadiza', 'Obinna', 'Chidinma',
      'Bayo', 'Adaeze', 'Kunle', 'Oluwakemi', 'Uche', 'Funke', 'Temitope',
      'Nnamdi', 'Blessing', 'Oluwadamilola', 'Chukwuemeka', 'Zainab'
    ];
    return this.pickFromArray(firstNames);
  }

  lastName(): string {
    const lastNames = [
      'Adebayo', 'Okafor', 'Ibrahim', 'Oluwatosin', 'Eze', 'Bello', 'Adeyemi',
      'Nwankwo', 'Salisu', 'Okonkwo', 'Adeleke', 'Mohammed', 'Ogunleye',
      'Chukwu', 'Abubakar', 'Afolabi', 'Okeke', 'Danjuma', 'Adewale', 'Nnamdi',
      'Okoro', 'Usman', 'Balogun', 'Okechukwu', 'Adeosun', 'Yusuf'
    ];
    return this.pickFromArray(lastNames);
  }

  dateOfBirth(): string {
    // Generate age between 18 and 70
    const age = 18 + Math.floor(this.random() * 53);
    const currentYear = new Date().getFullYear();
    const birthYear = currentYear - age;
    const month = 1 + Math.floor(this.random() * 12);
    const day = 1 + Math.floor(this.random() * 28);
    return `${birthYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  phoneNumber(): string {
    // Generate Nigerian phone number starting with +234
    const prefixes = ['803', '806', '813', '816', '810', '814', '815', '901', '902', '903', '904', '905', '906', '907', '908', '909'];
    const prefix = this.pickFromArray(prefixes);
    const remaining = Math.floor(this.random() * 10000000).toString().padStart(7, '0');
    return `+234${prefix}${remaining}`;
  }
}

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(Kyc)
    private kycRepository: Repository<Kyc>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async submitKyc(userId: string, kycDto: KycDto): Promise<{ message: string; kycId: string }> {
    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has KYC
    const existingKyc = await this.kycRepository.findOne({ where: { userId } });
    if (existingKyc) {
      throw new BadRequestException('KYC already submitted for this user');
    }

    // Mock BVN verification (in production, this would call an external BVN API)
    const bvnVerificationResult = await this.verifyBvn(kycDto.bvn);

    if (!bvnVerificationResult.verified) {
      throw new BadRequestException(`BVN verification failed: ${bvnVerificationResult.message}`);
    }

    // Create new KYC record with verified data
    const newKyc = this.kycRepository.create({
      userId,
      bvn: kycDto.bvn,
      firstName: bvnVerificationResult.firstName,
      lastName: bvnVerificationResult.lastName,
      dateOfBirth: bvnVerificationResult.dateOfBirth,
      phoneNumber: bvnVerificationResult.phoneNumber,
      identificationType: kycDto.identificationType,
      status: 'VERIFIED', // Auto-verify on successful BVN validation
    });

    const savedKyc = await this.kycRepository.save(newKyc);

    return {
      message: 'KYC details submitted and verified successfully',
      kycId: savedKyc.id,
    };
  }

  private async verifyBvn(bvn: string): Promise<{
    verified: boolean;
    message: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
  }> {
    // Mock BVN verification logic
    // In a real implementation, this would call an external BVN verification API
    
    // Simulate some validation
    if (bvn.length !== 11 || !/^[0-9]{11}$/.test(bvn)) {
      return {
        verified: false,
        message: 'Invalid BVN format'
      };
    }

    // Use BVN as a seed for consistent dynamic data generation
    // This ensures the same BVN always produces the same generated details
    const generator = new MockDataGenerator(bvn);

    // Generate dynamic KYC data
    return {
      verified: true,
      message: 'BVN verified successfully',
      firstName: generator.firstName(),
      lastName: generator.lastName(),
      dateOfBirth: generator.dateOfBirth(),
      phoneNumber: generator.phoneNumber()
    };
  }

  async getKycByUserId(userId: string): Promise<Kyc> {
    const kyc = await this.kycRepository.findOne({ where: { userId } });
    if (!kyc) {
      throw new NotFoundException('KYC details not found for this user');
    }
    return kyc;
  }

  async getKycById(kycId: string): Promise<Kyc> {
    const kyc = await this.kycRepository.findOne({ where: { id: kycId } });
    if (!kyc) {
      throw new NotFoundException('KYC details not found');
    }
    return kyc;
  }

  async updateKycStatus(kycId: string, status: string, rejectionReason?: string): Promise<{ message: string }> {
    const kyc = await this.kycRepository.findOne({ where: { id: kycId } });
    if (!kyc) {
      throw new NotFoundException('KYC details not found');
    }

    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(status)) {
      throw new BadRequestException('Invalid KYC status');
    }

    if (status === 'REJECTED' && !rejectionReason) {
      throw new BadRequestException('Rejection reason is required for REJECTED status');
    }

    kyc.status = status;
    if (status === 'REJECTED' && rejectionReason) {
      kyc.rejectionReason = rejectionReason;
    } else if (status !== 'REJECTED') {
      kyc.rejectionReason = null;
    }

    await this.kycRepository.save(kyc);

    return {
      message: `KYC status updated to ${status}`,
    };
  }

  async getUserWithKyc(userId: string): Promise<{ user: User; kyc?: Kyc }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const kyc = await this.kycRepository.findOne({ where: { userId } });

    return {
      user,
      kyc,
    };
  }
}