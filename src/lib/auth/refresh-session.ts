import type { NextRequest } from 'next/server';
import { getRefreshTokenFromCookies } from '@/lib/auth/cookies';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { blacklistToken, isBlacklisted } from '@/lib/auth/blacklist';

/**
 * Rotates refresh token and issues new access + refresh tokens.
 * Used by POST /api/auth/refresh and by GET /api/auth/me when the access token is expired.
 */
export async function rotateRefreshSession(
  request: NextRequest
): Promise<{ userId: string; accessToken: string; refreshToken: string } | null> {
  const refreshToken = getRefreshTokenFromCookies(request);
  if (!refreshToken) return null;

  try {
    const payload = await verifyRefreshToken(refreshToken);
    const blacklisted = await isBlacklisted(payload.jti);
    if (blacklisted) return null;

    const expiresAt = new Date(payload.exp * 1000);
    await blacklistToken(payload.jti, expiresAt);

    const userId = payload.sub;
    const accessToken = await signAccessToken(userId);
    const { token: newRefreshToken } = await signRefreshToken(userId);

    return { userId, accessToken, refreshToken: newRefreshToken };
  } catch {
    return null;
  }
}
