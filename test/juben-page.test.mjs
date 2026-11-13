import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { jubenCases } from '../src/data/juben.js';
import { resolveVaultMission } from '../src/scripts/juben-journey.js';

const page = readFileSync(new URL('../src/pages/juben/index.astro', import.meta.url), 'utf8');

function pageFunction(name) {
  const start = page.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing page function ${name}`);
  const end = page.indexOf('\n    }', start);
  assert.notEqual(end, -1, `unterminated page function ${name}`);
  return page.slice(start, end + '\n    }'.length);
}

test('an explicit valid case deep link ignores a different remote last-reading spot', () => {
  const transitions = [];
  const store = {
    lastReading: () => ({ caseId: 'remote-case', at: Date.now() }),
    markReading: (caseId) => transitions.push(['mark', caseId]) && false,
  };
  const settleSpot = new Function(
    'store', 'selected', 'explicitCase', 'userPicked', 'sync', 'spotSettled',
    'selectCase', 'showResume', 'RESUME_MAX_AGE',
    `${pageFunction('settleSpot')}; return settleSpot;`,
  )(
    store, 'explicit-case', true, false, null, false,
    (...args) => transitions.push(['select', ...args]),
    () => transitions.push(['resume']),
    60 * 24 * 60 * 60_000,
  );

  settleSpot(true);
  assert.deepEqual(transitions, [['mark', 'explicit-case']]);
});

test('remote last-reading still resumes only without an explicit case and uses canonical replacement', () => {
  const transitions = [];
  const store = {
    lastReading: () => ({ caseId: 'remote-case', at: Date.now() }),
    markReading: () => false,
  };
  const settleSpot = new Function(
    'store', 'selected', 'explicitCase', 'userPicked', 'sync', 'spotSettled',
    'selectCase', 'showResume', 'RESUME_MAX_AGE', 'location',
    `${pageFunction('settleSpot')}; return settleSpot;`,
  )(
    store, 'first-case', false, false, null, false,
    (...args) => transitions.push(['select', ...args]),
    () => transitions.push(['resume']),
    60 * 24 * 60 * 60_000,
    { hash: '#dm-vault' },
  );

  settleSpot(true);
  assert.equal(transitions[0][0], 'select');
  assert.equal(transitions[0][1], 'remote-case');
  assert.equal(transitions[0][2], 'replace');
});

test('history writer pushes explicit navigation, replaces canonicalization, and preserves hash when asked', () => {
  const calls = [];
  const location = new URL('https://example.test/juben/?case=first&module=one#dm-vault');
  const history = {
    pushState: (...args) => calls.push(['push', ...args]),
    replaceState: (...args) => calls.push(['replace', ...args]),
  };
  const updateHistory = new Function(
    'location', 'history',
    `${pageFunction('updateHistory')}; return updateHistory;`,
  )(location, history);

  updateHistory('second', 'two', 'push', 'dm-vault');
  assert.equal(calls[0][0], 'push');
  assert.equal(calls[0][3].searchParams.get('case'), 'second');
  assert.equal(calls[0][3].searchParams.get('module'), 'two');
  assert.equal(calls[0][3].hash, '#dm-vault');

  updateHistory('second', 'canonical', 'replace', null);
  assert.equal(calls[1][0], 'replace');
  assert.equal(calls[1][3].hash, '#dm-vault');
  updateHistory('ignored', 'ignored', false);
  assert.equal(calls.length, 2);

  assert.match(page, /window\.addEventListener\('popstate'/);
  assert.match(page, /selectCase\(caseId, false, true, params\.get\('module'\) \|\| ''\)/);
  assert.match(page, /function selectMission\(slug, historyMode = 'push'/);
});

test('failed draft persistence keeps the page-session draft and records a persistent warning', () => {
  const localStorage = {
    getItem: () => null,
    setItem: () => { throw new Error('quota'); },
  };
  const drafts = new Function(
    'localStorage', 'draftOwner', 'DRAFT_KEY',
    `const draftMemory = new Map();
     const failedDrafts = new Set();
     const draftKey = (caseId, slug) => \`${'${draftOwner}'}/${'${caseId}'}/${'${slug}'}\`;
     ${pageFunction('readDrafts')}
     ${pageFunction('loadDraft')}
     ${pageFunction('saveDraft')}
     return { loadDraft, saveDraft, failedDrafts };`,
  )(localStorage, 'guest', 'atw-juben-training-drafts-v1');

  assert.equal(drafts.saveDraft('case-a', 'mission-a', 'still usable'), false);
  assert.equal(drafts.loadDraft('case-a', 'mission-a'), 'still usable');
  assert.equal(drafts.failedDrafts.has('guest/case-a/mission-a'), true);
  assert.match(page, /id="trainer-draft-warning" role="alert" hidden/);
  assert.match(page, /updateDraftWarning\(selected, selectedMissionSlug\)/);
});

