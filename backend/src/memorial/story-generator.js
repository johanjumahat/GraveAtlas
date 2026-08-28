/**
 * Phase 24: AI Memorial Story Generator
 *
 * Generates rich narrative memorial stories from grave records by weaving
 * together inscription translations, family relationships, historical context,
 * cemetery information, and cultural traditions.
 *
 * This is the capstone feature that combines data from Phases 20-23.
 */

// ============================================================
// HISTORICAL CONTEXT
// ============================================================

/**
 * Get historical context for a birth/death year range.
 */
export function getHistoricalContext(birthYear, deathYear) {
  if (!birthYear && !deathYear) return null;

  const context = {
    era: null,
    lifespan: null,
    historicalEvents: [],
    culturalNotes: [],
    burialPractices: [],
  };

  if (birthYear && deathYear) {
    context.lifespan = deathYear - birthYear;
  }

  // Determine era
  const refYear = deathYear || birthYear;
  if (refYear) {
    if (refYear < 1900) {
      context.era = 'Pre-Modern';
      context.culturalNotes.push('Lived before modern record-keeping; data may rely on family records or church registers.');
      context.burialPractices.push('Traditional burial customs were dominant; cremation was rare in most cultures.');
    } else if (refYear < 1945) {
      context.era = 'Early Modern';
      context.culturalNotes.push('Lived through major global conflicts and industrial transformation.');
      context.burialPractices.push('Standardized cemetery layouts and government death certificates became common.');
    } else if (refYear < 2000) {
      context.era = 'Modern';
      context.culturalNotes.push('Lived during a period of rapid technological and social change.');
      context.burialPractices.push('Cremation rates rose significantly; memorial parks became more common.');
    } else {
      context.era = 'Contemporary';
      context.culturalNotes.push('Lived in the digital age; digital memorials and online records became prevalent.');
      context.burialPractices.push('Green burials, digital memorials, and personalized headstones became popular.');
    }
  }

  // Major historical events
  if (birthYear && deathYear) {
    if (birthYear <= 1918 && deathYear >= 1914) {
      context.historicalEvents.push({ event: 'World War I (1914-1918)', impact: 'May have been affected by or served in WWI.' });
    }
    if (birthYear <= 1945 && deathYear >= 1939) {
      context.historicalEvents.push({ event: 'World War II (1939-1945)', impact: 'Lived through WWII; may have served or been displaced.' });
    }
    if (birthYear <= 1950 && deathYear >= 1918) {
      context.historicalEvents.push({ event: 'Spanish Flu (1918-1920)', impact: 'May have been affected by the influenza pandemic.' });
    }
    if (birthYear <= 1969 && deathYear >= 1955) {
      context.historicalEvents.push({ event: 'Vietnam War era (1955-1975)', impact: 'Lived during a period of significant social change.' });
    }
    if (birthYear <= 2020 && deathYear >= 2020) {
      context.historicalEvents.push({ event: 'COVID-19 Pandemic (2020-2023)', impact: 'May have been affected by the global pandemic.' });
    }
    if (birthYear <= 1929 && deathYear >= 1929) {
      context.historicalEvents.push({ event: 'Great Depression (1929-1939)', impact: 'Lived through economic hardship.' });
    }
    // Singapore-specific
    if (birthYear <= 1942 && deathYear >= 1942 && deathYear <= 1945) {
      context.historicalEvents.push({ event: 'Japanese Occupation of Singapore (1942-1945)', impact: 'May have lived through the occupation.' });
    }
    if (birthYear <= 1965 && deathYear >= 1965) {
      context.historicalEvents.push({ event: 'Singapore Independence (1965)', impact: 'Witnessed Singapore\'s independence.' });
    }
  }

  return context;
}

// ============================================================
// MEMORIAL STORY GENERATION
// ============================================================

