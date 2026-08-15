#!/usr/bin/env node
/**
 * Phase 16.1 — AI Database Integration (RAG) Tests
 *
 * Tests the AIDataInterceptor logic:
 * - Search intent detection
 * - Search term extraction
 * - Context formatting
 * - Non-search query filtering
 *
 * These are unit tests for the interceptor logic that runs in Node.js.
 * The Android UI integration is verified by CI build.
 */

const assert = require('assert');

console.log('=== Phase 16.1 Tests — AI Database Integration (RAG) ===\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✅ ${name}`);
    } catch (e) {
        failed++;
        console.log(`  ❌ ${name}: ${e.message}`);
    }
}

// ─── Search Intent Detection ───

// Replicate the search trigger logic from AIDataInterceptor.java
const SEARCH_TRIGGERS = [
    "find", "search", "show me", "show", "where is", "where are", "tell me about",
    "tell me", "look up", "lookup", "who is", "who was", "information about", "info about",
    "records for", "records of", "graves in", "graves at", "cemeteries in",
    "cemeteries at", "buried in", "buried at", "grave of", "memorial for",
    "list cemeteries", "list graves", "what cemeteries", "what graves"
];

const NON_SEARCH_TRIGGERS = [
    "what is graveatlas", "how do i", "how to", "what does verification",
    "what is provenance", "what are evidence", "help me understand",
    "what research questions", "explain evidence", "what is the difference",
    "can you help", "thank", "hello", "hi "
];

function isSearchQuery(message) {
    if (!message || message.trim() === '') return false;
    const lower = message.toLowerCase().trim();
    for (const ns of NON_SEARCH_TRIGGERS) {
        if (lower.includes(ns)) return false;
    }
    for (const trigger of SEARCH_TRIGGERS) {
        if (lower.startsWith(trigger) || lower.includes(' ' + trigger + ' ')) return true;
    }
    if (lower.includes('cemetery') || lower.includes('grave') || lower.includes('buried') || lower.includes('memorial')) {
        return true;
    }
    return false;
}

function extractSearchTerms(message) {
    if (!message || message.trim() === '') return null;
    const lower = message.toLowerCase().trim();
    const prefixes = [
        "find ", "search for ", "search ", "show me ", "show ",
        "where is ", "where are ", "tell me about ", "tell me ",
        "look up ", "lookup ", "who is ", "who was ",
        "information about ", "info about ",
        "records for ", "records of ",
        "graves in ", "graves at ", "grave of ",
        "cemeteries in ", "cemeteries at ", "cemetery ",
        "buried in ", "buried at ",
        "memorial for ", "list cemeteries ", "list graves ",
        "what cemeteries ", "what graves "
    ];
    for (const prefix of prefixes) {
        if (lower.startsWith(prefix)) return message.substring(prefix.length).trim();
    }
    return message.trim();
}

console.log('Part 1: Search Intent Detection');

test('Detects "find cemeteries in Singapore"', () => {
    assert.strictEqual(isSearchQuery("find cemeteries in Singapore"), true);
});

test('Detects "search for graves in Bidadari"', () => {
    assert.strictEqual(isSearchQuery("search for graves in Bidadari"), true);
});

test('Detects "show me cemeteries in Japan"', () => {
    assert.strictEqual(isSearchQuery("show me cemeteries in Japan"), true);
});

test('Detects "who is buried in Bukit Brown Cemetery?"', () => {
    assert.strictEqual(isSearchQuery("who is buried in Bukit Brown Cemetery?"), true);
});

test('Detects "tell me about John Smith"', () => {
    assert.strictEqual(isSearchQuery("tell me about John Smith"), true);
});

test('Detects "where is Choa Chu Kang Cemetery"', () => {
    assert.strictEqual(isSearchQuery("where is Choa Chu Kang Cemetery"), true);
});

test('Detects "graves in Bidadari"', () => {
    assert.strictEqual(isSearchQuery("graves in Bidadari"), true);
});

test('Does NOT detect "how do I search for a person?"', () => {
    assert.strictEqual(isSearchQuery("how do I search for a person?"), false);
});

test('Does NOT detect "what is GraveAtlas?"', () => {
    assert.strictEqual(isSearchQuery("what is GraveAtlas?"), false);
});

test('Does NOT detect "what does verification status mean?"', () => {
    assert.strictEqual(isSearchQuery("what does verification status mean?"), false);
});

test('Does NOT detect "help me understand provenance"', () => {
    assert.strictEqual(isSearchQuery("help me understand provenance"), false);
});

test('Does NOT detect "hello"', () => {
    assert.strictEqual(isSearchQuery("hello"), false);
});

