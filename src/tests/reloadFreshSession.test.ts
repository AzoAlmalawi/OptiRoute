import assert from 'assert';
import { orchestrator } from '../services/triageOrchestrator';
import { DEMO_SCENARIOS } from '../data/scenarios';
import { LocalStorageSessionRepository } from '../services/providers';

console.log('=== Running OptiRoute Page Reload & Fresh Session Test Suite ===\n');

async function runTests() {
  const repo = orchestrator.repository;

  // Test 1: Baseline repository contains existing cases
  console.log('--- Test 1: Verify Pre-existing Cases in Repository ---');
  const initialSessions = await repo.getAllSessions();
  assert.ok(initialSessions.length > 0, 'Dashboard repository must contain initial sessions');
  const initialCount = initialSessions.length;
  console.log(`✅ PASS: Initial repository has ${initialCount} sessions`);

  // Test 2: Starting a fresh demo session on initial page load / reload
  console.log('\n--- Test 2: Simulating Page Reload / Fresh Session Init ---');
  // On reload: createNewSession(lang, false)
  const freshSession = await orchestrator.createNewSession('en', false);
  
  // Verify session state is empty and at consent stage
  assert.strictEqual(freshSession.consentGiven, false, 'Fresh session must start with consentGiven = false');
  assert.strictEqual(freshSession.status, 'AWAITING_CONSENT', 'Status must be AWAITING_CONSENT');
  assert.strictEqual(freshSession.messages.length, 1, 'Only consent prompt message should exist');
  assert.strictEqual(freshSession.messages[0].type, 'consent', 'First message must be consent notice');
  assert.strictEqual(freshSession.symptoms.vision_change, 'unknown', 'Symptoms must be reset/empty');
  assert.strictEqual(freshSession.symptoms.pain_level, 'unknown', 'Pain level must be unknown');
  assert.strictEqual(freshSession.decision, undefined, 'Decision must be undefined');
  assert.strictEqual(freshSession.routedFacility, undefined, 'Routed facility must be undefined');
  assert.strictEqual(freshSession.followUpCount, 0, 'Follow up count must be 0');
  console.log('✅ PASS: Fresh session created at consent stage with empty symptoms and no decision');

  // Test 3: Unpersisted reloads do not accumulate empty sessions in repository
  console.log('\n--- Test 3: Verify Reloads Do Not Accumulate Empty Sessions ---');
  const afterReloadSessions = await repo.getAllSessions();
  assert.strictEqual(afterReloadSessions.length, initialCount, 'Repository count must not increase on unpersisted reload');
  assert.strictEqual(
    afterReloadSessions.some((s) => s.id === freshSession.id),
    false,
    'Fresh unconsented session must not appear in dashboard records'
  );
  console.log('✅ PASS: Repeated reloads do not create duplicate empty records in dashboard');

  // Test 4: Previous case remains accessible in the dashboard
  console.log('\n--- Test 4: Previous Case Remains Accessible in Dashboard ---');
  const prevCaseId = initialSessions[0].id;
  const retrievedPrev = await repo.getSession(prevCaseId);
  assert.ok(retrievedPrev, 'Previous case must be retrievable from repository');
  assert.strictEqual(retrievedPrev.id, prevCaseId);
  console.log(`✅ PASS: Previous case ${prevCaseId} is intact and accessible`);

  // Test 5: Meaningful interaction persists the case into repository
  console.log('\n--- Test 5: Meaningful Interaction Saves Case To Repository ---');
  const consentedSession = await orchestrator.handleConsent(freshSession, true);
  assert.strictEqual(consentedSession.consentGiven, true);
  const updatedRepoSessions = await repo.getAllSessions();
  assert.strictEqual(updatedRepoSessions.length, initialCount + 1, 'Case is persisted after consent');
  const savedCase = await repo.getSession(freshSession.id);
  assert.ok(savedCase, 'Case is now retrievable from repository');
  console.log('✅ PASS: Case is properly saved once user interacts/gives consent');

  // Test 6: Completing a scenario then simulating a page reload
  console.log('\n--- Test 6: Completed Conversation Reload Simulation ---');
  const sc1 = DEMO_SCENARIOS.find((s) => s.id === 'sc-1-vision-loss')!;
  let completedSession = await orchestrator.createNewSession('ar', false, sc1.id);
  completedSession = await orchestrator.handleConsent(completedSession, true);
  completedSession = await orchestrator.processPatientMessage(completedSession, {
    text: sc1.initialMessageAr,
    userCity: 'Riyadh',
  });
  assert.strictEqual(completedSession.status, 'COMPLETED');
  assert.ok(completedSession.decision);

  // User then reloads the page -> init runs with createNewSession
  const reloadedSession = await orchestrator.createNewSession('ar', false);
  assert.strictEqual(reloadedSession.consentGiven, false, 'Reload starts at consent stage');
  assert.strictEqual(reloadedSession.status, 'AWAITING_CONSENT', 'Reload starts awaiting consent');
  assert.strictEqual(reloadedSession.decision, undefined, 'Reload has no decision');
  assert.notStrictEqual(reloadedSession.id, completedSession.id, 'Reload creates a new session ID');

  // Verify completedSession is still safely stored in repository
  const storedCompleted = await repo.getSession(completedSession.id);
  assert.ok(storedCompleted, 'Completed case remains in dashboard');
  assert.strictEqual(storedCompleted.status, 'COMPLETED');
  assert.strictEqual(storedCompleted.decision?.finalUrgency, 'EMERGENCY');
  console.log('✅ PASS: Completed conversation is preserved in dashboard while reload opens a fresh session at consent');

  console.log('\n========================================');
  console.log('All Page Reload & Fresh Session Tests Passed!');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
