import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ReactNode } from 'react';
import { LangUpdater } from './LangUpdater';

export async function I18nProvider({ children }: { children: ReactNode }) {
    const messages = await getMessages();
    return (
        <NextIntlClientProvider messages={messages}>
            <LangUpdater />
            {children}
        </NextIntlClientProvider>
    );
}