/**
 * Generate a memorial story from a grave record and optional enrichment data.
 * @param {Object} record - The grave record
 * @param {Object} enrichment - Optional enrichment data from other phases:
 *   - translation: InscriptionTranslationResult
 *   - familyTree: FamilyTreeResult
 *   - photoAnalysis: Headstone photo analysis result
 * @returns {Object} Memorial story
 */
export function generateMemorialStory(record, enrichment = {}) {
  if (!record) {
    return { error: 'No record provided' };
  }

  const name = record.name || 'Unknown';
  const birthYear = extractYear(record.birthDate || record.dateOfBirth);
  const deathYear = extractYear(record.deathDate || record.dateOfDeath);

  const sections = [];
  const metadata = {
    recordId: record.id,
    name,
    birthYear,
    deathYear,
    cemetery: record.cemeteryName || record.cemeteryId,
    section: record.section,
    plot: record.plot,
    wordCount: 0,
    sectionsGenerated: 0,
    enrichmentUsed: [],
  };

  // Section 1: Introduction
  sections.push(generateIntroduction(name, birthYear, deathYear, record));
  metadata.sectionsGenerated++;

  // Section 2: Historical Context
  const history = getHistoricalContext(birthYear, deathYear);
  if (history) {
    sections.push(generateHistoricalSection(name, history));
    metadata.sectionsGenerated++;
  }

  // Section 3: Inscription & Translation
  if (record.inscription || (enrichment.translation && enrichment.translation.translatedText)) {
    sections.push(generateInscriptionSection(record, enrichment.translation));
    metadata.sectionsGenerated++;
    if (enrichment.translation) metadata.enrichmentUsed.push('translation');
  }

  // Section 4: Family Connections
  if (enrichment.familyTree && enrichment.familyTree.edges) {
    const personEdges = enrichment.familyTree.edges.filter(e => {
      const a = e.personA || e.parent;
      const b = e.personB || e.child;
      return a === record.id || b === record.id;
    });
    if (personEdges.length > 0) {
      sections.push(generateFamilySection(name, personEdges, enrichment.familyTree));
      metadata.sectionsGenerated++;
      metadata.enrichmentUsed.push('familyTree');
    }
  }

  // Section 5: Cemetery & Resting Place
  if (record.cemeteryName || record.cemeteryId || record.section || record.plot) {
    sections.push(generateCemeterySection(record, name));
    metadata.sectionsGenerated++;
  }

  // Section 6: Photo Analysis
  if (enrichment.photoAnalysis) {
    sections.push(generatePhotoSection(enrichment.photoAnalysis));
    metadata.sectionsGenerated++;
    metadata.enrichmentUsed.push('photoAnalysis');
  }

  // Section 7: Closing
  sections.push(generateClosing(name, birthYear, deathYear, record));
  metadata.sectionsGenerated++;

  // Calculate word count
  metadata.wordCount = sections.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0);

  // Generate full story
  const fullText = sections.map(s => s.text).join('\n\n');

  return {
    title: `In Memory of ${name}`,
    fullText,
    sections,
    metadata,
    attribution: 'GraveAtlas — AI Memorial Story Generator',
  };
}

