import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=youtube_auth_failed`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=no_code`);
  }

  try {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/youtube/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('YouTube credentials not configured');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    // Set the access token in an httpOnly cookie for security
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}?youtube_connected=true`);
    
    response.cookies.set('youtube_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: tokenData.expires_in
    });

    if (tokenData.refresh_token) {
      response.cookies.set('youtube_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('YouTube callback error:', error);
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}?error=youtube_callback_failed`);
  }
}
