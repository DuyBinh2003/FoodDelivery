/**
 * @file theme-i18n.test.ts
 * @description Unit tests for Fresh Green theme mode resolution, i18n locale normalization, and StatusBadge config mapping.
 * @traceability
 * - Plan: docs/plans/frontend/ui-ux-refactor-v2.md # Verification Plan
 * - Targets:
 *   - frontend/src/lib/theme-config.ts
 *   - frontend/src/lib/i18n-helpers.ts
 *   - frontend/src/components/ui/status-badge/status-badge.utils.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_THEME_MODE,
  FRESH_GREEN_LIGHT_TOKENS,
  FRESH_GREEN_DARK_TOKENS,
  resolveThemeMode,
  getNextThemeMode,
} from '../theme-config.ts';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  resolveLocale,
  getNextLocale,
} from '../i18n-helpers.ts';
import { resolveStatusConfig } from '../../components/ui/status-badge/status-badge.utils.ts';

describe('UI Refactor v2.0 — Theme, i18n & StatusBadge Suite', () => {
  // ==========================================
  // 1. HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. Theme defaults to light mode and Fresh Green palette tokens are configured', () => {
      assert.strictEqual(DEFAULT_THEME_MODE, 'light');
      assert.strictEqual(resolveThemeMode('light'), 'light');
      assert.strictEqual(resolveThemeMode('dark'), 'dark');
      assert.strictEqual(getNextThemeMode('light'), 'dark');
      assert.strictEqual(getNextThemeMode('dark'), 'light');
      assert.ok(FRESH_GREEN_LIGHT_TOKENS.primaryOklch.includes('145'));
      assert.ok(FRESH_GREEN_DARK_TOKENS.primaryOklch.includes('145'));
    });

    it('2. i18n supports both vi and en locales with toggle helper', () => {
      assert.strictEqual(DEFAULT_LOCALE, 'vi');
      assert.strictEqual(SUPPORTED_LOCALES.length, 2);
      assert.strictEqual(resolveLocale('vi'), 'vi');
      assert.strictEqual(resolveLocale('en'), 'en');
      assert.strictEqual(getNextLocale('vi'), 'en');
      assert.strictEqual(getNextLocale('en'), 'vi');
    });

    it('3. StatusBadge maps known order and driver statuses to accurate semantic tones', () => {
      const delivering = resolveStatusConfig('DELIVERING');
      assert.strictEqual(delivering.tone, 'success');
      assert.strictEqual(delivering.pulse, true);

      const pending = resolveStatusConfig('PENDING');
      assert.strictEqual(pending.tone, 'warning');

      const cancelled = resolveStatusConfig('CANCELLED');
      assert.strictEqual(cancelled.tone, 'danger');
    });
  });

  // ==========================================
  // 2. EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. Locale resolver handles regional codes (en-US, vi-VN) and extra whitespace', () => {
      assert.strictEqual(resolveLocale('  en-US '), 'en');
      assert.strictEqual(resolveLocale('vi-VN'), 'vi');
    });

    it('2. StatusBadge accepts lowercase status strings and custom override labels', () => {
      const completed = resolveStatusConfig('completed', 'Đã giao xong');
      assert.strictEqual(completed.tone, 'success');
      assert.strictEqual(completed.label, 'Đã giao xong');
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('1. Invalid or missing theme strings safely fall back to light mode', () => {
      assert.strictEqual(resolveThemeMode(null), 'light');
      assert.strictEqual(resolveThemeMode(undefined), 'light');
      assert.strictEqual(resolveThemeMode('neon-rainbow'), 'light');
    });

    it('2. Unsupported locale values safely fall back to vi default', () => {
      assert.strictEqual(resolveLocale(null), 'vi');
      assert.strictEqual(resolveLocale(undefined), 'vi');
      assert.strictEqual(resolveLocale('fr-FR'), 'vi');
    });

    it('3. Unknown status strings degrade safely to neutral tone without throwing', () => {
      const unknownStatus = resolveStatusConfig('UNKNOWN_STATE_99');
      assert.strictEqual(unknownStatus.tone, 'neutral');
      assert.strictEqual(unknownStatus.label, 'UNKNOWN_STATE_99');
      const emptyStatus = resolveStatusConfig('');
      assert.strictEqual(emptyStatus.tone, 'neutral');
      assert.strictEqual(emptyStatus.label, 'Không xác định');
    });
  });
});
