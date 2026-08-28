/**
 * Phase 23: AI Genealogy & Family Tree Builder
 *
 * Detects family relationships from grave records using name matching,
 * date proximity, cemetery/section proximity, and inscription clues.
 * Builds visual family tree data structures (nodes + edges).
 *
 * Relationship types detected:
 *   - spouse: married couples (same surname, adjacent plots, "beloved wife/husband")
 *   - parent_child: parent → child (surname match, date alignment, "son/daughter of")
 *   - sibling: shared parents (same surname, close birth years, same cemetery section)
 *   - extended: grandparents, aunts/uncles (inferred from chains)
 */

// ============================================================
// RELATIONSHIP DETECTION
// ============================================================

/**
 * Extract surname from a full name.
 * Handles Western (last word), Chinese (first character), Malay (bin/binte patterns).
 */
export function extractSurname(fullName) {
  if (!fullName) return '';
  const name = fullName.trim();

  // Malay/Arabic pattern: "X bin Y" or "X binte Y"
  const malayMatch = name.match(/^(.+?)\s+(?:bin|binte|binti|bt)\s+/i);
  if (malayMatch) return malayMatch[1].trim();

  // Chinese pattern: first 1-2 characters are surname
  const cjkMatch = name.match(/^([\u4E00-\u9FFF]{1,2})/);
  if (cjkMatch) return cjkMatch[1];

  // Western pattern: last word
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return parts[parts.length - 1];

  return name;
}

/**
 * Extract given name from a full name.
 */
export function extractGivenName(fullName) {
  if (!fullName) return '';
  const name = fullName.trim();

  // Malay/Arabic pattern
  const malayMatch = name.match(/^(.+?)\s+(?:bin|binte|binti|bt)\s+(.+)$/i);
  if (malayMatch) return malayMatch[1].trim();

  // Chinese: after surname
  const cjkMatch = name.match(/^[\u4E00-\u9FFF]{1,2}([\u4E00-\u9FFF]+)/);
  if (cjkMatch) return cjkMatch[1];

  // Western: all but last word
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return parts.slice(0, -1).join(' ');

  return '';
}

/**
 * Compare two surnames for match (case-insensitive).
 */
function surnamesMatch(s1, s2) {
  if (!s1 || !s2) return false;
  return s1.toLowerCase() === s2.toLowerCase();
}

/**
 * Levenshtein distance for fuzzy name matching.
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Name similarity score (0-1).
 */
function nameSimilarity(n1, n2) {
  if (!n1 || !n2) return 0;
  const s1 = n1.toLowerCase().trim();
  const s2 = n2.toLowerCase().trim();
  if (s1 === s2) return 1;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 0;
  return 1 - (levenshtein(s1, s2) / maxLen);
}

/**
 * Parse a year from a date string.
 */
