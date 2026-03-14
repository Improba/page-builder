import { computed, inject, type ComputedRef, type InjectionKey } from 'vue';
import { DEFAULT_LOCALE, defaultTranslations } from './messages';
import { createTranslator, type TranslationDictionary, type Translator } from './translator';

export interface PageBuilderI18nOptions {
  locale?: string;
  messages?: TranslationDictionary;
}

export interface PageBuilderI18nContext {
  locale: ComputedRef<string>;
  t: Translator;
}

export const PAGE_BUILDER_I18N_OPTIONS_KEY: InjectionKey<PageBuilderI18nOptions> = Symbol('pageBuilderI18nOptions');
export const PAGE_BUILDER_I18N_KEY: InjectionKey<PageBuilderI18nContext> = Symbol('pageBuilderI18n');

const fallbackI18nContext: PageBuilderI18nContext = {
  locale: computed(() => DEFAULT_LOCALE),
  t: createTranslator(DEFAULT_LOCALE, defaultTranslations),
};

export function usePageBuilderI18n(): PageBuilderI18nContext {
  return inject(PAGE_BUILDER_I18N_KEY, fallbackI18nContext);
}
