import { Controller, Post, Body, Get, Param, UseGuards, Req, UnauthorizedException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from "@nestjs/swagger";
import { UserService } from "./user.service";
import { SignupDto } from "../dto/signup.dto";
import { SigninDto } from "../dto/signin.dto";
import { User } from "./user.entity";
import { JwtAuthGuard } from "../auth/jwt-auth.guard"; // Import JwtAuthGuard

@ApiTags("user")
@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("signup")
  @ApiOperation({ summary: "User registration" })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 400, description: "User already exists" })
  async signup(@Body() signupDto: SignupDto) {
    return this.userService.signup(signupDto);
  }

  @Post("signin")
  @ApiOperation({ summary: "User login" })
  @ApiBody({ type: SigninDto })
  @ApiResponse({ status: 200, description: "User signed in successfully" })
  @ApiResponse({ status: 404, description: "Invalid email or password" })
  async signin(@Body() signinDto: SigninDto) {
    return this.userService.signin(signinDto);
  }

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Get(":userId")
  @ApiOperation({ summary: "Get user by ID" })
  @ApiParam({ name: "userId", description: "User ID" })
  @ApiResponse({ status: 200, description: "User found", type: User })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserById(@Param("userId") userId: string, @Req() req: any): Promise<User> {
    // Ensure the authenticated user is accessing their own data or is an admin
    if (req.user.id !== userId) { // Changed from req.user.sub to req.user.id
      throw new UnauthorizedException("You are not authorized to view this user's data");
    }
    return this.userService.getUserById(userId);
  }

  @UseGuards(JwtAuthGuard) // Protect this endpoint
  @Get("email/:email")
  @ApiOperation({ summary: "Get user by email" })
  @ApiParam({ name: "email", description: "User email" })
  @ApiResponse({ status: 200, description: "User found", type: User })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserByEmail(@Param("email") email: string, @Req() req: any): Promise<User> {
    // Ensure the authenticated user is accessing their own data or is an admin
    if (req.user.email !== email) {
      throw new UnauthorizedException("You are not authorized to view this user's data");
    }
    return this.userService.getUserByEmail(email);
  }
}
