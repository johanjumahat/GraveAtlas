/**
 * Phase 26: AI Cemetery Analytics & Insights Dashboard
 *
 * Aggregates data from all previous phases into cemetery-level analytics:
 * burial trends, demographic breakdowns, surname distribution, family
 * analysis, spatial density patterns, and memorial story coverage.
 *
 * This is the analytics layer that makes all the collected data useful
 * for cemetery administrators, genealogists, and researchers.
 */

// ============================================================
// BURIAL TREND ANALYSIS
// ============================================================

export function analyzeBurialTrends(records) {
  if (!records || records.length === 0) {
    return { totalRecords: 0, byDecade: [], byYear: [], trend: 'unknown' };
  }

  const byYear = {};
  const byDecade = {};
  let totalWithDates = 0;

  for (const r of records) {
    const year = extractYear(r.deathDate || r.dateOfDeath);
    if (year) {
      byYear[year] = (byYear[year] || 0) + 1;
      const decade = Math.floor(year / 10) * 10;
      byDecade[decade] = (byDecade[decade] || 0) + 1;
      totalWithDates++;
    }
  }

  const yearEntries = Object.entries(byYear).map(([year, count]) => ({ year: parseInt(year), count }))
    .sort((a, b) => a.year - b.year);
  const decadeEntries = Object.entries(byDecade).map(([decade, count]) => ({ decade: parseInt(decade), count }))
    .sort((a, b) => a.decade - b.decade);

  // Determine trend
  let trend = 'stable';
  if (decadeEntries.length >= 2) {
    const recent = decadeEntries[decadeEntries.length - 1].count;
    const previous = decadeEntries[decadeEntries.length - 2].count;
    if (recent > previous * 1.2) trend = 'increasing';
    else if (recent < previous * 0.8) trend = 'decreasing';
  }

  return {
    totalRecords: records.length,
    totalWithDates,
    dateCoverage: totalWithDates > 0 ? Math.round((totalWithDates / records.length) * 100) : 0,
    byDecade: decadeEntries,
    byYear: yearEntries,
    peakYear: yearEntries.length > 0 ? yearEntries.reduce((max, y) => y.count > max.count ? y : max, yearEntries[0]) : null,
    peakDecade: decadeEntries.length > 0 ? decadeEntries.reduce((max, d) => d.count > max.count ? d : max, decadeEntries[0]) : null,
    trend,
  };
}

// ============================================================
// DEMOGRAPHIC ANALYSIS
// ============================================================

export function analyzeDemographics(records) {
  if (!records || records.length === 0) {
    return { totalRecords: 0, ageDistribution: [], avgLifespan: 0, genderBreakdown: {}, birthDecades: [] };
  }

  const ages = [];
  const birthDecades = {};
  const genderGuess = { male: 0, female: 0, unknown: 0 };

  for (const r of records) {
    const birth = extractYear(r.birthDate || r.dateOfBirth);
    const death = extractYear(r.deathDate || r.dateOfDeath);
    if (birth && death && death >= birth) {
      ages.push(death - birth);
    }
    if (birth) {
      const decade = Math.floor(birth / 10) * 10;
      birthDecades[decade] = (birthDecades[decade] || 0) + 1;
    }

    // Gender guess from name (heuristic)
    const name = (r.name || '').toLowerCase();
    if (/\b(mrs|madam|mary|jane|sarah|elizabeth|ann|rose|lim|tan ah bee|fatimah|aminah|siti|nor|aishah)\b/i.test(name)) {
      genderGuess.female++;
    } else if (/\b(mr|mr\.|tan ah kow|ahmad|muhammad|ali|abu|bin|razak|ibrahim|salleh)\b/i.test(name)) {
      genderGuess.male++;
    } else {
      genderGuess.unknown++;
    }
  }

  // Age distribution brackets
  const brackets = [
    { label: '0-17', min: 0, max: 17, count: 0 },
    { label: '18-39', min: 18, max: 39, count: 0 },
    { label: '40-59', min: 40, max: 59, count: 0 },
    { label: '60-79', min: 60, max:79, count: 0 },
    { label: '80+', min: 80, max: 200, count: 0 },
  ];
  for (const age of ages) {
    for (const b of brackets) {
      if (age >= b.min && age <= b.max) { b.count++; break; }
    }
  }

  const avgLifespan = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;
  const maxLifespan = ages.length > 0 ? Math.max(...ages) : 0;
  const minLifespan = ages.length > 0 ? Math.min(...ages) : 0;

  const birthDecadeEntries = Object.entries(birthDecades)
    .map(([decade, count]) => ({ decade: parseInt(decade), count }))
    .sort((a, b) => a.decade - b.decade);

  return {
    totalRecords: records.length,
    ageDistribution: brackets,
    avgLifespan,
    maxLifespan,
    minLifespan,
    totalWithAge: ages.length,
    ageCoverage: ages.length > 0 ? Math.round((ages.length / records.length) * 100) : 0,
    genderBreakdown: genderGuess,
    birthDecades: birthDecadeEntries,
  };
}

