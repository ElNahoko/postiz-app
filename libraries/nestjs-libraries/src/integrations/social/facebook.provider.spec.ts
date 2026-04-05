/**
 * Unit tests for FacebookProvider scope validation logic.
 *
 * These tests exercise the required-vs-optional scope policy introduced to
 * allow editor-level Business Manager users (who may not hold
 * business_management or insights scopes) to connect their Facebook Pages.
 *
 * Run with:
 *   npx jest facebook.provider.spec.ts
 * or, once project-level jest config is wired up:
 *   pnpm test
 */

import { SocialAbstract, NotEnoughScopes } from '../social.abstract';

// ---------------------------------------------------------------------------
// Minimal stub to test the shared helper methods without mocking the full
// FacebookProvider (which makes real HTTP calls).
// ---------------------------------------------------------------------------

class StubProvider extends SocialAbstract {
  identifier = 'stub';
}

const provider = new StubProvider();

const REQUIRED_SCOPES = ['pages_show_list', 'pages_manage_posts'];
const OPTIONAL_SCOPES = [
  'pages_manage_engagement',
  'pages_read_engagement',
  'read_insights',
  'business_management',
];
const FACEBOOK_REQUIRED_ERROR =
  'Missing required Facebook posting permissions (pages_show_list, pages_manage_posts).';

// ---------------------------------------------------------------------------
// checkScopesWithOptional — happy-path and edge cases
// ---------------------------------------------------------------------------

describe('SocialAbstract.checkScopesWithOptional', () => {
  describe('full scopes granted', () => {
    it('returns no missing optional scopes when all scopes are present', () => {
      const allScopes = [...REQUIRED_SCOPES, ...OPTIONAL_SCOPES];
      const result = provider.checkScopesWithOptional(
        REQUIRED_SCOPES,
        OPTIONAL_SCOPES,
        allScopes
      );
      expect(result.missingOptional).toHaveLength(0);
    });
  });

  describe('only required scopes granted (editor-level user)', () => {
    it('succeeds and reports all optional scopes as missing', () => {
      const result = provider.checkScopesWithOptional(
        REQUIRED_SCOPES,
        OPTIONAL_SCOPES,
        REQUIRED_SCOPES
      );
      expect(result.missingOptional).toEqual(
        expect.arrayContaining(OPTIONAL_SCOPES)
      );
      expect(result.missingOptional).toHaveLength(OPTIONAL_SCOPES.length);
    });
  });

  describe('partial optional scopes granted', () => {
    it('reports only the scopes that were not granted as missing', () => {
      const granted = [...REQUIRED_SCOPES, 'pages_read_engagement'];
      const result = provider.checkScopesWithOptional(
        REQUIRED_SCOPES,
        OPTIONAL_SCOPES,
        granted
      );
      expect(result.missingOptional).toContain('pages_manage_engagement');
      expect(result.missingOptional).toContain('read_insights');
      expect(result.missingOptional).toContain('business_management');
      expect(result.missingOptional).not.toContain('pages_read_engagement');
    });
  });

  describe('missing pages_show_list (hard fail)', () => {
    it('throws NotEnoughScopes with explicit message', () => {
      const granted = ['pages_manage_posts', ...OPTIONAL_SCOPES];
      expect(() =>
        provider.checkScopesWithOptional(
          REQUIRED_SCOPES,
          OPTIONAL_SCOPES,
          granted,
          FACEBOOK_REQUIRED_ERROR
        )
      ).toThrow(NotEnoughScopes);

      try {
        provider.checkScopesWithOptional(
          REQUIRED_SCOPES,
          OPTIONAL_SCOPES,
          granted,
          FACEBOOK_REQUIRED_ERROR
        );
      } catch (err) {
        expect(err).toBeInstanceOf(NotEnoughScopes);
        expect((err as NotEnoughScopes).message).toBe(FACEBOOK_REQUIRED_ERROR);
      }
    });
  });

  describe('missing pages_manage_posts (hard fail)', () => {
    it('throws NotEnoughScopes with explicit message', () => {
      const granted = ['pages_show_list', ...OPTIONAL_SCOPES];
      expect(() =>
        provider.checkScopesWithOptional(
          REQUIRED_SCOPES,
          OPTIONAL_SCOPES,
          granted,
          FACEBOOK_REQUIRED_ERROR
        )
      ).toThrow(NotEnoughScopes);

      try {
        provider.checkScopesWithOptional(
          REQUIRED_SCOPES,
          OPTIONAL_SCOPES,
          granted,
          FACEBOOK_REQUIRED_ERROR
        );
      } catch (err) {
        expect(err).toBeInstanceOf(NotEnoughScopes);
        expect((err as NotEnoughScopes).message).toBe(FACEBOOK_REQUIRED_ERROR);
      }
    });
  });

  describe('both required scopes missing (hard fail)', () => {
    it('throws NotEnoughScopes', () => {
      expect(() =>
        provider.checkScopesWithOptional(
          REQUIRED_SCOPES,
          OPTIONAL_SCOPES,
          OPTIONAL_SCOPES
        )
      ).toThrow(NotEnoughScopes);
    });
  });

  describe('regression: editor-only Business Manager user', () => {
    it('connects successfully with only pages_show_list and pages_manage_posts', () => {
      // An editor in Meta Business Manager typically only receives these two.
      const editorScopes = ['pages_show_list', 'pages_manage_posts'];
      const result = provider.checkScopesWithOptional(
        REQUIRED_SCOPES,
        OPTIONAL_SCOPES,
        editorScopes,
        FACEBOOK_REQUIRED_ERROR
      );
      // Connection is allowed
      expect(result.missingOptional.length).toBeGreaterThan(0);
      // All optional scopes are reported as missing
      expect(result.missingOptional).toEqual(
        expect.arrayContaining(OPTIONAL_SCOPES)
      );
    });
  });

  describe('scope string formats (space-separated / comma-separated)', () => {
    it('handles comma-separated scope string', () => {
      const scopeString = 'pages_show_list,pages_manage_posts,read_insights';
      const result = provider.checkScopesWithOptional(
        REQUIRED_SCOPES,
        OPTIONAL_SCOPES,
        scopeString
      );
      // pages_manage_engagement, pages_read_engagement, business_management are missing
      expect(result.missingOptional).toContain('pages_manage_engagement');
      expect(result.missingOptional).not.toContain('read_insights');
    });

    it('handles space-separated scope string', () => {
      const scopeString = 'pages_show_list pages_manage_posts';
      const result = provider.checkScopesWithOptional(
        REQUIRED_SCOPES,
        OPTIONAL_SCOPES,
        scopeString
      );
      expect(result.missingOptional).toHaveLength(OPTIONAL_SCOPES.length);
    });
  });
});

// ---------------------------------------------------------------------------
// checkScopes — existing behaviour must be preserved (regression)
// ---------------------------------------------------------------------------

describe('SocialAbstract.checkScopes (backward compatibility)', () => {
  it('returns true when all required scopes are present', () => {
    expect(
      provider.checkScopes(REQUIRED_SCOPES, [...REQUIRED_SCOPES, ...OPTIONAL_SCOPES])
    ).toBe(true);
  });

  it('throws NotEnoughScopes when a required scope is missing', () => {
    expect(() =>
      provider.checkScopes(['pages_manage_posts', 'pages_show_list'], ['pages_manage_posts'])
    ).toThrow(NotEnoughScopes);
  });
});
