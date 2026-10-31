import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';

/**
 * DTO for OAuth token
 */
export class OAuthTokenDto {
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsNotEmpty()
  @IsString()
  tokenType: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @IsOptional()
  @IsString()
  provider?: string;
}

/**
 * DTO for GitHub OAuth callback
 */
export class GitHubOAuthCallbackDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  state: string;
}

/**
 * DTO for Microsoft OAuth callback
 */
export class MicrosoftOAuthCallbackDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  state: string;

  @IsNotEmpty()
  @IsEnum(['teams', 'outlook', 'calendar-microsoft'])
  provider: 'teams' | 'outlook' | 'calendar-microsoft';
}

/**
 * DTO for Google OAuth callback
 */
export class GoogleOAuthCallbackDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  state: string;
}

/**
 * DTO for registering OAuth provider
 */
export class RegisterOAuthProviderDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  clientId: string;

  @IsNotEmpty()
  @IsString()
  clientSecret: string;

  @IsNotEmpty()
  @IsString()
  authorizationUrl: string;

  @IsNotEmpty()
  @IsString()
  tokenUrl: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  scopes: string[];

  @IsNotEmpty()
  @IsString()
  redirectUrl: string;
}

/**
 * DTO for refreshing tokens
 */
export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  @IsOptional()
  @IsString()
  provider?: string;
}

/**
 * DTO for validating credentials
 */
export class ValidateCredentialsDto {
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsOptional()
  @IsString()
  provider?: string;
}
