/**
 * Country Directory — worldwide country data with ISO codes, local names, and alternative names.
 *
 * This is a static dataset of countries with their ISO 3166-1 alpha-2 codes.
 * It is used by the country discovery API and the import normalization process.
 *
 * Data sources:
 * - ISO 3166-1 standard country codes
 * - Common English names
 * - Local endonyms where well-known
 *
 * This file does NOT contain cemetery or grave records — only country metadata.
 * Cemetery counts come from actual GraveAtlas data, not from this file.
 */

// Each entry: { code, name, localName, altNames }
const COUNTRIES = [
  { code: "AF", name: "Afghanistan", localName: "افغانستان", altNames: [] },
  { code: "AL", name: "Albania", localName: "Shqipëria", altNames: [] },
  { code: "DZ", name: "Algeria", localName: "الجزائر", altNames: [] },
  { code: "AD", name: "Andorra", localName: "Andorra", altNames: [] },
  { code: "AO", name: "Angola", localName: "Angola", altNames: [] },
  { code: "AR", name: "Argentina", localName: "Argentina", altNames: [] },
  { code: "AM", name: "Armenia", localName: "Հայաստան", altNames: [] },
  { code: "AU", name: "Australia", localName: "Australia", altNames: [] },
  { code: "AT", name: "Austria", localName: "Österreich", altNames: [] },
  { code: "AZ", name: "Azerbaijan", localName: "Azərbaycan", altNames: [] },
  { code: "BH", name: "Bahrain", localName: "البحرين", altNames: [] },
  { code: "BD", name: "Bangladesh", localName: "বাংলাদেশ", altNames: [] },
  { code: "BY", name: "Belarus", localName: "Беларусь", altNames: [] },
  { code: "BE", name: "Belgium", localName: "België", altNames: ["Belgique"] },
  { code: "BZ", name: "Belize", localName: "Belize", altNames: [] },
  { code: "BJ", name: "Benin", localName: "Bénin", altNames: [] },
  { code: "BT", name: "Bhutan", localName: "འབྲུག་ཡུལ", altNames: [] },
  { code: "BO", name: "Bolivia", localName: "Bolivia", altNames: ["Plurinational State of Bolivia"] },
  { code: "BA", name: "Bosnia and Herzegovina", localName: "Bosna i Hercegovina", altNames: ["Bosnia"] },
  { code: "BW", name: "Botswana", localName: "Botswana", altNames: [] },
  { code: "BR", name: "Brazil", localName: "Brasil", altNames: [] },
  { code: "BN", name: "Brunei", localName: "Brunei Darussalam", altNames: ["Brunei Darussalam"] },
  { code: "BG", name: "Bulgaria", localName: "България", altNames: [] },
  { code: "BF", name: "Burkina Faso", localName: "Burkina Faso", altNames: [] },
  { code: "BI", name: "Burundi", localName: "Burundi", altNames: [] },
  { code: "KH", name: "Cambodia", localName: "កម្ពុជា", altNames: ["Kampuchea"] },
  { code: "CM", name: "Cameroon", localName: "Cameroun", altNames: [] },
  { code: "CA", name: "Canada", localName: "Canada", altNames: [] },
  { code: "CV", name: "Cape Verde", localName: "Cabo Verde", altNames: ["Cabo Verde"] },
  { code: "CF", name: "Central African Republic", localName: "République Centrafricaine", altNames: [] },
  { code: "TD", name: "Chad", localName: "Tchad", altNames: [] },
  { code: "CL", name: "Chile", localName: "Chile", altNames: [] },
  { code: "CN", name: "China", localName: "中国", altNames: ["People's Republic of China"] },
  { code: "CO", name: "Colombia", localName: "Colombia", altNames: [] },
  { code: "KM", name: "Comoros", localName: "Komori", altNames: [] },
  { code: "CG", name: "Congo", localName: "Congo", altNames: ["Republic of the Congo"] },
  { code: "CD", name: "Democratic Republic of the Congo", localName: "République Démocratique du Congo", altNames: ["DR Congo", "DRC", "Congo-Kinshasa", "Zaire"] },
  { code: "CR", name: "Costa Rica", localName: "Costa Rica", altNames: [] },
  { code: "CI", name: "Côte d'Ivoire", localName: "Côte d'Ivoire", altNames: ["Ivory Coast"] },
  { code: "HR", name: "Croatia", localName: "Hrvatska", altNames: [] },
  { code: "CU", name: "Cuba", localName: "Cuba", altNames: [] },
  { code: "CY", name: "Cyprus", localName: "Κύπρος", altNames: ["Kıbrıs"] },
  { code: "CZ", name: "Czech Republic", localName: "Česko", altNames: ["Czechia"] },
  { code: "DK", name: "Denmark", localName: "Danmark", altNames: [] },
  { code: "DJ", name: "Djibouti", localName: "جيبوتي", altNames: [] },
  { code: "DO", name: "Dominican Republic", localName: "República Dominicana", altNames: [] },
  { code: "EC", name: "Ecuador", localName: "Ecuador", altNames: [] },
  { code: "EG", name: "Egypt", localName: "مصر", altNames: [] },
  { code: "SV", name: "El Salvador", localName: "El Salvador", altNames: [] },
  { code: "GQ", name: "Equatorial Guinea", localName: "Guinea Ecuatorial", altNames: [] },
  { code: "ER", name: "Eritrea", localName: "ኤርትራ", altNames: [] },
  { code: "EE", name: "Estonia", localName: "Eesti", altNames: [] },
  { code: "SZ", name: "Eswatini", localName: "eSwatini", altNames: ["Swaziland"] },
  { code: "ET", name: "Ethiopia", localName: "ኢትዮጵያ", altNames: [] },
  { code: "FJ", name: "Fiji", localName: "Fiji", altNames: [] },
  { code: "FI", name: "Finland", localName: "Suomi", altNames: [] },
  { code: "FR", name: "France", localName: "France", altNames: [] },
  { code: "GA", name: "Gabon", localName: "Gabon", altNames: [] },
  { code: "GM", name: "Gambia", localName: "Gambia", altNames: ["The Gambia"] },
  { code: "GE", name: "Georgia", localName: "საქართველო", altNames: [] },
  { code: "DE", name: "Germany", localName: "Deutschland", altNames: [] },
  { code: "GH", name: "Ghana", localName: "Ghana", altNames: [] },
  { code: "GR", name: "Greece", localName: "Ελλάδα", altNames: ["Hellas"] },
  { code: "GL", name: "Greenland", localName: "Kalaallit Nunaat", altNames: [] },
  { code: "GT", name: "Guatemala", localName: "Guatemala", altNames: [] },
  { code: "GN", name: "Guinea", localName: "Guinée", altNames: [] },
  { code: "GW", name: "Guinea-Bissau", localName: "Guiné-Bissau", altNames: [] },
  { code: "GY", name: "Guyana", localName: "Guyana", altNames: [] },
  { code: "HT", name: "Haiti", localName: "Haïti", altNames: [] },
  { code: "HN", name: "Honduras", localName: "Honduras", altNames: [] },
  { code: "HU", name: "Hungary", localName: "Magyarország", altNames: [] },
  { code: "IS", name: "Iceland", localName: "Ísland", altNames: [] },
  { code: "IN", name: "India", localName: "भारत", altNames: ["Bharat"] },
  { code: "ID", name: "Indonesia", localName: "Indonesia", altNames: [] },
  { code: "IR", name: "Iran", localName: "ایران", altNames: ["Persia"] },
  { code: "IQ", name: "Iraq", localName: "العراق", altNames: [] },
  { code: "IE", name: "Ireland", localName: "Éire", altNames: [] },
  { code: "IL", name: "Israel", localName: "ישראל", altNames: [] },
  { code: "IT", name: "Italy", localName: "Italia", altNames: [] },
  { code: "JM", name: "Jamaica", localName: "Jamaica", altNames: [] },
  { code: "JP", name: "Japan", localName: "日本", altNames: ["Nihon", "Nippon"] },
  { code: "JO", name: "Jordan", localName: "الأردن", altNames: [] },
  { code: "KZ", name: "Kazakhstan", localName: "Қазақстан", altNames: [] },
  { code: "KE", name: "Kenya", localName: "Kenya", altNames: [] },
  { code: "KI", name: "Kiribati", localName: "Kiribati", altNames: [] },
  { code: "KP", name: "North Korea", localName: "조선", altNames: ["Democratic People's Republic of Korea"] },
  { code: "KR", name: "South Korea", localName: "한국", altNames: ["Republic of Korea", "Korea, Republic of"] },
  { code: "KW", name: "Kuwait", localName: "الكويت", altNames: [] },
  { code: "KG", name: "Kyrgyzstan", localName: "Кыргызстан", altNames: [] },
  { code: "LA", name: "Laos", localName: "ສປປລາວ", altNames: ["Lao People's Democratic Republic"] },
  { code: "LV", name: "Latvia", localName: "Latvija", altNames: [] },
  { code: "LB", name: "Lebanon", localName: "لبنان", altNames: [] },
  { code: "LS", name: "Lesotho", localName: "Lesotho", altNames: [] },
  { code: "LR", name: "Liberia", localName: "Liberia", altNames: [] },
  { code: "LY", name: "Libya", localName: "ليبيا", altNames: [] },
  { code: "LI", name: "Liechtenstein", localName: "Liechtenstein", altNames: [] },
  { code: "LT", name: "Lithuania", localName: "Lietuva", altNames: [] },
  { code: "LU", name: "Luxembourg", localName: "Luxembourg", altNames: ["Lëtzebuerg"] },
  { code: "MG", name: "Madagascar", localName: "Madagasikara", altNames: [] },
  { code: "MW", name: "Malawi", localName: "Malawi", altNames: [] },
  { code: "MY", name: "Malaysia", localName: "Malaysia", altNames: [] },
  { code: "MV", name: "Maldives", localName: "ދިވެހިރާއްޖެ", altNames: [] },
  { code: "ML", name: "Mali", localName: "Mali", altNames: [] },
  { code: "MT", name: "Malta", localName: "Malta", altNames: [] },
  { code: "MR", name: "Mauritania", localName: "موريتانيا", altNames: [] },
  { code: "MU", name: "Mauritius", localName: "Maurice", altNames: ["Maurice"] },
  { code: "MX", name: "Mexico", localName: "México", altNames: [] },
  { code: "MD", name: "Moldova", localName: "Moldova", altNames: ["Republic of Moldova"] },
  { code: "MC", name: "Monaco", localName: "Monaco", altNames: [] },
  { code: "MN", name: "Mongolia", localName: "Монгол Улс", altNames: [] },
  { code: "ME", name: "Montenegro", localName: "Crna Gora", altNames: [] },
  { code: "MA", name: "Morocco", localName: "المغرب", altNames: [] },
  { code: "MZ", name: "Mozambique", localName: "Moçambique", altNames: [] },
  { code: "MM", name: "Myanmar", localName: "မြန်မာ", altNames: ["Burma"] },
  { code: "NA", name: "Namibia", localName: "Namibië", altNames: [] },
  { code: "NP", name: "Nepal", localName: "नेपाल", altNames: [] },
  { code: "NL", name: "Netherlands", localName: "Nederland", altNames: ["Holland"] },
  { code: "NZ", name: "New Zealand", localName: "New Zealand", altNames: ["Aotearoa"] },
  { code: "NI", name: "Nicaragua", localName: "Nicaragua", altNames: [] },
  { code: "NE", name: "Niger", localName: "Niger", altNames: [] },
  { code: "NG", name: "Nigeria", localName: "Nigeria", altNames: [] },
  { code: "MK", name: "North Macedonia", localName: "Северна Македонија", altNames: ["Macedonia"] },
  { code: "NO", name: "Norway", localName: "Norge", altNames: ["Noreg"] },
  { code: "OM", name: "Oman", localName: "عمان", altNames: [] },
  { code: "PK", name: "Pakistan", localName: "پاکستان", altNames: [] },
  { code: "PS", name: "Palestine", localName: "فلسطين", altNames: ["State of Palestine"] },
  { code: "PA", name: "Panama", localName: "Panamá", altNames: [] },
  { code: "PG", name: "Papua New Guinea", localName: "Papua Niugini", altNames: [] },
  { code: "PY", name: "Paraguay", localName: "Paraguay", altNames: [] },
  { code: "PE", name: "Peru", localName: "Perú", altNames: [] },
  { code: "PH", name: "Philippines", localName: "Pilipinas", altNames: [] },
  { code: "PL", name: "Poland", localName: "Polska", altNames: [] },
  { code: "PT", name: "Portugal", localName: "Portugal", altNames: [] },
  { code: "QA", name: "Qatar", localName: "قطر", altNames: [] },
  { code: "RO", name: "Romania", localName: "România", altNames: [] },
  { code: "RU", name: "Russia", localName: "Россия", altNames: ["Russian Federation"] },
  { code: "RW", name: "Rwanda", localName: "Rwanda", altNames: [] },
  { code: "SA", name: "Saudi Arabia", localName: "المملكة العربية السعودية", altNames: ["KSA"] },
  { code: "SN", name: "Senegal", localName: "Sénégal", altNames: [] },
  { code: "RS", name: "Serbia", localName: "Србија", altNames: [] },
  { code: "SC", name: "Seychelles", localName: "Seychelles", altNames: [] },
  { code: "SL", name: "Sierra Leone", localName: "Sierra Leone", altNames: [] },
  { code: "SG", name: "Singapore", localName: "新加坡", altNames: ["Singapura"] },
  { code: "SK", name: "Slovakia", localName: "Slovensko", altNames: [] },
  { code: "SI", name: "Slovenia", localName: "Slovenija", altNames: [] },
  { code: "SO", name: "Somalia", localName: "Soomaaliya", altNames: [] },
  { code: "ZA", name: "South Africa", localName: "South Africa", altNames: ["Suid-Afrika"] },
  { code: "SS", name: "South Sudan", localName: "South Sudan", altNames: [] },
  { code: "ES", name: "Spain", localName: "España", altNames: [] },
  { code: "LK", name: "Sri Lanka", localName: "ශ්‍රී ලංකාව", altNames: ["Ceylon"] },
  { code: "SD", name: "Sudan", localName: "السودان", altNames: [] },
  { code: "SR", name: "Suriname", localName: "Suriname", altNames: [] },
  { code: "SE", name: "Sweden", localName: "Sverige", altNames: [] },
  { code: "CH", name: "Switzerland", localName: "Schweiz", altNames: ["Suisse", "Svizzera"] },
  { code: "SY", name: "Syria", localName: "سوريا", altNames: ["Syrian Arab Republic"] },
  { code: "TW", name: "Taiwan", localName: "臺灣", altNames: ["Chinese Taipei"] },
  { code: "TJ", name: "Tajikistan", localName: "Тоҷикистон", altNames: [] },
  { code: "TZ", name: "Tanzania", localName: "Tanzania", altNames: [] },
  { code: "TH", name: "Thailand", localName: "ประเทศไทย", altNames: [] },
  { code: "TL", name: "Timor-Leste", localName: "Timór-Leste", altNames: ["East Timor"] },
  { code: "TG", name: "Togo", localName: "Togo", altNames: [] },
  { code: "TT", name: "Trinidad and Tobago", localName: "Trinidad and Tobago", altNames: [] },
  { code: "TN", name: "Tunisia", localName: "تونس", altNames: [] },
  { code: "TR", name: "Turkey", localName: "Türkiye", altNames: ["Türkiye Cumhuriyeti"] },
  { code: "TM", name: "Turkmenistan", localName: "Türkmenistan", altNames: [] },
  { code: "UG", name: "Uganda", localName: "Uganda", altNames: [] },
  { code: "UA", name: "Ukraine", localName: "Україна", altNames: [] },
  { code: "AE", name: "United Arab Emirates", localName: "الإمارات العربية المتحدة", altNames: ["UAE"] },
  { code: "GB", name: "United Kingdom", localName: "United Kingdom", altNames: ["UK", "Britain", "Great Britain"] },
  { code: "US", name: "United States", localName: "United States", altNames: ["USA", "United States of America"] },
  { code: "UY", name: "Uruguay", localName: "Uruguay", altNames: [] },
  { code: "UZ", name: "Uzbekistan", localName: "Oʻzbekiston", altNames: [] },
  { code: "VE", name: "Venezuela", localName: "Venezuela", altNames: [] },
  { code: "VN", name: "Vietnam", localName: "Việt Nam", altNames: [] },
  { code: "YE", name: "Yemen", localName: "اليمن", altNames: [] },
  { code: "ZM", name: "Zambia", localName: "Zambia", altNames: [] },
  { code: "ZW", name: "Zimbabwe", localName: "Zimbabwe", altNames: [] },
];

