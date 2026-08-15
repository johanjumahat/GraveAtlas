/**
 * Licensing Engine (Part 10)
 *
 * Before importing or redistributing data, evaluate:
 * - license, attribution, commercial restrictions
 * - derivative-data restrictions, redistribution rules
 * - API terms, retention restrictions
 *
 * If rights are unclear: DO NOT IMPORT. Mark LICENSE_REVIEW_REQUIRED.
 */

export const LICENSE_EVALUATION = {
  APPROVED: 'approved',
  REVIEW_REQUIRED: 'review_required',
  REJECTED: 'rejected'
};

// Known compatible licenses for GraveAtlas (open data, attribution-based)
const COMPATIBLE_LICENSES = [
  'CC0', 'Public Domain', 'public-domain', 'PDDL',
  'CC-BY', 'CC-BY-SA',
  'ODbL', 'OGTSL',
  'Singapore Open Data Licence'
];

// Licenses that prohibit redistribution or commercial use
const RESTRICTED_LICENSES = [
  'CC-BY-NC', 'CC-BY-NC-SA', 'CC-BY-ND',
  'All Rights Reserved', 'Proprietary',
  'unknown', 'Unknown'
];

/**
 * Evaluate a license for GraveAtlas compatibility.
 * @param {Object} sourceEntry - Entry from SOURCE_REGISTRY
 * @returns {Object} { decision, reason, canImport, canRedistribute, attributionRequired }
 */
export function evaluateLicense(sourceEntry) {
  if (!sourceEntry) {
    return { decision: LICENSE_EVALUATION.REJECTED, reason: 'No source entry provided', canImport: false, canRedistribute: false, attributionRequired: false };
  }

  const license = sourceEntry.licensing || 'unknown';
  const commercial = sourceEntry.commercialUseStatus || 'unknown';
  const attribution = sourceEntry.attributionRequirement || null;

  // Check if license is in compatible list
  const isCompatible = COMPATIBLE_LICENSES.some(l =>
    license.toLowerCase().includes(l.toLowerCase())
  );

  const isRestricted = RESTRICTED_LICENSES.some(l =>
    license.toLowerCase().includes(l.toLowerCase())
  );

  if (isRestricted || (!isCompatible && license === 'unknown')) {
    return {
      decision: LICENSE_EVALUATION.REVIEW_REQUIRED,
      reason: `License "${license}" is not in the approved list. Manual review required.`,
      canImport: false,
      canRedistribute: false,
      attributionRequired: !!attribution
    };
  }

  if (!isCompatible) {
    return {
      decision: LICENSE_EVALUATION.REVIEW_REQUIRED,
      reason: `Unrecognized license: "${license}". Cannot determine compatibility.`,
      canImport: false,
      canRedistribute: false,
      attributionRequired: !!attribution
    };
  }

  // Check commercial use restrictions
  const commercialRestricted = /non-commercial|nc-only|personal use only/i.test(commercial);
  if (commercialRestricted) {
    return {
      decision: LICENSE_EVALUATION.REVIEW_REQUIRED,
      reason: `Commercial use restricted: ${commercial}`,
      canImport: false,
      canRedistribute: false,
      attributionRequired: !!attribution
    };
  }

  return {
    decision: LICENSE_EVALUATION.APPROVED,
    reason: `License "${license}" is compatible with GraveAtlas`,
    canImport: true,
    canRedistribute: true,
    attributionRequired: !!attribution,
    attributionText: attribution
  };
}

/**
 * Check if a record can be cached based on its source's caching policy.
 */
export function canCache(sourceEntry) {
  if (!sourceEntry) return false;
  // Check source entry for caching restrictions
  const cachePolicy = sourceEntry.cachingPolicy || 'allowed';
  return cachePolicy === 'allowed' || cachePolicy === 'permitted';
}
