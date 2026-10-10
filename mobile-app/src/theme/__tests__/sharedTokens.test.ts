// src/theme/__tests__/sharedTokens.test.ts
//
// The web app reads design tokens from packages/shared, a copy of these.
// Until Phase 1 of the web plan makes mobile import the shared tokens too,
// this keeps the two copies identical so both apps look the same.
import * as shared from '@coin-collecting/shared';
import { darkPalette, lightPalette, spacing, radius, fontSize, letterSpacing } from '../tokens';

describe('shared design tokens match mobile', () => {
  it('dark palette', () => expect(shared.darkPalette).toEqual(darkPalette));
  it('light palette', () => expect(shared.lightPalette).toEqual(lightPalette));
  it('spacing, radius, type sizes, letter spacing', () => {
    expect(shared.spacing).toEqual(spacing);
    expect(shared.radius).toEqual(radius);
    expect(shared.fontSize).toEqual(fontSize);
    expect(shared.letterSpacing).toEqual(letterSpacing);
  });
});
