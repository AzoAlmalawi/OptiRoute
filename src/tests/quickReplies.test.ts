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

  // --------------------------------------------------------------------------
  // Group 7: Independent Trauma and Chemical-Exposure Follow-Up & Explanation
  // --------------------------------------------------------------------------
  console.log('\n--- Group 7: Independent Trauma and Chemical Follow-Up ---');

  let testSessTrauma = await orchestrator.createNewSession('ar');
  testSessTrauma = await orchestrator.handleConsent(testSessTrauma, true);

  // Vague message with no onset or trauma info
  testSessTrauma = await orchestrator.processPatientMessage(testSessTrauma, {
    text: 'عيني مضايقتني ومو مرتاح لها أبد.',
  });

  // Check if first asked about vision
  if (testSessTrauma.status === 'FOLLOW_UP') {
    const q1 = testSessTrauma.messages[testSessTrauma.messages.length - 1];
    // Answer vision as normal
    testSessTrauma = await orchestrator.processPatientMessage(testSessTrauma, {
      text: 'النظر طبيعي',
      parentMessageId: q1.id,
    });
  }

  // Next question for pain or trauma
  if (testSessTrauma.status === 'FOLLOW_UP') {
    const q2 = testSessTrauma.messages[testSessTrauma.messages.length - 1];
    testSessTrauma = await orchestrator.processPatientMessage(testSessTrauma, {
      text: 'لا يوجد ألم',
      parentMessageId: q2.id,
    });
  }

  // Now if asked about trauma:
  if (testSessTrauma.status === 'FOLLOW_UP') {
    const q3 = testSessTrauma.messages[testSessTrauma.messages.length - 1];
    if (q3.text?.includes('ضربة') || q3.text?.includes('إصابة')) {
      // Must NOT ask about cleaning chemicals in the same question
      assert(
        !q3.text?.includes('منظف') && !q3.text?.includes('كيماويات'),
        'Trauma question is independent and does not ask about chemicals'
      );
      // Answer trauma affirmative
      testSessTrauma = await orchestrator.processPatientMessage(testSessTrauma, {
        text: 'نعم تعرضت لضربة/إصابة',
        quickReply: {
          id: 'qr-trauma-yes',
          labelAr: 'نعم تعرضت لضربة/إصابة',
          labelEn: 'Yes, had trauma/injury',
          value: 'trauma:true',
          field: 'trauma',
          fieldValue: true,
        },
      });

      assert(testSessTrauma.symptoms.trauma === true, 'trauma is true');
      assert(
        testSessTrauma.symptoms.chemical_exposure === null,
        'chemical_exposure remains untouched (null) when answering trauma'
      );
      // Immediate emergency escalation
      assert(
        testSessTrauma.decision?.finalUrgency === 'EMERGENCY',
        'Direct trauma hit escalates immediately to EMERGENCY'
      );
    }
  }

  // Test Conservative Fallback explanation text on Scenario 6
  const sc6 = DEMO_SCENARIOS.find((s) => s.id === 'sc-6-unclear-incomplete');
  if (sc6) {
    let sc6Sess = await orchestrator.createNewSession('ar');
    sc6Sess = await orchestrator.handleConsent(sc6Sess, true);
    sc6Sess = await orchestrator.processPatientMessage(sc6Sess, {
      text: sc6.initialMessageAr,
    });
    // Respond "لست متأكدًا" to all follow-ups to trigger conservative fallback
    while (sc6Sess.status === 'FOLLOW_UP') {
      const lastMsg = sc6Sess.messages[sc6Sess.messages.length - 1];
      sc6Sess = await orchestrator.processPatientMessage(sc6Sess, {
        text: 'لست متأكدًا',
        parentMessageId: lastMsg.id,
      });
    }

    assert(
      sc6Sess.decision?.decisionSource === 'CONSERVATIVE_FALLBACK',
      'Unclear scenario resolves with CONSERVATIVE_FALLBACK'
    );
    assert(
      sc6Sess.decision?.guidanceTextAr.includes('عدم اكتمال أو غموض') === true,
      'Arabic guidance text explicitly mentions incomplete/unclear information'
    );
    assert(
      sc6Sess.decision?.guidanceTextEn.includes('incomplete or unclear') === true,
      'English guidance text explicitly mentions incomplete or unclear information'
    );
  }

  // --------------------------------------------------------------------------
  // Group 8: Reproduced Scenario 6 Path: Vision -> Pain -> Trauma -> Chemical -> Resolution
  // --------------------------------------------------------------------------
  console.log('\n--- Group 8: Reproduced Scenario 6 Flow ---');

  // Arabic test of exact reproduced flow
  let reproSessAr = await orchestrator.createNewSession('ar');
  reproSessAr = await orchestrator.handleConsent(reproSessAr, true);
  reproSessAr = await orchestrator.processPatientMessage(reproSessAr, {
    text: sc6?.initialMessageAr || 'والله مدري وش فيها عيني اليوم.',
  });
  assert(reproSessAr.status === 'FOLLOW_UP', 'Step 1: Starts in FOLLOW_UP');

  // Step 2: Answer vision: "النظر طبيعي"
  let lastMsg = reproSessAr.messages[reproSessAr.messages.length - 1];
  reproSessAr = await orchestrator.processPatientMessage(reproSessAr, {
    text: 'النظر طبيعي',
    parentMessageId: lastMsg.id,
  });
  assert(reproSessAr.status === 'FOLLOW_UP', 'Step 2: Still in FOLLOW_UP after vision');
  assert(reproSessAr.symptoms.vision_change === 'none', 'Vision is resolved as none');

  // Step 3: Answer pain: "لست متأكدًا"
  lastMsg = reproSessAr.messages[reproSessAr.messages.length - 1];
  reproSessAr = await orchestrator.processPatientMessage(reproSessAr, {
    text: 'لست متأكدًا',
    quickReply: {
      id: 'qr-pain-unknown',
      labelAr: 'لست متأكدًا',
      labelEn: 'Not sure',
      value: 'pain_level:unknown',
      field: 'pain_level',
      fieldValue: 'unknown',
    },
    parentMessageId: lastMsg.id,
  });
  assert(reproSessAr.status === 'FOLLOW_UP', 'Step 3: Still in FOLLOW_UP after pain');
  assert(reproSessAr.symptoms.pain_level === 'unknown', 'Pain is unknown');

  // Step 4: Answer trauma: "لا، لم أتعرض لإصابة"
  lastMsg = reproSessAr.messages[reproSessAr.messages.length - 1];
  assert(
    lastMsg.text?.includes('ضربة') || lastMsg.text?.includes('إصابة'),
    'Step 4 prompt is about trauma'
  );
  reproSessAr = await orchestrator.processPatientMessage(reproSessAr, {
    text: 'لا، لم أتعرض لإصابة',
    quickReply: {
      id: 'qr-trauma-no',
      labelAr: 'لا، لم أتعرض لإصابة',
      labelEn: 'No, no injury',
      value: 'trauma:false',
      field: 'trauma',
      fieldValue: false,
    },
    parentMessageId: lastMsg.id,
  });

  // Verify: Chemical question MUST be asked next, NOT prematurely finished!
  assert(
    reproSessAr.status === 'FOLLOW_UP',
    'Step 4: Session stays in FOLLOW_UP to clarify chemical exposure'
  );
  lastMsg = reproSessAr.messages[reproSessAr.messages.length - 1];
  assert(
    Boolean(lastMsg.text?.includes('منظف') || lastMsg.text?.includes('كيميائية')),
    `Step 5 prompt is chemical exposure question: "${lastMsg.text}"`
  );
  assert(
    reproSessAr.symptoms.trauma === false,
    'trauma is false'
  );
  assert(
    reproSessAr.symptoms.chemical_exposure === null,
    'chemical_exposure is still null before answering'
  );

  // Step 5a: If chemical is positive -> immediate EMERGENCY escalation
  let emergBranch = JSON.parse(JSON.stringify(reproSessAr));
  emergBranch = await orchestrator.processPatientMessage(emergBranch, {
    text: 'نعم دخل رذاذ منظف/كيماويات',
    quickReply: {
      id: 'qr-chem-yes',
      labelAr: 'نعم دخل رذاذ منظف/كيماويات',
      labelEn: 'Yes, chemical splash',
      value: 'chemical_exposure:true',
      field: 'chemical_exposure',
      fieldValue: true,
    },
    parentMessageId: lastMsg.id,
  });
  assert(
    emergBranch.status === 'COMPLETED' && emergBranch.decision?.finalUrgency === 'EMERGENCY',
    'Positive chemical answer immediately escalates to EMERGENCY'
  );

  // Step 5b: If chemical is "لست متأكدًا" -> completes with CONSERVATIVE_FALLBACK without looping
  reproSessAr = await orchestrator.processPatientMessage(reproSessAr, {
    text: 'لست متأكدًا',
    quickReply: {
      id: 'qr-chem-unknown',
      labelAr: 'لست متأكدًا',
      labelEn: 'Not sure',
      value: 'chemical_exposure:null',
      field: 'chemical_exposure',
      fieldValue: null,
    },
    parentMessageId: lastMsg.id,
  });
  assert(
    reproSessAr.status === 'COMPLETED',
    'Session completes safely after chemical question answered'
  );
  assert(
    reproSessAr.decision?.decisionSource === 'CONSERVATIVE_FALLBACK',
    'Fallback applied safely when details remain unknown'
  );

  // English test of the same flow
  let reproSessEn = await orchestrator.createNewSession('en');
  reproSessEn = await orchestrator.handleConsent(reproSessEn, true);
  reproSessEn = await orchestrator.processPatientMessage(reproSessEn, {
    text: sc6?.initialMessageEn || 'I am not sure what is wrong with my eye today.',
  });
  // Answer vision: Vision is normal
  let lastMsgEn = reproSessEn.messages[reproSessEn.messages.length - 1];
  reproSessEn = await orchestrator.processPatientMessage(reproSessEn, {
    text: 'Vision is normal',
    parentMessageId: lastMsgEn.id,
  });
  // Answer pain: Not sure
  lastMsgEn = reproSessEn.messages[reproSessEn.messages.length - 1];
  reproSessEn = await orchestrator.processPatientMessage(reproSessEn, {
    text: 'Not sure',
    quickReply: {
      id: 'qr-pain-unknown',
      labelAr: 'لست متأكدًا',
      labelEn: 'Not sure',
      value: 'pain_level:unknown',
      field: 'pain_level',
      fieldValue: 'unknown',
    },
    parentMessageId: lastMsgEn.id,
  });
  // Answer trauma: No, no injury
  lastMsgEn = reproSessEn.messages[reproSessEn.messages.length - 1];
  reproSessEn = await orchestrator.processPatientMessage(reproSessEn, {
    text: 'No, no injury',
    quickReply: {
      id: 'qr-trauma-no',
      labelAr: 'لا، لم أتعرض لإصابة',
      labelEn: 'No, no injury',
      value: 'trauma:false',
      field: 'trauma',
      fieldValue: false,
    },
    parentMessageId: lastMsgEn.id,
  });
  // Must ask chemical question
  assert(
    reproSessEn.status === 'FOLLOW_UP',
    'English flow stays in FOLLOW_UP for chemical question'
  );
  lastMsgEn = reproSessEn.messages[reproSessEn.messages.length - 1];
  assert(
    Boolean(lastMsgEn.text?.toLowerCase().includes('chemical') || lastMsgEn.text?.toLowerCase().includes('cleaning')),
    'English prompt asks about cleaning/chemical splash'
  );

  // --------------------------------------------------------------------------
  // Group 9: Answer Summary, Tri-State Distinctions, Field Corrections, and Sticky Emergency
  // --------------------------------------------------------------------------
  console.log('\n--- Group 9: Answer Summary & Field Correction Invariants ---');

  // 1. Check Scenario 4 Summary fields
  let g9Sess = await orchestrator.createNewSession('ar', false);
  g9Sess = await orchestrator.handleConsent(g9Sess, true);
  g9Sess = await orchestrator.processPatientMessage(g9Sess, {
    text: sc4.initialMessageAr,
    isVoice: sc4.isVoiceSample,
    voiceDuration: sc4.voiceDurationSeconds,
    userCity: sc4.locationCity,
  });

  // Answer vision to complete triage
  let lastPrompt = g9Sess.messages[g9Sess.messages.length - 1];
  g9Sess = await orchestrator.processPatientMessage(g9Sess, {
    text: 'النظر طبيعي',
    quickReply: STABLE_QUICK_REPLIES['vision_change:none'],
    parentMessageId: lastPrompt.id,
  });

  assert(g9Sess.status === 'COMPLETED', 'Session completes after vision answer');
  assert(g9Sess.decision?.finalUrgency === 'URGENT', 'Scenario 4 final urgency is URGENT');
  assert(g9Sess.symptoms.contact_lens === true, 'contact_lens is true in symptoms');
  assert(g9Sess.symptoms.chemical_exposure === false, 'chemical_exposure is false (denied)');
  assert(g9Sess.symptoms.trauma === false, 'trauma is false (denied)');
  assert(g9Sess.symptoms.nausea_vomiting === null, 'nausea_vomiting is null (unknown, not false)');

  // 2. Correcting an answer updates the field authoritatively and re-evaluates
  // If patient corrects vision_change to 'loss', RF-01 triggers immediate EMERGENCY
  g9Sess = await orchestrator.correctSymptomField(
    g9Sess,
    'vision_change',
    'loss',
    'ضعف أو فقدان شديد',
    'Severe vision loss'
  );

  assert(g9Sess.symptoms.vision_change === 'loss', 'vision_change is now updated to loss');
  assert(g9Sess.decision?.finalUrgency === 'EMERGENCY', 'Triage re-evaluated to EMERGENCY upon vision loss correction');
  assert(g9Sess.routedFacility?.tier === 'EMERGENCY', 'Facility re-routed to EMERGENCY tier');

  // 3. Sticky Emergency Invariant: Once emergency is reached, correcting a non-urgent field does NOT silently downgrade
  g9Sess = await orchestrator.correctSymptomField(
    g9Sess,
    'pain_level',
    'none',
    'لا يوجد ألم',
    'No pain'
  );
  assert(g9Sess.decision?.finalUrgency === 'EMERGENCY', 'Sticky emergency invariant maintained: emergency recommendation is NOT silently downgraded');

  // 5. Correcting chemical exposure from Yes to No:
  // Updates the current finding to false, preserves emergency recommendation with retained emergency explanation
  let chemSess = await orchestrator.createNewSession('ar', false);
  chemSess = await orchestrator.handleConsent(chemSess, true);
  // Initial message with vague symptom
  chemSess = await orchestrator.processPatientMessage(chemSess, {
    text: 'عيني مضايقتني شوي وابغى استشيركم',
  });
  // Trigger emergency via chemical exposure
  chemSess = await orchestrator.correctSymptomField(
    chemSess,
    'chemical_exposure',
    true,
    'نعم رذاذ مواد كيميائية أو منظفات',
    'Yes, chemical splash'
  );
  assert(chemSess.symptoms.chemical_exposure === true, 'chemical_exposure is true initially');
  assert(chemSess.decision?.finalUrgency === 'EMERGENCY', 'Triage is EMERGENCY due to chemical exposure');
  assert(!chemSess.decision?.isRetainedEmergency, 'Initial emergency is direct, not retained');

  // Now user corrects chemical exposure to "No" (false)
  chemSess = await orchestrator.correctSymptomField(
    chemSess,
    'chemical_exposure',
    false,
    'لا لم يدخل أي رذاذ كيميائي',
    'No chemical splash'
  );
  assert(chemSess.symptoms.chemical_exposure === false, 'Current finding for chemical_exposure is updated to false');
  assert(chemSess.decision?.finalUrgency === 'EMERGENCY', 'Emergency recommendation is preserved per non-downgrade policy');
  assert(chemSess.decision?.isRetainedEmergency === true, 'isRetainedEmergency flag is true');
  assert(
    chemSess.decision?.retainedEmergencyReasonAr?.includes('تم تحديث إجابتك') === true,
    'Arabic retained emergency explanation clearly explains retained precaution'
  );
  assert(
    chemSess.decision?.retainedEmergencyReasonEn?.includes('Your answer has been updated') === true,
    'English retained emergency explanation clearly explains retained precaution'
  );
  // Ensure the current ruleResult flags do NOT show RF-02 (chemical splash) as a currently confirmed finding
  assert(
    !chemSess.decision?.ruleResult.matchedFlags.some((f) => f.id === 'RF-02'),
    'Chemical splash is NOT labeled as a currently matched rule flag after correction to No'
  );

  // 6. Test redness and discharge corrections
  chemSess = await orchestrator.correctSymptomField(
    chemSess,
    'redness',
    true,
    'نعم احمرار في العين',
    'Yes, eye redness'
  );
  assert(chemSess.symptoms.redness === true, 'redness is correctly updated to true');

  chemSess = await orchestrator.correctSymptomField(
    chemSess,
    'discharge',
    false,
    'لا توجد إفرازات',
    'No discharge'
  );
  assert(chemSess.symptoms.discharge === false, 'discharge is correctly updated to false');

  chemSess = await orchestrator.correctSymptomField(
    chemSess,
    'discharge',
    null,
    'لست متأكداً',
    'Not sure'
  );
  assert(chemSess.symptoms.discharge === null, 'discharge can be set to null (Not sure, distinct from false)');

  console.log('\n========================================');
  console.log('All Follow-Up Quick Reply & Correction Tests Passed!');
  console.log('========================================\n');
}

runQuickReplyTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
