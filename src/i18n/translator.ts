export type TranslationParams = Record<string, string | number>;
export type TranslationDictionary = Record<string, Record<string, string>>;
export type Translator = (key: string, params?: TranslationParams) => string;

interface TranslateOptions {
  locale: string;
  dictionary: TranslationDictionary;
  key: string;
  params?: TranslationParams;
  fallbackLocale?: string;
}

function interpolate(message: string, params?: TranslationParams): string {
  if (!params) return message;

  return message.replace(/\{(\w+)\}/g, (match, paramName: string) => {
    const value = params[paramName];
    return value === undefined ? match : String(value);
  });
}

export function mergeTranslations(
  ...dictionaries: Array<TranslationDictionary | undefined | null>
): TranslationDictionary {
  const merged: TranslationDictionary = {};

  for (const dictionary of dictionaries) {
    if (!dictionary) continue;

    for (const [locale, messages] of Object.entries(dictionary)) {
      merged[locale] = {
        ...(merged[locale] ?? {}),
        ...messages,
      };
    }
  }

  return merged;
}

export function translate(options: TranslateOptions): string {
  const fallbackLocale = options.fallbackLocale ?? 'en';
  const localeMessages = options.dictionary[options.locale] ?? {};
  const fallbackMessages = options.dictionary[fallbackLocale] ?? {};
  const message = localeMessages[options.key] ?? fallbackMessages[options.key] ?? options.key;
  return interpolate(message, options.params);
}

export function createTranslator(
  localeSource: string | (() => string),
  dictionarySource: TranslationDictionary | (() => TranslationDictionary),
  fallbackLocale = 'en',
): Translator {
  const getLocale = typeof localeSource === 'function' ? localeSource : () => localeSource;
  const getDictionary = typeof dictionarySource === 'function' ? dictionarySource : () => dictionarySource;

  return (key, params) =>
    translate({
      locale: getLocale(),
      dictionary: getDictionary(),
      key,
      params,
      fallbackLocale,
    });
}
