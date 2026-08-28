/**
 * Phase 22: AI Inscription Translation & Cross-Language Search
 *
 * Provides translation of headstone inscriptions from 8 languages,
 * script detection, transliteration, cultural notation explanation,
 * and cross-language name search.
 *
 * Languages supported:
 *   - Chinese (Simplified/Traditional)
 *   - Arabic
 *   - Tamil
 *   - Malay (Jawi + Rumi)
 *   - Hebrew
 *   - Japanese
 *   - Korean
 *   - English
 */

// ============================================================
// SCRIPT DETECTION
// ============================================================

/**
 * Detect the script/language of inscription text.
 * Uses Unicode block ranges for detection.
 * @param {string} text - Inscription text
 * @returns {{ script: string, language: string, confidence: number, detectedChars: Object }}
 */
export function detectScript(text) {
  if (!text || typeof text !== 'string') {
    return { script: 'unknown', language: 'unknown', confidence: 0, detectedChars: {} };
  }

  const scripts = {
    chinese:    { range: /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/g, language: 'Chinese', name: 'CJK Unified Ideographs' },
    japanese_kana: { range: /[\u3040-\u309F\u30A0-\u30FF]/g, language: 'Japanese', name: 'Hiragana/Katakana' },
    korean:     { range: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g, language: 'Korean', name: 'Hangul' },
    arabic:     { range: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, language: 'Arabic', name: 'Arabic' },
    hebrew:     { range: /[\u0590-\u05FF\uFB1D-\uFB4F]/g, language: 'Hebrew', name: 'Hebrew' },
    tamil:      { range: /[\u0B80-\u0BFF]/g, language: 'Tamil', name: 'Tamil' },
    latin:      { range: /[A-Za-z\u00C0-\u00FF\u0100-\u017F]/g, language: 'English', name: 'Latin' },
    jawi:       { range: /[\u0600-\u06FF]/g, language: 'Malay (Jawi)', name: 'Arabic-script Malay' },
  };

  const counts = {};
  let totalChars = 0;

  for (const [key, info] of Object.entries(scripts)) {
    if (key === 'jawi') continue; // Jawi overlaps with Arabic, handle separately
    const matches = text.match(info.range);
    if (matches) {
      counts[key] = matches.length;
      totalChars += matches.length;
    }
  }

  if (totalChars === 0) {
    return { script: 'unknown', language: 'unknown', confidence: 0, detectedChars: {} };
  }

  // Sort by count descending
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topScript, topCount] = sorted[0];
  const confidence = Math.round((topCount / totalChars) * 100);

  // If Arabic script detected, check if it could be Jawi (Malay in Arabic script)
  let language = scripts[topScript].language;
  if (topScript === 'arabic') {
    // Jawi-specific characters: چ ڨ ڠ ڤ ڽ
    const jawiSpecific = /[\u0686\u06A8\u06A0\u06A4\u068B]/g;
    if (text.match(jawiSpecific)) {
      language = 'Malay (Jawi)';
    }
  }

  // Japanese: if both CJK and Kana detected, it's Japanese
  if (counts.chinese && counts.japanese_kana) {
    return {
      script: 'japanese',
      language: 'Japanese',
      confidence: Math.min(100, confidence + 10),
      detectedChars: counts,
    };
  }

  // Korean: Hangul takes precedence over any CJK
  if (counts.korean && counts.korean > (counts.chinese || 0)) {
    return {
      script: 'korean',
      language: 'Korean',
      confidence: Math.round((counts.korean / totalChars) * 100),
      detectedChars: counts,
    };
  }

  return {
    script: topScript,
    language,
    confidence,
    detectedChars: counts,
  };
}

// ============================================================
// TRANSLITERATION TABLES
// ============================================================

const transliterationTables = {
  // Arabic to Latin (simplified)
  arabic: {
    'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r',
    'ز': 'z', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't',
    'ظ': 'z', 'ع': '', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k',
    'ل': 'l', 'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w', 'ي': 'y',
    'ة': 'ah', 'ى': 'a', 'ء': '',
    'ال': 'al-',
  },
  // Hebrew to Latin (simplified)
  hebrew: {
    'א': '', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v',
    'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'k', 'ך': 'k',
    'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's',
    'ע': '', 'פ': 'p', 'ף': 'p', 'צ': 'ts', 'ץ': 'ts', 'ק': 'k',
    'ר': 'r', 'ש': 'sh', 'ת': 't',
  },
  // Korean Hangul Romanization (simplified — initial consonants)
  korean: {
    '김': 'Kim', '이': 'Lee', '박': 'Park', '최': 'Choi', '정': 'Jung',
    '강': 'Kang', '조': 'Cho', '윤': 'Yoon', '장': 'Jang', '임': 'Lim',
    '한': 'Han', '오': 'Oh', '서': 'Seo', '신': 'Shin', '권': 'Kwon',
  },
};

