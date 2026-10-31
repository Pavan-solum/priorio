import { IsString, IsArray, IsNotEmpty } from 'class-validator';

export class AuthorizeDto {
  @IsNotEmpty()
  @IsString()
  provider: string;

  @IsArray()
  @IsString({ each: true })
  scopes: string[];
}

export class OAuthCallbackDto {
  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  state: string;
}

export class TokenRefreshDto {
  @IsNotEmpty()
  @IsString()
  connectionId: string;
}

export class RevokeConnectionDto {
  @IsNotEmpty()
  @IsString()
  connectionId: string;
}
