import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Redirect,
} from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { AuthorizeDto, OAuthCallbackDto } from './dto/oauth.dto';
import {
  AuthorizeResponseDto,
  OAuthConnectionsListDto,
  RevokeResponseDto,
} from './entities/oauth-connection.entity';

// TODO: Add proper authentication guard
// import { AuthGuard } from '@nestjs/passport';

@Controller('api/integrations/oauth')
export class OAuthController {
  constructor(private oauthService: OAuthService) {}

  /**
   * Get authorization URL
   * POST /api/integrations/oauth/authorize
   */
  @Post('authorize')
  async authorize(
    @Body() dto: AuthorizeDto,
    @Request() req: any, // TODO: Extract from JWT token
  ): Promise<AuthorizeResponseDto> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';
    const userId = req.userId || '00000000-0000-0000-0000-000000000001';

    const result = await this.oauthService.authorize(
      workspaceId,
      userId,
      dto.provider,
      dto.scopes,
    );

    return {
      authorizationUrl: result.authorizationUrl,
      state: result.state,
    };
  }

  /**
   * OAuth callback handler
   * GET /api/integrations/oauth/callback?code=...&state=...
   */
  @Get('callback')
  @Redirect()
  async handleCallback(@Query() query: OAuthCallbackDto): Promise<any> {
    try {
      const result = await this.oauthService.handleCallback(query.code, query.state);
      return {
        url: `${process.env.WEB_URL || 'http://localhost:5175'}/integrations/success?connectionId=${result.connectionId}`,
        statusCode: 302,
      };
    } catch (error) {
      return {
        url: `${process.env.WEB_URL || 'http://localhost:5175'}/integrations/error?error=${encodeURIComponent(error.message)}`,
        statusCode: 302,
      };
    }
  }

  /**
   * List OAuth connections
   * GET /api/integrations/oauth/connections
   */
  @Get('connections')
  async listConnections(@Request() req: any): Promise<OAuthConnectionsListDto> {
    const workspaceId = req.workspaceId || '00000000-0000-0000-0000-000000000001';

    const connections = await this.oauthService.listConnections(workspaceId);

    return { connections };
  }

  /**
   * Get single OAuth connection
   * GET /api/integrations/oauth/connections/:id
   */
  @Get('connections/:id')
  async getConnection(
    @Param('id') connectionId: string,
  ) {
    return this.oauthService.getConnection(connectionId);
  }

  /**
   * Revoke OAuth connection
   * DELETE /api/integrations/oauth/connections/:id
   */
  @Delete('connections/:id')
  async revokeConnection(
    @Param('id') connectionId: string,
  ): Promise<RevokeResponseDto> {
    return this.oauthService.revokeConnection(connectionId);
  }
}
