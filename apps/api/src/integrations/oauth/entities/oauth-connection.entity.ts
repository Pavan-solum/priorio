export class OAuthConnectionEntity {
  id: string;
  provider: string;
  userId: string;
  scopes: string[];
  connectedAt: Date;
  lastSyncAt?: Date;
  revokedAt?: Date;
  status: 'active' | 'revoked' | 'expired';
}

export class AuthorizeResponseDto {
  authorizationUrl: string;
  state: string;
}

export class OAuthConnectionsListDto {
  connections: OAuthConnectionEntity[];
}

export class RevokeResponseDto {
  message: string;
}

export class TokenRefreshResponseDto {
  message: string;
}
