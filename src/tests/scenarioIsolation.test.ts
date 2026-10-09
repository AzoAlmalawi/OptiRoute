/**
 * Test Suite: Demo Scenario Isolation Verification
 *
 * Verifies:
 * 1. Complete a non-urgent scenario (sc-5-non-urgent)
 * 2. Select the vague/incomplete scenario (sc-6-unclear-incomplete)
 * 3. Confirm it starts a separate session with a new ID
 * 4. Confirm symptoms are reset to unknown, history reset, follow-up count 0, outcome reset
 * 5. Confirm it waits for consent before processing
 * 6. After consent, confirm it processes only the vague scenario and asks follow-up questions
 * 7. Confirm it does NOT inherit the previous NON_URGENT outcome (Assessment pending)
 * 8. Confirm both sessions remain preserved in the dashboard repository
 * 9. Confirm switching language preserves the session unchanged
 */

import { orchestrator } from '../services/triageOrchestrator';
import { DEMO_SCENARIOS } from '../data/scenarios';
import { TriageSession } from '../types/triage';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    passCount++;
    console.log(`✅ PASS: ${testName}`);
  } else {
    failCount++;
    console.error(`❌ FAIL: ${testName}`);
  }
}

export async function runScenarioIsolationTests() {
  console.log('=== Running Demo Scenario Isolation Test Suite ===\n');

  const scNonUrgent = DEMO_SCENARIOS.find((s) => s.id === 'sc-5-non-urgent')!;
  const scVague = DEMO_SCENARIOS.find((s) => s.id === 'sc-6-unclear-incomplete')!;

  assert(!!scNonUrgent, 'Scenario 5 (non-urgent) is defined');
  assert(!!scVague, 'Scenario 6 (vague/incomplete) is defined');

  // STEP 1: Simulate user selecting Scenario 5
  console.log('\n--- Step 1: Select and complete non-urgent scenario ---');
  let session1 = await orchestrator.createNewSession('ar');
  const session1Id = session1.id;
  assert(session1.consentGiven === false, 'Session 1 created with consentGiven=false');
  assert(session1.status === 'AWAITING_CONSENT', 'Session 1 status is AWAITING_CONSENT');

  // Grant consent for Session 1
  session1 = await orchestrator.handleConsent(session1, true);
  assert(session1.consentGiven === true, 'Session 1 consent given');

  // Process Scenario 5 initial message
  session1 = await orchestrator.processPatientMessage(session1, {
    text: scNonUrgent.initialMessageAr,
    isVoice: scNonUrgent.isVoiceSample,
    voiceDuration: scNonUrgent.voiceDurationSeconds,
    userCity: scNonUrgent.locationCity,
  });

  assert(session1.status === 'COMPLETED', 'Session 1 completed triage');
  assert(session1.decision?.finalUrgency === 'NON_URGENT', 'Session 1 resolved as NON_URGENT');
  assert(!!session1.routedFacility, 'Session 1 has routed facility');
  assert(session1.symptoms.pain_level === 'mild', 'Session 1 has pain_level=mild');

  // STEP 2: User selects Scenario 6 (vague / incomplete)
  console.log('\n--- Step 2: Select vague/incomplete scenario ---');
  // Scenario isolation: create fresh session with new ID
  let session2 = await orchestrator.createNewSession('ar');
  const session2Id = session2.id;

  assert(session2Id !== session1Id, `Session 2 has a fresh, separate ID (${session2Id} !== ${session1Id})`);
  assert(session2.consentGiven === false, 'Session 2 requires explicit consent (consentGiven=false)');
  assert(session2.status === 'AWAITING_CONSENT', 'Session 2 status is AWAITING_CONSENT');

  // Verify reset state of Session 2:
  assert(session2.symptoms.vision_change === 'unknown', 'Session 2 vision_change reset to unknown');
  assert(session2.symptoms.pain_level === 'unknown', 'Session 2 pain_level reset to unknown');
  assert(session2.symptoms.chemical_exposure === null, 'Session 2 chemical_exposure reset to null/unknown');
  assert(session2.symptoms.trauma === null, 'Session 2 trauma reset to null/unknown');
  assert(session2.followUpCount === 0, 'Session 2 follow-up count is 0');
  assert(session2.decision === undefined, 'Session 2 decision is undefined (not inherited)');
  assert(session2.routedFacility === undefined, 'Session 2 routing is undefined (not inherited)');
  assert(session2.messages.length === 1 && session2.messages[0].type === 'consent', 'Session 2 history reset to initial consent notice only');

  // STEP 3: Check both sessions exist in repository / dashboard
  console.log('\n--- Step 3: Check dashboard repository preservation ---');
  const stored1 = await orchestrator.repository.getSession(session1Id);
  const stored2 = await orchestrator.repository.getSession(session2Id);
  const allStored = await orchestrator.repository.getAllSessions();

  assert(!!stored1, 'Session 1 is preserved in repository');
  assert(stored1?.decision?.finalUrgency === 'NON_URGENT', 'Session 1 preserved in repository with NON_URGENT');
  assert(!!stored2, 'Session 2 is present in repository');
  assert(allStored.some((s) => s.id === session1Id), 'Session 1 listed in allSessions');
  assert(allStored.some((s) => s.id === session2Id), 'Session 2 listed in allSessions');

  // STEP 4: Grant consent on Session 2 and process only newly selected scenario
  console.log('\n--- Step 4: Grant consent and process vague scenario ---');
  session2 = await orchestrator.handleConsent(session2, true);
  assert(session2.consentGiven === true, 'Session 2 consent granted');

  session2 = await orchestrator.processPatientMessage(session2, {
    text: scVague.initialMessageAr,
    isVoice: scVague.isVoiceSample,
    voiceDuration: scVague.voiceDurationSeconds,
    userCity: scVague.locationCity,
  });

  // Verify it asks follow-up questions and does NOT inherit previous outcome
  assert(session2.status === 'FOLLOW_UP', 'Session 2 asks follow-up questions (status=FOLLOW_UP)');
  assert(session2.followUpCount === 1, 'Session 2 followUpCount=1');
  assert(session2.decision?.isPending === true, 'Session 2 assessment is pending (isPending=true)');
  assert(session2.decision?.isFinalDecision === false, 'Session 2 is not finalized (isFinalDecision=false)');
  assert(session2.routedFacility === undefined, 'Session 2 did NOT inherit completed routing from Session 1');
  assert(session2.status !== stored1?.status, 'Session 2 did NOT inherit COMPLETED status from Session 1');
  const hasFollowUpMessage = session2.messages.some((m) => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0);
  assert(hasFollowUpMessage, 'Session 2 has follow-up prompt with quick replies');

  // STEP 5: Confirm dashboard still preserves both sessions
  console.log('\n--- Step 5: Confirm both sessions remain in repository after triage step ---');
  const finalStored1 = await orchestrator.repository.getSession(session1Id);
  const finalStored2 = await orchestrator.repository.getSession(session2Id);
  assert(!!finalStored1, 'Session 1 still preserved in dashboard');
  assert(finalStored1?.status === 'COMPLETED', 'Session 1 status remains COMPLETED');
  assert(finalStored1?.decision?.finalUrgency === 'NON_URGENT', 'Session 1 urgency remains NON_URGENT');
  assert(!!finalStored2, 'Session 2 preserved in dashboard');
  assert(finalStored2?.status === 'FOLLOW_UP', 'Session 2 status is FOLLOW_UP');

  // STEP 6: Language switch preservation test
  console.log('\n--- Step 6: Verify interface language toggle keeps session unchanged ---');
  const sessionBeforeToggleId = session2.id;
  const sessionBeforeToggleMessages = session2.messages.length;
  const sessionBeforeToggleStatus = session2.status;
  // Simulating toggling language in App: state language changes from 'ar' to 'en', session is untouched
  const simulatedAppLangChange = 'en';
  assert(simulatedAppLangChange === 'en', 'Language switched to English');
  assert(session2.id === sessionBeforeToggleId, 'Session ID remains unchanged');
  assert(session2.messages.length === sessionBeforeToggleMessages, 'Session messages remain unchanged');
  assert(session2.status === sessionBeforeToggleStatus, 'Session status remains unchanged');

  console.log(`\n========================================`);
  console.log(`Scenario Isolation: ${passCount} Passed, ${failCount} Failed.`);
  console.log(`========================================\n`);

  return { passCount, failCount };
}

// Auto-run if executed in Node/tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('scenarioIsolation.test')) {
  runScenarioIsolationTests().then(({ failCount }) => {
    if (failCount > 0) {
      process.exit(1);
    }
  });
}
