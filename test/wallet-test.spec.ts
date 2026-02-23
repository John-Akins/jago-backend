import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WalletModule } from '../src/wallet/wallet.module';
import { WalletService } from '../src/wallet/wallet.service';
import { Wallet } from '../src/wallet/wallet.entity';
import { User } from '../src/user/user.entity';
import { Repository } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DatabaseConfigService } from '../src/config/database.config';
import { AuthModule } from '../src/auth/auth.module';
import { UserService } from '../src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

const KOBO_PER_NAIRA = 100;
const nairaToKobo = (naira: number): number => Math.round(naira * KOBO_PER_NAIRA);

describe('Wallet API (e2e)', () => {
  let app: INestApplication;
  let walletRepository: Repository<Wallet>;
  let userRepository: Repository<User>;
  let walletService: WalletService;
  let userService: UserService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const saltRounds = 10;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        TypeOrmModule.forRootAsync({ useClass: DatabaseConfigService }),
        WalletModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    walletRepository = moduleFixture.get<Repository<Wallet>>(getRepositoryToken(Wallet));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    walletService = moduleFixture.get<WalletService>(WalletService);
    userService = moduleFixture.get<UserService>(UserService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    
    const config = new DocumentBuilder()
      .setTitle('Jago Wallet API')
      .setDescription('A simple wallet service API with static responses for testing')
      .setVersion('1.0')
      .addTag('wallet')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.init();
  });

  afterEach(async () => {
    if (walletRepository) { await walletRepository.clear(); }
    if (userRepository) { await userRepository.clear(); }
  });

  afterAll(async () => {
    if (app) { await app.close(); }
  });

  async function createUserAndWallet(balanceInNaira: number = 1000, currency: string = 'NGN', shortcode?: string) {
    const hashedPassword = await bcrypt.hash('password123', saltRounds);
    const hashedShortcode = shortcode ? await bcrypt.hash(shortcode, saltRounds) : undefined;

    const user = userRepository.create({
      email: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: hashedPassword,
      name: 'Test User',
      shortcode: hashedShortcode,
    });
    const savedUser = await userRepository.save(user);

    const wallet = walletRepository.create({
      userId: savedUser.id,
      balance: nairaToKobo(balanceInNaira),
      currency: currency,
    });
    await walletRepository.save(wallet);

    const payload = { email: savedUser.email, sub: savedUser.id };
    const accessToken = await jwtService.signAsync(payload, { secret: configService.get<string>('JWT_SECRET') });

    return { user: savedUser, wallet, accessToken };
  }

  describe('POST /wallet/:userId/fund', () => {
    it('should fund a wallet successfully', async () => {
      const { user, accessToken } = await createUserAndWallet(1000, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/fund`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 1000, currency: 'NGN' })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'COMPLETED',
        type: 'FUNDING',
        userId: user.id,
        amount: 1000,
        currency: 'NGN',
        message: 'Successfully funded wallet with 1000 NGN'
      });
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.completedAt).toBeDefined();

      const updatedWallet = await walletRepository.findOne({ where: { userId: user.id } });
      expect(Number(updatedWallet.balance)).toBe(nairaToKobo(2000));
    });

    it('should return 400 for invalid amount', async () => {
      const { user, accessToken } = await createUserAndWallet(1000, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/fund`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: -100, currency: 'NGN' })
        .expect(400);

      expect(response.body.message).toContain('amount must be a positive number');
    });

    it('should return 404 for non-existent wallet', async () => {
      const { user, accessToken } = await createUserAndWallet(1000, 'NGN', '1234');
      
      // Delete the wallet to simulate non-existent wallet
      await walletRepository.delete({ userId: user.id });
      
      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/fund`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: 1000, currency: 'NGN' })
        .expect(404);

      expect(response.body.message).toContain('Wallet not found for user');
    });
  });

  describe('POST /wallet/:userId/pay-bill', () => {
    it('should pay a bill successfully with correct shortcode', async () => {
      const { user, accessToken } = await createUserAndWallet(5000, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500,
          shortcode: '1234',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'COMPLETED',
        type: 'BILL_PAYMENT',
        userId: user.id,
        billType: 'AIRTIME',
        billerCode: 'AIRTEL',
        customerId: '08012345678',
        amount: 500,
        message: 'Successfully paid AIRTIME bill for customer 08012345678'
      });
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.completedAt).toBeDefined();

      const updatedWallet = await walletRepository.findOne({ where: { userId: user.id } });
      expect(Number(updatedWallet.balance)).toBe(nairaToKobo(4500));
    });

    it('should return 401 for incorrect shortcode', async () => {
      const { user, accessToken } = await createUserAndWallet(5000, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500,
          shortcode: '9999',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid shortcode');
    });

    it('should return 400 if shortcode not provided', async () => {
      const { user, accessToken } = await createUserAndWallet(5000, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500,
        })
        .expect(400);

      expect(response.body.message).toContain('Shortcode must be a 4-digit number');
    });

    it('should return 400 for invalid bill type', async () => {
      const { user, accessToken } = await createUserAndWallet(5000, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          billType: 'INVALID',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500,
          shortcode: '1234',
        })
        .expect(400);

      expect(response.body.message[0]).toContain('billType must be one of the following values');
    });

    it('should return 400 for insufficient balance', async () => {
      const { user, accessToken } = await createUserAndWallet(100, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500,
          shortcode: '1234',
        })
        .expect(400);

      expect(response.body.message).toContain('Insufficient wallet balance');
    });

    it('should return 404 for non-existent wallet', async () => {
      const { user, accessToken } = await createUserAndWallet(5000, 'NGN', '1234');
      
      // Delete the wallet to simulate non-existent wallet
      await walletRepository.delete({ userId: user.id });
      
      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500,
          shortcode: '1234',
        })
        .expect(404);

      expect(response.body.message).toContain('Wallet not found for user');
    });
  });

  describe('GET /wallet/:userId/balance', () => {
    it('should get wallet balance', async () => {
      const { user, accessToken } = await createUserAndWallet(5000, 'NGN', '1234');

      const response = await request(app.getHttpServer())
        .get(`/wallet/${user.id}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: user.id,
        availableBalance: 5000,
        currency: 'NGN'
      });
      expect(response.body.lastUpdated).toBeDefined();
    });

    it('should return 404 for non-existent wallet', async () => {
      const { user, accessToken } = await createUserAndWallet(5000, 'NGN', '1234');
      
      // Delete the wallet to simulate non-existent wallet
      await walletRepository.delete({ userId: user.id });
      
      const response = await request(app.getHttpServer())
        .get(`/wallet/${user.id}/balance`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.message).toContain('Wallet not found for user');
    });
  });

  describe('GET /wallet/transactions/:transactionId/status', () => {
    it('should get transaction status', async () => {
      const { accessToken } = await createUserAndWallet(5000, 'NGN', '1234');
      
      const response = await request(app.getHttpServer())
        .get('/wallet/transactions/txn_123/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        transactionId: 'txn_123',
        status: 'COMPLETED',
        type: 'FUNDING',
        userId: 'user123',
        amount: 1000,
        currency: 'NGN',
        message: 'Transaction completed successfully'
      });
      expect(response.body.completedAt).toBeDefined();
    });
  });

  describe('Swagger Documentation', () => {
    it('should serve Swagger documentation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api')
        .expect(200);

      expect(response.text).toContain('Swagger UI');
    });

    it('should serve Swagger JSON', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
      expect(response.body.info.title).toBe('Jago Wallet API');
    });
  });
});
