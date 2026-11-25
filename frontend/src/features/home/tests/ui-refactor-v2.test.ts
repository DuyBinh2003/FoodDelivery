/**
 * @file ui-refactor-v2.test.ts
 * @description Unit tests for Hero search URL building, trending keywords, and bilingual i18n dictionary parity.
 * @traceability
 * - Plan: docs/plans/frontend/ui-ux-refactor-v2.md # Verification Plan
 * - Targets:
 *   - frontend/src/features/home/utils/hero-search.utils.ts
 *   - frontend/messages/vi.json
 *   - frontend/messages/en.json
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  HERO_TRENDING_KEYWORDS,
  buildMenuSearchHref,
} from '../utils/hero-search.utils.ts';

function collectLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const nextKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v as Record<string, unknown>, nextKey));
    } else {
      keys.push(nextKey);
    }
  }
  return keys.sort();
}

describe('UI Refactor v2.0 — Hero Search & Bilingual Dictionary Suite', () => {
  // ==========================================
  // 1. HAPPY PATH
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('1. buildMenuSearchHref encodes Vietnamese search terms cleanly', () => {
      assert.strictEqual(buildMenuSearchHref('Phở bò'), '/menu?q=Ph%E1%BB%9F%20b%C3%B2');
      assert.strictEqual(buildMenuSearchHref('Cơm tấm'), '/menu?q=C%C6%A1m%20t%E1%BA%A5m');
    });

    it('2. HERO_TRENDING_KEYWORDS provides non-empty bilingual labels', () => {
      assert.ok(HERO_TRENDING_KEYWORDS.length >= 4);
      for (const kw of HERO_TRENDING_KEYWORDS) {
        assert.ok(kw.id.length > 0);
        assert.ok(kw.labelVi.length > 0);
        assert.ok(kw.labelEn.length > 0);
        assert.ok(kw.query.length > 0);
      }
    });

    it('3. vi.json and en.json have identical i18n key structures', () => {
      const viPath = path.resolve(process.cwd(), 'messages/vi.json');
      const enPath = path.resolve(process.cwd(), 'messages/en.json');
      const viDict = JSON.parse(fs.readFileSync(viPath, 'utf8')) as Record<string, unknown>;
      const enDict = JSON.parse(fs.readFileSync(enPath, 'utf8')) as Record<string, unknown>;

      assert.deepStrictEqual(collectLeafKeys(viDict), collectLeafKeys(enDict));
    });
  });

  // ==========================================
  // 2. EDGE CASES
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('1. buildMenuSearchHref trims leading and trailing spaces before encoding', () => {
      assert.strictEqual(buildMenuSearchHref('   Pizza   '), '/menu?q=Pizza');
    });

    it('2. Special characters in query are safely URI-encoded', () => {
      assert.strictEqual(buildMenuSearchHref('Trà & Bánh'), '/menu?q=Tr%C3%A0%20%26%20B%C3%A1nh');
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOW
  // ==========================================
  describe('🔴 Error & Rejection Flow', () => {
    it('1. Empty, whitespace-only, null, or undefined queries safely fall back to /menu', () => {
      assert.strictEqual(buildMenuSearchHref(''), '/menu');
      assert.strictEqual(buildMenuSearchHref('   '), '/menu');
      assert.strictEqual(buildMenuSearchHref(null), '/menu');
      assert.strictEqual(buildMenuSearchHref(undefined), '/menu');
    });
  });
});