/**
 * Transliterate non-Latin text to Latin script.
 * @param {string} text - Text to transliterate
 * @param {string} script - Source script (arabic, hebrew, korean)
 * @returns {string} Transliterated text
 */
export function transliterate(text, script) {
  if (!text || !transliterationTables[script]) {
    return text || '';
  }

  const table = transliterationTables[script];
  let result = text;

  // Apply multi-char replacements first (e.g., 'ال' before 'ا')
  const entries = Object.entries(table).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    result = result.split(from).join(to);
  }

  return result.trim();
}

// ============================================================
// CULTURAL / RELIGIOUS NOTATION EXPLANATIONS
// ============================================================

const culturalNotations = {
  // Islamic/Muslim notations
  'almarhum': { meaning: 'The late/deceased (male)', tradition: 'Islamic (Malay/Indonesian)', language: 'Malay' },
  'المرحوم': { meaning: 'The late/deceased (male)', tradition: 'Islamic (Arabic)', language: 'Arabic' },
  'المرحومة': { meaning: 'The late/deceased (female)', tradition: 'Islamic (Arabic)', language: 'Arabic' },
  'رحمه الله': { meaning: 'May Allah have mercy on him', tradition: 'Islamic', language: 'Arabic' },
  'رحمة الله': { meaning: 'May Allah have mercy on them', tradition: 'Islamic', language: 'Arabic' },
  'بسم الله': { meaning: 'In the name of Allah', tradition: 'Islamic', language: 'Arabic' },
  'لا إله إلا الله': { meaning: 'There is no god but Allah', tradition: 'Islamic', language: 'Arabic' },
  'إنا لله': { meaning: 'Indeed we belong to Allah', tradition: 'Islamic', language: 'Arabic' },
  'almarhumah': { meaning: 'The late/deceased (female)', tradition: 'Islamic (Malay/Indonesian)', language: 'Malay' },
  'rahumatullah': { meaning: 'May Allah have mercy on him/her', tradition: 'Islamic', language: 'Arabic' },
  'rahimahullah': { meaning: 'May Allah have mercy on him', tradition: 'Islamic', language: 'Arabic' },
  'rahimahallah': { meaning: 'May Allah have mercy on her', tradition: 'Islamic', language: 'Arabic' },
  'inna lillahi': { meaning: 'Indeed we belong to Allah', tradition: 'Islamic', language: 'Arabic' },
  'la ilaha illallah': { meaning: 'There is no god but Allah', tradition: 'Islamic', language: 'Arabic' },
  'bismillah': { meaning: 'In the name of Allah', tradition: 'Islamic', language: 'Arabic' },
  'fatihah': { meaning: 'The Opening (first chapter of Quran)', tradition: 'Islamic', language: 'Arabic' },
  'surah': { meaning: 'Quranic chapter', tradition: 'Islamic', language: 'Arabic' },
  'Allahu Akbar': { meaning: 'Allah is the Greatest', tradition: 'Islamic', language: 'Arabic' },

  // Chinese notations
  '先考': { meaning: 'Deceased father', tradition: 'Chinese', language: 'Chinese' },
  '先妣': { meaning: 'Deceased mother', tradition: 'Chinese', language: 'Chinese' },
  '故考': { meaning: 'Deceased father (alternative)', tradition: 'Chinese', language: 'Chinese' },
  '故妣': { meaning: 'Deceased mother (alternative)', tradition: 'Chinese', language: 'Chinese' },
  '显考': { meaning: 'Honorable deceased father', tradition: 'Chinese', language: 'Chinese' },
  '显妣': { meaning: 'Honorable deceased mother', tradition: 'Chinese', language: 'Chinese' },
  '之墓': { meaning: 'Tomb of', tradition: 'Chinese', language: 'Chinese' },
  '墓': { meaning: 'Grave/Tomb', tradition: 'Chinese', language: 'Chinese' },
  '公墓': { meaning: 'Public cemetery', tradition: 'Chinese', language: 'Chinese' },
  '生于': { meaning: 'Born on', tradition: 'Chinese', language: 'Chinese' },
  '卒于': { meaning: 'Died on', tradition: 'Chinese', language: 'Chinese' },
  '享年': { meaning: 'Lived to the age of', tradition: 'Chinese', language: 'Chinese' },
  '立碑': { meaning: 'Erected by (family)', tradition: 'Chinese', language: 'Chinese' },
  '孝男': { meaning: 'Filial son', tradition: 'Chinese', language: 'Chinese' },
  '孝女': { meaning: 'Filial daughter', tradition: 'Chinese', language: 'Chinese' },
  '永遠懷念': { meaning: 'Forever remembered', tradition: 'Chinese', language: 'Chinese' },
  '永遠的懷念': { meaning: 'Forever in our memory', tradition: 'Chinese', language: 'Chinese' },

  // Japanese notations
  '命日': { meaning: 'Anniversary of death', tradition: 'Japanese Buddhist', language: 'Japanese' },
  '戒名': { meaning: 'Posthumous Buddhist name', tradition: 'Japanese Buddhist', language: 'Japanese' },
  '俗名': { meaning: 'Secular/living name', tradition: 'Japanese Buddhist', language: 'Japanese' },
  '没年月日': { meaning: 'Date of death', tradition: 'Japanese', language: 'Japanese' },
  '行年': { meaning: 'Died at age', tradition: 'Japanese', language: 'Japanese' },
  '享年': { meaning: 'Lived to the age of', tradition: 'Japanese', language: 'Japanese' },

  // Hebrew/Jewish notations
  'פ״נ': { meaning: 'Here lies (POH NIKHBAR)', tradition: 'Jewish', language: 'Hebrew' },
  'פה נטמן': { meaning: 'Here is buried', tradition: 'Jewish', language: 'Hebrew' },
  'תנצבה': { meaning: 'May their soul be bound in the bond of life', tradition: 'Jewish', language: 'Hebrew' },
  'ה״ו': { meaning: 'May their soul be bound up', tradition: 'Jewish', language: 'Hebrew' },

  // Christian notations
  'In Memory of': { meaning: 'Dedicated to the memory of', tradition: 'Christian/General', language: 'English' },
  'In Loving Memory': { meaning: 'Dedicated with love', tradition: 'Christian/General', language: 'English' },
  'Sacred to the Memory': { meaning: 'Dedicated to the memory of', tradition: 'Christian/General', language: 'English' },
  'RIP': { meaning: 'Rest in Peace', tradition: 'Christian', language: 'English' },
  'Requiescat in Pace': { meaning: 'May he/she rest in peace', tradition: 'Christian (Latin)', language: 'Latin' },

  // Tamil notations
  'நினைவாக': { meaning: 'In memory of', tradition: 'Tamil', language: 'Tamil' },
  'பிறந்த': { meaning: 'Born', tradition: 'Tamil', language: 'Tamil' },
  'இறந்த': { meaning: 'Died', tradition: 'Tamil', language: 'Tamil' },
};

