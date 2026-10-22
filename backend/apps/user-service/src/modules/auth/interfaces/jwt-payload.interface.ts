export interface JwtUserPayload {
  id: string;
  email: string;
  role: string;
}

export interface JwtAccessTokenPayload extends JwtUserPayload {
  jti?: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshTokenPayload extends JwtUserPayload {
  tokenId: string;
  iat?: number;
  exp?: number;
}
