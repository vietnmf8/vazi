import { NextResponse, type NextRequest } from 'next/server';

const locales = ['en', 'vi', 'ko'];
const defaultLocale = 'en';

export default function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  // Kiểm tra cookie hiện tại
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;

  // Nếu không có cookie, lấy từ accept-language
  if (!cookieLocale || !locales.includes(cookieLocale)) {
    const acceptLanguage = request.headers.get('accept-language');
    let locale = defaultLocale;

    if (acceptLanguage) {
      const requestedLocales = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim().substring(0, 2).toLowerCase());

      const matchedLocale = requestedLocales.find((lang) =>
        locales.includes(lang)
      );
      locale = matchedLocale || defaultLocale;
    }

    // Set cookie cho response để Client & Server đồng bộ ngay từ đầu
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 31536000, // 1 năm
      sameSite: 'lax',
    });
  }

  return response;
}

export const config = {
  // Chỉ apply cho các page routes, bỏ qua static assets, api, _next...
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
