import assert from 'assert';
import { DemoSymptomExtractionProvider } from '../services/providers';
import { orchestrator } from '../services/triageOrchestrator';

console.log('=== Running OptiRoute Arabic Chemical Negation Regression Suite ===\n');

async function runTests() {
  const extractor = new DemoSymptomExtractionProvider();

  // Test 1: Exact input yields chemical_exposure = false
  console.log('--- Test 1: Exact Input Denying Trauma and Chemical Exposure ---');
  const exactInput =
    'بدأ فجأة ألم شديد جداً في عيني اليسرى مع احمرار. لم أتعرض لإصابة ولم تدخل عيني مادة كيميائية.';
  const res1 = await extractor.extract(exactInput, 'ar');
  assert.strictEqual(
    res1.symptoms.chemical_exposure,
    false,
    'Chemical exposure must be recognized as false'
  );
  assert.strictEqual(res1.symptoms.trauma, false, 'Trauma must be recognized as false');
  assert.strictEqual(res1.symptoms.eye, 'left', 'Eye must be left');
  assert.strictEqual(res1.symptoms.pain_level, 'severe', 'Pain level must be severe');
  assert.strictEqual(res1.symptoms.onset, 'sudden', 'Onset must be sudden');
  assert.strictEqual(res1.symptoms.redness, true, 'Redness must be true');
  console.log('✅ PASS: Exact input correctly extracts chemical_exposure=false and all clinical fields');

  // Test 2: Affirmative chemical input
  console.log('\n--- Test 2: Affirmative Chemical Input ---');
  const input2 = 'دخلت عيني مادة كيميائية';
  const res2 = await extractor.extract(input2, 'ar');
  assert.strictEqual(
    res2.symptoms.chemical_exposure,
    true,
    'Affirmative statement must yield chemical_exposure=true'
  );
  console.log('✅ PASS: Affirmative "دخلت عيني مادة كيميائية" yields true');

  // Test 3: Negated trauma, but affirmative chemical exposure
  console.log('\n--- Test 3: Negated Trauma, Adversative Affirmative Chemical ---');
  const input3 = 'لم أتعرض لإصابة، لكن دخلت عيني مادة كيميائية';
  const res3 = await extractor.extract(input3, 'ar');
  assert.strictEqual(res3.symptoms.trauma, false, 'Trauma must be false');
  assert.strictEqual(
    res3.symptoms.chemical_exposure,
    true,
    'Chemical exposure must be true after adversative clause'
  );
  console.log(
    '✅ PASS: "لم أتعرض لإصابة، لكن دخلت عيني مادة كيميائية" yields trauma=false and chemical_exposure=true'
  );

  // Test 4: No mention of chemicals leaves field Unknown (null)
  console.log('\n--- Test 4: Unmentioned Chemicals Remains Unknown ---');
  const input4 = 'بدأ فجأة ألم شديد جداً في عيني اليسرى مع احمرار. لم أتعرض لإصابة.';
  const res4 = await extractor.extract(input4, 'ar');
  assert.strictEqual(
    res4.symptoms.chemical_exposure,
    null,
    'Unmentioned chemicals must remain null (unknown)'
  );
  console.log('✅ PASS: No mention of chemicals preserves field as Unknown (null)');

  // Test 5: Exact negative input does not trigger redundant chemical question in orchestrator
  console.log('\n--- Test 5: Orchestrator Skips Redundant Chemical Question ---');
  let session = await orchestrator.createNewSession('ar', true);
  session = await orchestrator.handleConsent(session, true);
  session = await orchestrator.processPatientMessage(session, {
    text: exactInput,
    userCity: 'Riyadh',
  });
  assert.strictEqual(
    session.symptoms.chemical_exposure,
    false,
    'Session symptoms must store chemical_exposure=false'
  );
  const lastMsg = session.messages[session.messages.length - 1];
  const askedAboutChemicals =
    lastMsg?.text.includes('كيميائ') ||
    lastMsg?.text.includes('منظف') ||
    lastMsg?.text.includes('مادة');
  assert.strictEqual(
    askedAboutChemicals,
    false,
    'Orchestrator must NOT ask redundant follow-up question about chemical exposure'
  );
  console.log('✅ PASS: Orchestrator flow did not ask redundant chemical exposure question');

  console.log('\n========================================');
  console.log('All Arabic Chemical Negation Regression Tests Passed!');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
