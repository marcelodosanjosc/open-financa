import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, UserPayloadDto } from '@repo/shared';
import { CostClassification, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado no sistema');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user and initial 4-quadrant categories in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email.toLowerCase().trim(),
          fullName: dto.fullName.trim(),
          passwordHash,
          role: UserRole.USER,
        },
      });

      // Default baseline categories (4 quadrants)
      const baselineCategories = [
        {
          name: 'Alimentação',
          icon: 'Utensils',
          color: '#f97316',
          classification: CostClassification.ESSENTIAL,
          subs: [
            { name: 'Supermercado', icon: 'ShoppingCart', classification: CostClassification.ESSENTIAL },
            { name: 'Restaurantes & Delivery', icon: 'Coffee', classification: CostClassification.DISCRETIONARY },
          ],
        },
        {
          name: 'Moradia',
          icon: 'Home',
          color: '#3b82f6',
          classification: CostClassification.FIXED,
          subs: [
            { name: 'Aluguel & Condomínio', icon: 'Key', classification: CostClassification.FIXED },
            { name: 'Energia & Água', icon: 'Zap', classification: CostClassification.VARIABLE },
            { name: 'Internet & Telefonia', icon: 'Wifi', classification: CostClassification.FIXED },
          ],
        },
        {
          name: 'Transporte',
          icon: 'Car',
          color: '#eab308',
          classification: CostClassification.ESSENTIAL,
          subs: [
            { name: 'Combustível', icon: 'Fuel', classification: CostClassification.VARIABLE },
            { name: 'Transporte Público & Apps', icon: 'Bus', classification: CostClassification.VARIABLE },
          ],
        },
        {
          name: 'Lazer & Estilo de Vida',
          icon: 'Smile',
          color: '#ec4899',
          classification: CostClassification.DISCRETIONARY,
          subs: [
            { name: 'Streaming & Assinaturas', icon: 'Tv', classification: CostClassification.FIXED },
            { name: 'Viagens & Passeios', icon: 'Compass', classification: CostClassification.DISCRETIONARY },
          ],
        },
        {
          name: 'Saúde & Cuidados',
          icon: 'HeartPulse',
          color: '#10b981',
          classification: CostClassification.ESSENTIAL,
          subs: [
            { name: 'Farmácia & Medicamentos', icon: 'Pill', classification: CostClassification.VARIABLE },
            { name: 'Consultas & Exames', icon: 'Activity', classification: CostClassification.VARIABLE },
          ],
        },
      ];

      for (const cat of baselineCategories) {
        const parent = await tx.category.create({
          data: {
            userId: newUser.id,
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            classification: cat.classification,
          },
        });

        if (cat.subs && cat.subs.length > 0) {
          await tx.category.createMany({
            data: cat.subs.map((s) => ({
              userId: newUser.id,
              name: s.name,
              icon: s.icon,
              classification: s.classification,
              parentId: parent.id,
            })),
          });
        }
      }

      return newUser;
    });

    const userPayload: UserPayloadDto = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
    };

    const tokens = await this.generateTokens(userPayload);
    return { user: userPayload, ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const userPayload: UserPayloadDto = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
    };

    const tokens = await this.generateTokens(userPayload);
    return { user: userPayload, ...tokens };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token ausente');
    }

    let payload: { sub: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'open_financa_refresh_secret_2026',
      });
    } catch {
      throw new UnauthorizedException('Sessão expirada ou inválida');
    }

    const tokenHash = this.hashToken(refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Sessão revogada ou inválida');
    }

    // Revoke old refresh token (token rotation)
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const userPayload: UserPayloadDto = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
    };

    const tokens = await this.generateTokens(userPayload);
    return { user: userPayload, ...tokens };
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, isRevoked: false },
        data: { isRevoked: true },
      });
    }
    return { message: 'Sessão encerrada com sucesso' };
  }

  async getMe(userId: string): Promise<UserPayloadDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
    };
  }

  private async generateTokens(user: UserPayloadDto) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET || 'open_financa_super_secret_jwt_key_2026',
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'open_financa_refresh_secret_2026',
      expiresIn: '7d',
    });

    // Save refresh token hash in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
