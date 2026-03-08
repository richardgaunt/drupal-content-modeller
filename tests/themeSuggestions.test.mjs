import {
  getBundleThemeSuggestions,
  getFieldThemeSuggestions
} from '../src/utils/themeSuggestions.js';

describe('Theme Suggestions', () => {
  describe('getBundleThemeSuggestions', () => {
    describe('node', () => {
      test('generates suggestions without view mode', () => {
        const result = getBundleThemeSuggestions('node', 'page');
        expect(result).toEqual([
          'node',
          'node__page'
        ]);
      });

      test('generates suggestions with view mode', () => {
        const result = getBundleThemeSuggestions('node', 'page', 'teaser');
        expect(result).toEqual([
          'node',
          'node__teaser',
          'node__page',
          'node__page__teaser'
        ]);
      });
    });

    describe('paragraph', () => {
      test('generates suggestions without view mode', () => {
        const result = getBundleThemeSuggestions('paragraph', 'hero_banner');
        expect(result).toEqual([
          'paragraph',
          'paragraph__hero_banner'
        ]);
      });

      test('generates suggestions with view mode', () => {
        const result = getBundleThemeSuggestions('paragraph', 'hero_banner', 'preview');
        expect(result).toEqual([
          'paragraph',
          'paragraph__preview',
          'paragraph__hero_banner',
          'paragraph__hero_banner__preview'
        ]);
      });
    });

    describe('block_content', () => {
      test('generates suggestions without view mode', () => {
        const result = getBundleThemeSuggestions('block_content', 'basic');
        expect(result).toEqual([
          'block__block_content',
          'block__block_content__type__basic'
        ]);
      });

      test('generates suggestions with view mode', () => {
        const result = getBundleThemeSuggestions('block_content', 'basic', 'full');
        expect(result).toEqual([
          'block__block_content',
          'block__block_content__view__full',
          'block__block_content__type__basic',
          'block__block_content__view_type__basic__full'
        ]);
      });
    });

    describe('taxonomy_term', () => {
      test('generates suggestions (no view mode support)', () => {
        const result = getBundleThemeSuggestions('taxonomy_term', 'tags');
        expect(result).toEqual([
          'taxonomy_term',
          'taxonomy_term__tags'
        ]);
      });
    });

    describe('media', () => {
      test('generates suggestions without view mode', () => {
        const result = getBundleThemeSuggestions('media', 'image');
        expect(result).toEqual([
          'media',
          'media__image'
        ]);
      });

      test('generates suggestions with view mode', () => {
        const result = getBundleThemeSuggestions('media', 'image', 'component');
        expect(result).toEqual([
          'media',
          'media__component',
          'media__image',
          'media__image__component'
        ]);
      });
    });

    test('sanitizes dots in view mode name', () => {
      const result = getBundleThemeSuggestions('node', 'page', 'some.mode');
      expect(result).toContain('node__some_mode');
      expect(result).toContain('node__page__some_mode');
    });

    test('returns empty array for unknown entity type', () => {
      const result = getBundleThemeSuggestions('unknown', 'test');
      expect(result).toEqual([]);
    });
  });

  describe('getFieldThemeSuggestions', () => {
    test('generates field suggestions', () => {
      const result = getFieldThemeSuggestions('node', 'page', 'field_n_body', 'text_long');
      expect(result).toEqual([
        'field',
        'field__text_long',
        'field__field_n_body',
        'field__node__page',
        'field__node__field_n_body',
        'field__node__field_n_body__page'
      ]);
    });

    test('generates suggestions for entity reference field', () => {
      const result = getFieldThemeSuggestions('paragraph', 'card', 'field_p_image', 'entity_reference');
      expect(result).toEqual([
        'field',
        'field__entity_reference',
        'field__field_p_image',
        'field__paragraph__card',
        'field__paragraph__field_p_image',
        'field__paragraph__field_p_image__card'
      ]);
    });
  });
});