/**
 * Identify cultural/religious notations in inscription text.
 * @param {string} text - Inscription text
 * @returns {Array<{ notation: string, meaning: string, tradition: string, language: string }>}
 */
export function identifyNotations(text) {
  if (!text) return [];
  const found = [];
  const lowerText = text.toLowerCase();

  for (const [notation, info] of Object.entries(culturalNotations)) {
    if (text.includes(notation) || lowerText.includes(notation.toLowerCase())) {
      found.push({
        notation,
        meaning: info.meaning,
        tradition: info.tradition,
        language: info.language,
      });
    }
  }

  return found;
}

// ============================================================
// CROSS-LANGUAGE NAME EQUIVALENCE
// ============================================================

const nameEquivalents = {
  // Arabic ↔ English
  'ahmad': { arabic: 'أحمد', english: ['Ahmad', 'Ahmed', 'Ahmet'] },
  'muhammad': { arabic: 'محمد', english: ['Muhammad', 'Mohammed', 'Mohamed', 'Mohamad'] },
  'abdullah': { arabic: 'عبد الله', english: ['Abdullah', 'Abdullah', 'Abdulah'] },
  'ibrahim': { arabic: 'إبراهيم', english: ['Ibrahim', 'Abraham', 'Ebrahim'] },
  'ismael': { arabic: 'إسماعيل', english: ['Ismail', 'Ismael', 'Ishmael'] },
  'yusof': { arabic: 'يوسف', english: ['Yusof', 'Yusuf', 'Yusoff', 'Joseph', 'Yousef'] },
  'ali': { arabic: 'علي', english: ['Ali'] },
  'omar': { arabic: 'عمر', english: ['Omar', 'Omar', 'Umar'] },
  'fatimah': { arabic: 'فاطمة', english: ['Fatimah', 'Fatima'] },
  'aminah': { arabic: 'آمنة', english: ['Aminah', 'Amina'] },
  'siti': { arabic: 'ستي', english: ['Siti', 'Sity'] },
  'rahman': { arabic: 'رحمن', english: ['Rahman', 'Rahim'] },

  // Chinese ↔ English (common Singapore names)
  'tan': { chinese: '陈', english: ['Tan', 'Chen'] },
  'lee': { chinese: '李', english: ['Lee', 'Li'] },
  'lim': { chinese: '林', english: ['Lim', 'Lin'] },
  'ong': { chinese: '王', english: ['Ong', 'Wang'] },
  'wong': { chinese: '黄', english: ['Wong', 'Huang'] },
  'goh': { chinese: '吴', english: ['Goh', 'Wu'] },
  'chua': { chinese: '蔡', english: ['Chua', 'Cai', 'Choi'] },
  'chan': { chinese: '陈', english: ['Chan', 'Chen'] },
  'sim': { chinese: '沈', english: ['Sim', 'Shen'] },
  'chong': { chinese: '张', english: ['Chong', 'Cheong', 'Zhang'] },
  'ng': { chinese: '黄', english: ['Ng', 'Huang'] },
  'teh': { chinese: '郑', english: ['Teh', 'Cheng', 'Zheng'] },

  // Tamil ↔ English
  'murugan': { tamil: 'முருகன்', english: ['Murugan', 'Murugan'] },
  'rajan': { tamil: 'ராஜன்', english: ['Rajan', 'Rajen'] },
  'devi': { tamil: 'தேவி', english: ['Devi', 'Thevi'] },
  'samy': { tamil: 'சாமி', english: ['Samy', 'Sami'] },
  'kumar': { tamil: 'குமார்', english: ['Kumar', 'Kumaar'] },
};

