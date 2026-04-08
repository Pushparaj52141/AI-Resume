import { NextRequest, NextResponse } from 'next/server';
import { getUsersCollection, ensureAuthIndexes } from '@/lib/mongodb';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/cookies';
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
    const { allowed, retryAfter } = checkRateLimit(ip, 'login');
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Too many Google login attempts. Please try again later.',
          retryAfter,
        },
        { status: 429, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined }
      );
    }

    const body = await request.json();
    const credential = String(body?.credential || '');
    if (!credential) {
      return NextResponse.json({ error: 'Google credential is required' }, { status: 400 });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return NextResponse.json({ error: 'Google auth is not configured' }, { status: 500 });
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: 'no-store' }
    );

    if (!tokenInfoResponse.ok) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const tokenInfo = (await tokenInfoResponse.json()) as {
      aud?: string;
      iss?: string;
      sub?: string;
      email?: string;
      email_verified?: 'true' | 'false';
      name?: string;
      picture?: string;
    };

    const validIssuer =
      tokenInfo.iss === 'accounts.google.com' || tokenInfo.iss === 'https://accounts.google.com';

    if (
      tokenInfo.aud !== googleClientId ||
      !validIssuer ||
      !tokenInfo.sub ||
      !tokenInfo.email ||
      tokenInfo.email_verified !== 'true'
    ) {
      return NextResponse.json({ error: 'Google token verification failed' }, { status: 401 });
    }

    await ensureAuthIndexes();
    const users = await getUsersCollection();
    const now = new Date();

    let user = await users.findOne({ email: tokenInfo.email });

    if (!user) {
      const insertResult = await users.insertOne({
        email: tokenInfo.email,
        name: tokenInfo.name || tokenInfo.email.split('@')[0],
        googleId: tokenInfo.sub,
        picture: tokenInfo.picture || '',
        provider: 'google',
        createdAt: now,
        updatedAt: now,
      });
      user = await users.findOne({ _id: insertResult.insertedId });
    } else {
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            name: tokenInfo.name || user.name,
            googleId: tokenInfo.sub,
            picture: tokenInfo.picture || user.picture || '',
            provider: 'google',
            updatedAt: now,
          },
        }
      );
      user = await users.findOne({ _id: user._id });
    }

    if (!user) {
      return NextResponse.json({ error: 'Failed to create or fetch user' }, { status: 500 });
    }

    const userId = user._id.toString();
    const accessToken = await signAccessToken(userId);
    const { token: refreshToken } = await signRefreshToken(userId);

    const response = NextResponse.json({
      user: {
        id: userId,
        email: user.email,
        name: user.name,
      },
    });

    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json({ error: 'Failed to authenticate with Google' }, { status: 500 });
  }
}
