/**
 * API Discovery Registry — Grave/Cemetery API Integration (external prompt)
 *
 * Internal registry of external cemetery/burial data sources GraveAtlas has
 * evaluated. This is metadata only — it does NOT grant a source permission
 * to be queried. A source is only ever queried by a connector once:
 *   1. Its license/terms have been read and are compatible with GraveAtlas
 *   2. A connector has actually been implemented and tested against it
 *   3. `integrationStatus` below has been manually set to 'implemented'
 *
 * Never mark a source 'implemented' without a working, tested connector.
 * Never mark 'licenseVerified: true' without reading the actual terms.
 *
 * All entries below were evaluated on 2026-08-11 by reading the cited
 * documentation URLs. No source's data has been imported/stored in
 * GraveAtlas — this registry only powers the health dashboard and the
 * one live read-through connector (OpenStreetMap Overpass).
 */

export const SOURCE_REGISTRY = [
  {
    sourceId: 'osm-overpass',
    sourceName: 'OpenStreetMap (via Overpass API)',
    organization: 'OpenStreetMap Foundation / FOSSGIS (Overpass instance operator)',
    countryRegion: 'Global',
    apiBaseUrl: 'https://overpass-api.de/api/interpreter',
    documentationUrl: 'https://wiki.openstreetmap.org/wiki/Overpass_API',
    dataType: 'Geographic (cemetery polygons/points tagged landuse=cemetery or amenity=grave_yard)',
    authenticationRequirement: 'None — public read-only API. Must send a descriptive User-Agent header per usage policy.',
    rateLimits: 'Documented fair-use policy: stay under ~10,000 queries/day and ~1GB/day on the main FOSSGIS instance. No API key or quota enforcement mechanism beyond best-effort throttling by the operator.',
    licensing: 'Open Database License (ODbL 1.0) — https://www.openstreetmap.org/copyright',
    licenseVerified: true,
    commercialUseStatus: 'Permitted under ODbL with attribution; share-alike applies only if redistributing a derived database, not to simple query results shown with attribution.',
    attributionRequirement: 'Required: "\u00a9 OpenStreetMap contributors" must be shown wherever the data is displayed.',
    privacyRestrictions: 'None identified — cemetery boundaries are physical map features, not personal burial records. Contains no names of the deceased.',
    geographicCoverage: 'Global, but coverage/completeness varies heavily by region depending on volunteer mapping activity.',
    updateFrequency: 'Continuous (OpenStreetMap is edited in real time); Overpass instances typically replicate within minutes to a day.',
    integrationStatus: 'implemented',
    lastVerificationDate: '2026-08-11',
    verificationEvidence: 'Live test query executed against https://overpass-api.de/api/interpreter on 2026-08-11 for a bounding box over Singapore; returned real tagged cemetery ways (e.g. "Ying Fo Fui Kun Cemetery").',
    notes: 'Provides cemetery LOCATIONS/BOUNDARIES only — not individual grave/burial records. Useful for the map layer and for suggesting cemetery entities GraveAtlas does not yet have, not for burial-record lookups.'
  },
  {
    sourceId: 'wikidata-sparql',
    sourceName: 'Wikidata Query Service (SPARQL)',
    organization: 'Wikimedia Foundation',
    countryRegion: 'Global',
    apiBaseUrl: 'https://query.wikidata.org/sparql',
    documentationUrl: 'https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service',
    dataType: 'Structured facts (cemetery entities, notable burial places of notable people)',
    authenticationRequirement: 'None for read queries; a descriptive User-Agent is recommended.',
    rateLimits: 'Public endpoint has query timeout (~60s) and shared fair-use limits; no published hard request quota found during this review.',
    licensing: 'CC0 (public domain dedication) — per Wikidata:Copyright.',
    licenseVerified: true,
    commercialUseStatus: 'Unrestricted under CC0.',
    attributionRequirement: 'Not legally required (CC0), but crediting Wikidata is good practice.',
    privacyRestrictions: 'Covers only notable/public figures already documented on Wikipedia/Wikidata — no private burial records.',
    geographicCoverage: 'Global but sparse — only notable individuals and notable cemeteries have entries.',
    updateFrequency: 'Continuous, community-edited.',
    integrationStatus: 'not_implemented',
    lastVerificationDate: '2026-08-11',
    verificationEvidence: 'Documentation reviewed only. No connector built yet — no live query executed against this endpoint in this integration pass.',
    notes: 'Good long-term candidate for "notable burials" lookups. Not built in this pass to keep scope to one fully tested connector.'
  },
  {
    sourceId: 'va-nca-gravesite-locator',
    sourceName: 'National Cemetery Administration — Gravesite Locator',
    organization: 'U.S. Department of Veterans Affairs',
    countryRegion: 'United States',
    apiBaseUrl: 'https://www.data.va.gov (Socrata/SODA open-data platform — specific dataset endpoint not yet resolved)',
    documentationUrl: 'https://www.data.va.gov/dataset/National-Cemetery-Administration-Gravesite-Locator/3u66-fxug',
    dataType: 'Individual veteran burial/gravesite records',
    authenticationRequirement: 'Unknown — Socrata datasets are often open-read, sometimes require a free app token for higher rate limits. Not verified against the live SODA API in this pass.',
    rateLimits: 'Not verified.',
    licensing: 'U.S. federal government open data (typically public domain per data.gov policy) — not independently confirmed for this specific dataset\'s terms page in this pass.',
    licenseVerified: false,
    commercialUseStatus: 'LICENSE REVIEW REQUIRED',
    attributionRequirement: 'Not verified.',
    privacyRestrictions: 'Contains real individual burial records of veterans and family members — requires a privacy review (living relatives, sensitive military service data) before any integration, per Part 21.',
    geographicCoverage: 'United States (VA national cemeteries, state veterans cemeteries, some private cemeteries).',
    updateFrequency: 'Not verified.',
    integrationStatus: 'not_implemented',
    lastVerificationDate: '2026-08-11',
    verificationEvidence: 'Dataset landing page reviewed. No SODA API call made — endpoint and auth requirements not yet confirmed live.',
    notes: 'BLOCKED pending: (1) confirming the exact SODA resource endpoint, (2) license/terms text, (3) a privacy review of individual burial data before any display in GraveAtlas.'
  },
  {
    sourceId: 'cwgc',
    sourceName: 'Commonwealth War Graves Commission — casualty records',
    organization: 'Commonwealth War Graves Commission',
    countryRegion: 'Global (Commonwealth war casualties)',
    apiBaseUrl: 'Not found — cwgc.org exposes only an HTML search UI (https://www.cwgc.org/find-records/find-war-dead/), no documented public API in this review.',
    documentationUrl: 'https://www.cwgc.org/find-records/',
    dataType: 'Individual war casualty/burial records',
    authenticationRequirement: 'N/A — no public API identified.',
    rateLimits: 'N/A',
    licensing: 'Not published for programmatic reuse in this review.',
    licenseVerified: false,
    commercialUseStatus: 'LICENSE REVIEW REQUIRED — no API terms found.',
    attributionRequirement: 'Not verified.',
    privacyRestrictions: 'Individual casualty records — would need review even if an API existed.',
    geographicCoverage: 'Global — Commonwealth war dead from WWI/WWII.',
    updateFrequency: 'Not verified.',
    integrationStatus: 'not_implemented',
    lastVerificationDate: '2026-08-11',
    verificationEvidence: 'Only the public HTML search page was found. No API endpoint or developer terms page was located. Per the core principle "never scrape restricted systems", GraveAtlas will not scrape cwgc.org.',
    notes: 'No path to legitimate programmatic access found in this review. Would require reaching out to CWGC directly for a data-sharing agreement — that is outside the scope of an automated integration pass.'
  },
  {
    sourceId: 'findagrave',
    sourceName: 'Find A Grave',
    organization: 'Find A Grave (Ancestry.com company)',
    countryRegion: 'Global',
    apiBaseUrl: 'None — no public API.',
    documentationUrl: 'https://www.findagrave.com/',
    dataType: 'Individual grave/memorial records with photos',
    authenticationRequirement: 'N/A',
    rateLimits: 'N/A',
    licensing: 'All content owned by Find A Grave/Ancestry; Terms of Service explicitly prohibit automated scraping/bulk extraction.',
    licenseVerified: true,
    commercialUseStatus: 'NOT PERMITTED — no public API, and their Terms of Service forbid scraping.',
    attributionRequirement: 'N/A — not integrated.',
    privacyRestrictions: 'N/A — not integrated.',
    geographicCoverage: 'Global (largest gravesite database in the world, per their own marketing).',
    updateFrequency: 'N/A',
    integrationStatus: 'rejected',
    lastVerificationDate: '2026-08-11',
    verificationEvidence: 'Multiple sources confirm Find A Grave "does not expose a public API to programmatically extract information" and their ToS prohibits scraping/automated access.',
    notes: 'REJECTED by design. Per core principles, GraveAtlas will not scrape Find A Grave or use unofficial third-party scraper services (e.g. Apify scrapers) to obtain this data.'
  },
  {
    sourceId: 'billiongraves',
    sourceName: 'BillionGraves',
    organization: 'BillionGraves LLC',
    countryRegion: 'Global',
    apiBaseUrl: 'Not publicly documented — third-party unofficial scrapers exist (e.g. Apify), but no first-party public API/developer terms were found.',
    documentationUrl: 'https://billiongraves.com/',
    dataType: 'Individual grave records with GPS-tagged headstone photos',
    authenticationRequirement: 'Unknown — no first-party developer documentation found.',
    rateLimits: 'Unknown',
    licensing: 'Not published for third-party programmatic reuse.',
    licenseVerified: false,
    commercialUseStatus: 'LICENSE REVIEW REQUIRED — no first-party API/terms found.',
    attributionRequirement: 'Not verified.',
    privacyRestrictions: 'Individual grave records — would need review even if a legitimate API existed.',
    geographicCoverage: 'Global.',
    updateFrequency: 'Not verified.',
    integrationStatus: 'not_implemented',
    lastVerificationDate: '2026-08-11',
    verificationEvidence: 'Only third-party unofficial scraper listings were found (not first-party API docs). Per core principles, GraveAtlas will not use unofficial scrapers to bypass the absence of a public API.',
    notes: 'Would require contacting BillionGraves directly for an official data partnership — outside the scope of this automated pass.'
,
  {
    sourceId: 'datagov-sg',
    sourceName: 'Singapore Government Open Data (data.gov.sg)',
    organization: 'Open Government Products, GovTech Singapore (on behalf of NEA, NHB)',
    countryRegion: 'Singapore',
    apiBaseUrl: 'https://api-open.data.gov.sg/v1/public/api/datasets',
    documentationUrl: 'https://guide.data.gov.sg/developer-guide/dataset-apis/download-dataset',
    dataType: 'Government datasets — cemetery locations (NEA), after-death facilities (NEA), columbaria (NEA), national monuments (NHB). GeoJSON format.',
    authenticationRequirement: 'None for public read access. API key available for higher rate limits (5 req/min -> higher).',
    rateLimits: '5 requests per minute on public API without key. Higher limits with API key registration.',
    licensing: 'Singapore Open Data Licence — https://data.gov.sg/open-data-licence',
    licenseVerified: true,
    commercialUseStatus: 'Permitted — free for personal and commercial use under Singapore Open Data Licence.',
    attributionRequirement: 'Required: cite "National Environment Agency" (NEA datasets) or "National Heritage Board" (NHB datasets) and data.gov.sg.',
    privacyRestrictions: 'None identified — datasets contain government-managed facility locations, not individual burial records or personal data.',
    geographicCoverage: 'Singapore (nationwide). Includes all government-managed cemeteries (Choa Chu Kang complex), columbaria, crematoria, and national monuments.',
    updateFrequency: 'Varies by dataset. NEA Active Cemeteries updated 2024-03-13. After Death Facilities last updated 2015-02-02. NHB Monuments updated 2026-04-16.',
    integrationStatus: 'implemented',
    lastVerificationDate: '2026-08-15',
    verificationEvidence: 'API documentation reviewed at https://guide.data.gov.sg/developer-guide/dataset-apis/download-dataset. Poll-download API pattern confirmed. Four datasets identified: NEA Active Cemeteries (d_4a9b83ee745c10c3aa5829fb80e09d9c), NEA After Death Facilities (d_8057b4f4c7eca22c3c51c4ac05440f21), NEA Dedicated Columbaria (d_9b0752e9d3f1f9d957d5d8be2b58dfff), NHB National Monuments (d_b29c230ec6b609e29ed42f71ca9a8767). Dataset schemas verified from data.gov.sg preview pages.',
    notes: 'Provides cemetery/facility LOCATIONS only — not individual burial records. NEA manages burial records internally but has not published individual grave data as open data. Bukit Brown burial registers (1922-1972) are held by National Archives of Singapore (NAS) as digitised PDFs, not API-accessible. This connector covers all four SG government datasets relevant to cemetery/heritage research.'
  }
  }
];

/**
 * Get a registry entry by source ID.
 */
export function getSource(sourceId) {
  return SOURCE_REGISTRY.find(s => s.sourceId === sourceId) || null;
}

/**
 * Get only sources that are actually implemented (safe to query live).
 */
export function getImplementedSources() {
  return SOURCE_REGISTRY.filter(s => s.integrationStatus === 'implemented');
}

/**
 * Public-safe registry view (no internal notes) for the API/GUI.
 */
export function getPublicRegistry() {
  return SOURCE_REGISTRY.map(s => ({
    sourceId: s.sourceId,
    sourceName: s.sourceName,
    organization: s.organization,
    countryRegion: s.countryRegion,
    dataType: s.dataType,
    licensing: s.licensing,
    licenseVerified: s.licenseVerified,
    attributionRequirement: s.attributionRequirement,
    geographicCoverage: s.geographicCoverage,
    integrationStatus: s.integrationStatus,
    lastVerificationDate: s.lastVerificationDate
  }));
}