/**
 * Find cross-language name equivalents for a search query.
 * @param {string} query - Search query (name)
 * @returns {{ original: string, equivalents: string[], languages: string[] }}
 */
export function findNameEquivalents(query) {
  if (!query) return { original: '', equivalents: [], languages: [] };

  const lowerQuery = query.toLowerCase().trim();
  const equivalents = new Set();
  const languages = new Set();

  for (const [key, info] of Object.entries(nameEquivalents)) {
    // Check if query matches the key
    if (lowerQuery.includes(key)) {
      for (const eng of (info.english || [])) {
        equivalents.add(eng);
        languages.add('English');
      }
      if (info.arabic) { equivalents.add(info.arabic); languages.add('Arabic'); }
      if (info.chinese) { equivalents.add(info.chinese); languages.add('Chinese'); }
      if (info.tamil) { equivalents.add(info.tamil); languages.add('Tamil'); }
    }
    // Check if query matches any English variant
    if (info.english) {
      for (const eng of info.english) {
        if (lowerQuery.includes(eng.toLowerCase())) {
          equivalents.add(key);
          languages.add('English');
          if (info.arabic) { equivalents.add(info.arabic); languages.add('Arabic'); }
          if (info.chinese) { equivalents.add(info.chinese); languages.add('Chinese'); }
          if (info.tamil) { equivalents.add(info.tamil); languages.add('Tamil'); }
          break;
        }
      }
    }
  }

  return {
    original: query,
    equivalents: [...equivalents].filter(e => e.toLowerCase() !== lowerQuery),
    languages: [...languages],
  };
}

// ============================================================
// TRANSLATION (Pattern-Based)
// ============================================================

