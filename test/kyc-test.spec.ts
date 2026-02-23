import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KycModule } from '../src/kyc/kyc.module';
import { KycService } from '../src/kyc/kyc.service';
import { User } from '../src/user/user.entity';
import { Kyc } from '../src/kyc/kyc.entity';
import { Repository } from 'typeorm';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { DatabaseConfigService } from '../src/config/database.config';
import { AuthModule } from '../src/auth/auth.module'; // Import AuthModule
import { UserService } from '../src/user/user.service'; // Import UserService
import { JwtService } from '@nestjs/jwt'; // Import JwtService
import { IdentificationType } from '../src/dto/kyc.dto'; // Import IdentificationType enum

describe('KYC API (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let kycRepository: Repository<Kyc>;
  let userService: UserService; // Declare userService
  let jwtService: JwtService; // Declare jwtService
  let configService: ConfigService; // Declare configService

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ".env",
        }),
        TypeOrmModule.forRootAsync({
          useClass: DatabaseConfigService,
        }),
        KycModule,
        AuthModule, // Import AuthModule to provide JWT strategy
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
    userService = moduleFixture.get<UserService>(UserService); // Initialize userService
    jwtService = moduleFixture.get<JwtService>(JwtService); // Initialize jwtService
    configService = moduleFixture.get<ConfigService>(ConfigService); // Initialize configService
    
    // Configure Swagger for tests
    const config = new DocumentBuilder()
      .setTitle("Jago KYC API")
      .setDescription("KYC service API with BVN verification for testing")
      .setVersion("1.0")
      .addTag("kyc")
      .addBearerAuth() // Add bearer auth for Swagger
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api", app, document);

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

  // Helper to create a user and get an access token
  async function createUserAndGetToken(email: string, password = 'Password123!', name = 'Test User', shortcode = '1234') {
    await userService.signup({ email, password, name, shortcode });
    const user = await userRepository.findOne({ where: { email } });
    const payload = { email: user.email, sub: user.id };
    const accessToken = await jwtService.signAsync(payload, { secret: configService.get<string>('JWT_SECRET') });
    return { user, accessToken };
  }

  describe('POST /kyc/submit', () => {
    it('should return 400 for invalid BVN format', async () => {
      const { user, accessToken } = await createUserAndGetToken('test1@example.com');

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`) // Add Authorization header
        .send({
          userId: user.id,
          bvn: '1234567890', // Too short - BVN must be exactly 11 digits
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(400);

      expect(response.body.message).toContain('BVN must be exactly 11 digits');
    });

    it('should return 401 when submitting KYC for another user (non-existent user ID)', async () => {
      const { accessToken } = await createUserAndGetToken('test-kyc-submit-user-not-found@example.com');

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`) // Add Authorization header
        .send({
          userId: '550e8400-e29b-41d4-a716-446655440000', // Different user ID (non-existent)
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(401);

      expect(response.body.message).toContain('You are not authorized to submit KYC for this user');
    });

    it('should return 400 if KYC already submitted for this user', async () => {
      const { user, accessToken } = await createUserAndGetToken('test2@example.com');

      // Create existing KYC for user
      const existingKyc = kycRepository.create({
        userId: user.id,
        bvn: '11111111111',
        firstName: 'Existing',
        lastName: 'KycUser',
        dateOfBirth: '1990-01-01',
        phoneNumber: '+2348012345678',
        status: 'VERIFIED'
      });
      await kycRepository.save(existingKyc);

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`) // Add Authorization header
        .send({
          userId: user.id,
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(400);

      expect(response.body.message).toContain('KYC already submitted for this user');
    });

    it('should submit KYC successfully with valid BVN', async () => {
      const { user, accessToken } = await createUserAndGetToken('test3@example.com');

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`) // Add Authorization header
        .send({
          userId: user.id,
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
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

    it('should return 401 if submitting KYC for another user', async () => {
      const { accessToken } = await createUserAndGetToken('user-a@example.com');
      const { user: userB } = await createUserAndGetToken('user-b@example.com');

      const response = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: userB.id, // Trying to submit KYC for user B with user A's token
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(401);
      expect(response.body.message).toContain('You are not authorized to submit KYC for this user');
    });
  });

  describe('GET /kyc/user/:userId', () => {
    it('should get KYC details by user ID for authenticated user', async () => {
      const { user, accessToken } = await createUserAndGetToken('getbyid@example.com');

      // Submit KYC first
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: user.id,
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(201);
      
      const response = await request(app.getHttpServer())
        .get(`/kyc/user/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: user.id,
        bvn: '12345678901',
        status: 'VERIFIED',
      });
    });

    it('should return 401 if trying to get KYC for another user', async () => {
      const { accessToken } = await createUserAndGetToken('userX@example.com');
      const { user: userY } = await createUserAndGetToken('userY@example.com');

      const response = await request(app.getHttpServer())
        .get(`/kyc/user/${userY.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      expect(response.body.message).toContain('You are not authorized to view this user\'s KYC data');
    });

    it('should return 404 for non-existent KYC details by user ID', async () => {
      const { user, accessToken } = await createUserAndGetToken('no-kyc-user@example.com');

      const response = await request(app.getHttpServer())
        .get(`/kyc/user/${user.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
      expect(response.body.message).toContain('KYC details not found for this user');
    });
  });

  describe('PUT /kyc/:kycId/status', () => {
    it('should update KYC status successfully', async () => {
      const { user, accessToken } = await createUserAndGetToken('updatestatus@example.com');

      // Submit KYC first
      const submitRes = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: user.id,
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(201);
      const kycId = submitRes.body.kycId;
      
      const response = await request(app.getHttpServer())
        .put(`/kyc/${kycId}/status?status=REJECTED&rejectionReason=Incomplete+documents`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'KYC status updated to REJECTED',
      });

      const updatedKyc = await kycRepository.findOne({ where: { id: kycId } });
      expect(updatedKyc.status).toBe('REJECTED');
      expect(updatedKyc.rejectionReason).toBe('Incomplete documents');
    });

    it('should return 400 for invalid status', async () => {
      const { user, accessToken } = await createUserAndGetToken('invalidstatus@example.com');

      // Submit KYC first
      const submitRes = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: user.id,
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(201);
      const kycId = submitRes.body.kycId;
      
      await request(app.getHttpServer())
        .put(`/kyc/${kycId}/status?status=UNKNOWN`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should return 400 if rejectionReason is missing for REJECTED status', async () => {
      const { user, accessToken } = await createUserAndGetToken('missingreason@example.com');

      // Submit KYC first
      const submitRes = await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: user.id,
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(201);
      const kycId = submitRes.body.kycId;
      
      const response = await request(app.getHttpServer())
        .put(`/kyc/${kycId}/status?status=REJECTED`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.message).toContain('Rejection reason is required for REJECTED status');
    });

    it('should return 404 for non-existent KYC ID when updating status', async () => {
      const { accessToken } = await createUserAndGetToken('nonexistentkyc@example.com');

      const response = await request(app.getHttpServer())
        .put('/kyc/550e8400-e29b-41d4-a716-446655440000/status?status=REJECTED&rejectionReason=Fake')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
      expect(response.body.message).toContain('KYC details not found');
    });
  });

  describe('GET /kyc/user/:userId/with-details', () => {
    it('should get user details with KYC information for authenticated user', async () => {
      const { user, accessToken } = await createUserAndGetToken('userwithkyc@example.com');

      // Submit KYC first
      await request(app.getHttpServer())
        .post('/kyc/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: user.id,
          bvn: '12345678901',
          identificationType: IdentificationType.NATIONAL_ID,
        })
        .expect(201);
      
      const response = await request(app.getHttpServer())
        .get(`/kyc/user/${user.id}/with-details`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.kyc).toBeDefined();
      expect(response.body.kyc.userId).toBe(user.id);
    });

    it('should return user details without KYC if not submitted', async () => {
      const { user, accessToken } = await createUserAndGetToken('usernokyc@example.com');

      const response = await request(app.getHttpServer())
        .get(`/kyc/user/${user.id}/with-details`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(user.email);
      expect(response.body.kyc).toBeNull(); // KYC should be null or undefined if not submitted
    });

    it('should return 401 if trying to get details for another user', async () => {
      const { accessToken } = await createUserAndGetToken('user-c@example.com');
      const { user: userD } = await createUserAndGetToken('user-d@example.com');

      const response = await request(app.getHttpServer())
        .get(`/kyc/user/${userD.id}/with-details`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
      expect(response.body.message).toContain('You are not authorized to view this user\'s KYC data');
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