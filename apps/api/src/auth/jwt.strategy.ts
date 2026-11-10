import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthenticatedUser } from './decorators/current-user.decorator'

export interface JwtPayload {
  sub: string
  email: string
  displayName: string
  workspaceId?: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'priorio-super-secret-jwt-key-2026',
    })
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload')
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          memberships: {
            take: 1,
            select: { workspaceId: true },
          },
        },
      })

      if (!user) {
        // Fallback for demo or development users if DB was not reachable
        return {
          userId: payload.sub,
          email: payload.email,
          displayName: payload.displayName,
          workspaceId: payload.workspaceId,
        }
      }

      return {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        workspaceId: user.memberships[0]?.workspaceId || payload.workspaceId,
      }
    } catch {
      // In case DB is temporarily unreachable in dev, validate payload
      return {
        userId: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
        workspaceId: payload.workspaceId,
      }
    }
  }
}