const translationPatterns = {
  // Common Chinese epitaph phrases
  chinese: [
    { pattern: /永遠懷念/g, translation: 'Forever remembered' },
    { pattern: /永遠的懷念/g, translation: 'Forever in our memory' },
    { pattern: /安息/g, translation: 'Rest in peace' },
    { pattern: /先考/g, translation: 'Deceased father' },
    { pattern: /先妣/g, translation: 'Deceased mother' },
    { pattern: /显考/g, translation: 'Honorable deceased father' },
    { pattern: /显妣/g, translation: 'Honorable deceased mother' },
    { pattern: /之墓/g, translation: 'Tomb of' },
    { pattern: /生于/g, translation: 'Born on' },
    { pattern: /卒于/g, translation: 'Died on' },
    { pattern: /享年/g, translation: 'Lived to the age of' },
    { pattern: /立碑/g, translation: 'Erected by' },
    { pattern: /孝男/g, translation: 'Filial son' },
    { pattern: /孝女/g, translation: 'Filial daughter' },
  ],
  // Common Arabic epitaph phrases
  arabic: [
    { pattern: /بسم الله/g, translation: 'In the name of Allah' },
    { pattern: /إنا لله/g, translation: 'Indeed we belong to Allah' },
    { pattern: /رحمه الله/g, translation: 'May Allah have mercy on him' },
    { pattern: /رحمة الله/g, translation: 'May Allah have mercy on them' },
    { pattern: /لا إله إلا الله/g, translation: 'There is no god but Allah' },
    { pattern: /المرحوم/g, translation: 'The late/deceased' },
    { pattern: /المرحومة/g, translation: 'The late/deceased (female)' },
    { pattern: /توفي/g, translation: 'Passed away' },
    { pattern: /ولد/g, translation: 'Born' },
    { pattern: /في ذمة الله/g, translation: "In Allah's keeping" },
  ],
  // Common Japanese epitaph phrases
  japanese: [
    { pattern: /命日/g, translation: 'Anniversary of death' },
    { pattern: /戒名/g, translation: 'Posthumous Buddhist name' },
    { pattern: /俗名/g, translation: 'Secular name' },
    { pattern: /没年月日/g, translation: 'Date of death' },
    { pattern: /行年/g, translation: 'Died at age' },
    { pattern: /享年/g, translation: 'Lived to the age of' },
  ],
  // Tamil
  tamil: [
    { pattern: /நினைவாக/g, translation: 'In memory of' },
    { pattern: /பிறந்த/g, translation: 'Born' },
    { pattern: /இறந்த/g, translation: 'Died' },
  ],
};

/**
 * Translate inscription text using pattern-based translation.
 * This is a fallback when no external translation API is available.
 * @param {string} text - Inscription text
 * @param {string} sourceLanguage - Source language
 * @returns {{ originalText: string, translatedText: string, translatedSegments: Array, untranslated: string }}
 */
export function translateInscription(text, sourceLanguage) {
  if (!text) {
    return { originalText: '', translatedText: '', translatedSegments: [], untranslated: '' };
  }

  const langKey = sourceLanguage.toLowerCase().split(' ')[0]; // Handle "Malay (Jawi)" → "malay"
  const patterns = translationPatterns[langKey] || translationPatterns[sourceLanguage.toLowerCase()] || [];

  let translatedText = text;
  const segments = [];

  for (const { pattern, translation } of patterns) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      segments.push({
        original: match[0],
        translation,
        position: match.index,
      });
      translatedText = translatedText.split(match[0]).join(translation);
    }
  }

  // For Arabic, also handle Jawi
  if (langKey === 'arabic' || sourceLanguage === 'Malay (Jawi)') {
    const jawiPatterns = translationPatterns.arabic || [];
    for (const { pattern, translation } of jawiPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(text)) !== null) {
        if (!segments.find(s => s.original === match[0])) {
          segments.push({
            original: match[0],
            translation,
            position: match.index,
          });
          translatedText = translatedText.split(match[0]).join(translation);
        }
      }
    }
  }

  return {
    originalText: text,
    translatedText: segments.length > 0 ? translatedText : '',
    translatedSegments: segments,
    untranslated: segments.length === 0 ? text : '',
  };
}

// ============================================================
// MAIN TRANSLATION FUNCTION
// ============================================================

/**
 * Full inscription analysis: detect script, translate, transliterate,
 * and identify cultural notations.
 * @param {string} text - Inscription text
 * @param {string} targetLanguage - Target language for translation (default: 'English')
 * @returns {Object} Full translation result
 */
