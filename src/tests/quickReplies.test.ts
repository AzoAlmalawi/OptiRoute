/**
 * Test Suite: Follow-up Quick-Reply Buttons Structured Field Updates
 *
 * Verifies:
 * 1. Each quick reply has a stable, language-independent value.
 * 2. Clicking "النظر طبيعي" or "Vision is normal" directly sets vision_change="none".
 * 3. Records the selected answer as evidence in the session history (events & answeredFields).
 * 4. Does not ask again about a field already answered unless later contradicted.
 * 5. Disables previous question buttons after they are answered.
 * 6. Preserves emergency precedence, session isolation, consent, and corrected facility routing.
 * 7. End-to-end tests for Scenario 4 in both Arabic and English.
 */

import { orchestrator, resolveQuickReplyFromInput, STABLE_QUICK_REPLIES } from '../services/triageOrchestrator';
import { DEMO_SCENARIOS } from '../data/scenarios';
import { QuickReplyOption, TriageSession } from '../types/triage';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runQuickReplyTests() {
  console.log('\n=== Running OptiRoute Follow-Up Quick Reply Test Suite ===\n');

  const sc4 = DEMO_SCENARIOS.find((s) => s.id === 'sc-4-same-day-urgent');
  assert(Boolean(sc4), 'Scenario 4 (sc-4-same-day-urgent) exists in DEMO_SCENARIOS');
  if (!sc4) return;

  // --------------------------------------------------------------------------
  // Group 1: Stable, Language-Independent Values & Resolver
  // --------------------------------------------------------------------------
  console.log('\n--- Group 1: Stable Language-Independent Quick Reply Values ---');

  const visionNormalQR = STABLE_QUICK_REPLIES['vision_change:none'];
  assert(Boolean(visionNormalQR), 'STABLE_QUICK_REPLIES has vision_change:none entry');
  assert(visionNormalQR.field === 'vision_change', 'Field is vision_change');
  assert(visionNormalQR.fieldValue === 'none', 'Field value is none');
  assert(visionNormalQR.value === 'vision_change:none', 'Value is language-independent string');
  assert(visionNormalQR.labelAr === 'النظر طبيعي', 'Arabic label is النظر طبيعي');
  assert(visionNormalQR.labelEn === 'Vision is normal', 'English label is Vision is normal');

  // Test resolveQuickReplyFromInput
  const resolvedFromAr = resolveQuickReplyFromInput('النظر طبيعي');
  assert(Boolean(resolvedFromAr), 'Resolves from Arabic label "النظر طبيعي"');
  assert(resolvedFromAr?.field === 'vision_change' && resolvedFromAr?.fieldValue === 'none', 'Directly maps to vision_change="none"');

  const resolvedFromLegacyAr = resolveQuickReplyFromInput('النظر طبيعي ما تغير');
  assert(Boolean(resolvedFromLegacyAr), 'Resolves from legacy displayed string "النظر طبيعي ما تغير"');
  assert(resolvedFromLegacyAr?.field === 'vision_change' && resolvedFromLegacyAr?.fieldValue === 'none', 'Maps to vision_change="none"');

  const resolvedFromEn = resolveQuickReplyFromInput('Vision is normal');
  assert(Boolean(resolvedFromEn), 'Resolves from English label "Vision is normal"');
  assert(resolvedFromEn?.field === 'vision_change' && resolvedFromEn?.fieldValue === 'none', 'Directly maps to vision_change="none"');

  const resolvedFromStableVal = resolveQuickReplyFromInput('vision_change:none');
  assert(Boolean(resolvedFromStableVal), 'Resolves from stable value "vision_change:none"');
  assert(resolvedFromStableVal?.field === 'vision_change' && resolvedFromStableVal?.fieldValue === 'none', 'Maps to vision_change="none"');

  const customQROption: QuickReplyOption = {
    id: 'qr-vision-none',
    labelAr: 'النظر طبيعي',
    labelEn: 'Vision is normal',
    value: 'vision_change:none',
    field: 'vision_change',
    fieldValue: 'none',
  };
  const resolvedFromObj = resolveQuickReplyFromInput('', customQROption);
  assert(Boolean(resolvedFromObj), 'Resolves from QuickReplyOption object');
  assert(resolvedFromObj?.field === 'vision_change' && resolvedFromObj?.fieldValue === 'none', 'Object maps to vision_change="none"');

  // --------------------------------------------------------------------------
  // Group 2: Arabic Scenario 4 - Quick Reply Directly Sets vision_change="none"
  // --------------------------------------------------------------------------
  console.log('\n--- Group 2: Arabic Scenario 4 - Single Answer Updates vision_change ---');

  // 1. Create fresh session
  let arSession = await orchestrator.createNewSession('ar');
  assert(arSession.status === 'AWAITING_CONSENT', 'Arabic Session starts AWAITING_CONSENT');

  // 2. Grant explicit consent
  arSession = await orchestrator.handleConsent(arSession, true);
  assert(arSession.consentGiven === true, 'Consent given for Arabic session');

  // 3. Send Scenario 4 initial message
  arSession = await orchestrator.processPatientMessage(arSession, {
    text: sc4.initialMessageAr,
    isVoice: sc4.isVoiceSample,
    voiceDuration: sc4.voiceDurationSeconds,
    userCity: sc4.locationCity,
  });

  // Verify it asks follow-up about vision changes
  assert(arSession.status === 'FOLLOW_UP', 'Session transitions to FOLLOW_UP');
  assert(arSession.followUpCount === 1, 'followUpCount is 1');
  assert(arSession.symptoms.vision_change === 'unknown', 'Initial vision_change is unknown');

  const lastBotMsg = arSession.messages.find(
    (m) => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0
  );
  assert(Boolean(lastBotMsg), 'Bot sends a message with quickReplies');
  assert(
    lastBotMsg?.quickReplies?.some((qr) => qr.value === 'vision_change:none') === true,
    'QuickReplies contains stable vision_change:none option'
  );

  const normalVisionReply = lastBotMsg?.quickReplies?.find((qr) => qr.value === 'vision_change:none')!;
  assert(normalVisionReply.labelAr === 'النظر طبيعي', 'Arabic label is "النظر طبيعي"');
  assert(normalVisionReply.field === 'vision_change', 'QR field is "vision_change"');
  assert(normalVisionReply.fieldValue === 'none', 'QR fieldValue is "none"');

  // 4. Patient clicks "النظر طبيعي" ONCE
  arSession = await orchestrator.processPatientMessage(arSession, {
    text: normalVisionReply.labelAr,
    quickReply: normalVisionReply,
    parentMessageId: lastBotMsg?.id,
    userCity: sc4.locationCity,
  });

  // 5. Confirm the field changes IMMEDIATELY to "none"
  assert(
    arSession.symptoms.vision_change === 'none',
    'vision_change changes immediately to "none" (not unknown)'
  );

  // 6. Confirm the answer is recorded as evidence in session history
  assert(
    Boolean(arSession.answeredFields?.vision_change),
    'answeredFields contains vision_change record'
  );
  assert(
    arSession.answeredFields?.vision_change.value === 'none',
    'answeredFields.vision_change value is "none"'
  );

  const evidenceEvt = arSession.events.find(
    (e) => e.type === 'MESSAGE_RECEIVED' && (e.summaryAr.includes('vision_change') || e.summaryEn.includes('vision_change'))
  );
  assert(Boolean(evidenceEvt), 'Clinical evidence event recorded in session events');

  // 7. Confirm the bot does NOT repeat the vision question!
  // Count how many times vision question was asked
  const visionQuestions = arSession.messages.filter(
    (m) => m.sender === 'bot' && m.text && m.text.includes('هل لاحظت أي تغير في قوة النظر')
  );
  assert(
    visionQuestions.length === 1,
    `Vision question was asked exactly 1 time, NOT repeated (count=${visionQuestions.length})`
  );

  // 8. Confirm previous question buttons are marked answered
  const previousPrompt = arSession.messages.find((m) => m.id === lastBotMsg?.id);
  assert(previousPrompt?.isAnswered === true, 'Previous question message isAnswered is true');
  assert(
    previousPrompt?.selectedQuickReplyId === normalVisionReply.id,
    'Previous question message selectedQuickReplyId is set'
  );

  // 9. Confirm the final decision & facility routing remains appropriate to final urgency
  assert(
    arSession.decision?.finalUrgency === 'URGENT',
    `Final urgency is URGENT (actual: ${arSession.decision?.finalUrgency})`
  );
  assert(
    arSession.routedFacility !== undefined,
    'Routed facility is populated'
  );
  assert(
    arSession.routedFacility?.tier === 'URGENT',
    `Routed facility tier is URGENT (actual: ${arSession.routedFacility?.tier})`
  );
  assert(
    arSession.routedFacility?.hasEmergencyEyeCare === false,
    'Routed facility is NOT an emergency department'
  );
  assert(
    arSession.routedFacility?.city === 'Riyadh',
    'Routed facility is in patient city (Riyadh)'
  );

  // --------------------------------------------------------------------------
  // Group 3: English Scenario 4 - Quick Reply Updates vision_change="none"
  // --------------------------------------------------------------------------
  console.log('\n--- Group 3: English Scenario 4 - Single Answer Updates vision_change ---');

  // 1. Create fresh session in English
  let enSession = await orchestrator.createNewSession('en');
  assert(enSession.status === 'AWAITING_CONSENT', 'English Session starts AWAITING_CONSENT');

  // 2. Grant explicit consent
  enSession = await orchestrator.handleConsent(enSession, true);

  // 3. Send Scenario 4 initial message in English
  enSession = await orchestrator.processPatientMessage(enSession, {
    text: sc4.initialMessageEn,
    isVoice: sc4.isVoiceSample,
    voiceDuration: sc4.voiceDurationSeconds,
    userCity: sc4.locationCity,
  });

  assert(enSession.status === 'FOLLOW_UP', 'English session status is FOLLOW_UP');
  assert(enSession.symptoms.vision_change === 'unknown', 'Initial English vision_change is unknown');

  const enBotMsg = enSession.messages.find(
    (m) => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0
  );
  assert(Boolean(enBotMsg), 'Bot sends follow-up with quick replies in English');

  const enNormalVisionReply = enBotMsg?.quickReplies?.find((qr) => qr.value === 'vision_change:none')!;
  assert(enNormalVisionReply.labelEn === 'Vision is normal', 'English label is "Vision is normal"');

  // 4. Patient clicks "Vision is normal" ONCE
  enSession = await orchestrator.processPatientMessage(enSession, {
    text: enNormalVisionReply.labelEn,
    quickReply: enNormalVisionReply,
    parentMessageId: enBotMsg?.id,
    userCity: sc4.locationCity,
  });

  // 5. Confirm field changes immediately to "none"
  assert(
    enSession.symptoms.vision_change === 'none',
    'English session: vision_change changes immediately to "none"'
  );

  // 6. Confirm answeredFields recorded
  assert(
    enSession.answeredFields?.vision_change.value === 'none',
    'English session: answeredFields.vision_change is "none"'
  );

  // 7. Confirm vision question NOT repeated
  const enVisionQuestions = enSession.messages.filter(
    (m) => m.sender === 'bot' && m.text && m.text.includes('Have you noticed any change in your vision')
  );
  assert(
    enVisionQuestions.length === 1,
    `English vision question was asked exactly 1 time, NOT repeated (count=${enVisionQuestions.length})`
  );

  // 8. Confirm previous question buttons disabled / answered
  const enPrevPrompt = enSession.messages.find((m) => m.id === enBotMsg?.id);
  assert(enPrevPrompt?.isAnswered === true, 'English previous prompt isAnswered is true');

  // 9. Confirm final decision & routing
  assert(
    enSession.decision?.finalUrgency === 'URGENT',
    `English session: final urgency is URGENT (actual: ${enSession.decision?.finalUrgency})`
  );
  assert(
    enSession.routedFacility?.tier === 'URGENT',
    `English session: routed facility tier is URGENT (actual: ${enSession.routedFacility?.tier})`
  );

  // --------------------------------------------------------------------------
  // Group 4: Non-Repetition Invariant (Never Asks Already-Answered Field)
  // --------------------------------------------------------------------------
  console.log('\n--- Group 4: Non-Repetition Invariant ---');

  // Create session where vision_change is known, pain is unknown
  let testSess = await orchestrator.createNewSession('ar');
  testSess = await orchestrator.handleConsent(testSess, true);

  testSess = await orchestrator.processPatientMessage(testSess, {
    text: 'عيني حمراء من أمس وألبس عدسات والنظر طبيعي.',
  });

  assert(testSess.symptoms.vision_change === 'none', 'Vision is recognized as none');
  assert(testSess.symptoms.contact_lens === true, 'Contact lens is recognized as true');
  assert(testSess.symptoms.pain_level === 'unknown', 'Pain is initially unknown');

  // Follow-up question should ask about pain level, NOT vision!
  const followUpMsg1 = testSess.messages.find(
    (m) => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0
  );
  assert(
    followUpMsg1?.text?.includes('مستوى الألم') === true,
    'Follow-up asks about pain level, skipping already-known vision field'
  );
  assert(
    !followUpMsg1?.text?.includes('تغير في قوة النظر'),
    'Does NOT ask about vision change because vision was already known'
  );

  // Patient answers pain with quick-reply "لا يوجد ألم"
  const noPainQR = followUpMsg1?.quickReplies?.find((q) => q.value === 'pain_level:none')!;
  testSess = await orchestrator.processPatientMessage(testSess, {
    text: noPainQR.labelAr,
    quickReply: noPainQR,
    parentMessageId: followUpMsg1?.id,
  });

  assert(testSess.symptoms.pain_level === 'none', 'Pain level updated immediately to "none"');
  assert(testSess.answeredFields?.pain_level.value === 'none', 'pain_level recorded in answeredFields');

  // Bot should NOT repeat the pain question!
  const painQuestions = testSess.messages.filter(
    (m) => m.sender === 'bot' && m.text && m.text.includes('مستوى الألم')
  );
  assert(
    painQuestions.length === 1,
    `Pain question was asked exactly 1 time, NOT repeated (count=${painQuestions.length})`
  );

  // --------------------------------------------------------------------------
  // Group 5: Emergency Precedence Overrides Follow-ups
  // --------------------------------------------------------------------------
  console.log('\n--- Group 5: Emergency Precedence Invariant ---');

  let emergSess = await orchestrator.createNewSession('ar');
  emergSess = await orchestrator.handleConsent(emergSess, true);

  // Severe trauma with chemical splash
  emergSess = await orchestrator.processPatientMessage(emergSess, {
    text: 'انكب فلاش منظف كيميائي في عيني وألم شديد جداً وفقدت النظر!',
  });

  assert(
    emergSess.status === 'COMPLETED',
    'Emergency case finishes immediately without waiting for follow-ups (status=COMPLETED)'
  );
  assert(
    emergSess.decision?.finalUrgency === 'EMERGENCY',
    'Emergency case finalUrgency is EMERGENCY'
  );
  assert(
    emergSess.routedFacility?.hasEmergencyEyeCare === true,
    'Emergency case routed to emergency eye facility'
  );

  // --------------------------------------------------------------------------
  // Group 6: 'Not sure' / 'لست متأكدًا' treated as unknown, does not loop
  // --------------------------------------------------------------------------
  console.log('\n--- Group 6: Not Sure Triaged Safely Without Looping ---');

  let notSureSess = await orchestrator.createNewSession('ar');
  notSureSess = await orchestrator.handleConsent(notSureSess, true);

  // Patient with ambiguous corneal issue (red eye, light sensitivity, unknown vision change)
  notSureSess = await orchestrator.processPatientMessage(notSureSess, {
    text: 'عيني اليمين محمرة وتوجعني من أمس وفيها تحسس من النور، ونظري ما راح فجأة.',
  });
  assert(notSureSess.status === 'FOLLOW_UP', 'Prompts for follow-up on unknown vision change');

  // Patient answers "لست متأكدًا"
  notSureSess = await orchestrator.processPatientMessage(notSureSess, {
    text: 'لست متأكدًا',
    quickReply: {
      id: 'qr-vision-unknown',
      labelAr: 'لست متأكدًا',
      labelEn: 'Not sure',
      value: 'vision_change:unknown',
      field: 'vision_change',
      fieldValue: 'unknown',
    },
  });

  // Vision change remains unknown (not false / none)
  assert(
    notSureSess.symptoms.vision_change === 'unknown',
    '"لست متأكدًا" preserves vision_change as unknown (NOT none or false)'
  );
  assert(
    Boolean(notSureSess.answeredFields?.vision_change),
    'vision_change is recorded in answeredFields to prevent re-asking'
  );

  // Ensure system does not re-ask about vision change
  const reaskedVision = notSureSess.messages.filter(
    (m) => m.sender === 'bot' && m.text && m.text.includes('تغير في قوة النظر')
  );
  assert(
    reaskedVision.length === 1,
    `Vision question was not asked again after 'Not sure' (count=${reaskedVision.length})`
  );

  console.log('\n========================================');
  console.log('All Follow-Up Quick Reply Tests Passed!');
  console.log('========================================\n');
}

runQuickReplyTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
