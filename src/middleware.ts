import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jose from 'jose';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

/** Edge-safe: some runtimes omit Headers#getSetCookie; fall back to a single header. */
function getSetCookieHeaders(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === 'function') {
    const list = headers.getSetCookie();
    if (list?.length) return list;
  }
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const key = new TextEncoder().encode(secret);
  try {
    await jose.jwtVerify(token, key);
    return true;
  } catch {
    return false;
  }
}

async function tryRefreshToken(request: NextRequest): Promise<NextResponse | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    // Create a request to the refresh endpoint
    const refreshUrl = new URL('/api/auth/refresh', request.url);
    const refreshResponse = await fetch(refreshUrl.toString(), {
      method: 'POST',
      headers: {
        Cookie: `${REFRESH_COOKIE}=${refreshToken}`,
      },
    });

    if (!refreshResponse.ok) {
      return null;
    }

    const setCookieHeaders = getSetCookieHeaders(refreshResponse);

    const response = NextResponse.next();

    setCookieHeaders.forEach((cookie) => {
      response.headers.append('Set-Cookie', cookie);
    });

    return response;
  } catch (error) {
    console.error('Token refresh failed in middleware:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const protectedPaths = ['/builder', '/generate', '/templates', '/dashboard'];
  const protectedApiPrefixes = ['/api/resumes', '/api/export-pdf'];
  const isProtectedPage = protectedPaths.some((p) => pathname.startsWith(p));
  const isProtectedApi = protectedApiPrefixes.some((p) => pathname.startsWith(p));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
  const accessSecret = process.env.JWT_ACCESS_SECRET || '';

  // If no access token, try to refresh immediately
  if (!token) {
    const refreshedResponse = await tryRefreshToken(request);
    if (refreshedResponse) {
      return refreshedResponse;
    }

    // No token and refresh failed - redirect to login
    if (isProtectedPage) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify the access token
  const valid = await verifyToken(token, accessSecret);
  if (!valid) {
    // Token is invalid/expired - try to refresh
    const refreshedResponse = await tryRefreshToken(request);
    if (refreshedResponse) {
      return refreshedResponse;
    }

    // Refresh failed - redirect to login
    if (isProtectedPage) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/builder/:path*', '/generate/:path*', '/templates/:path*', '/dashboard/:path*', '/api/resumes/:path*', '/api/export-pdf/:path*'],
};
