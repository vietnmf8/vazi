import {getRequestConfig} from 'next-intl/server';
import {cookies, headers} from 'next/headers';
import { connection } from 'next/server';

export const locales = ['en', 'vi', 'ko'];
export const defaultLocale = 'en';

export default getRequestConfig(async () => {
  await connection();

  // Lấy locale từ cookie nếu user đã chọn
  const cookieStore = await cookies();
  let locale = cookieStore.get('NEXT_LOCALE')?.value;

  // Nếu không có cookie, tự nhận diện qua Accept-Language header
  if (!locale || !locales.includes(locale)) {
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');

    if (acceptLanguage) {
      // Ví dụ: acceptLanguage = 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      const requestedLocales = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim().substring(0, 2).toLowerCase());

      // Tìm ngôn ngữ hỗ trợ đầu tiên khớp với request của user
      const matchedLocale = requestedLocales.find((lang) =>
        locales.includes(lang)
      );
      locale = matchedLocale || defaultLocale;
    } else {
      locale = defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
