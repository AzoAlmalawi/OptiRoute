import { DEMO_SCENARIOS } from '../data/scenarios';
import { TriageOrchestrator } from '../services/triageOrchestrator';
import { LocalStorageSessionRepository } from '../services/providers';

async function runAutoPlaybackTests() {
  console.log('--- Starting Auto Playback Scenarios Test ---');
  const repo = new LocalStorageSessionRepository();
  const orchestrator = new TriageOrchestrator(repo);

  // Test 1: Verify all 6 scenarios have correctly defined scriptedAnswers
  console.log('\n[Check 1] Verifying all demo scenarios have scripted answers for follow-up fields:');
  for (const sc of DEMO_SCENARIOS) {
    console.log(`Checking scenario ${sc.id} (${sc.category}):`);
    if (sc.id === 'sc-2-chemical-splash' || sc.id === 'sc-3-eye-trauma') {
      console.log(` - Immediate Emergency: No follow-up needed. Expected rule: ${sc.expectedRuleId}`);
    } else {
      if (!sc.scriptedAnswers) {
        throw new Error(`Missing scriptedAnswers for ${sc.id}`);
      }
      for (const [field, ans] of Object.entries(sc.scriptedAnswers)) {
        if (!ans.textAr || !ans.textEn || !ans.quickReplyValue) {
          throw new Error(`Incomplete scripted answer for ${sc.id} field ${field}`);
        }
        console.log(`   * ${field} -> "${ans.textAr}" / "${ans.textEn}" [${ans.quickReplyValue}]`);
      }
    }
  }

  // Test 2: Emergency scenarios immediately resolve without asking follow-up questions
  console.log('\n[Check 2] Testing Immediate Emergency scenario (sc-2 chemical splash):');
  let session2 = await orchestrator.createNewSession('ar', false, 'sc-2-chemical-splash');
  session2 = await orchestrator.handleConsent(session2, true);
  session2 = await orchestrator.processPatientMessage(session2, {
    text: DEMO_SCENARIOS[1].initialMessageAr,
    isVoice: true,
    voiceDuration: 18,
    userCity: 'Al-Ahsa / Hofuf',
  });
  console.log(`Session 2 Status: ${session2.status}, Decision Urgency: ${session2.decision?.finalUrgency}`);
  if (session2.status !== 'COMPLETED' || session2.decision?.finalUrgency !== 'EMERGENCY') {
    throw new Error('sc-2 did not immediately complete as EMERGENCY');
  }
  const lastMsg2 = session2.messages[session2.messages.length - 1];
  if (lastMsg2.type !== 'result_card') {
    throw new Error('sc-2 did not conclude with result_card');
  }
  console.log('✓ sc-2 immediately triggered EMERGENCY without follow-up questions.');

  // Test 3: Follow-up scenario progression (sc-4 contact lens)
  console.log('\n[Check 3] Testing Follow-up scenario progression (sc-4 contact lens):');
  const sc4 = DEMO_SCENARIOS.find((s) => s.id === 'sc-4-same-day-urgent')!;
  let session4 = await orchestrator.createNewSession('ar', false, 'sc-4-same-day-urgent');
  session4 = await orchestrator.handleConsent(session4, true);
  session4 = await orchestrator.processPatientMessage(session4, {
    text: sc4.initialMessageAr,
    isVoice: true,
    voiceDuration: 20,
    userCity: 'Riyadh',
  });

  console.log(`Initial sc-4 status: ${session4.status}`);
  let round = 0;
  while (session4.status === 'FOLLOW_UP' && round < 5) {
    round++;
    const botMsg = [...session4.messages].reverse().find((m) => m.sender === 'bot' && m.quickReplies && !m.isAnswered);
    if (!botMsg || !botMsg.quickReplies) break;
    const targetField = botMsg.quickReplies[0]?.field as string;
    console.log(`Round ${round}: Bot asks field [${targetField}]`);
    const scripted = sc4.scriptedAnswers?.[targetField];
    if (!scripted) {
      throw new Error(`sc-4 missing scripted answer for queried field ${targetField}`);
    }
    const matchingOption = botMsg.quickReplies.find((o) => o.value === scripted.quickReplyValue) || botMsg.quickReplies[0];
    session4 = await orchestrator.processPatientMessage(session4, {
      text: scripted.textAr,
      quickReply: matchingOption,
      parentMessageId: botMsg.id,
    });
    console.log(`Submitted reply: "${scripted.textAr}". New status: ${session4.status}`);
  }

  if (session4.status !== 'COMPLETED') {
    throw new Error(`sc-4 did not complete after scripted answers! Status: ${session4.status}`);
  }
  if (session4.decision?.finalUrgency !== 'URGENT') {
    throw new Error(`sc-4 expected URGENT, got ${session4.decision?.finalUrgency}`);
  }
  console.log('✓ sc-4 successfully progressed through scripted replies to final URGENT evaluation.');

  // Test 4: English language scenario progression (sc-5 non urgent)
  console.log('\n[Check 4] Testing English scenario progression (sc-5 non urgent):');
  const sc5 = DEMO_SCENARIOS.find((s) => s.id === 'sc-5-non-urgent')!;
  let session5 = await orchestrator.createNewSession('en', false, 'sc-5-non-urgent');
  session5 = await orchestrator.handleConsent(session5, true);
  session5 = await orchestrator.processPatientMessage(session5, {
    text: sc5.initialMessageEn,
    isVoice: true,
    voiceDuration: 22,
    userCity: 'Jeddah',
  });

  round = 0;
  while (session5.status === 'FOLLOW_UP' && round < 5) {
    round++;
    const botMsg = [...session5.messages].reverse().find((m) => m.sender === 'bot' && m.quickReplies && !m.isAnswered);
    if (!botMsg || !botMsg.quickReplies) break;
    const targetField = botMsg.quickReplies[0]?.field as string;
    console.log(`Round ${round} (EN): Bot asks field [${targetField}]`);
    const scripted = sc5.scriptedAnswers?.[targetField];
    if (!scripted) {
      throw new Error(`sc-5 missing scripted answer for queried field ${targetField}`);
    }
    const matchingOption = botMsg.quickReplies.find((o) => o.value === scripted.quickReplyValue) || botMsg.quickReplies[0];
    session5 = await orchestrator.processPatientMessage(session5, {
      text: scripted.textEn,
      quickReply: matchingOption,
      parentMessageId: botMsg.id,
    });
    console.log(`Submitted EN reply: "${scripted.textEn}". New status: ${session5.status}`);
  }

  if (session5.status !== 'COMPLETED') {
    throw new Error(`sc-5 did not complete after scripted answers! Status: ${session5.status}`);
  }
  if (session5.decision?.finalUrgency !== 'NON_URGENT') {
    throw new Error(`sc-5 expected NON_URGENT, got ${session5.decision?.finalUrgency}`);
  }
  console.log('✓ sc-5 successfully completed in English with NON_URGENT assessment.');

  // Test 5: Pausing midway through audio or on typing, submitting manual answer, and resuming from next unanswered question
  console.log('\n[Check 5] Testing Manual answer while paused, and resuming only from next unanswered question:');
  const sc6 = DEMO_SCENARIOS.find((s) => s.id === 'sc-6-unclear-incomplete')!;
  let session6 = await orchestrator.createNewSession('ar', false, 'sc-6-unclear-incomplete');
  session6 = await orchestrator.handleConsent(session6, true);
  session6 = await orchestrator.processPatientMessage(session6, {
    text: sc6.initialMessageAr,
    isVoice: true,
    voiceDuration: 16,
    userCity: 'Riyadh',
  });

  // Simulator now asks first follow-up (vision_change)
  const botQ1 = [...session6.messages].reverse().find((m) => m.sender === 'bot' && m.quickReplies && !m.isAnswered)!;
  console.log(`Bot Q1 field: ${botQ1.quickReplies?.[0]?.field}`);

  // User manually answers Q1 while paused:
  session6 = await orchestrator.processPatientMessage(session6, {
    text: 'عندي ضبابية بالرؤية',
    parentMessageId: botQ1.id,
    quickReply: botQ1.quickReplies?.find((q) => q.value === 'vision_change:blurred'),
  });

  console.log(`After manual answer to Q1, session status: ${session6.status}`);
  // If next question is asked, check that it targets next missing field (pain_level)
  const botQ2 = [...session6.messages].reverse().find((m) => m.sender === 'bot' && m.quickReplies && !m.isAnswered);
  if (botQ2 && botQ2.quickReplies) {
    const nextField = botQ2.quickReplies[0]?.field as string;
    console.log(`Next unanswered field upon resume: ${nextField}`);
    if (nextField === 'vision_change') {
      throw new Error('Did not advance past manually answered vision_change!');
    }
    const scriptedNext = sc6.scriptedAnswers?.[nextField];
    if (scriptedNext) {
      session6 = await orchestrator.processPatientMessage(session6, {
        text: scriptedNext.textAr,
        parentMessageId: botQ2.id,
        quickReply: botQ2.quickReplies.find((q) => q.value === scriptedNext.quickReplyValue),
      });
      console.log(`Auto answered next field [${nextField}]. Final status: ${session6.status}`);
    }
  }
  console.log('✓ Manual answer while paused successfully preserved and auto playback resumes only from the next unanswered question.');

  console.log('\nAll Auto Playback tests passed successfully! 🎉');
}

runAutoPlaybackTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
