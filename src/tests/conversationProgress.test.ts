import assert from 'assert';
import { computeConversationStages } from '../components/PatientSimulator/ConversationProgressIndicator';
import { orchestrator } from '../services/triageOrchestrator';
import { DEMO_SCENARIOS } from '../data/scenarios';
import { TriageSession } from '../types/triage';

console.log('=== Running OptiRoute Conversation Progress Indicator Test Suite ===\n');

async function runTests() {
  // Test 1: Fresh Session (Awaiting Consent)
  console.log('--- Test 1: Fresh Session Starts at Consent Stage ---');
  let freshSession = await orchestrator.createNewSession('en', false);
  let stages = computeConversationStages(freshSession);

  assert.strictEqual(stages[0].id, 'consent');
  assert.strictEqual(stages[0].status, 'current', 'Consent must be current in fresh session');
  assert.strictEqual(stages[1].status, 'upcoming', 'Symptoms must be upcoming');
  assert.strictEqual(stages[2].status, 'upcoming', 'Follow-up must be upcoming');
  assert.strictEqual(stages[3].status, 'upcoming', 'Result must be upcoming');

  assert.strictEqual(stages[0].labelEn, 'Consent');
  assert.strictEqual(stages[0].labelAr, 'الموافقة');
  assert.strictEqual(stages[1].labelEn, 'Symptoms');
  assert.strictEqual(stages[1].labelAr, 'وصف الأعراض');
  assert.strictEqual(stages[2].labelEn, 'Follow-up');
  assert.strictEqual(stages[2].labelAr, 'أسئلة المتابعة');
  assert.strictEqual(stages[3].labelEn, 'Result');
  assert.strictEqual(stages[3].labelAr, 'النتيجة');
  console.log('✅ PASS: Fresh session correctly starts with Consent as current and rest upcoming');

  // Test 2: After Consent Granted (IN_TRIAGE)
  console.log('\n--- Test 2: After Consent Granted Transitions to Symptoms ---');
  freshSession = await orchestrator.handleConsent(freshSession, true);
  stages = computeConversationStages(freshSession);

  assert.strictEqual(stages[0].status, 'completed', 'Consent must be completed after grant');
  assert.strictEqual(stages[1].status, 'current', 'Symptoms must be current after consent');
  assert.strictEqual(stages[2].status, 'upcoming', 'Follow-up must be upcoming');
  assert.strictEqual(stages[3].status, 'upcoming', 'Result must be upcoming');
  console.log('✅ PASS: Consent transitions to completed and Symptoms becomes current');

  // Test 3: Scenario with Follow-up Questions (Scenario 4)
  console.log('\n--- Test 3: Scenario with Follow-up Questions (Scenario 4) ---');
  const sc4 = DEMO_SCENARIOS.find((s) => s.id === 'sc-4-same-day-urgent')!;
  let sc4Session = await orchestrator.createNewSession('en', false);
  sc4Session = await orchestrator.handleConsent(sc4Session, true);

  // Send initial message
  sc4Session = await orchestrator.processPatientMessage(sc4Session, {
    text: sc4.initialMessageEn,
    isVoice: sc4.isVoiceSample,
    voiceDuration: sc4.voiceDurationSeconds,
    userCity: 'Riyadh',
  });

  assert.strictEqual(sc4Session.status, 'FOLLOW_UP', 'Scenario 4 must be in FOLLOW_UP');
  stages = computeConversationStages(sc4Session);
  assert.strictEqual(stages[0].status, 'completed', 'Consent is completed');
  assert.strictEqual(stages[1].status, 'completed', 'Symptoms is completed');
  assert.strictEqual(stages[2].status, 'current', 'Follow-up is current');
  assert.strictEqual(stages[3].status, 'upcoming', 'Result is upcoming');
  console.log('✅ PASS: Follow-up stage is marked current during active follow-up questions');

  // Answer follow-up question
  const followUpMsg = [...sc4Session.messages].reverse().find((m) => m.quickReplies && m.quickReplies.length > 0)!;
  const qrNone = followUpMsg.quickReplies!.find((q) => q.value === 'vision_change:none')!;
  sc4Session = await orchestrator.processPatientMessage(sc4Session, {
    text: qrNone.labelEn,
    quickReply: qrNone,
    parentMessageId: followUpMsg.id,
    userCity: 'Riyadh',
  });

  assert.strictEqual(sc4Session.status, 'COMPLETED', 'Scenario 4 must complete after follow-up');
  stages = computeConversationStages(sc4Session);
  assert.strictEqual(stages[0].status, 'completed', 'Consent is completed');
  assert.strictEqual(stages[1].status, 'completed', 'Symptoms is completed');
  assert.strictEqual(stages[2].status, 'completed', 'Follow-up is completed when answered');
  assert.strictEqual(stages[3].status, 'current', 'Result is active/current');
  console.log('✅ PASS: Completed follow-up scenario has Consent, Symptoms, Follow-up completed, and Result current');

  // Test 4: Direct Emergency Scenario (Scenario 2 - Chemical Splash)
  console.log('\n--- Test 4: Direct Emergency Scenario Skips Follow-up (Scenario 2) ---');
  const sc2 = DEMO_SCENARIOS.find((s) => s.id === 'sc-2-chemical-splash')!;
  let sc2Session = await orchestrator.createNewSession('ar', false);
  sc2Session = await orchestrator.handleConsent(sc2Session, true);

  // Send chemical splash initial message
  sc2Session = await orchestrator.processPatientMessage(sc2Session, {
    text: sc2.initialMessageAr,
    isVoice: sc2.isVoiceSample,
    voiceDuration: sc2.voiceDurationSeconds,
    userCity: 'Al-Ahsa / Hofuf',
  });

  assert.strictEqual(sc2Session.status, 'COMPLETED', 'Emergency scenario completes immediately');
  assert.strictEqual(sc2Session.followUpCount, 0, 'No follow-up questions asked');
  stages = computeConversationStages(sc2Session);

  assert.strictEqual(stages[0].status, 'completed', 'Consent is completed');
  assert.strictEqual(stages[1].status, 'completed', 'Symptoms is completed');
  assert.strictEqual(stages[2].status, 'skipped', 'Follow-up MUST be skipped for immediate emergency');
  assert.notStrictEqual(stages[2].status, 'completed', 'Follow-up must NOT be marked completed');
  assert.strictEqual(stages[3].status, 'current', 'Result is current');
  console.log('✅ PASS: Direct emergency scenario correctly marks Follow-up as SKIPPED, not completed');

  // Test 5: Resetting Demo Resets to Consent
  console.log('\n--- Test 5: Resetting Demo Resets Indicator to Consent ---');
  const resetSession = await orchestrator.createNewSession('ar', false);
  const resetStages = computeConversationStages(resetSession);
  assert.strictEqual(resetStages[0].status, 'current', 'Reset session must reset to Consent');
  assert.strictEqual(resetStages[1].status, 'upcoming');
  assert.strictEqual(resetStages[2].status, 'upcoming');
  assert.strictEqual(resetStages[3].status, 'upcoming');
  console.log('✅ PASS: Resetting demo resets indicator cleanly back to Consent');

  console.log('\n========================================');
  console.log('All Conversation Progress Indicator Tests Passed!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