/**
 * Get all countries from the directory.
 * @returns {Array} Array of country objects with code, name, localName, altNames
 */
export function getAllCountries() {
  return COUNTRIES;
}

/**
 * Find a country by ISO code.
 * @param {string} code - ISO 3166-1 alpha-2 code (case-insensitive)
 * @returns {Object|null} Country object or null
 */
export function getCountryByCode(code) {
  if (!code || typeof code !== 'string') return null;
  return COUNTRIES.find(c => c.code === code.toUpperCase()) || null;
}

/**
 * Search countries by name (English, local, or alternative names).
 * Supports Unicode and case-insensitive matching.
 * @param {string} query - Search query
 * @returns {Array} Matching countries
 */
export function searchCountries(query) {
  if (!query || typeof query !== 'string' || query.length < 1) return COUNTRIES;
  const normalized = query.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return COUNTRIES.filter(c => {
    if (normalize(c.name).includes(normalized)) return true;
    if (normalize(c.localName).includes(normalized)) return true;
    if (c.altNames.some(a => normalize(a).includes(normalized))) return true;
    if (c.code.toLowerCase() === normalized) return true;
    return false;
  });
}

function normalize(text) {
  if (!text) return '';
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/**
 * Total number of countries in the directory.
 */
export const COUNTRY_COUNT = COUNTRIES.length;
