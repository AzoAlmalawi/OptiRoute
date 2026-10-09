/**
 * Comprehensive Automated Safety, Negation & Rule Engine Test Suite for Baseera
 * Verifies core PRD clinical and governance invariants:
 * 1. NEGATION REGRESSION: Exact reported input and Arabic equivalent
 * 2. POSITIVE CONTROLS: Genuine affirmative red flags are detected
 * 3. CONFLICTING STATEMENTS: Handled as UNCERTAIN / conservative
 * 4. PRECEDENCE INVARIANT: Model CANNOT downgrade an emergency rule
 * 5. CONSERVATIVE FALLBACK: Missing / unknown info escalates to URGENT
 * 6. STICKY EMERGENCY: Emergency status preserved across session lifetime
 * 7. LOW MODEL CONFIDENCE: Escalates urgency by 1 level
 * 8. EXPLICIT CONSENT: No triage before consent
 */

import {
  evaluateRawTextSafety,
  evaluateStructuredFields,
  runDeterministicRuleEngine,
  resolveTriageDecision,
  checkHasRequiredNonUrgentInfo,
} from '../safety/ruleEngine';
import {
  createEmptySymptoms,
  DemoSymptomExtractionProvider,
} from '../services/providers';
import { ModelSuggestion, TriageDecision } from '../types/triage';
import { orchestrator } from '../services/triageOrchestrator';

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

