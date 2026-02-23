import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Wallet } from '../wallet/wallet.entity';
import { SignupDto } from '../dto/signup.dto';
import { SigninDto } from '../dto/signin.dto';
import { JwtService } from '@nestjs/jwt'; // Import JwtService
import { ConfigService } from '@nestjs/config'; // Import ConfigService

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly saltRounds = 10;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    private jwtService: JwtService, // Inject JwtService
    private configService: ConfigService, // Inject ConfigService
  ) {}

  async signup(signupDto: SignupDto): Promise<{ message: string; userId: string }> {
    const { email, password, name, shortcode } = signupDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password and shortcode
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);
    const hashedShortcode = await bcrypt.hash(shortcode, this.saltRounds);

    // Create new user
    const newUser = this.userRepository.create({
      email,
      password: hashedPassword,
      name,
      emailVerified: false,
      shortcode: hashedShortcode,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Create wallet for the new user
    const newWallet = this.walletRepository.create({
      userId: savedUser.id,
      balance: 0,
      currency: 'NGN',
    });
    await this.walletRepository.save(newWallet);

    return {
      message: 'User registered successfully',
      userId: savedUser.id,
    };
  }

  async signin(signinDto: SigninDto): Promise<{ message: string; access_token: string, user_id: string }> {
    const { email, password } = signinDto;

    // Find user by email
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new NotFoundException('Invalid email or password');
    }

    // Generate JWT token
    const payload = { email: user.email, sub: user.id };
    const access_token = await this.jwtService.signAsync(payload, { secret: this.configService.get<string>('JWT_SECRET') });

    return {
      message: 'User signed in successfully',
      access_token: access_token,
      user_id: user.id
    };
  }

  async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
