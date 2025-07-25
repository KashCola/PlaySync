import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get('youtube_access_token')?.value;
  
  if (!accessToken) {
    return NextResponse.json({ error: 'No YouTube access token found' }, { status: 401 });
  }

  return NextResponse.json({ accessToken });
}