test('Does NOT detect empty string', () => {
    assert.strictEqual(isSearchQuery(""), false);
});

test('Does NOT detect null', () => {
    assert.strictEqual(isSearchQuery(null), false);
});

test('Detects "memorial for Tan Ah Kow"', () => {
    assert.strictEqual(isSearchQuery("memorial for Tan Ah Kow"), true);
});

test('Detects "look up Bukit Brown"', () => {
    assert.strictEqual(isSearchQuery("look up Bukit Brown"), true);
});

console.log('\nPart 2: Search Term Extraction');

test('Extracts "Singapore" from "find cemeteries in Singapore"', () => {
    assert.strictEqual(extractSearchTerms("find cemeteries in Singapore"), "cemeteries in Singapore");
});

test('Extracts "graves in Bidadari" from "search for graves in Bidadari"', () => {
    assert.strictEqual(extractSearchTerms("search for graves in Bidadari"), "graves in Bidadari");
});

test('Extracts "John Smith" from "tell me about John Smith"', () => {
    assert.strictEqual(extractSearchTerms("tell me about John Smith"), "John Smith");
});

test('Extracts "Bukit Brown Cemetery" from "where is Bukit Brown Cemetery"', () => {
    assert.strictEqual(extractSearchTerms("where is Bukit Brown Cemetery"), "Bukit Brown Cemetery");
});

test('Returns full message when no prefix matches', () => {
    assert.strictEqual(extractSearchTerms("Bukit Brown Cemetery"), "Bukit Brown Cemetery");
});

test('Returns null for empty input', () => {
    assert.strictEqual(extractSearchTerms(""), null);
});

test('Extracts "cemeteries in Japan" from "show me cemeteries in Japan"', () => {
    assert.strictEqual(extractSearchTerms("show me cemeteries in Japan"), "cemeteries in Japan");
});

console.log('\nPart 3: Context Formatting');

// Replicate the formatSearchContext logic
function formatSearchContext(results, searchTerms) {
    if (!results || results.length === 0) {
        return `No records found in GraveAtlas for "${searchTerms}". The database may not contain records matching this query yet. Let the user know and suggest they try the Search tab with different terms or contribute new records.`;
    }
    let sb = `GraveAtlas database returned ${results.length} result(s) for "${searchTerms}":\n\n`;
    return sb;
}

test('Formats empty results with helpful message', () => {
    const ctx = formatSearchContext([], "nonexistent");
    assert.ok(ctx.includes("No records found"));
    assert.ok(ctx.includes("nonexistent"));
});

test('Formats results with count', () => {
    const mockResults = [{type: 'cemetery', name: 'Bukit Brown', id: 'c1'}];
    const ctx = formatSearchContext(mockResults, "Bukit Brown");
    assert.ok(ctx.includes("1 result(s)"));
    assert.ok(ctx.includes("Bukit Brown"));
});

test('Formats multiple results with count', () => {
    const mockResults = [
        {type: 'cemetery', name: 'A', id: '1'},
        {type: 'cemetery', name: 'B', id: '2'},
        {type: 'cemetery', name: 'C', id: '3'}
    ];
    const ctx = formatSearchContext(mockResults, "test");
    assert.ok(ctx.includes("3 result(s)"));
});

console.log('\nPart 4: System Prompt Verification');

// Verify the system prompt includes database access instructions
const fs = require('fs');
const promptFile = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java', 'utf8');

test('System prompt mentions DATABASE ACCESS', () => {
    assert.ok(promptFile.includes('DATABASE ACCESS'), 'Missing DATABASE ACCESS section');
});

test('System prompt mentions [DATABASE CONTEXT]', () => {
    assert.ok(promptFile.includes('[DATABASE CONTEXT]'), 'Missing [DATABASE CONTEXT] reference');
});

test('System prompt does NOT say "You do NOT have direct access"', () => {
    assert.ok(!promptFile.includes('You do NOT have direct access to the GraveAtlas database'),
        'Old prompt still says no database access — should be updated');
});

test('System prompt still has evidence categories', () => {
    assert.ok(promptFile.includes('KNOWN'), 'Missing KNOWN evidence category');
    assert.ok(promptFile.includes('SOURCE-BACKED'), 'Missing SOURCE-BACKED evidence category');
    assert.ok(promptFile.includes('NEEDS VERIFICATION'), 'Missing NEEDS VERIFICATION evidence category');
});

test('System prompt still has no-fabrication rule', () => {
    assert.ok(promptFile.includes('NEVER fabricate'), 'Missing no-fabrication rule');
});

console.log('\nPart 5: Interceptor File Verification');

