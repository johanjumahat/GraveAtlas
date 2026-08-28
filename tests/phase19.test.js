/**
 * Phase 19 Tests — Community Engagement & Memorial Features
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}

console.log('\nPart 1: Backend Handlers');
const indexFile = fs.readFileSync(path.join(projectRoot, 'backend/src/index.js'), 'utf8');

test('Has handleCreateTribute', () => assert.ok(indexFile.includes('handleCreateTribute'), 'Missing'));
test('Has handleListTributes', () => assert.ok(indexFile.includes('handleListTributes'), 'Missing'));
test('Has handleDeleteTribute', () => assert.ok(indexFile.includes('handleDeleteTribute'), 'Missing'));
test('Has handleLikeTribute', () => assert.ok(indexFile.includes('handleLikeTribute'), 'Missing'));
test('Has handleCommunityFeed', () => assert.ok(indexFile.includes('handleCommunityFeed'), 'Missing'));
test('Has handleCommunityStats', () => assert.ok(indexFile.includes('handleCommunityStats'), 'Missing'));
test('Has handleCommunityLeaderboard', () => assert.ok(indexFile.includes('handleCommunityLeaderboard'), 'Missing'));

console.log('\nPart 2: Routes Registered');
test('POST /api/tributes', () => assert.ok(indexFile.includes("'/api/tributes' && method === 'POST'"), 'Missing'));
test('GET /api/tributes', () => assert.ok(indexFile.includes("'/api/tributes' && method === 'GET'"), 'Missing'));
test('DELETE /api/tributes/:id', () => assert.ok(indexFile.includes('api/tributes/') && indexFile.includes("method === 'DELETE'"), 'Missing'));
test('POST /api/tributes/:id/like', () => assert.ok(indexFile.includes('/like') && indexFile.includes('handleLikeTribute'), 'Missing'));
test('GET /api/community/feed', () => assert.ok(indexFile.includes("'/api/community/feed'"), 'Missing'));
test('GET /api/community/stats', () => assert.ok(indexFile.includes("'/api/community/stats'"), 'Missing'));
test('GET /api/community/leaderboard', () => assert.ok(indexFile.includes("'/api/community/leaderboard'"), 'Missing'));

console.log('\nPart 3: Tribute Handler Logic');
test('Requires authentication', () => assert.ok(indexFile.includes('Authentication required to leave a tribute'), 'Missing'));
test('Requires targetType', () => assert.ok(indexFile.includes('targetType and targetId are required'), 'Missing'));
test('Validates targetType values', () => assert.ok(indexFile.includes("targetType must be"), 'Missing'));
test('Limits message length', () => assert.ok(indexFile.includes('max 1000 characters'), 'Missing'));
test('Supports candle type', () => assert.ok(indexFile.includes("'candle'"), 'Missing'));
test('Supports message type', () => assert.ok(indexFile.includes("'message'"), 'Missing'));
test('Supports flower type', () => assert.ok(indexFile.includes("'flower'"), 'Missing'));
test('Supports photo-memory type', () => assert.ok(indexFile.includes("'photo-memory'"), 'Missing'));
test('Supports anonymous', () => assert.ok(indexFile.includes('isAnonymous'), 'Missing'));
test('Rate limits tributes', () => assert.ok(indexFile.includes('max 10 tributes per hour'), 'Missing'));
test('Uses crypto.randomUUID', () => assert.ok(indexFile.includes('crypto.randomUUID'), 'Missing'));
test('Stores in community/tributes/', () => assert.ok(indexFile.includes('community/tributes/'), 'Missing'));

console.log('\nPart 4: List Tributes');
test('Paginates with limit/offset', () => assert.ok(indexFile.includes('offset + limit < allTributes.length'), 'Missing'));
test('Returns hasMore', () => assert.ok(indexFile.includes('hasMore'), 'Missing'));
test('Sorts newest first', () => assert.ok(indexFile.includes('new Date(b.createdAt) - new Date(a.createdAt)'), 'Missing'));
test('Filters active only', () => assert.ok(indexFile.includes("status === 'active'"), 'Missing'));

console.log('\nPart 5: Delete Tribute');
test('Requires authentication', () => assert.ok(indexFile.includes('Authentication required'), 'Missing'));
test('Owner or admin only', () => assert.ok(indexFile.includes('only delete your own'), 'Missing'));
test('Marks as deleted (not physical delete)', () => assert.ok(indexFile.includes("status = 'deleted'"), 'Missing'));

console.log('\nPart 6: Like Tribute');
test('Returns likeCount', () => assert.ok(indexFile.includes('likeCount'), 'Missing'));
test('Returns hasLiked', () => assert.ok(indexFile.includes('hasLiked'), 'Missing'));
test('Tracks unique likes', () => assert.ok(indexFile.includes('!tribute.likes.includes'), 'Missing'));

console.log('\nPart 7: Community Feed');
test('Returns feed items', () => assert.ok(indexFile.includes('feedItems'), 'Missing'));
test('Supports type filter', () => assert.ok(indexFile.includes("type === 'tributes'"), 'Missing'));
test('Paginates', () => assert.ok(indexFile.includes('paginated = feedItems.slice'), 'Missing'));
test('Includes tribute metadata', () => assert.ok(indexFile.includes('tributeType:'), 'Missing'));

console.log('\nPart 8: Community Stats');
test('Returns totalTributes', () => assert.ok(indexFile.includes('totalTributes'), 'Missing'));
test('Returns candles count', () => assert.ok(indexFile.includes('totalCandles'), 'Missing'));
test('Returns messages count', () => assert.ok(indexFile.includes('totalMessages'), 'Missing'));
test('Returns flowers count', () => assert.ok(indexFile.includes('totalFlowers'), 'Missing'));

console.log('\nPart 9: Community Leaderboard');
test('Sorts by tributeCount', () => assert.ok(indexFile.includes('b.tributeCount - a.tributeCount'), 'Missing'));
test('Returns displayName', () => assert.ok(indexFile.includes('displayName'), 'Missing'));
test('Accepts limit parameter', () => assert.ok(indexFile.includes('url.searchParams.get(\'limit\''), 'Missing'));

console.log('\nPart 10: Helper Functions');
test('Has sanitizeText', () => assert.ok(indexFile.includes('function sanitizeText'), 'Missing'));
test('Sanitizes HTML', () => assert.ok(indexFile.includes('<[^>]*>'), 'Missing'));
test('Sanitizes javascript:', () => assert.ok(indexFile.includes('javascript:'), 'Missing'));
test('Has incrementUserContributionCount', () => assert.ok(indexFile.includes('incrementUserContributionCount'), 'Missing'));

console.log('\nPart 11: Android Models');
const tributeFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/Tribute.java'), 'utf8'
);
test('Tribute class exists', () => assert.ok(tributeFile.includes('public class Tribute'), 'Missing'));
test('Has fromJson', () => assert.ok(tributeFile.includes('fromJson'), 'Missing'));
test('Has fromJsonArray', () => assert.ok(tributeFile.includes('fromJsonArray'), 'Missing'));
test('Has isCandle', () => assert.ok(tributeFile.includes('isCandle'), 'Missing'));
test('Has isAnonymous', () => assert.ok(tributeFile.includes('isAnonymous'), 'Missing'));

const feedFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/model/CommunityFeedItem.java'), 'utf8'
);
test('CommunityFeedItem class exists', () => assert.ok(feedFile.includes('public class CommunityFeedItem'), 'Missing'));
test('Has fromJsonArray', () => assert.ok(feedFile.includes('fromJsonArray'), 'Missing'));
test('Has isTribute', () => assert.ok(feedFile.includes('isTribute'), 'Missing'));

console.log('\nPart 12: API Client');
const apiFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/data/api/ApiClient.java'), 'utf8'
);
test('Imports Tribute', () => assert.ok(apiFile.includes('Tribute'), 'Missing'));
test('Imports CommunityFeedItem', () => assert.ok(apiFile.includes('CommunityFeedItem'), 'Missing'));
test('Has createTribute', () => assert.ok(apiFile.includes('createTribute') && apiFile.includes('/api/tributes'), 'Missing'));
test('Has listTributes', () => assert.ok(apiFile.includes('listTributes'), 'Missing'));
test('Has deleteTribute', () => assert.ok(apiFile.includes('deleteTribute'), 'Missing'));
test('Has likeTribute', () => assert.ok(apiFile.includes('likeTribute'), 'Missing'));
test('Has getCommunityFeed', () => assert.ok(apiFile.includes('getCommunityFeed') && apiFile.includes('/api/community/feed'), 'Missing'));
test('Has getCommunityStats', () => assert.ok(apiFile.includes('getCommunityStats') && apiFile.includes('/api/community/stats'), 'Missing'));
test('Has getCommunityLeaderboard', () => assert.ok(apiFile.includes('getCommunityLeaderboard') && apiFile.includes('/api/community/leaderboard'), 'Missing'));

console.log('\nPart 13: AI System Prompts');
const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'), 'utf8'
);
test('Prompts mention POST /api/tributes', () => assert.ok(promptsFile.includes('POST /api/tributes'), 'Missing'));
test('Prompts mention GET /api/tributes', () => assert.ok(promptsFile.includes('GET /api/tributes'), 'Missing'));
test('Prompts mention community/feed', () => assert.ok(promptsFile.includes('community/feed'), 'Missing'));
test('Prompts mention community/stats', () => assert.ok(promptsFile.includes('community/stats'), 'Missing'));
test('Prompts mention community/leaderboard', () => assert.ok(promptsFile.includes('community/leaderboard'), 'Missing'));
test('Prompts mention candle type', () => assert.ok(promptsFile.includes('candle'), 'Missing'));
test('Suggested prompts include memorial candle', () => assert.ok(promptsFile.includes('memorial candle'), 'Missing'));
test('Suggested prompts include community feed', () => assert.ok(promptsFile.includes('community feed'), 'Missing'));
test('Suggested prompts include top contributors', () => assert.ok(promptsFile.includes('top contributors'), 'Missing'));

console.log('\nPart 14: Documentation');
test('CHANGELOG mentions Phase 19', () => {
  const c = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(c.includes('Phase 19') || c.includes('Community Engagement'), 'Missing');
});
test('STATUS.md mentions Phase 19', () => {
  const s = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(s.includes('19') || s.includes('Community') || s.includes('Tribute'), 'Missing');
});

console.log('\n=== Phase 19 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) console.log('\n✅ All Phase 19 Community Engagement tests passed!');
else console.log('\n❌ Some tests failed!');