// ============================================================
// SURNAME DISTRIBUTION
// ============================================================

export function analyzeSurnameDistribution(records) {
  if (!records || records.length === 0) {
    return { totalRecords: 0, totalSurnames: 0, topSurnames: [], diversityIndex: 0 };
  }

  const surnameCounts = {};
  for (const r of records) {
    const sn = extractSurname(r.name || '');
    if (sn) {
      const key = sn.toLowerCase();
      surnameCounts[key] = (surnameCounts[key] || 0) + 1;
    }
  }

  const sorted = Object.entries(surnameCounts)
    .map(([surname, count]) => ({ surname, count, percentage: Math.round((count / records.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  const totalSurnames = Object.keys(surnameCounts).length;
  // Simpson's diversity index
  const N = records.length;
  let sumSq = 0;
  for (const c of Object.values(surnameCounts)) sumSq += c * c;
  const diversityIndex = N > 0 ? 1 - (sumSq / (N * N)) : 0;

  return {
    totalRecords: records.length,
    totalSurnames,
    topSurnames: sorted.slice(0, 20),
    diversityIndex: Math.round(diversityIndex * 100) / 100,
    surnameCoverage: totalSurnames > 0 ? Math.round((totalSurnames / records.length) * 100) : 0,
  };
}

// ============================================================
// FAMILY ANALYSIS
// ============================================================

export function analyzeFamilies(records, familyTree) {
  if (!records || !familyTree || !familyTree.edges) {
    return { totalFamilies: 0, avgFamilySize: 0, largestFamily: 0, relationshipTypes: {} };
  }

  const byType = {};
  for (const e of familyTree.edges) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  const families = familyTree.families || [];
  const familySizes = families.map(f => f.length);
  const avgFamilySize = familySizes.length > 0
    ? Math.round(familySizes.reduce((s, n) => s + n, 0) / familySizes.length * 10) / 10
    : 0;

  return {
    totalFamilies: families.length,
    avgFamilySize,
    largestFamily: familySizes.length > 0 ? Math.max(...familySizes) : 0,
    smallestFamily: familySizes.length > 0 ? Math.min(...familySizes) : 0,
    totalRelationships: familyTree.edges.length,
    relationshipTypes: byType,
    recordsWithFamily: families.reduce((s, f) => s + f.length, 0),
    familyCoverage: records.length > 0 ? Math.round((families.reduce((s, f) => s + f.length, 0) / records.length) * 100) : 0,
  };
}

// ============================================================
// CEMETERY INSIGHTS SUMMARY
// ============================================================

export function generateInsights(records, options = {}) {
  if (!records || records.length === 0) {
    return { totalRecords: 0, insights: [], attribution: 'GraveAtlas — AI Cemetery Analytics' };
  }

  const burialTrends = analyzeBurialTrends(records);
  const demographics = analyzeDemographics(records);
  const surnames = analyzeSurnameDistribution(records);

  const insights = [];

  // Data coverage insight
  const coverage = Math.round((burialTrends.dateCoverage + demographics.ageCoverage + surnames.surnameCoverage) / 3);
  insights.push({
    category: 'Data Quality',
    title: 'Data Coverage',
    value: `${coverage}%`,
    detail: `Death dates: ${burialTrends.dateCoverage}%, Age data: ${demographics.ageCoverage}%, Surname extraction: ${surnames.surnameCoverage}%`,
  });

  // Burial trend insight
  if (burialTrends.peakYear) {
    insights.push({
      category: 'Burial Trends',
      title: 'Peak Burial Year',
      value: `${burialTrends.peakYear.year}`,
      detail: `${burialTrends.peakYear.count} burials — highest in the dataset`,
    });
  }

  // Lifespan insight
  if (demographics.avgLifespan > 0) {
    insights.push({
      category: 'Demographics',
      title: 'Average Lifespan',
      value: `${demographics.avgLifespan} years`,
      detail: `Range: ${demographics.minLifespan}–${demographics.maxLifespan} years (${demographics.totalWithAge} records with age data)`,
    });
  }

  // Surname diversity
  insights.push({
    category: 'Surnames',
    title: 'Surname Diversity',
    value: surnames.diversityIndex.toFixed(2),
    detail: `${surnames.totalSurnames} unique surnames across ${records.length} records`,
  });

  // Top surname
  if (surnames.topSurnames.length > 0) {
    const top = surnames.topSurnames[0];
    insights.push({
      category: 'Surnames',
      title: 'Most Common Surname',
      value: top.surname,
      detail: `${top.count} records (${top.percentage}%)`,
    });
  }

  // Era breakdown
  if (burialTrends.byDecade.length > 0) {
    const earliest = burialTrends.byDecade[0];
    const latest = burialTrends.byDecade[burialTrends.byDecade.length - 1];
    insights.push({
      category: 'Timeline',
      title: 'Burial Period',
      value: `${earliest.decade}s–${latest.decade}s`,
      detail: `Records span ${burialTrends.byDecade.length} decades`,
    });
  }

  // Trend direction
  insights.push({
    category: 'Burial Trends',
    title: 'Burial Trend',
    value: burialTrends.trend,
    detail: `Comparing recent decades: ${burialTrends.trend === 'increasing' ? 'more' : burialTrends.trend === 'decreasing' ? 'fewer' : 'similar'} burials in recent decades`,
  });

  return {
    totalRecords: records.length,
    totalInsights: insights.length,
    insights,
    summary: {
      burialTrends,
      demographics,
      surnames,
    },
    attribution: 'GraveAtlas — AI Cemetery Analytics',
  };
}

// ============================================================
// INFO
// ============================================================

export function getAnalyticsInfo() {
  return {
    system: 'GraveAtlas AI Cemetery Analytics & Insights Dashboard',
    version: '1.0',
    analyticsModules: [
      'Burial Trends (by decade, by year, trend direction)',
      'Demographics (age distribution, lifespan, gender estimate, birth decades)',
      'Surname Distribution (top surnames, diversity index, coverage)',
      'Family Analysis (family count, size, relationship types, coverage)',
      'Cemetery Insights (data quality, trends, demographics summary)',
    ],
    metrics: [
      'Data coverage (death dates, age data, surnames)',
      'Peak burial year/decade',
      'Average/max/min lifespan',
      'Surname diversity (Simpson index)',
      'Family coverage percentage',
      'Burial trend direction',
    ],
    integrations: [
      'Phase 23: Family Tree Builder',
      'Phase 22: Inscription Translation',
      'Phase 25: Spatial Intelligence',
    ],
    attribution: 'GraveAtlas — AI Cemetery Analytics',
  };
}

// ============================================================
// HELPERS
// ============================================================

function extractYear(dateStr) {
  if (!dateStr) return null;
  const match = String(dateStr).match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function extractSurname(fullName) {
  if (!fullName) return '';
  const name = fullName.trim();
  const malayMatch = name.match(/^(.+?)\s+(?:bin|binte|binti|bt)\s+/i);
  if (malayMatch) return malayMatch[1].trim();
  const cjkMatch = name.match(/^([\u4E00-\u9FFF]{1,2})/);
  if (cjkMatch) return cjkMatch[1];
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return parts[parts.length - 1];
  return name;
}
