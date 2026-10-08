// 비밀 링크 접근 제한 (ADR-0008)
// ?k=<ACCESS_KEY> 로 처음 들어오면 쿠키를 발급하고 주소에서 키를 지운다. 이후는 쿠키로 통과.

import { NextResponse } from 'next/server';

export const ACCESS_COOKIE = 'mbs_access';

export function middleware(request) {
  const key = process.env.ACCESS_KEY;
  if (!key) {
    // 키가 없으면 개발 중에만 열어둔다
    return process.env.NODE_ENV === 'production'
      ? new NextResponse('Not Found', { status: 404 })
      : NextResponse.next();
  }

  const url = request.nextUrl;
  const fromQuery = url.searchParams.get('k');
  if (fromQuery === key) {
    url.searchParams.delete('k');
    const res = NextResponse.redirect(url);
    res.cookies.set(ACCESS_COOKIE, key, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  }

  if (request.cookies.get(ACCESS_COOKIE)?.value === key) return NextResponse.next();
  return new NextResponse('Not Found', { status: 404 });
}

export const config = {
  // 정적 파일과 robots.txt는 제외
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