test('vault continuations are generation and identity guarded and never select the first manifest fallback', () => {
  assert.match(page, /const generation = beginVaultRender\(\)/);
  assert.match(page, /if \(!isCurrentVault\(generation, identity\) \|\| !isDm\(user\)\) return;\r?\n        manifest = loadedManifest/);
  assert.match(page, /requestId === docRequest[\s\S]*?isCurrentVault\(generation, identity\)[\s\S]*?document\.getElementById\('vault-reader-doc'\) === host/);
  assert.match(page, /api\('GET', '\/dm\/invite'\)\.then[\s\S]*?if \(!isCurrentVault\(generation, identity\) \|\| !isDm\(user\)\) return/);
  assert.doesNotMatch(page, /activeCase = manifest\?\.cases\?\.\[0\]/);
  assert.match(page, /directPrivateCase = entry\.id;\r?\n\s*renderReader\(\)/);
  assert.match(page, /未打开其他卷宗代替/);

  const requested = jubenCases[0];
  const other = jubenCases[1];
  const target = resolveVaultMission(
    jubenCases,
    [{ id: other.vaultCaseId, docs: [{ id: 'other-doc', title: 'Other' }] }],
    requested.id,
    requested.modules[0].slug,
  );
  assert.equal(target.manifestCase, null);
  assert.equal(target.vaultCaseId, requested.vaultCaseId);
  assert.equal(target.docId, null);
});

test('已有 DM 会话直接读受保护的目录，普通会话先确认身份', async () => {
  async function start(user, token, changeWhileRefreshing = false) {
    const calls = [];
    const boot = new Function(
      'user', 'sessionToken', 'vaultGeneration', 'isCurrentVault', 'isDm',
      'renderAnonymous', 'renderForUser', 'refreshUser',
      `async ${pageFunction('boot')}; return boot;`,
    )(
      user, token, 0, () => !changeWhileRefreshing, (value) => value?.role === 'dm',
      () => calls.push('guest'), () => calls.push('directory'),
      async () => { calls.push('auth'); },
    );
    await boot();
    return calls;
  }
  assert.deepEqual(await start(null, ''), ['guest']);
  assert.deepEqual(await start({ role: 'dm' }, 'token'), ['directory', 'auth']);
  assert.deepEqual(await start({ role: 'member' }, 'token'), ['auth', 'directory']);
  assert.deepEqual(await start({ role: 'member' }, 'token', true), ['auth']);
});

test('training rerenders retain checks and focus, scrolling honors reduced motion, and resume copy follows sync state', () => {
  assert.match(page, /const selfCheckState = new Map\(\)/);
  assert.match(page, /input\.checked = Boolean\(savedChecks\[checkIndex\]\)/);
  assert.match(page, /selfCheckState\.set\(checkKey, values\)/);
  assert.match(page, /focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(page, /behavior:\s*'smooth'/);
  assert.match(page, /sync\.status\(\)\.state === 'synced'/);
  assert.match(page, /这条续读记录仅保证保留在本机/);
});
