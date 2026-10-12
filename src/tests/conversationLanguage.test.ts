import assert from 'assert';
import {
  TriageOrchestrator,
  detectMessageLanguage,
} from '../services/triageOrchestrator';

console.log('=== Running OptiRoute Conversation Language Dynamic Adaptation Tests ===\n');

async function runTests() {
  const orchestrator = new TriageOrchestrator();

  // Test 0: Unit tests on detectMessageLanguage
  console.log('--- Test 0: Language Detection Unit Tests ---');
  assert.strictEqual(detectMessageLanguage('عندي ألم شديد في عيني اليسار', undefined, 'en'), 'ar');
  assert.strictEqual(detectMessageLanguage('I have severe pain in my left eye', undefined, 'ar'), 'en');
  assert.strictEqual(detectMessageLanguage('My eye hurts', undefined, 'ar'), 'en');
  assert.strictEqual(detectMessageLanguage('احمرار في العين', undefined, 'en'), 'ar');

  // Dominant language in mixed messages
  assert.strictEqual(detectMessageLanguage('عندي severe pain في العين اليسرى منذ يومين', undefined, 'en'), 'ar', 'More Arabic letters than English');
  assert.strictEqual(detectMessageLanguage('My left eye has severe pain and احمرار', undefined, 'ar'), 'en', 'More English letters than Arabic');

  // Ambiguous, short replies, emojis, numbers preserve prior conversation language
  assert.strictEqual(detectMessageLanguage('ok', 'ar', 'en'), 'ar', 'Short ambiguous reply preserves ar');
  assert.strictEqual(detectMessageLanguage('ok', 'en', 'ar'), 'en', 'Short ambiguous reply preserves en');
  assert.strictEqual(detectMessageLanguage('123', 'ar', 'en'), 'ar', 'Numbers preserve ar');
  assert.strictEqual(detectMessageLanguage('👍', 'ar', 'en'), 'ar', 'Emoji preserves ar');
  assert.strictEqual(detectMessageLanguage('👍', 'en', 'ar'), 'en', 'Emoji preserves en');
  console.log('✅ PASS: Unit tests for detectMessageLanguage passed');

  // Test 1: English interface + Arabic message -> Arabic reply & quick replies
  console.log('\n--- Test 1: English Interface + Arabic Message ---');
  const session1 = await orchestrator.createNewSession('en', false);
  const consented1 = await orchestrator.handleConsent(session1, true);
  const arabicMsg1 = 'عندي احمرار في عيني اليسار منذ ساعتين ولا يوجد ألم';
  const updated1 = await orchestrator.processPatientMessage(consented1, { text: arabicMsg1 });

  assert.strictEqual(updated1.language, 'en', 'Interface language must remain English');
  assert.strictEqual(updated1.conversationLanguage, 'ar', 'Conversation language must adapt to Arabic');

  const botMsg1 = updated1.messages[updated1.messages.length - 1];
  assert.strictEqual(botMsg1.sender, 'bot');
  assert.strictEqual(botMsg1.conversationLanguage, 'ar', 'Bot message must be tagged Arabic');

  // Verify Arabic character presence in bot response
  const hasArabic1 = /[\u0600-\u06FF]/.test(botMsg1.text || '');
  assert.ok(hasArabic1, 'Bot response must be in Arabic');
  console.log(`✅ PASS: Bot replied in Arabic: "${botMsg1.text?.slice(0, 45)}..."`);

  // Test 2: Arabic interface + English message -> English reply & quick replies
  console.log('\n--- Test 2: Arabic Interface + English Message ---');
  const session2 = await orchestrator.createNewSession('ar', false);
  const consented2 = await orchestrator.handleConsent(session2, true);
  const englishMsg2 = 'I have redness in my left eye since two hours and no pain';
  const updated2 = await orchestrator.processPatientMessage(consented2, { text: englishMsg2 });

  assert.strictEqual(updated2.language, 'ar', 'Interface language must remain Arabic');
  assert.strictEqual(updated2.conversationLanguage, 'en', 'Conversation language must adapt to English');

  const botMsg2 = updated2.messages[updated2.messages.length - 1];
  assert.strictEqual(botMsg2.sender, 'bot');
  assert.strictEqual(botMsg2.conversationLanguage, 'en', 'Bot message must be tagged English');

  // Verify English text in bot response
  const hasEnglish2 = /[a-zA-Z]/.test(botMsg2.text || '');
  assert.ok(hasEnglish2, 'Bot response must be in English');
  console.log(`✅ PASS: Bot replied in English: "${botMsg2.text?.slice(0, 45)}..."`);

  // Test 3: Switching message language mid-conversation updates subsequent replies
  console.log('\n--- Test 3: Switching Language Mid-Conversation ---');
  // Continuing session2 (which started in Arabic UI, then user spoke English)
  // Now user switches to Arabic in next turn
  const switchMsg3 = 'نعم ألبس عدسات لاصقة في عيني اليسار';
  const updated3 = await orchestrator.processPatientMessage(updated2, { text: switchMsg3 });
  assert.strictEqual(updated3.conversationLanguage, 'ar', 'Conversation language must switch to Arabic');

  const botMsg3 = updated3.messages[updated3.messages.length - 1];
  assert.strictEqual(botMsg3.conversationLanguage, 'ar', 'Subsequent bot reply must switch to Arabic');
  console.log(`✅ PASS: Bot adapted to mid-conversation switch to Arabic`);

  // Test 4: Short answers & quick replies preserve conversation language
  console.log('\n--- Test 4: Short Answers and Quick Replies Preserve Language ---');
  const session4 = await orchestrator.createNewSession('ar', false);
  const consented4 = await orchestrator.handleConsent(session4, true);
  // Start with English
  const resEng4 = await orchestrator.processPatientMessage(consented4, { text: 'I have redness in my right eye' });
  assert.strictEqual(resEng4.conversationLanguage, 'en');

  // Send a short ambiguous reply "ok" or click quick reply
  const resShort4 = await orchestrator.processPatientMessage(resEng4, {
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
  assert.strictEqual(resShort4.conversationLanguage, 'en', 'Quick reply must preserve existing conversation language');
  console.log('✅ PASS: Quick replies preserve conversation language');

  // Test 5: Equivalent Arabic & English answers produce identical triage decisions
  console.log('\n--- Test 5: Clinical Equivalence Across Languages ---');
  // Case A: Chemical splash in Arabic
  const sAr = await orchestrator.createNewSession('ar', false);
  const cAr = await orchestrator.handleConsent(sAr, true);
  const finalAr = await orchestrator.processPatientMessage(cAr, {
    text: 'دخل في عيني اليسار كلور ومادة منظفة مع حرقان شديد',
  });

  // Case B: Chemical splash in English
  const sEn = await orchestrator.createNewSession('en', false);
  const cEn = await orchestrator.handleConsent(sEn, true);
  const finalEn = await orchestrator.processPatientMessage(cEn, {
    text: 'Bleach and cleaning product splashed into my left eye with severe burning',
  });

  assert.strictEqual(finalAr.decision?.finalUrgency, finalEn.decision?.finalUrgency, 'Both must resolve to the same urgency');
  assert.strictEqual(finalAr.decision?.finalUrgency, 'EMERGENCY', 'Both must be EMERGENCY');
  assert.strictEqual(finalAr.symptoms.chemical_exposure, true);
  assert.strictEqual(finalEn.symptoms.chemical_exposure, true);
  console.log(`✅ PASS: Equivalent Arabic & English inputs produce identical triage decisions (${finalAr.decision?.finalUrgency})`);

  console.log('\n========================================');
  console.log('All Conversation Language Tests Passed Successfully!');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
