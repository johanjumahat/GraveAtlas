/**
 * Cemetery Entity Matching (Part 6)
 *
 * Match external cemetery entities against GraveAtlas carefully.
 * Uses: exact identifiers, official names, geographic info, addresses, aliases.
 *
 * AI may suggest a match. Does NOT automatically merge uncertain entities.
 */

/**
 * Calculate name similarity between two cemetery names.
 * Uses normalized string comparison (case, punctuation, whitespace insensitive).
 */
export function nameSimilarity(name1, name2) {
  if (!name1 || !name2) return 0;
  const normalize = s => s.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  if (n1 === n2) return 1.0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.85;
  // Token overlap (Jaccard)
  const tokens1 = new Set(n1.split(' '));
  const tokens2 = new Set(n2.split(' '));
  const intersection = [...tokens1].filter(t => tokens2.has(t)).length;
  const union = tokens1.size + tokens2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Calculate geographic distance in km between two coordinates.
 */
export function geographicDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const R = 6371; // Earth radius km
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Match an external cemetery against GraveAtlas cemeteries.
 * Returns potential matches with confidence scores.
 */
export function matchCemetery(externalCemetery, graveAtlasCemeteries) {
  const matches = [];

  for (const ga of graveAtlasCemeteries) {
    let score = 0;
    const reasons = [];

    // Name similarity (weight: 40%)
    const nameScore = nameSimilarity(externalCemetery.cemetery, ga.name || ga.cemeteryName);
    if (nameScore > 0) {
      score += nameScore * 0.4;
      if (nameScore > 0.8) reasons.push('exact name match');
      else if (nameScore > 0.5) reasons.push('similar name');
    }

    // Geographic proximity (weight: 40%)
    if (externalCemetery.latitude && externalCemetery.longitude && ga.latitude && ga.longitude) {
      const dist = geographicDistance(
        externalCemetery.latitude, externalCemetery.longitude,
        ga.latitude, ga.longitude
      );
      if (dist < 0.1) {
        score += 0.4;
        reasons.push(`co-located (${dist.toFixed(2)} km)`);
      } else if (dist < 1) {
        score += 0.3;
        reasons.push(`nearby (${dist.toFixed(2)} km)`);
      } else if (dist < 10) {
        score += 0.1;
        reasons.push(`same region (${dist.toFixed(2)} km)`);
      }
    }

    // Exact ID match (weight: 20%)
    if (externalCemetery.externalRecordId && externalCemetery.externalRecordId === ga.id) {
      score += 0.2;
      reasons.push('exact ID match');
    }

    if (score >= 0.5) {
      matches.push({
        externalCemetery,
        graveAtlasCemetery: ga,
        confidence: score >= 0.8 ? 'high' : score >= 0.6 ? 'medium' : 'low',
        score: parseFloat(score.toFixed(2)),
        reasons,
        autoMerge: score >= 0.9  // only auto-merge at 90%+ confidence
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches;
}