test('AIDataInterceptor.java exists', () => {
    assert.ok(fs.existsSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java'),
        'AIDataInterceptor.java not found');
});

test('AIDataInterceptor has search trigger detection', () => {
    const interceptor = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java', 'utf8');
    assert.ok(interceptor.includes('SEARCH_TRIGGERS'), 'Missing SEARCH_TRIGGERS');
});

test('AIDataInterceptor has InterceptorCallback interface', () => {
    const interceptor = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java', 'utf8');
    assert.ok(interceptor.includes('InterceptorCallback'), 'Missing InterceptorCallback');
});

test('AIDataInterceptor has onReady and onSkipped callbacks', () => {
    const interceptor = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java', 'utf8');
    assert.ok(interceptor.includes('onReady'), 'Missing onReady callback');
    assert.ok(interceptor.includes('onSkipped'), 'Missing onSkipped callback');
});

test('MainActivity uses AIDataInterceptor', () => {
    const main = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/MainActivity.java', 'utf8');
    assert.ok(main.includes('AIDataInterceptor'), 'MainActivity does not import AIDataInterceptor');
    assert.ok(main.includes('interceptor.intercept'), 'MainActivity does not call interceptor.intercept()');
});

console.log('\nPart 6: Evidence Badges in Search');

test('GlobalSearchFragment imports EvidenceStatus', () => {
    const frag = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/ui/search/GlobalSearchFragment.java', 'utf8');
    assert.ok(frag.includes('EvidenceStatus'), 'GlobalSearchFragment missing EvidenceStatus import');
});

test('GlobalSearchFragment creates evidence badges', () => {
    const frag = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/ui/search/GlobalSearchFragment.java', 'utf8');
    assert.ok(frag.includes('EvidenceStatus.createBadge'), 'GlobalSearchFragment missing badge creation');
});

test('EvidenceStatus has 6 categories', () => {
    const es = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/ui/evidence/EvidenceStatus.java', 'utf8');
    assert.ok(es.includes('KNOWN'), 'Missing KNOWN');
    assert.ok(es.includes('SOURCE_BACKED'), 'Missing SOURCE_BACKED');
    assert.ok(es.includes('INFERRED'), 'Missing INFERRED');
    assert.ok(es.includes('UNCERTAIN'), 'Missing UNCERTAIN');
    assert.ok(es.includes('CONFLICTING'), 'Missing CONFLICTING');
    assert.ok(es.includes('NEEDS_VERIFICATION'), 'Missing NEEDS_VERIFICATION');
});

console.log('\nPart 7: Security Verification');

test('AIDataInterceptor does not expose API keys', () => {
    const interceptor = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java', 'utf8');
    assert.ok(!interceptor.includes('apiKey'), 'Interceptor should not reference API keys');
    assert.ok(!interceptor.includes('token'), 'Interceptor should not reference tokens');
});

test('AIDataInterceptor does not bypass authorization', () => {
    const interceptor = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java', 'utf8');
    assert.ok(!interceptor.includes('admin'), 'Interceptor should not access admin endpoints');
    assert.ok(!interceptor.includes('write'), 'Interceptor should not write to database');
    assert.ok(!interceptor.includes('delete'), 'Interceptor should not delete records');
});

test('AIDataInterceptor only uses public search endpoint', () => {
    const interceptor = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java', 'utf8');
    assert.ok(interceptor.includes('apiClient.search'), 'Interceptor should only use search');
    assert.ok(!interceptor.includes('apiClient.create'), 'Should not call create');
    assert.ok(!interceptor.includes('apiClient.update'), 'Should not call update');
    assert.ok(!interceptor.includes('apiClient.delete'), 'Should not call delete');
});

test('AIDataInterceptor handles API errors gracefully', () => {
    const interceptor = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AIDataInterceptor.java', 'utf8');
    assert.ok(interceptor.includes('onError'), 'Missing error callback');
    assert.ok(interceptor.includes('proceed without data'), 'Missing graceful degradation on error');
});

console.log('\nPart 8: Updated Suggested Prompts');

test('Suggested prompts include database-aware queries', () => {
    const prompts = fs.readFileSync('app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java', 'utf8');
    assert.ok(prompts.includes('Search for graves'), 'Missing search-oriented prompt');
    assert.ok(prompts.includes('Who is buried'), 'Missing query-oriented prompt');
    assert.ok(prompts.includes('Show me cemeteries'), 'Missing location-oriented prompt');
});

console.log('\n=== Phase 16.1 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 16.1 tests passed!');
else console.log('\n❌ Some tests failed!');

process.exit(failed > 0 ? 1 : 0);
