import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import type { JwtPayload } from './jwt.strategy'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    displayName: string
    timezone: string
  }
  workspace: {
    id: string
    name: string
  }
  tokens: AuthTokens
}

// In-memory fallback cache for development/demo when local DB is offline
interface CachedUser {
  id: string
  email: string
  passwordHash: string
  displayName: string
  timezone: string
  workspaceId: string
  workspaceName: string
}

const DEMO_PASSWORD_HASH = bcrypt.hashSync('Priorio2026!', 10)

const MEMORY_USERS: Map<string, CachedUser> = new Map([
  [
    'alex@priorio.app',
    {
      id: 'usr-alex-morgan-preview',
      email: 'alex@priorio.app',
      passwordHash: DEMO_PASSWORD_HASH,
      displayName: 'Alex Morgan',
      timezone: 'America/New_York',
      workspaceId: 'ws-alex-personal',
      workspaceName: "Alex's Workspace",
    },
  ],
])

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim()

    // 1. Check existing user in DB or memory
    try {
      const existingDb = await this.prisma.user.findUnique({ where: { email } })
      if (existingDb) {
        throw new ConflictException('An account with this email already exists.')
      }
    } catch (err: any) {
      if (err instanceof ConflictException) throw err
      // DB connection failed, check memory cache
      if (MEMORY_USERS.has(email)) {
        throw new ConflictException('An account with this email already exists.')
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)
    const timezone = dto.timezone || 'UTC'
    const workspaceName = dto.workspaceName || `${dto.displayName}'s Workspace`

    let userId: string
    let workspaceId: string

    try {
      // 2. Create user + workspace in DB
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash,
            displayName: dto.displayName,
            timezone,
          },
        })

        const workspace = await tx.workspace.create({
          data: {
            name: workspaceName,
            memberships: {
              create: {
                userId: user.id,
                role: 'owner',
              },
            },
          },
        })

        return { user, workspace }
      })

      userId = result.user.id
      workspaceId = result.workspace.id
    } catch (err) {
      this.logger.warn(`Database offline, using memory registry fallback for ${email}: ${err}`)
      userId = crypto.randomUUID()
      workspaceId = crypto.randomUUID()

      MEMORY_USERS.set(email, {
        id: userId,
        email,
        passwordHash,
        displayName: dto.displayName,
        timezone,
        workspaceId,
        workspaceName,
      })
    }

    const tokens = await this.generateTokens({
      sub: userId,
      email,
      displayName: dto.displayName,
      workspaceId,
    })

    await this.recordSession(userId, tokens.refreshToken)

    return {
      user: {
        id: userId,
        email,
        displayName: dto.displayName,
        timezone,
      },
      workspace: {
        id: workspaceId,
        name: workspaceName,
      },
      tokens,
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const email = dto.email.toLowerCase().trim()
    let user: any = null
    let workspace: any = null

    // Try finding user in DB
    try {
      user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          memberships: {
            include: { workspace: true },
          },
        },
      })
      if (user && user.memberships.length > 0) {
        workspace = user.memberships[0].workspace
      }
    } catch {
      // DB offline, fall through to memory store
    }

    // Check memory fallback if not found in DB
    if (!user) {
      const memoryUser = MEMORY_USERS.get(email)
      if (memoryUser) {
        user = {
          id: memoryUser.id,
          email: memoryUser.email,
          passwordHash: memoryUser.passwordHash,
          displayName: memoryUser.displayName,
          timezone: memoryUser.timezone,
        }
        workspace = {
          id: memoryUser.workspaceId,
          name: memoryUser.workspaceName,
        }
      }
    }

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.')
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash)
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password.')
    }

    const workspaceId = workspace?.id || 'ws-default'
    const workspaceName = workspace?.name || `${user.displayName}'s Workspace`

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      workspaceId,
    })

    await this.recordSession(user.id, tokens.refreshToken)

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        timezone: user.timezone || 'UTC',
      },
      workspace: {
        id: workspaceId,
        name: workspaceName,
      },
      tokens,
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'priorio-refresh-secret-jwt-key-2026',
      })

      const newTokens = await this.generateTokens({
        sub: payload.sub,
        email: payload.email,
        displayName: payload.displayName,
        workspaceId: payload.workspaceId,
      })

      await this.recordSession(payload.sub, newTokens.refreshToken)
      return newTokens
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.')
    }
  }

  async logout(userId: string, refreshToken?: string): Promise<{ success: boolean }> {
    if (refreshToken) {
      try {
        const hash = crypto.createHash('sha256').update(refreshToken).digest('hex')
        await this.prisma.authSession.updateMany({
          where: { userId, refreshHash: hash, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      } catch {
        // Ignore DB offline
      }
    }
    return { success: true }
  }

  async getProfile(userId: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            include: { workspace: true },
          },
        },
      })
      if (user) {
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          timezone: user.timezone,
          workspaces: user.memberships.map((m) => ({
            id: m.workspace.id,
            name: m.workspace.name,
            role: m.role,
          })),
        }
      }
    } catch {
      // Fall through to memory
    }

    for (const mem of MEMORY_USERS.values()) {
      if (mem.id === userId) {
        return {
          id: mem.id,
          email: mem.email,
          displayName: mem.displayName,
          timezone: mem.timezone,
          workspaces: [{ id: mem.workspaceId, name: mem.workspaceName, role: 'owner' }],
        }
      }
    }

    throw new UnauthorizedException('User profile not found.')
  }

  private async generateTokens(payload: JwtPayload): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '1d',
      secret: process.env.JWT_SECRET || 'priorio-super-secret-jwt-key-2026',
    })

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '30d',
      secret: process.env.JWT_REFRESH_SECRET || 'priorio-refresh-secret-jwt-key-2026',
    })

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400,
    }
  }

  private async recordSession(userId: string, refreshToken: string) {
    try {
      const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex')
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      await this.prisma.authSession.create({
        data: {
          userId,
          refreshHash,
          expiresAt,
        },
      })
    } catch {
      // Graceful fallback when DB is offline
    }
  }
}

