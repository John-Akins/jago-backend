import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { UserService } from "../src/user/user.service";
import { JwtService } from "@nestjs/jwt";
import { User } from "../src/user/user.entity";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Wallet } from "../src/wallet/wallet.entity";

describe("Auth (e2e)", () => {
  let app: INestApplication;
  let userService: UserService;
  let jwtService: JwtService;
  let userRepository: Repository<User>;
  let walletRepository: Repository<Wallet>;

  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    password: "Password123!",
    name: "Test User",
    emailVerified: false,
    shortcode: "1234", // Added shortcode
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    userService = moduleFixture.get<UserService>(UserService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    walletRepository = moduleFixture.get<Repository<Wallet>>(getRepositoryToken(Wallet));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await walletRepository.clear();
    await userRepository.clear();
  });

  it("/user/signup (POST) - should register a new user with shortcode", async () => {
    const res = await request(app.getHttpServer())
      .post("/user/signup")
      .send({
        email: mockUser.email,
        password: mockUser.password,
        name: mockUser.name,
        shortcode: mockUser.shortcode, // Included shortcode
      })
      .expect(201);

    expect(res.body.message).toBe("User registered successfully");
    expect(res.body.userId).toBeDefined();

    const user = await userRepository.findOne({ where: { email: mockUser.email } });
    expect(user).toBeDefined();
    expect(user?.email).toBe(mockUser.email);
    expect(user?.shortcode).toBeDefined(); // Verify shortcode is stored
  });

  it("/user/signup (POST) - should return 400 for invalid shortcode format (too short)", async () => {
    const res = await request(app.getHttpServer())
      .post("/user/signup")
      .send({
        email: "invalidshortcode@example.com",
        password: mockUser.password,
        name: mockUser.name,
        shortcode: "123", // Too short
      })
      .expect(400);

    expect(res.body.message).toContain("Shortcode must be exactly 4 digits");
  });

  it("/user/signup (POST) - should return 400 for invalid shortcode format (non-numeric)", async () => {
    const res = await request(app.getHttpServer())
      .post("/user/signup")
      .send({
        email: "invalidshortcode2@example.com",
        password: mockUser.password,
        name: mockUser.name,
        shortcode: "abcd", // Non-numeric
      })
      .expect(400);

    expect(res.body.message).toContain("Shortcode must be a 4-digit number");
  });

  it("/user/signin (POST) - should sign in a user and return an access token", async () => {
    // First, register the user
    await userService.signup({
      email: mockUser.email,
      password: mockUser.password,
      name: mockUser.name,
      shortcode: mockUser.shortcode, // Included shortcode
    });

    const res = await request(app.getHttpServer())
      .post("/user/signin")
      .send({
        email: mockUser.email,
        password: mockUser.password,
      })
      .expect(201);

    expect(res.body.message).toBe("User signed in successfully");
    expect(res.body.access_token).toBeDefined();

    const decodedToken = jwtService.decode(res.body.access_token);
    expect(decodedToken.email).toBe(mockUser.email);
    expect(decodedToken.sub).toBeDefined();
  });

  it("/user/:userId (GET) - should return user details for an authenticated user", async () => {
    // Register and sign in a user to get a token
    await userService.signup({
      email: mockUser.email,
      password: mockUser.password,
      name: mockUser.name,
      shortcode: mockUser.shortcode, // Included shortcode
    });

    const signinRes = await request(app.getHttpServer())
      .post("/user/signin")
      .send({
        email: mockUser.email,
        password: mockUser.password,
      });
    const accessToken = signinRes.body.access_token;

    const user = await userRepository.findOne({ where: { email: mockUser.email } });
    const userId = user?.id;

    const res = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.email).toBe(mockUser.email);
    expect(res.body.id).toBe(userId);
  });

  it("/user/:userId (GET) - should deny access to unauthorized user data", async () => {
    // Register and sign in a user to get a token
    await userService.signup({
      email: mockUser.email,
      password: mockUser.password,
      name: mockUser.name,
      shortcode: mockUser.shortcode, // Included shortcode
    });

    const signinRes = await request(app.getHttpServer())
      .post("/user/signin")
      .send({
        email: mockUser.email,
        password: mockUser.password,
      });
    const accessToken = signinRes.body.access_token;

    const otherUserId = "some-other-user-id"; // A different user\u005c's ID

    await request(app.getHttpServer())
      .get(`/user/${otherUserId}`)
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(401); // Unauthorized
  });

  it("/user/:userId (GET) - should deny access without a token", async () => {
    const user = await userRepository.findOne({ where: { email: mockUser.email } });
    const userId = user?.id || "some-id";

    await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .expect(401); // Unauthorized
  });
});
