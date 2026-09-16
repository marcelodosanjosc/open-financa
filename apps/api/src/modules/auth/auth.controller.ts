import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RegisterSchema,
  RegisterDto,
  LoginSchema,
  LoginDto,
  UserPayloadDto,
  AuthResponseDto,
} from '@repo/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutos
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Cadastra um novo usuário com onboarding de categorias' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso' })
  @UsePipes(new ZodValidationPipe(RegisterSchema))
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, message: 'Cadastro realizado com sucesso' };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica o usuário e define cookies de sessão' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, message: 'Login realizado com sucesso' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renova o access_token e rotaciona o refresh_token' })
  @ApiResponse({ status: 200, description: 'Tokens renovados com sucesso' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const refreshToken = req.cookies?.['refresh_token'];
    const result = await this.authService.refresh(refreshToken);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, message: 'Sessão renovada com sucesso' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encerra a sessão ativa e revoga o refresh token' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const refreshToken = req.cookies?.['refresh_token'];
    const result = await this.authService.logout(refreshToken);
    this.clearAuthCookies(res);
    return result;
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna os dados do usuário atualmente autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso' })
  async getMe(@CurrentUser() user: UserPayloadDto): Promise<UserPayloadDto> {
    return this.authService.getMe(user.id);
  }
}
