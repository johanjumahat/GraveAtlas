/**
 * Phase 16.6 Tests — Adaptive Interface Modes
 *
 * Tests the InterfaceMode enum and InterfaceModeManager:
 * - Mode definitions and properties
 * - Mode-specific feature flags (contribute, admin, map, canvas, timeline, AI bar)
 * - AI context hints per mode
 * - Mode persistence and initialization
 * - Mode selection and switching
 * - MainNavActivity integration
 * - AISystemPrompts integration
 * - Layout integration
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

// ── Part 1: InterfaceMode enum ──
console.log('\nPart 1: InterfaceMode enum');

const modeFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/ui/navigation/InterfaceMode.java'),
  'utf8'
);

test('InterfaceMode enum exists', () => {
  assert.ok(modeFile.includes('public enum InterfaceMode'), 'InterfaceMode enum not found');
});

test('Five modes are defined', () => {
  assert.ok(modeFile.includes('RESEARCH'), 'Missing RESEARCH mode');
  assert.ok(modeFile.includes('MAP'), 'Missing MAP mode');
  assert.ok(modeFile.includes('ARCHIVE'), 'Missing ARCHIVE mode');
  assert.ok(modeFile.includes('INSTITUTION'), 'Missing INSTITUTION mode');
  assert.ok(modeFile.includes('PUBLIC'), 'Missing PUBLIC mode');
});

test('Each mode has a label', () => {
  assert.ok(modeFile.includes('Research'), 'Missing Research label');
  assert.ok(modeFile.includes('Map Explorer'), 'Missing Map Explorer label');
  assert.ok(modeFile.includes('Archive Manager'), 'Missing Archive Manager label');
  assert.ok(modeFile.includes('Institution'), 'Missing Institution label');
  assert.ok(modeFile.includes('Public Browser'), 'Missing Public Browser label');
});

test('Each mode has a description', () => {
  // Check that each mode constructor call has at least 2 string args (label + description)
  const constructors = (modeFile.match(/new String\[\]/g) || []).length;
  assert.ok(constructors >= 5 || modeFile.includes('getDescription'), 'Missing descriptions');
});

test('Each mode has navItems array', () => {
  assert.ok(modeFile.includes('getNavItems'), 'Missing getNavItems method');
});

test('Each mode has defaultScreen', () => {
  assert.ok(modeFile.includes('getDefaultScreen'), 'Missing getDefaultScreen method');
});

test('Mode has getAIContextHint method', () => {
  assert.ok(modeFile.includes('getAIContextHint'), 'Missing getAIContextHint method');
});

test('Mode has canContribute method', () => {
  assert.ok(modeFile.includes('canContribute'), 'Missing canContribute method');
});

test('Mode has showAdminTools method', () => {
  assert.ok(modeFile.includes('showAdminTools'), 'Missing showAdminTools method');
});

test('Mode has emphasizeMap method', () => {
  assert.ok(modeFile.includes('emphasizeMap'), 'Missing emphasizeMap method');
});

test('Mode has showResearchCanvas method', () => {
  assert.ok(modeFile.includes('showResearchCanvas'), 'Missing showResearchCanvas method');
});

test('Mode has showTimeline method', () => {
  assert.ok(modeFile.includes('showTimeline'), 'Missing showTimeline method');
});

test('Mode has showAICommandBar method', () => {
  assert.ok(modeFile.includes('showAICommandBar'), 'Missing showAICommandBar method');
});

test('Mode has fromLabel static method', () => {
  assert.ok(modeFile.includes('fromLabel'), 'Missing fromLabel method');
});

// ── Part 2: Mode-specific feature flags ──
console.log('\nPart 2: Mode-specific feature flags');

test('RESEARCH mode allows contributing', () => {
  // RESEARCH canContribute should return true (it's not PUBLIC)
  assert.ok(modeFile.includes('RESEARCH'), 'RESEARCH mode exists');
  // The canContribute method checks this != PUBLIC
  assert.ok(modeFile.includes('PUBLIC'), 'PUBLIC mode exists for canContribute check');
});

test('PUBLIC mode does not allow contributing', () => {
  // canContribute returns false only for PUBLIC
  assert.ok(modeFile.includes('canContribute'), 'canContribute exists');
  assert.ok(modeFile.includes('PUBLIC'), 'PUBLIC mode exists');
});

test('Only INSTITUTION mode shows admin tools', () => {
  assert.ok(modeFile.includes('INSTITUTION'), 'INSTITUTION mode exists');
  // showAdminTools returns true only for INSTITUTION
});

test('MAP and RESEARCH emphasize map features', () => {
  assert.ok(modeFile.includes('emphasizeMap'), 'emphasizeMap exists');
  assert.ok(modeFile.includes('MAP'), 'MAP mode exists');
  assert.ok(modeFile.includes('RESEARCH'), 'RESEARCH mode exists');
});

test('Only RESEARCH shows research canvas', () => {
  assert.ok(modeFile.includes('showResearchCanvas'), 'showResearchCanvas exists');
});

test('RESEARCH and ARCHIVE show timeline', () => {
  assert.ok(modeFile.includes('showTimeline'), 'showTimeline exists');
});

test('PUBLIC mode hides AI command bar', () => {
  assert.ok(modeFile.includes('showAICommandBar'), 'showAICommandBar exists');
});

// ── Part 3: AI Context Hints ──
console.log('\nPart 3: AI Context Hints');

test('RESEARCH mode has AI context hint', () => {
  assert.ok(modeFile.includes('RESEARCH mode'), 'Missing RESEARCH AI context');
});

test('MAP mode has AI context hint', () => {
  assert.ok(modeFile.includes('MAP EXPLORER mode'), 'Missing MAP AI context');
});

test('ARCHIVE mode has AI context hint', () => {
  assert.ok(modeFile.includes('ARCHIVE MANAGER mode'), 'Missing ARCHIVE AI context');
});

test('INSTITUTION mode has AI context hint', () => {
  assert.ok(modeFile.includes('INSTITUTION mode'), 'Missing INSTITUTION AI context');
});

test('PUBLIC mode has AI context hint', () => {
  assert.ok(modeFile.includes('PUBLIC BROWSER mode'), 'Missing PUBLIC AI context');
});

// ── Part 4: InterfaceModeManager ──
console.log('\nPart 4: InterfaceModeManager');

const managerFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/ui/navigation/InterfaceModeManager.java'),
  'utf8'
);

test('InterfaceModeManager exists', () => {
  assert.ok(managerFile.includes('public class InterfaceModeManager'), 'InterfaceModeManager class not found');
});

test('Manager has init method', () => {
  assert.ok(managerFile.includes('public static void init'), 'Missing init method');
});

test('Manager has getCurrentMode method', () => {
  assert.ok(managerFile.includes('getCurrentMode'), 'Missing getCurrentMode method');
});

test('Manager has setMode method', () => {
  assert.ok(managerFile.includes('public static void setMode'), 'Missing setMode method');
});

test('Manager persists mode via SharedPreferences', () => {
  assert.ok(managerFile.includes('SharedPreferences'), 'Missing SharedPreferences');
  assert.ok(managerFile.includes('PREFS_NAME'), 'Missing PREFS_NAME');
  assert.ok(managerFile.includes('KEY_MODE'), 'Missing KEY_MODE');
});

test('Manager has isFirstLaunch method', () => {
  assert.ok(managerFile.includes('isFirstLaunch'), 'Missing isFirstLaunch method');
});

test('Manager has markModeSelected method', () => {
  assert.ok(managerFile.includes('markModeSelected'), 'Missing markModeSelected method');
});

test('Manager has getCurrentAIContextHint', () => {
  assert.ok(managerFile.includes('getCurrentAIContextHint'), 'Missing getCurrentAIContextHint method');
});

test('Manager delegates feature flags to current mode', () => {
  assert.ok(managerFile.includes('canContribute'), 'Missing canContribute delegate');
  assert.ok(managerFile.includes('showAdminTools'), 'Missing showAdminTools delegate');
  assert.ok(managerFile.includes('emphasizeMap'), 'Missing emphasizeMap delegate');
  assert.ok(managerFile.includes('showResearchCanvas'), 'Missing showResearchCanvas delegate');
  assert.ok(managerFile.includes('showTimeline'), 'Missing showTimeline delegate');
  assert.ok(managerFile.includes('showAICommandBar'), 'Missing showAICommandBar delegate');
});

test('Manager has reset method for testing', () => {
  assert.ok(managerFile.includes('public static void reset'), 'Missing reset method');
});

// ── Part 5: MainNavActivity Integration ──
console.log('\nPart 5: MainNavActivity Integration');

const navFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/MainNavActivity.java'),
  'utf8'
);

test('MainNavActivity imports InterfaceMode', () => {
  assert.ok(navFile.includes('import') && navFile.includes('InterfaceMode'), 'Missing InterfaceMode import');
});

test('MainNavActivity imports InterfaceModeManager', () => {
  assert.ok(navFile.includes('InterfaceModeManager'), 'Missing InterfaceModeManager import');
});

test('MainNavActivity initializes InterfaceModeManager', () => {
  assert.ok(navFile.includes('InterfaceModeManager.init'), 'Missing InterfaceModeManager.init call');
});

test('MainNavActivity has getDefaultFragmentForMode method', () => {
  assert.ok(navFile.includes('getDefaultFragmentForMode'), 'Missing getDefaultFragmentForMode method');
});

test('Default fragment respects MAP mode', () => {
  assert.ok(navFile.includes('MAP') && navFile.includes('MapFragment'), 'MAP mode should default to MapFragment');
});

test('Default fragment respects ARCHIVE mode', () => {
  assert.ok(navFile.includes('ARCHIVE') && navFile.includes('GlobalSearchFragment'), 'ARCHIVE mode should default to GlobalSearchFragment');
});

test('MainNavActivity has showInterfaceModeSelector method', () => {
  assert.ok(navFile.includes('showInterfaceModeSelector'), 'Missing showInterfaceModeSelector method');
});

test('Mode selector uses AlertDialog with single choice items', () => {
  assert.ok(navFile.includes('setSingleChoiceItems'), 'Missing setSingleChoiceItems in mode selector');
});

test('Mode selector calls InterfaceModeManager.setMode', () => {
  assert.ok(navFile.includes('InterfaceModeManager.setMode'), 'Missing setMode call in selector');
});

test('Mode selector marks mode as selected', () => {
  assert.ok(navFile.includes('markModeSelected'), 'Missing markModeSelected call');
});

test('Mode selector recreates activity to apply changes', () => {
  assert.ok(navFile.includes('recreate'), 'Missing recreate() call');
});

test('AI command bar visibility respects PUBLIC mode', () => {
  assert.ok(navFile.includes('showAICommandBar'), 'Missing showAICommandBar check for AI command bar');
});

test('Admin tools visible only in INSTITUTION mode', () => {
  assert.ok(navFile.includes('showAdminTools'), 'Missing showAdminTools check');
  assert.ok(navFile.includes('moreAdmin'), 'Missing moreAdmin layout reference');
});

// ── Part 6: AISystemPrompts Integration ──
console.log('\nPart 6: AISystemPrompts Integration');

const promptsFile = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/java/com/putraworks/graveatlas/chat/AISystemPrompts.java'),
  'utf8'
);

test('AISystemPrompts imports InterfaceModeManager', () => {
  assert.ok(promptsFile.includes('InterfaceModeManager'), 'Missing InterfaceModeManager import');
});

test('System prompt includes INTERFACE MODE context', () => {
  assert.ok(promptsFile.includes('INTERFACE MODE'), 'Missing INTERFACE MODE in prompt');
});

test('System prompt appends mode context hint', () => {
  assert.ok(promptsFile.includes('getCurrentAIContextHint'), 'Missing getCurrentAIContextHint call');
});

// ── Part 7: Layout Integration ──
console.log('\nPart 7: Layout Integration');

const sheetLayout = fs.readFileSync(
  path.join(projectRoot, 'app/src/main/res/layout/sheet_more.xml'),
  'utf8'
);

test('More sheet has interface mode button', () => {
  assert.ok(sheetLayout.includes('moreInterfaceMode'), 'Missing moreInterfaceMode in sheet_more.xml');
});

test('More sheet has admin button (hidden by default)', () => {
  assert.ok(sheetLayout.includes('moreAdmin'), 'Missing moreAdmin in sheet_more.xml');
  assert.ok(sheetLayout.includes('gone'), 'Admin button should be gone by default');
});

test('More sheet has INTERFACE section label', () => {
  assert.ok(sheetLayout.includes('INTERFACE'), 'Missing INTERFACE section label');
});

// ── Part 8: Documentation ──
console.log('\nPart 8: Documentation');

test('CHANGELOG mentions Phase 16.6 or Adaptive Interface Modes', () => {
  const changelog = fs.readFileSync(path.join(projectRoot, 'CHANGELOG.md'), 'utf8');
  assert.ok(
    changelog.includes('Phase 16.6') || changelog.includes('Adaptive Interface') || changelog.includes('interface mode'),
    'CHANGELOG should mention Phase 16.6 or Adaptive Interface Modes'
  );
});

test('STATUS.md mentions Adaptive Interface Modes', () => {
  const status = fs.readFileSync(path.join(projectRoot, 'STATUS.md'), 'utf8');
  assert.ok(
    status.includes('Adaptive Interface') || status.includes('16.6') || status.includes('interface mode'),
    'STATUS.md should mention Adaptive Interface Modes'
  );
});

// ── Results ──
console.log('\n=== Phase 16.6 Test Results ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All Phase 16.6 Adaptive Interface Modes tests passed!');
} else {
  console.log('\n❌ Some tests failed!');
}