function extractYear(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function generateIntroduction(name, birthYear, deathYear, record) {
  let text = `${name}`;
  if (birthYear && deathYear) {
    text += ` was born in ${birthYear} and passed away in ${deathYear}`;
    const lifespan = deathYear - birthYear;
    if (lifespan > 0) text += `, at the age of ${lifespan}`;
    text += '.';
  } else if (birthYear) {
    text += ` was born in ${birthYear}.`;
  } else if (deathYear) {
    text += ` passed away in ${deathYear}.`;
  } else {
    text += ` is remembered here.`;
  }

  if (record.cemeteryName) {
    text += ` ${name} rests at ${record.cemeteryName}`;
    if (record.section) text += `, Section ${record.section}`;
    if (record.plot) text += `, Plot ${record.plot}`;
    text += '.';
  }

  return { title: 'Remembering', text };
}

function generateHistoricalSection(name, history) {
  let text = '';

  if (history.era) {
    text += `${name} lived during the ${history.era} era`;
    if (history.lifespan) text += `, spanning ${history.lifespan} years`;
    text += '. ';
  }

  if (history.historicalEvents.length > 0) {
    text += `${name} lived through significant historical events: `;
    text += history.historicalEvents.map(e => e.event).join(', ') + '. ';
  }

  if (history.culturalNotes.length > 0) {
    text += history.culturalNotes.join(' ') + ' ';
  }

  if (history.burialPractices.length > 0) {
    text += history.burialPractices.join(' ');
  }

  return { title: 'Historical Context', text: text.trim() };
}

function generateInscriptionSection(record, translation) {
  let text = '';

  if (record.inscription) {
    text += `The headstone reads: "${record.inscription}"`;
    if (translation && translation.translatedText) {
      text += `\n\nTranslation: "${translation.translatedText}"`;
      if (translation.sourceLanguage && translation.sourceLanguage !== 'English') {
        text += ` (translated from ${translation.sourceLanguage})`;
      }
    }
    if (translation && translation.transliteratedText) {
      text += `\n\nTransliteration: "${translation.transliteratedText}"`;
    }
    if (translation && translation.notations && translation.notations.length > 0) {
      text += `\n\nCultural notations found: `;
      text += translation.notations.map(n => `${n.notation} (${n.meaning})`).join(', ') + '.';
    }
    text += '.';
  }

  return { title: 'Inscription', text };
}

function generateFamilySection(name, edges, tree) {
  let text = `${name} was connected to others buried nearby. `;

  const spouses = edges.filter(e => e.type === 'spouse');
  const parents = edges.filter(e => e.type === 'parent_child' && e.parent === name || e.parent === edges[0]?.parent);
  const children = edges.filter(e => e.type === 'parent_child' && (e.child === name || e.child === edges[0]?.child));
  const siblings = edges.filter(e => e.type === 'sibling');

  const parts = [];
  if (spouses.length > 0) {
    parts.push(`Spouse: ${spouses.map(s => (s.personA === name ? s.personB : s.personA)).join(', ')}`);
  }
  if (parents.length > 0) {
    parts.push(`Parent of: ${parents.map(p => p.child).join(', ')}`);
  }
  if (children.length > 0) {
    parts.push(`Child of: ${children.map(c => c.parent).join(', ')}`);
  }
  if (siblings.length > 0) {
    parts.push(`Sibling of: ${siblings.map(s => (s.personA === name ? s.personB : s.personA)).join(', ')}`);
  }

  if (parts.length > 0) {
    text += parts.join('. ') + '.';
  } else {
    text += `Family connections were detected with ${edges.length} other record(s).`;
  }

  // Add confidence note
  const avgConfidence = Math.round(edges.reduce((sum, e) => sum + e.confidence, 0) / edges.length);
  text += ` (Average relationship confidence: ${avgConfidence}%)`;

  return { title: 'Family Connections', text };
}

function generateCemeterySection(record, name) {
  let text = '';
  if (record.cemeteryName) {
    text += `${name} rests at ${record.cemeteryName}`;
  } else {
    text += `${name} rests in a cemetery`;
  }
  if (record.section) text += `, in Section ${record.section}`;
  if (record.plot) text += `, at Plot ${record.plot}`;
  text += '. ';

  if (record.cemeteryName) {
    text += `This cemetery serves as a final resting place for many, and ${record.name || 'this individual'}'s grave is part of its enduring record.`;
  }

  return { title: 'Resting Place', text: text.trim() };
}

function generatePhotoSection(photoAnalysis) {
  let text = 'A headstone photograph has been analyzed. ';
  if (photoAnalysis.qualityScore) {
    text += `Photo quality score: ${photoAnalysis.qualityScore}/100. `;
  }
  if (photoAnalysis.ocrText) {
    text += `OCR extracted text: "${photoAnalysis.ocrText}". `;
  }
  if (photoAnalysis.issues && photoAnalysis.issues.length > 0) {
    text += `Photo issues detected: ${photoAnalysis.issues.join(', ')}. `;
  }
  return { title: 'Headstone Photo', text: text.trim() };
}

function generateClosing(name, birthYear, deathYear, record) {
  let text = '';
  if (birthYear && deathYear) {
    text += `${name} (${birthYear}\u2013${deathYear})`;
  } else {
    text += name;
  }
  text += ' is remembered through this memorial. ';

  if (record.inscription) {
    text += `The words on their headstone endure: "${record.inscription}"`;
  }

  text += ' May they rest in peace.';

  return { title: 'In Remembrance', text };
}

// [removed duplicate function]
// ============================================================
// BATCH STORY GENERATION
// ============================================================

/**
 * Generate memorial stories for multiple records.
 * @param {Array} records - Grave records
 * @param {Object} options - { maxRecords, includeHistory, includeFamily }
 * @returns {Object} Batch result
 */
export function generateBatchStories(records, options = {}) {
  const { maxRecords = 50, includeHistory = true, includeFamily = false } = options;

  if (!records || !Array.isArray(records)) {
    return { stories: [], totalGenerated: 0, errors: [] };
  }

  const stories = [];
  const errors = [];
  const toProcess = records.slice(0, maxRecords);

  for (const record of toProcess) {
    try {
      const enrichment = {};
      const story = generateMemorialStory(record, enrichment);
      stories.push({
        recordId: record.id || record.name,
        title: story.title,
        wordCount: story.metadata.wordCount,
        sections: story.metadata.sectionsGenerated,
        preview: story.fullText.substring(0, 200) + (story.fullText.length > 200 ? '...' : ''),
      });
    } catch (e) {
      errors.push({ recordId: record.id || record.name, error: e.message });
    }
  }

  return {
    stories,
    totalGenerated: stories.length,
    totalErrors: errors.length,
    errors,
    attribution: 'GraveAtlas — AI Memorial Story Generator',
  };
}

// ============================================================
// STORY INFO
// ============================================================

export function getStoryInfo() {
  return {
    system: 'GraveAtlas AI Memorial Story Generator',
    version: '1.0',
    storySections: [
      'Introduction (name, dates, cemetery)',
      'Historical Context (era, events, cultural notes)',
      'Inscription & Translation (text, translation, transliteration, notations)',
      'Family Connections (spouse, parent-child, sibling)',
      'Resting Place (cemetery, section, plot)',
      'Headstone Photo (quality, OCR, issues)',
      'Closing (remembrance)',
    ],
    historicalEvents: [
      'World War I (1914-1918)',
      'Spanish Flu (1918-1920)',
      'Great Depression (1929-1939)',
      'World War II (1939-1945)',
      'Vietnam War era (1955-1975)',
      'Singapore Independence (1965)',
      'Japanese Occupation of Singapore (1942-1945)',
      'COVID-19 Pandemic (2020-2023)',
    ],
    enrichmentIntegrations: [
      'Phase 22: Inscription Translation',
      'Phase 23: Family Tree Builder',
      'Phase 20: Headstone Photo Analysis',
    ],
    features: [
      'Multi-section narrative generation',
      'Historical event detection from birth/death years',
      'Cultural era classification (Pre-Modern, Early Modern, Modern, Contemporary)',
      'Burial practice context',
      'Family relationship weaving',
      'Inscription translation integration',
      'Photo analysis integration',
      'Batch story generation for cemetery-wide narratives',
    ],
    limitations: [
      'Historical events are limited to major global and Singapore-specific events',
      'Stories are template-based; for richer narratives, LLM generation is recommended',
      'Family connections depend on Phase 23 genealogy detection accuracy',
    ],
    attribution: 'GraveAtlas — AI Memorial Story Generator',
  };
}
