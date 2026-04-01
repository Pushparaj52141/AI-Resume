import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAccessTokenFromCookies, setAuthCookies } from '@/lib/auth/cookies';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { rotateRefreshSession } from '@/lib/auth/refresh-session';
import { getUsersCollection } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    let userId: string | null = null;
    let rotated: { accessToken: string; refreshToken: string } | null = null;

    const accessToken = getAccessTokenFromCookies(request);
    if (accessToken) {
      try {
        const payload = await verifyAccessToken(accessToken);
        userId = payload.sub;
      } catch {
        // Access token expired or invalid — try refresh cookie (7d) before failing
        const session = await rotateRefreshSession(request);
        if (session) {
          userId = session.userId;
          rotated = {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
          };
        }
      }
    } else {
      const session = await rotateRefreshSession(request);
      if (session) {
        userId = session.userId;
        rotated = {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        };
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const users = await getUsersCollection();
    const user = await users.findOne(
      { _id: new ObjectId(userId) },
      { projection: { passwordHash: 0 } }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
    if (rotated) {
      setAuthCookies(response, rotated.accessToken, rotated.refreshToken);
    }
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