export function analyzeInscription(text, targetLanguage = 'English') {
  if (!text || typeof text !== 'string') {
    return {
      originalText: '',
      script: 'unknown',
      sourceLanguage: 'unknown',
      confidence: 0,
      targetLanguage,
      translatedText: '',
      transliteratedText: '',
      notations: [],
      segments: [],
      note: 'No text provided for analysis.',
    };
  }

  // 1. Detect script
  const scriptInfo = detectScript(text);

  // 2. Translate
  const translation = translateInscription(text, scriptInfo.language);

  // 3. Transliterate if non-Latin
  let transliteratedText = '';
  if (scriptInfo.script === 'arabic' || scriptInfo.language === 'Malay (Jawi)') {
    transliteratedText = transliterate(text, 'arabic');
  } else if (scriptInfo.script === 'hebrew') {
    transliteratedText = transliterate(text, 'hebrew');
  } else if (scriptInfo.script === 'korean') {
    transliteratedText = transliterate(text, 'korean');
  }

  // 4. Identify cultural notations
  const notations = identifyNotations(text);

  return {
    originalText: text,
    script: scriptInfo.script,
    sourceLanguage: scriptInfo.language,
    confidence: scriptInfo.confidence,
    targetLanguage,
    translatedText: translation.translatedText,
    transliteratedText,
    notations,
    segments: translation.translatedSegments,
    note: translation.translatedText
      ? 'Pattern-based translation. For full text translation, AI translation service recommended.'
      : 'Script detected but no pattern matches found. For full translation, AI translation service recommended.',
  };
}

// ============================================================
// CROSS-LANGUAGE SEARCH
// ============================================================

/**
 * Expand a search query with cross-language name equivalents.
 * @param {string} query - Original search query
 * @returns {{ originalQuery: string, expandedQueries: string[], languages: string[], equivalents: Array }}
 */
export function expandCrossLanguageSearch(query) {
  if (!query) {
    return { originalQuery: '', expandedQueries: [], languages: [], equivalents: [] };
  }

  const nameEq = findNameEquivalents(query);

  return {
    originalQuery: query,
    expandedQueries: nameEq.equivalents,
    languages: nameEq.languages,
    equivalents: nameEq.equivalents.map(eq => ({
      text: eq,
      source: nameEq.languages.join(', '),
    })),
  };
}

// ============================================================
// SUPPORTED LANGUAGES
// ============================================================

export const supportedLanguages = [
  { code: 'zh', name: 'Chinese', script: 'CJK', nativeName: '中文', transliteration: true },
  { code: 'ar', name: 'Arabic', script: 'Arabic', nativeName: 'العربية', transliteration: true },
  { code: 'ta', name: 'Tamil', script: 'Tamil', nativeName: 'தமிழ்', transliteration: false },
  { code: 'ms', name: 'Malay', script: 'Latin/Jawi', nativeName: 'Bahasa Melayu', transliteration: true },
  { code: 'he', name: 'Hebrew', script: 'Hebrew', nativeName: 'עברית', transliteration: true },
  { code: 'ja', name: 'Japanese', script: 'CJK/Kana', nativeName: '日本語', transliteration: false },
  { code: 'ko', name: 'Korean', script: 'Hangul', nativeName: '한국어', transliteration: true },
  { code: 'en', name: 'English', script: 'Latin', nativeName: 'English', transliteration: false },
];

/**
 * Get list of supported languages.
 * @returns {Array} Supported languages
 */
export function getSupportedLanguages() {
  return supportedLanguages;
}

/**
 * Get info about the translation system.
 */
export function getTranslationInfo() {
  return {
    system: 'GraveAtlas Inscription Translation System',
    version: '1.0',
    supportedLanguages: supportedLanguages.length,
    languages: supportedLanguages.map(l => l.name),
    features: [
      'Script detection (8 scripts via Unicode block analysis)',
      'Pattern-based translation (Chinese, Arabic, Japanese, Tamil)',
      'Transliteration (Arabic, Hebrew, Korean)',
      'Cultural/religious notation identification (40+ notations)',
      'Cross-language name search (Arabic, Chinese, Tamil, English)',
      'Full inscription analysis pipeline',
    ],
    limitations: [
      'Pattern-based translation covers common epitaph phrases only',
      'Full text translation requires external AI service',
      'Transliteration is simplified (not academic standard)',
      'Name equivalence covers common names, not exhaustive',
    ],
    attribution: 'GraveAtlas — AI Inscription Translation',
  };
}
