/**
 * Record Matching (Part 7)
 *
 * Identify potential duplicate records using:
 * - external identifiers, names, dates, cemetery, location, source info.
 *
 * AI may suggest matches. Human review required for uncertain merges.
 */

import { nameSimilarity, geographicDistance } from './cemetery-matcher.js';

/**
 * Calculate birth/death date similarity.
 */
function dateSimilarity(date1, date2) {
  if (!date1 || !date2) return 0;
  // Normalize to YYYY-MM-DD
  const d1 = date1.split('T')[0];
  const d2 = date2.split('T')[0];
  if (d1 === d2) return 1.0;
  // Same year
  if (d1.substring(0, 4) === d2.substring(0, 4)) return 0.7;
  return 0;
}

/**
 * Match an external record against GraveAtlas grave records.
 * Returns potential matches with confidence scores.
 */
export function matchRecord(externalRecord, graveAtlasRecords) {
  const matches = [];

  for (const ga of graveAtlasRecords) {
    let score = 0;
    const reasons = [];

    // External ID match (strongest)
    if (externalRecord.externalRecordId && externalRecord.externalRecordId === ga.id) {
      matches.push({
        externalRecord, graveAtlasRecord: ga,
        confidence: 'high', score: 1.0,
        reasons: ['exact ID match'], autoMerge: true
      });
      continue;
    }

    // Name similarity (weight: 35%)
    const extName = externalRecord.personName || [externalRecord.givenNames, externalRecord.familyName].filter(Boolean).join(' ');
    const gaName = ga.name;
    const nameScore = nameSimilarity(extName, gaName);
    if (nameScore > 0.5) {
      score += nameScore * 0.35;
      if (nameScore > 0.85) reasons.push('exact name match');
      else reasons.push('similar name');
    }

    // Date similarity (weight: 25%)
    const birthScore = dateSimilarity(externalRecord.birthDate, ga.birthDate);
    const deathScore = dateSimilarity(externalRecord.deathDate, ga.deathDate);
    const dateScore = Math.max(birthScore, deathScore);
    if (dateScore > 0) {
      score += dateScore * 0.25;
      if (dateScore === 1.0) reasons.push('exact date match');
      else reasons.push('same year');
    }

    // Cemetery match (weight: 20%)
    if (externalRecord.cemetery && ga.cemeteryName) {
      const cemScore = nameSimilarity(externalRecord.cemetery, ga.cemeteryName);
      if (cemScore > 0.5) {
        score += cemScore * 0.2;
        reasons.push('same cemetery');
      }
    }

    // Geographic proximity (weight: 20%)
    if (externalRecord.latitude && externalRecord.longitude && ga.latitude && ga.longitude) {
      const dist = geographicDistance(
        externalRecord.latitude, externalRecord.longitude,
        ga.latitude, ga.longitude
      );
      if (dist < 0.5) {
        score += 0.2;
        reasons.push(`co-located (${dist.toFixed(2)} km)`);
      }
    }

    if (score >= 0.4) {
      matches.push({
        externalRecord, graveAtlasRecord: ga,
        confidence: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low',
        score: parseFloat(score.toFixed(2)),
        reasons,
        autoMerge: score >= 0.85 // only auto-merge at 85%+
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}

/**
 * Batch match external records against GraveAtlas records.
 */
export function batchMatchRecords(externalRecords, graveAtlasRecords) {
  const results = [];
  for (const ext of externalRecords) {
    const matches = matchRecord(ext, graveAtlasRecords);
    if (matches.length > 0) {
      results.push({ externalRecord: ext, matches });
    }
  }
  return results;
}
