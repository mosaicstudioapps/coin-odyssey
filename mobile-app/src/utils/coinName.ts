import {
  isKnownDenomination,
  normalizeDenomination,
  normalizeText,
} from '@coin-collecting/shared';

/**
 * The name a scanned coin is saved under.
 *
 * The counterpart to `coinLabel`, which decides what to *show*; this decides
 * what to *store* when a scan creates the coin.
 *
 * Some design names already carry the denomination ("Delaware State Quarter")
 * and some are a bare honoree ("Maya Angelou"), which reads as a fragment on
 * its own. Append the denomination only in the second case, so neither
 * "1999 Delaware State Quarter Quarter Dollar" nor a dangling "2022 Maya
 * Angelou" can happen.
 *
 * Denominations are compared through the shared vocabulary rather than by
 * text, so "Penny" is recognised as already named by "Lincoln Wheat Cent".
 */
export function buildCoinName(recognition: {
  year?: number | null;
  denomination?: string | null;
  design?: string | null;
}): string {
  const year = recognition.year ? String(recognition.year) : '';
  const denomination = recognition.denomination?.trim() ?? '';
  const design = recognition.design?.trim() ?? '';

  if (design) {
    const alreadyNamesDenomination =
      isKnownDenomination(denomination) &&
      normalizeText(design).includes(normalizeDenomination(denomination));
    return (
      [year, design, alreadyNamesDenomination ? '' : denomination]
        .filter(Boolean)
        .join(' ') || 'Untitled coin'
    );
  }

  return [year, denomination].filter(Boolean).join(' ') || 'Untitled coin';
}
