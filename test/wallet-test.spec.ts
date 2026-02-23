import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from '../src/wallet/wallet.module';
import { WalletService } from '../src/wallet/wallet.service';
import { Wallet } from '../src/wallet/wallet.entity';
import { User } from '../src/user/user.entity';
import { Repository } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DatabaseConfigService } from '../src/config/database.config';

// Conversion constant for tests
const KOBO_PER_NAIRA = 100;
const nairaToKobo = (naira: number): number => Math.round(naira * KOBO_PER_NAIRA);

describe('Wallet API (e2e)', () => {
  let app: INestApplication;
  let walletRepository: Repository<Wallet>;
  let userRepository: Repository<User>;
  let walletService: WalletService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env',
        }),
        TypeOrmModule.forRootAsync({
          useClass: DatabaseConfigService,
        }),
        WalletModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply validation pipe globally
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    walletRepository = moduleFixture.get<Repository<Wallet>>(getRepositoryToken(Wallet));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    walletService = moduleFixture.get<WalletService>(WalletService);
    
    // Configure Swagger for tests
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
    // Clean up database after each test
    if (walletRepository) {
      await walletRepository.clear();
    }
    if (userRepository) {
      await userRepository.clear();
    }
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  // Helper function to create a user and wallet (balance stored in kobo)
  // Returns the user with auto-generated ID
  async function createUserAndWallet(balanceInNaira: number = 1000, currency: string = 'NGN') {
    const user = userRepository.create({
      email: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@test.com`,
      password: 'hashed_password',
      name: 'Test User',
    });
    const savedUser = await userRepository.save(user);

    const wallet = walletRepository.create({
      userId: savedUser.id,
      balance: nairaToKobo(balanceInNaira), // Convert to kobo for storage
      currency: currency,
    });
    await walletRepository.save(wallet);

    return { user: savedUser, wallet };
  }

  describe('POST /wallet/:userId/fund', () => {
    it('should fund a wallet successfully', async () => {
      const { user } = await createUserAndWallet(1000); // 1000 Naira = 100000 kobo

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/fund`)
        .send({
          amount: 1000, // Amount in Naira (API uses Naira)
          currency: 'NGN'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'COMPLETED',
        type: 'FUNDING',
        userId: user.id,
        amount: 1000, // Response in Naira
        currency: 'NGN',
        message: 'Successfully funded wallet with 1000 NGN'
      });
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.completedAt).toBeDefined();

      // Verify balance was updated in database (stored in kobo)
      const updatedWallet = await walletRepository.findOne({ where: { userId: user.id } });
      expect(Number(updatedWallet.balance)).toBe(nairaToKobo(2000)); // 2000 Naira = 200000 kobo
    });

    it('should return 400 for invalid amount', async () => {
      const { user } = await createUserAndWallet(1000);

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/fund`)
        .send({
          amount: -100,
          currency: 'NGN'
        })
        .expect(400);

      expect(response.body.message).toContain('amount must be a positive number');
    });

    it('should return 404 for non-existent wallet', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/550e8400-e29b-41d4-a716-446655440000/fund')
        .send({
          amount: 1000,
          currency: 'NGN'
        })
        .expect(404);

      expect(response.body.message).toContain('Wallet not found for user');
    });
  });

  describe('POST /wallet/:userId/pay-bill', () => {
    it('should pay a bill successfully', async () => {
      const { user } = await createUserAndWallet(5000); // 5000 Naira = 500000 kobo

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500 // Amount in Naira (API uses Naira)
        })
        .expect(201);

      expect(response.body).toMatchObject({
        status: 'COMPLETED',
        type: 'BILL_PAYMENT',
        userId: user.id,
        billType: 'AIRTIME',
        billerCode: 'AIRTEL',
        customerId: '08012345678',
        amount: 500, // Response in Naira
        message: 'Successfully paid AIRTIME bill for customer 08012345678'
      });
      expect(response.body.transactionId).toBeDefined();
      expect(response.body.completedAt).toBeDefined();

      // Verify balance was deducted in database (stored in kobo)
      const updatedWallet = await walletRepository.findOne({ where: { userId: user.id } });
      expect(Number(updatedWallet.balance)).toBe(nairaToKobo(4500)); // 4500 Naira = 450000 kobo
    });

    it('should return 400 for invalid bill type', async () => {
      const { user } = await createUserAndWallet(5000);

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .send({
          billType: 'INVALID',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500
        })
        .expect(400);

      expect(response.body.message[0]).toContain('billType must be one of the following values');
    });

    it('should return 400 for insufficient balance', async () => {
      const { user } = await createUserAndWallet(100); // 100 Naira

      const response = await request(app.getHttpServer())
        .post(`/wallet/${user.id}/pay-bill`)
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500 // Trying to pay 500 Naira
        })
        .expect(400);

      expect(response.body.message).toContain('Insufficient wallet balance');
    });

    it('should return 404 for non-existent wallet', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallet/550e8400-e29b-41d4-a716-446655440000/pay-bill')
        .send({
          billType: 'AIRTIME',
          billerCode: 'AIRTEL',
          customerId: '08012345678',
          amount: 500
        })
        .expect(404);

      expect(response.body.message).toContain('Wallet not found for user');
    });
  });

  describe('GET /wallet/:userId/balance', () => {
    it('should get wallet balance', async () => {
      const { user } = await createUserAndWallet(5000); // 5000 Naira

      const response = await request(app.getHttpServer())
        .get(`/wallet/${user.id}/balance`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: user.id,
        availableBalance: 5000, // Response in Naira
        currency: 'NGN'
      });
      expect(response.body.lastUpdated).toBeDefined();
    });

    it('should return 404 for non-existent wallet', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/550e8400-e29b-41d4-a716-446655440000/balance')
        .expect(404);

      expect(response.body.message).toContain('Wallet not found for user');
    });
  });

  describe('GET /wallet/transactions/:transactionId/status', () => {
    it('should get transaction status', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallet/transactions/txn_123/status')
        .expect(200);

      expect(response.body).toMatchObject({
        transactionId: 'txn_123',
        status: 'COMPLETED',
        type: 'FUNDING',
        userId: 'user123',
        amount: 1000, // In Naira
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