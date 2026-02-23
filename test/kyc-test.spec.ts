import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { KycModule } from '../src/kyc/kyc.module';
import { KycService } from '../src/kyc/kyc.service';
import { User } from '../src/user/user.entity';
import { Kyc } from '../src/kyc/kyc.entity';
import { Repository } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DatabaseConfigService } from '../src/config/database.config';

describe('KYC API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let kycRepository: Repository<Kyc>;

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
        KycModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply validation pipe globally
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    kycRepository = moduleFixture.get<Repository<Kyc>>(getRepositoryToken(Kyc));
    
    // Configure Swagger for tests
    const config = new DocumentBuilder()
      .setTitle('Jago KYC API')
      .setDescription('KYC service API with BVN verification for testing')
      .setVersion('1.0')
      .addTag('kyc')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.init();
  });

  afterEach(async () => {
    // Clean up database after each test
    if (kycRepository) {
      await kycRepository.clear();
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

  describe('POST /kyc/submit', () => {
    it('should return 400 for invalid BVN format', async () => {
      const user = userRepository.create({
        email: 'test1@example.com',
        password: 'hashed_password',
        name: 'Test User 1',
      });
      await userRepository.save(user);

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .send({
          userId: user.id,
          bvn: '1234567890', // Too short - BVN must be exactly 11 digits
        })
        .expect(400);

      expect(response.body.message).toContain('BVN must be exactly 11 digits');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .send({
          userId: '550e8400-e29b-41d4-a716-446655440000', // Non-existent user
          bvn: '12345678901',
        })
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });

    it('should return 400 if user already has KYC', async () => {
      const user = userRepository.create({
        email: 'test2@example.com',
        password: 'hashed_password',
        name: 'Test User 2',
      });
      await userRepository.save(user);

      // Create existing KYC for user
      const existingKyc = kycRepository.create({
        userId: user.id,
        bvn: '12345678901',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+2348012345678',
        status: 'VERIFIED'
      });
      await kycRepository.save(existingKyc);

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .send({
          userId: user.id,
          bvn: '12345678901',
        })
        .expect(400);

      expect(response.body.message).toContain('KYC already submitted for this user');
    });

    it('should submit KYC successfully with valid BVN', async () => {
      const user = userRepository.create({
        email: 'test3@example.com',
        password: 'hashed_password',
        name: 'Test User 3',
      });
      await userRepository.save(user);

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .send({
          userId: user.id,
          bvn: '12345678901',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        message: 'KYC details submitted and verified successfully',
      });
      expect(response.body).toHaveProperty('kycId');

      // Verify KYC was saved to database
      const savedKyc = await kycRepository.findOne({ where: { userId: user.id } });
      expect(savedKyc).toBeDefined();
      expect(savedKyc.bvn).toBe('12345678901');
      expect(savedKyc.status).toBe('VERIFIED');
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
      expect(response.body.info.title).toBe('Jago KYC API');
    });
  });
});