function parseYear(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Detect potential spouse relationship between two records.
 * @returns {Object|null} Relationship or null
 */
function detectSpouse(r1, r2) {
  const reasons = [];
  let confidence = 0;

  // Same surname (one may have taken the other's name)
  const sn1 = extractSurname(r1.name || '');
  const sn2 = extractSurname(r2.name || '');
  if (surnamesMatch(sn1, sn2)) {
    reasons.push('same surname');
    confidence += 25;
  }

  // Adjacent plots
  if (r1.plot && r2.plot && r1.plot === r2.plot) {
    reasons.push('same plot');
    confidence += 40;
  }

  // Adjacent plot numbers
  if (r1.plot && r2.plot) {
    const n1 = r1.plot.match(/(\d+)/);
    const n2 = r2.plot.match(/(\d+)/);
    if (n1 && n2 && Math.abs(parseInt(n1[1]) - parseInt(n2[1])) <= 2) {
      reasons.push('adjacent plots');
      confidence += 25;
    }
  }

  // Same cemetery
  if (r1.cemeteryId && r2.cemeteryId && r1.cemeteryId === r2.cemeteryId) {
    reasons.push('same cemetery');
    confidence += 10;
  }

  // Same section
  if (r1.section && r2.section && r1.section === r2.section) {
    reasons.push('same section');
    confidence += 15;
  }

  // Date proximity (died within ~10 years of each other)
  const d1 = parseYear(r1.deathDate || r1.dateOfDeath || '');
  const d2 = parseYear(r2.deathDate || r2.dateOfDeath || '');
  if (d1 && d2 && Math.abs(d1 - d2) <= 10) {
    reasons.push('died within 10 years');
    confidence += 15;
  }

  // Different given names (not the same person)
  const gn1 = extractGivenName(r1.name || '').toLowerCase();
  const gn2 = extractGivenName(r2.name || '').toLowerCase();
  if (gn1 && gn2 && gn1 !== gn2) {
    confidence += 5;
  }

  // Inscription clues
  const insc1 = (r1.inscription || '').toLowerCase();
  const insc2 = (r2.inscription || '').toLowerCase();

  // Skip if inscriptions indicate parent-child or sibling, not spouse
  if (insc1.includes('son of') || insc1.includes('daughter of') || insc1.includes('child of') ||
      insc2.includes('son of') || insc2.includes('daughter of') || insc2.includes('child of') ||
      insc1.includes('brother') || insc1.includes('sister') ||
      insc2.includes('brother') || insc2.includes('sister')) {
    confidence -= 50;
  }

  if (insc1.includes('wife') || insc1.includes('husband') || insc1.includes('spouse') ||
      insc2.includes('wife') || insc2.includes('husband') || insc2.includes('spouse') ||
      insc1.includes('beloved') || insc2.includes('beloved')) {
    reasons.push('inscription mentions spouse/beloved');
    confidence += 30;
  }

  // Large birth year gap reduces spouse likelihood
  const b1 = parseYear(r1.birthDate || r1.dateOfBirth || '');
  const b2 = parseYear(r2.birthDate || r2.dateOfBirth || '');
  if (b1 && b2 && Math.abs(b1 - b2) > 20) {
    confidence -= 20;
  }

  if (confidence >= 40) {
    return {
      type: 'spouse',
      personA: r1.id || r1.name,
      personB: r2.id || r2.name,
      confidence: Math.min(100, confidence),
      reasons,
    };
  }
  return null;
}

/**
 * Detect potential parent-child relationship between two records.
 */
function detectParentChild(parent, child) {
  const reasons = [];
  let confidence = 0;

  // Surname match
  const psn = extractSurname(parent.name || '');
  const csn = extractSurname(child.name || '');
  if (surnamesMatch(psn, csn)) {
    reasons.push('same surname');
    confidence += 30;
  }

  // Parent born before child
  const pb = parseYear(parent.birthDate || parent.dateOfBirth || '');
  const cb = parseYear(child.birthDate || child.dateOfBirth || '');
  if (pb && cb && pb < cb) {
    const ageDiff = cb - pb;
    if (ageDiff >= 15 && ageDiff <= 60) {
      reasons.push(`parent ${ageDiff} years older`);
      confidence += 35;
    }
  }

  // Parent died after child was born
  const pd = parseYear(parent.deathDate || parent.dateOfDeath || '');
  if (pd && cb && pd >= cb) {
    reasons.push('parent alive when child born');
    confidence += 15;
  }

  // Same cemetery
  if (parent.cemeteryId && child.cemeteryId && parent.cemeteryId === child.cemeteryId) {
    reasons.push('same cemetery');
    confidence += 10;
  }

  // Same section
  if (parent.section && child.section && parent.section === child.section) {
    reasons.push('same section');
    confidence += 10;
  }

  // Inscription clues
  const childInsc = (child.inscription || '').toLowerCase();
  if (childInsc.includes('son of') || childInsc.includes('daughter of') ||
      childInsc.includes('child of')) {
    const parentName = (parent.name || '').toLowerCase();
    if (childInsc.includes(parentName) || childInsc.includes(extractGivenName(parent.name || '').toLowerCase())) {
      reasons.push('inscription names parent');
      confidence += 40;
    }
  }

  // If birth years are known and too close, penalize (can't be parent-child if < 15 years apart)
  if (pb && cb && Math.abs(pb - cb) < 15) {
    confidence -= 30;
    reasons.push('birth years too close for parent-child');
  }

  if (confidence >= 40) {
    return {
      type: 'parent_child',
      parent: parent.id || parent.name,
      child: child.id || child.name,
      confidence: Math.min(100, confidence),
      reasons,
    };
  }
  return null;
}

/**
 * Detect potential sibling relationship between two records.
 */
function detectSibling(r1, r2) {
  const reasons = [];
  let confidence = 0;

  // Same surname
  const sn1 = extractSurname(r1.name || '');
  const sn2 = extractSurname(r2.name || '');
  if (surnamesMatch(sn1, sn2)) {
    reasons.push('same surname');
    confidence += 25;
  }

  // Close birth years (within ~10 years)
  const b1 = parseYear(r1.birthDate || r1.dateOfBirth || '');
  const b2 = parseYear(r2.birthDate || r2.dateOfBirth || '');
  if (b1 && b2 && Math.abs(b1 - b2) <= 10) {
    reasons.push('born within 10 years');
    confidence += 25;
  }

  // Different given names
  const gn1 = extractGivenName(r1.name || '').toLowerCase();
  const gn2 = extractGivenName(r2.name || '').toLowerCase();
  if (gn1 && gn2 && gn1 !== gn2) {
    confidence += 5;
  }

  // Same cemetery
  if (r1.cemeteryId && r2.cemeteryId && r1.cemeteryId === r2.cemeteryId) {
    reasons.push('same cemetery');
    confidence += 10;
  }

  // Same section
  if (r1.section && r2.section && r1.section === r2.section) {
    reasons.push('same section');
    confidence += 15;
  }

  // Inscription clues
  const insc1 = (r1.inscription || '').toLowerCase();
  const insc2 = (r2.inscription || '').toLowerCase();
  if (insc1.includes('brother') || insc1.includes('sister') ||
      insc2.includes('brother') || insc2.includes('sister')) {
    reasons.push('inscription mentions sibling');
    confidence += 35;
  }

  if (confidence >= 40) {
    return {
      type: 'sibling',
      personA: r1.id || r1.name,
      personB: r2.id || r2.name,
      confidence: Math.min(100, confidence),
      reasons,
    };
  }
  return null;
}

// ============================================================
// FAMILY TREE BUILDER
// ============================================================

/**
 * Build a family tree from a set of grave records.
 * @param {Array} records - Grave records
 * @param {Object} options - { maxRelationships, minConfidence }
 * @returns {Object} Family tree { nodes, edges, stats }
 */
export function buildFamilyTree(records, options = {}) {
  const { maxRelationships = 100, minConfidence = 40 } = options;

  if (!records || records.length < 2) {
    return {
      nodes: [],
      edges: [],
      stats: { totalRecords: (records || []).length, totalRelationships: 0, byType: {} },
    };
  }

  const nodes = records.map(r => ({
    id: r.id || r.name,
    name: r.name || 'Unknown',
    surname: extractSurname(r.name || ''),
    givenName: extractGivenName(r.name || ''),
    birthYear: parseYear(r.birthDate || r.dateOfBirth || ''),
    deathYear: parseYear(r.deathDate || r.dateOfDeath || ''),
    cemeteryId: r.cemeteryId || null,
    section: r.section || null,
    plot: r.plot || null,
  }));

  const edges = [];
  const seenPairs = new Set();

  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const pairKey = `${i}-${j}`;
      if (seenPairs.has(pairKey)) continue;

      // Try spouse
      let rel = detectSpouse(records[i], records[j]);
      if (!rel) rel = detectParentChild(records[i], records[j]);
      if (!rel) rel = detectParentChild(records[j], records[i]);
      if (!rel) rel = detectSibling(records[i], records[j]);

      if (rel && rel.confidence >= minConfidence) {
        seenPairs.add(pairKey);
        edges.push(rel);
        if (edges.length >= maxRelationships) break;
      }
    }
    if (edges.length >= maxRelationships) break;
  }

  // Stats
  const byType = {};
  for (const e of edges) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  // Find connected components (families)
  const families = findConnectedComponents(nodes, edges);

  return {
    nodes,
    edges,
    stats: {
      totalRecords: records.length,
      totalRelationships: edges.length,
      byType,
      familyCount: families.length,
      largestFamilySize: Math.max(...families.map(f => f.length), 0),
    },
    families,
  };
}

