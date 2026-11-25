import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginUseCase } from '../../../../application/use-cases/login.use-case';
import { GetProfileUseCase } from '../../../../application/use-cases/get-profile.use-case';
import { LoginHttpDto } from './dto/login.http-dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Authentication successful with JWT' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or inactive user' })
  async login(@Body() dto: LoginHttpDto, @Ip() ipAddress: string) {
    return this.loginUseCase.execute({
      email: dto.email,
      password: dto.password,
      ipAddress,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil del usuario autenticado con detalles de ubicación' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMe(@CurrentUser() user: { id: string }) {
    return this.getProfileUseCase.execute(user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Alias de GET /auth/me' })
  @ApiResponse({ status: 200, description: 'Detalles del usuario autenticado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getProfile(@CurrentUser() user: { id: string }) {
    return this.getProfileUseCase.execute(user.id);
  }
}
