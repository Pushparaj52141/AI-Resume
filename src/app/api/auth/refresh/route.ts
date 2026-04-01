import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth/cookies';
import { rotateRefreshSession } from '@/lib/auth/refresh-session';
import { checkRateLimit } from '@/lib/auth/rate-limit';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = checkRateLimit(ip, 'refresh');
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many refresh attempts. Please try again later.',
          retryAfter,
        },
        { status: 429, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined }
      );
    }

    const rotated = await rotateRefreshSession(request);
    if (!rotated) {
      const response = NextResponse.json(
        { error: 'No refresh token or session invalid' },
        { status: 401 }
      );
      clearAuthCookies(response);
      return response;
    }

    const response = NextResponse.json({ success: true });
    setAuthCookies(response, rotated.accessToken, rotated.refreshToken);
    return response;
  } catch (error) {
    console.error('Refresh error:', error);
    const response = NextResponse.json(
      { error: 'Invalid or expired refresh token' },
      { status: 401 }
    );
    clearAuthCookies(response);
    return response;
  }
}