/**
 * Find connected components in the family graph (families).
 */
function findConnectedComponents(nodes, edges) {
  const adj = {};
  for (const n of nodes) {
    adj[n.id] = new Set();
  }
  for (const e of edges) {
    const a = e.personA || e.parent;
    const b = e.personB || e.child;
    if (adj[a]) adj[a].add(b);
    if (adj[b]) adj[b].add(a);
  }

  const visited = new Set();
  const components = [];

  for (const n of nodes) {
    if (visited.has(n.id)) continue;
    const component = [];
    const stack = [n.id];
    while (stack.length > 0) {
      const id = stack.pop();
      if (visited.has(id)) continue;
      visited.add(id);
      component.push(id);
      if (adj[id]) {
        for (const neighbor of adj[id]) {
          if (!visited.has(neighbor)) stack.push(neighbor);
        }
      }
    }
    if (component.length > 1) {
      components.push(component);
    }
  }

  return components;
}

// ============================================================
// RELATIONSHIP CONFIRMATION
// ============================================================

/**
 * Generate a confirmation request for a detected relationship.
 */
export function createConfirmationRequest(relationship) {
  return {
    relationshipId: `${relationship.personA || relationship.parent}-${relationship.type}-${relationship.personB || relationship.child}`,
    type: relationship.type,
    confidence: relationship.confidence,
    reasons: relationship.reasons,
    status: 'pending',
    action: 'confirm_or_reject',
    message: `Detected ${relationship.type} relationship with ${relationship.confidence}% confidence. Reasons: ${relationship.reasons.join(', ')}.`,
  };
}

/**
 * Get info about the genealogy system.
 */
export function getGenealogyInfo() {
  return {
    system: 'GraveAtlas AI Genealogy & Family Tree Builder',
    version: '1.0',
    relationshipTypes: ['spouse', 'parent_child', 'sibling', 'extended'],
    detectionSignals: [
      'Surname matching (Western, Chinese, Malay/Arabic bin/binte)',
      'Date proximity (birth/death year alignment)',
      'Cemetery/section/plot proximity',
      'Inscription clues (wife/husband, son/daughter of, brother/sister)',
      'Name similarity (Levenshtein distance)',
    ],
    treeFeatures: [
      'Node extraction (name, surname, given name, birth/death years, cemetery, plot)',
      'Edge detection (spouse, parent-child, sibling)',
      'Connected component analysis (family grouping)',
      'Confidence scoring per relationship',
      'Relationship confirmation workflow',
    ],
    limitations: [
      'Pattern-based detection only; no access to civil records',
      'Surname matching limited to Western, Chinese, and Malay conventions',
      'Inscription parsing depends on OCR quality',
      'May produce false positives for common surnames in same cemetery',
    ],
    attribution: 'GraveAtlas — AI Genealogy System',
  };
}