export async function runAllSafetyTests() {
  console.log('=== Running OptiRoute Clinical Safety & Negation Regression Suite ===\n');

  const extractor = new DemoSymptomExtractionProvider();

  // -------------------------------------------------------------
  // TEST GROUP 1: NEGATION REGRESSION TESTS
  // -------------------------------------------------------------
  console.log('--- Group 1: Negation Regression Tests ---');

  // Exact English input from regression report
  const exactEnText =
    'Synthetic test: I have mild itching in both eyes for two weeks. No chemical exposure, no trauma, no sudden vision loss, no severe pain.';
  const exactEnExtracted = await extractor.extract(exactEnText, 'en');
  const exactEnRules = runDeterministicRuleEngine([exactEnText], exactEnExtracted.symptoms);
  const exactEnDecision = resolveTriageDecision(
    exactEnRules,
    undefined,
    undefined,
    { isFinal: true, symptoms: exactEnExtracted.symptoms }
  );

  assert(
    exactEnExtracted.symptoms.chemical_exposure === false,
    'Regression EN: chemical_exposure is false (NOT positive true)'
  );
  assert(
    exactEnExtracted.symptoms.trauma === false,
    'Regression EN: trauma is false (NOT positive true)'
  );
  assert(
    exactEnExtracted.symptoms.vision_change === 'none',
    'Regression EN: vision_change is none (NOT loss)'
  );
  assert(
    exactEnExtracted.symptoms.onset === 'gradual',
    'Regression EN: onset is gradual (NOT sudden)'
  );
  assert(
    exactEnExtracted.symptoms.pain_level === 'mild',
    'Regression EN: pain_level is mild (NOT severe)'
  );
  assert(
    exactEnRules.matchedFlags.length === 0,
    'Regression EN: Rule engine matched ZERO red flags'
  );
  assert(
    exactEnDecision.finalUrgency === 'NON_URGENT',
    'Regression EN: Final urgency resolves as NON_URGENT'
  );

  // Equivalent Arabic input
  const exactArText =
    'فحص افتراضي: حكة خفيفة في كلتا العينين منذ أسبوعين. لا يوجد تعرض كيميائي، ولا إصابة، ولا فقدان مفاجئ للنظر، ولا ألم شديد.';
  const exactArExtracted = await extractor.extract(exactArText, 'ar');
  const exactArRules = runDeterministicRuleEngine([exactArText], exactArExtracted.symptoms);
  const exactArDecision = resolveTriageDecision(
    exactArRules,
    undefined,
    undefined,
    { isFinal: true, symptoms: exactArExtracted.symptoms }
  );

  assert(
    exactArExtracted.symptoms.chemical_exposure === false,
    'Regression AR: chemical_exposure is false (NOT positive true)'
  );
  assert(
    exactArExtracted.symptoms.trauma === false,
    'Regression AR: trauma is false (NOT positive true)'
  );
  assert(
    exactArExtracted.symptoms.vision_change === 'none',
    'Regression AR: vision_change is none (NOT loss)'
  );
  assert(
    exactArExtracted.symptoms.onset === 'gradual',
    'Regression AR: onset is gradual (NOT sudden)'
  );
  assert(
    exactArExtracted.symptoms.pain_level === 'mild',
    'Regression AR: pain_level is mild (NOT severe)'
  );
  assert(
    exactArRules.matchedFlags.length === 0,
    'Regression AR: Rule engine matched ZERO red flags'
  );
  assert(
    exactArDecision.finalUrgency === 'NON_URGENT',
    'Regression AR: Final urgency resolves as NON_URGENT'
  );

  // -------------------------------------------------------------
  // TEST GROUP 2: POSITIVE CONTROLS (Genuine Affirmative Statements)
  // -------------------------------------------------------------
  console.log('\n--- Group 2: Positive Controls (Affirmative Statements) ---');

  // Positive 1: Chemical Splash in English
  const posChemEn = await extractor.extract(
    'I had bleach splash into my eye while cleaning, severe burning pain',
    'en'
  );
  const ruleChemEn = runDeterministicRuleEngine(
    ['I had bleach splash into my eye while cleaning, severe burning pain'],
    posChemEn.symptoms
  );
  assert(posChemEn.symptoms.chemical_exposure === true, 'Positive Control: Bleach splash sets chemical_exposure=true');
  assert(ruleChemEn.ruleUrgency === 'EMERGENCY', 'Positive Control: Bleach splash triggers EMERGENCY');

  // Positive 2: Penetrating Trauma in English
  const posTraumaEn = await extractor.extract(
    'Metal fragment hit directly in my right eye at work',
    'en'
  );
  const ruleTraumaEn = runDeterministicRuleEngine(
    ['Metal fragment hit directly in my right eye at work'],
    posTraumaEn.symptoms
  );
  assert(posTraumaEn.symptoms.trauma === true, 'Positive Control: Metal fragment sets trauma=true');
  assert(ruleTraumaEn.ruleUrgency === 'EMERGENCY', 'Positive Control: Metal fragment triggers EMERGENCY');

  // Positive 3: Sudden Vision Loss in English
  const posLossEn = await extractor.extract(
    'Sudden vision loss in my left eye and dark shadow veil',
    'en'
  );
  const ruleLossEn = runDeterministicRuleEngine(
    ['Sudden vision loss in my left eye and dark shadow veil'],
    posLossEn.symptoms
  );
  assert(posLossEn.symptoms.onset === 'sudden', 'Positive Control: Sudden onset affirmed');
  assert(ruleLossEn.ruleUrgency === 'EMERGENCY', 'Positive Control: Sudden vision loss triggers EMERGENCY');

  // Positive 4: Chemical Splash in Arabic
  const posChemAr = await extractor.extract(
    'دخل فلاش منظف كيماوي حارق في عيني وألم شديد',
    'ar'
  );
  const ruleChemAr = runDeterministicRuleEngine(
    ['دخل فلاش منظف كيماوي حارق في عيني وألم شديد'],
    posChemAr.symptoms
  );
  assert(posChemAr.symptoms.chemical_exposure === true, 'Positive Control AR: Flash detergent sets chemical_exposure=true');
  assert(ruleChemAr.ruleUrgency === 'EMERGENCY', 'Positive Control AR: Chemical splash triggers EMERGENCY');

  // Positive 5: Eye Trauma in Arabic
  const posTraumaAr = await extractor.extract(
    'طارت شظية حديد في عيني ونزيف وألم حاد',
    'ar'
  );
  const ruleTraumaAr = runDeterministicRuleEngine(
    ['طارت شظية حديد في عيني ونزيف وألم حاد'],
    posTraumaAr.symptoms
  );
  assert(posTraumaAr.symptoms.trauma === true, 'Positive Control AR: Metal shard sets trauma=true');
  assert(ruleTraumaAr.ruleUrgency === 'EMERGENCY', 'Positive Control AR: Trauma triggers EMERGENCY');

  // -------------------------------------------------------------
  // TEST GROUP 3: CONFLICTING & UNCERTAIN STATEMENTS
  // -------------------------------------------------------------
  console.log('\n--- Group 3: Conflicting & Uncertain Statements ---');

  const conflictText =
    'I had an injury hit... wait actually no trauma, no injury at all';
  const conflictExtracted = await extractor.extract(conflictText, 'en');
  assert(
    conflictExtracted.symptoms.trauma === null,
    'Conflicting statements: trauma remains null (unknown/uncertain), NEVER assumed false'
  );

  // -------------------------------------------------------------
  // TEST GROUP 4: CONSERVATIVE FALLBACK POLICY (PRD Safety Rules)
  // -------------------------------------------------------------
  console.log('\n--- Group 4: Conservative Fallback Policy ---');

  // Incomplete symptoms with unknown vision change
  const incompleteSymptoms = createEmptySymptoms('en');
  incompleteSymptoms.pain_level = 'none';
  incompleteSymptoms.vision_change = 'unknown'; // Crucial field unknown!

  const checkIncomplete = checkHasRequiredNonUrgentInfo(incompleteSymptoms);
  assert(
    checkIncomplete.isSafeToCompleteNonUrgent === false,
    'Completeness check fails when vision_change is unknown'
  );

  const fallbackDecision = resolveTriageDecision(
    {
      matchedFlags: [],
      ruleUrgency: 'NON_URGENT',
      rationaleCodes: [],
      evidenceMatches: [],
    },
    {
      urgency: 'NON_URGENT',
      confidence: 0.90,
      rationaleCodes: [],
      baseModel: 'TestBase',
      adapterVersion: 'v1.0',
    },
    undefined,
    { isFinal: true, symptoms: incompleteSymptoms }
  );

  assert(
    fallbackDecision.finalUrgency === 'URGENT',
    'Conservative Fallback: Incomplete data safely escalates NON_URGENT to URGENT'
  );
  assert(
    fallbackDecision.decisionSource === 'CONSERVATIVE_FALLBACK',
    'Decision source accurately tagged as CONSERVATIVE_FALLBACK'
  );

  // -------------------------------------------------------------
  // TEST GROUP 5: PRECEDENCE INVARIANT (Model CANNOT downgrade rules)
  // -------------------------------------------------------------
  console.log('\n--- Group 5: Precedence Invariant ---');

  const ruleEmergencyResult = runDeterministicRuleEngine(
    ['دخل فلاش في عيني'],
    createEmptySymptoms('ar')
  );
  assert(ruleEmergencyResult.ruleUrgency === 'EMERGENCY', 'Rule Engine classified as EMERGENCY');

  const adversarialModel: ModelSuggestion = {
    urgency: 'NON_URGENT',
    confidence: 0.99,
    rationaleCodes: ['MOCK_ADVERSARIAL'],
    baseModel: 'TestBase',
    adapterVersion: 'v0.1',
  };

  const resolvedDecision = resolveTriageDecision(ruleEmergencyResult, adversarialModel);
  assert(
    resolvedDecision.finalUrgency === 'EMERGENCY',
    'SAFETY INVARIANT: Model CANNOT downgrade Rule EMERGENCY to NON_URGENT'
  );
  assert(
    resolvedDecision.decisionSource === 'RULE_ENGINE_OVERRIDE',
    'Decision source attributed to RULE_ENGINE_OVERRIDE'
  );

  // -------------------------------------------------------------
  // TEST GROUP 6: STICKY EMERGENCY & LOW CONFIDENCE ESCALATION
  // -------------------------------------------------------------
  console.log('\n--- Group 6: Sticky Emergency & Low Confidence ---');

  const previousEmergency: TriageDecision = {
    finalUrgency: 'EMERGENCY',
    isFinalDecision: true,
    ruleResult: ruleEmergencyResult,
    decisionSource: 'RULE_ENGINE_OVERRIDE',
    escalatedByUncertainty: false,
    guidanceTextAr: '',
    guidanceTextEn: '',
    evaluatedAt: new Date().toISOString(),
  };

  const subsequentCalmDecision = resolveTriageDecision(
    {
      matchedFlags: [],
      ruleUrgency: 'NON_URGENT',
      rationaleCodes: [],
      evidenceMatches: [],
    },
    {
      urgency: 'NON_URGENT',
      confidence: 0.95,
      rationaleCodes: [],
      baseModel: 'TestBase',
      adapterVersion: 'v0.1',
    },
    previousEmergency
  );
  assert(
    subsequentCalmDecision.finalUrgency === 'EMERGENCY',
    'STICKY EMERGENCY: Once classified EMERGENCY, remains EMERGENCY across session lifetime'
  );

  const lowConfModel: ModelSuggestion = {
    urgency: 'NON_URGENT',
    confidence: 0.55, // Low confidence < 0.70
    rationaleCodes: ['UNCERTAIN'],
    baseModel: 'TestBase',
    adapterVersion: 'v0.1',
  };
  const lowConfResolved = resolveTriageDecision(
    {
      matchedFlags: [],
      ruleUrgency: 'NON_URGENT',
      rationaleCodes: [],
      evidenceMatches: [],
    },
    lowConfModel
  );
  assert(
    lowConfResolved.finalUrgency === 'URGENT',
    'Low model confidence (< 0.70) safely escalates NON_URGENT to URGENT'
  );

  // -------------------------------------------------------------
  // TEST GROUP 7: CONSENT INVARIANT
  // -------------------------------------------------------------
  console.log('\n--- Group 7: Consent Invariant ---');

  const freshSession = await orchestrator.createNewSession('ar');
  assert(freshSession.consentGiven === false, 'Fresh session starts with consentGiven=false');
  assert(freshSession.status === 'AWAITING_CONSENT', 'Fresh session status is AWAITING_CONSENT');

  console.log(`\n========================================`);
  console.log(`Summary: ${passCount} Passed, ${failCount} Failed.`);
  console.log(`========================================\n`);

  return { passCount, failCount };
}

// Auto-run if executed in Node/tsx
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('safetyRules.test')) {
  runAllSafetyTests().then(({ failCount }) => {
    if (failCount > 0) {
      process.exit(1);
    }
  });
}
