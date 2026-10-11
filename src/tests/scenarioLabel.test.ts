import assert from 'assert';
import { orchestrator } from '../services/triageOrchestrator';
import { DEMO_SCENARIOS } from '../data/scenarios';
import { resolveSessionScenario, getSessionCaseDisplay } from '../utils/sessionScenario';
import { normalizeStoredSession } from '../services/providers';
import { TriageSession } from '../types/triage';

console.log('=== Running OptiRoute Scenario Label & Restoration Test Suite ===\n');

async function runTests() {
  // Test 1: Creating a session from a demo scenario persists scenarioId
  console.log('--- Test 1: Selecting Demo Scenario Persists scenarioId ---');
  const sc1 = DEMO_SCENARIOS.find((s) => s.id === 'sc-1-vision-loss')!;
  let session1 = await orchestrator.createNewSession('ar', true, sc1.id);

  assert.strictEqual(session1.scenarioId, 'sc-1-vision-loss', 'Session must have scenarioId set');
  
  // Save to repository and retrieve via getSession
  await orchestrator.repository.saveSession(session1);
  const retrieved1 = await orchestrator.repository.getSession(session1.id);
  assert.ok(retrieved1, 'Session must be retrieved from repository');
  assert.strictEqual(retrieved1.scenarioId, 'sc-1-vision-loss', 'Retrieved session must retain scenarioId');

  // Verify display
  let displayAr = getSessionCaseDisplay(retrieved1, 'ar');
  assert.strictEqual(displayAr.kind, 'scenario');
  assert.strictEqual(displayAr.title, sc1.titleAr);
  console.log('✅ PASS: Direct scenario session persists and restores scenario title in Arabic');

  // Test 2: Language Switching
  console.log('\n--- Test 2: Language Switching Restores Localized Scenario Title ---');
  let displayEn = getSessionCaseDisplay(retrieved1, 'en');
  assert.strictEqual(displayEn.kind, 'scenario');
  assert.strictEqual(displayEn.title, sc1.titleEn);
  console.log('✅ PASS: Switching to English shows English scenario title: ' + displayEn.title);

  // Test 3: Follow-up answers preserve scenario identity
  console.log('\n--- Test 3: Follow-Up Answers Preserve scenarioId ---');
  const sc4 = DEMO_SCENARIOS.find((s) => s.id === 'sc-4-same-day-urgent')!;
  let session4 = await orchestrator.createNewSession('en', true, sc4.id);
  session4 = await orchestrator.handleConsent(session4, true);

  session4 = await orchestrator.processPatientMessage(session4, {
    text: sc4.initialMessageEn,
    isVoice: sc4.isVoiceSample,
    voiceDuration: sc4.voiceDurationSeconds,
    userCity: 'Riyadh',
  });

  assert.strictEqual(session4.scenarioId, 'sc-4-same-day-urgent', 'scenarioId preserved after initial message');
  assert.strictEqual(session4.status, 'FOLLOW_UP');

  // Answer follow-up
  session4 = await orchestrator.processPatientMessage(session4, {
    text: 'Vision is normal',
    quickReply: {
      id: 'qr-vision-none',
      labelAr: 'النظر طبيعي',
      labelEn: 'Vision is normal',
      value: 'vision_change:none',
      field: 'vision_change',
      fieldValue: 'none',
    },
  });

  assert.strictEqual(session4.scenarioId, 'sc-4-same-day-urgent', 'scenarioId preserved after follow-up message');
  await orchestrator.repository.saveSession(session4);
  const retrieved4 = await orchestrator.repository.getSession(session4.id);
  assert.ok(retrieved4);
  assert.strictEqual(retrieved4.scenarioId, 'sc-4-same-day-urgent');
  assert.strictEqual(getSessionCaseDisplay(retrieved4, 'en').title, sc4.titleEn);
  console.log('✅ PASS: Follow-up questions and answers preserve scenarioId');

  // Test 4: Field corrections preserve scenario identity
  console.log('\n--- Test 4: Answer Corrections Preserve scenarioId ---');
  let corrected4 = await orchestrator.correctSymptomField(
    session4,
    'pain_level',
    'severe',
    'ألم شديد جداً',
    'Severe pain',
    'Riyadh'
  );

  assert.strictEqual(corrected4.scenarioId, 'sc-4-same-day-urgent', 'scenarioId preserved after correction');
  await orchestrator.repository.saveSession(corrected4);
  const retrievedCorrected = await orchestrator.repository.getSession(corrected4.id);
  assert.ok(retrievedCorrected);
  assert.strictEqual(retrievedCorrected.scenarioId, 'sc-4-same-day-urgent');
  assert.strictEqual(getSessionCaseDisplay(retrievedCorrected, 'en').title, sc4.titleEn);
  console.log('✅ PASS: Symptom field corrections preserve scenarioId');

  // Test 5: Fresh free-text demo session does not show previous scenario
  console.log('\n--- Test 5: New Free-Text Demo Clears Scenario Selection ---');
  let freeTextSession = await orchestrator.createNewSession('en', false);
  assert.strictEqual(freeTextSession.scenarioId, undefined, 'Fresh free-text session has no scenarioId');

  let freeTextDisplayEn = getSessionCaseDisplay(freeTextSession, 'en');
  assert.strictEqual(freeTextDisplayEn.kind, 'free_text');
  assert.strictEqual(freeTextDisplayEn.title, 'Custom simulated chat');

  let freeTextDisplayAr = getSessionCaseDisplay(freeTextSession, 'ar');
  assert.strictEqual(freeTextDisplayAr.kind, 'free_text');
  assert.strictEqual(freeTextDisplayAr.title, 'محادثة حرة افتراضية');
  console.log('✅ PASS: Fresh free-text session displays "Custom simulated chat" / "محادثة حرة افتراضية"');

  // Test 6: Older sessions with reliable metadata
  console.log('\n--- Test 6: Older Sessions with Existing Metadata Restored Accurately ---');
  // 6a: Seed session SES-9421-KSA (Chemical splash)
  const legacyEmergencySession = await orchestrator.repository.getSession('SES-9421-KSA');
  assert.ok(legacyEmergencySession, 'SES-9421-KSA exists in repo');
  const legacySc2 = resolveSessionScenario(legacyEmergencySession);
  assert.ok(legacySc2, 'Must resolve scenario for SES-9421-KSA');
  assert.strictEqual(legacySc2.id, 'sc-2-chemical-splash');
  assert.strictEqual(getSessionCaseDisplay(legacyEmergencySession, 'ar').title, DEMO_SCENARIOS.find(s => s.id === 'sc-2-chemical-splash')!.titleAr);
  console.log('✅ PASS: Seed emergency session SES-9421-KSA resolves to Chemical splash scenario');

  // 6b: Older session with audio fixture URL but no scenarioId
  const legacyAudioSession: TriageSession = {
    id: 'SES-LEGACY-AUDIO-1',
    patientMaskedPhone: '+966 50 *** 1111',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: 'ar',
    consentGiven: true,
    status: 'COMPLETED',
    followUpCount: 0,
    messages: [
      {
        id: 'msg-legacy-pt',
        sender: 'patient',
        type: 'voice',
        text: 'الصوت',
        audioUrl: 'https://example.com/demo-audio/ar/03-eye-injury.mp3',
        timestamp: new Date().toISOString(),
      },
    ],
    symptoms: {} as any,
    events: [],
    metadata: {} as any,
  };

  const resolvedAudioSc = resolveSessionScenario(legacyAudioSession);
  assert.ok(resolvedAudioSc, 'Should resolve scenario by audio URL');
  assert.strictEqual(resolvedAudioSc.id, 'sc-3-eye-trauma');
  console.log('✅ PASS: Older session with audio fixture resolves to Workshop eye trauma scenario');

  // 6c: Older session whose origin CANNOT be determined (e.g. ad-hoc typed messages)
  const legacyUnknownSession: TriageSession = {
    id: 'SES-LEGACY-UNKNOWN-1',
    patientMaskedPhone: '+966 50 *** 9999',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    language: 'ar',
    consentGiven: true,
    status: 'COMPLETED',
    followUpCount: 0,
    messages: [
      {
        id: 'msg-pt-unknown',
        sender: 'patient',
        type: 'text',
        text: 'عيني توجعني صار لي ثلاث أيام بدون إصابة',
        timestamp: new Date().toISOString(),
      },
    ],
    symptoms: {} as any,
    events: [
      { id: '1', timestamp: 'ts', type: 'SESSION_START', summaryAr: '', summaryEn: '' },
      { id: '2', timestamp: 'ts', type: 'CONSENT_GRANTED', summaryAr: '', summaryEn: '' },
      { id: '3', timestamp: 'ts', type: 'MESSAGE_RECEIVED', summaryAr: '', summaryEn: '' },
    ],
    metadata: {} as any,
  };

  const resolvedUnknown = resolveSessionScenario(legacyUnknownSession);
  assert.strictEqual(resolvedUnknown, null, 'Must NOT guess scenario from symptoms or generic text');

  const unknownDisplayEn = getSessionCaseDisplay(legacyUnknownSession, 'en');
  assert.strictEqual(unknownDisplayEn.kind, 'saved_conversation');
  assert.strictEqual(unknownDisplayEn.title, 'Saved conversation');

  const unknownDisplayAr = getSessionCaseDisplay(legacyUnknownSession, 'ar');
  assert.strictEqual(unknownDisplayAr.kind, 'saved_conversation');
  assert.strictEqual(unknownDisplayAr.title, 'محادثة محفوظة');
  console.log('✅ PASS: Older sessions without clear scenario metadata show neutral "Saved conversation" / "محادثة محفوظة"');

  // Test 7: normalizeStoredSession preserves scenarioId
  console.log('\n--- Test 7: normalizeStoredSession Preserves scenarioId ---');
  const normalized = normalizeStoredSession({
    id: 'SES-TEST-NORM',
    scenarioId: 'sc-1-vision-loss',
    status: 'COMPLETED',
  });
  assert.strictEqual(normalized.scenarioId, 'sc-1-vision-loss', 'Normalized session must preserve scenarioId');
  console.log('✅ PASS: normalizeStoredSession preserves scenarioId');

  console.log('\n========================================');
  console.log('All Scenario Label & Restoration Tests Passed!');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
