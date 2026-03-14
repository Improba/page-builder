import { createTranslator, mergeTranslations, translate, type TranslationDictionary } from '@/i18n';

describe('i18n translator', () => {
  const dictionary: TranslationDictionary = {
    en: {
      'ui.save': 'Save',
      'ui.greeting': 'Hello {name}',
    },
    fr: {
      'ui.save': 'Enregistrer',
    },
  };

  it('resolves keys in the active locale', () => {
    expect(translate({ locale: 'fr', dictionary, key: 'ui.save' })).toBe('Enregistrer');
  });

  it('falls back to english when key is missing in active locale', () => {
    expect(translate({ locale: 'fr', dictionary, key: 'ui.greeting', params: { name: 'Marie' } })).toBe('Hello Marie');
  });

  it('returns key when no translation exists in any locale', () => {
    expect(translate({ locale: 'fr', dictionary, key: 'ui.missing' })).toBe('ui.missing');
  });

  it('creates a translator function from dynamic sources', () => {
    let locale = 'en';
    const t = createTranslator(
      () => locale,
      () => dictionary,
    );

    expect(t('ui.save')).toBe('Save');
    locale = 'fr';
    expect(t('ui.save')).toBe('Enregistrer');
  });

  it('merges locale dictionaries with override precedence', () => {
    const merged = mergeTranslations(dictionary, {
      fr: { 'ui.greeting': 'Bonjour {name}' },
      es: { 'ui.save': 'Guardar' },
    });

    expect(translate({ locale: 'fr', dictionary: merged, key: 'ui.greeting', params: { name: 'Marie' } })).toBe(
      'Bonjour Marie',
    );
    expect(translate({ locale: 'es', dictionary: merged, key: 'ui.save' })).toBe('Guardar');
  });
});
