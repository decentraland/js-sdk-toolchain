import { type ReactNode } from 'react';
import { IntlProvider } from 'react-intl';
import { useSelector } from '#store';
import { selectors } from '../../modules/store/translation';

export function TranslationProvider(props: { children?: ReactNode }) {
  const locale = useSelector(selectors.getLocale);
  const keys = useSelector(selectors.getKeys);
  return (
    <IntlProvider
      locale={locale}
      messages={keys}
    >
      {props.children}
    </IntlProvider>
  );
}
