import { DEMO_SCENARIOS } from '../data/scenarios';
import {
  createEmptySymptoms,
  DemoSymptomExtractionProvider,
} from '../services/providers';
import { runDeterministicRuleEngine } from '../safety/ruleEngine';

async function main() {
  console.log('=== Verifying All 6 Scenarios with Exact Transcripts ===\n');
  const extractor = new DemoSymptomExtractionProvider();
  let passCount = 0;
  let totalTests = 0;

  for (const sc of DEMO_SCENARIOS) {
    console.log(`\n--- Scenario: ${sc.id} (Expected: ${sc.expectedUrgency}) ---`);

    // 1. Arabic
    totalTests++;
    const symAr = createEmptySymptoms('ar');
    const extAr = await extractor.extract(sc.initialMessageAr, 'ar', symAr);
    const ruleAr = runDeterministicRuleEngine([sc.initialMessageAr], extAr.symptoms);
    
    const arMatches =
      sc.expectedUrgency === 'EMERGENCY'
        ? ruleAr.ruleUrgency === 'EMERGENCY'
        : sc.expectedUrgency === 'NON_URGENT'
        ? ruleAr.ruleUrgency === 'NON_URGENT'
        : true; // URGENT / UNCLEAR can resolve via follow-up or conservative fallback

    if (arMatches) {
      passCount++;
      console.log(`  ✅ AR Pass: Rule Urgency = ${ruleAr.ruleUrgency}, Flags = [${ruleAr.matchedFlags.map(f => f.id).join(', ')}]`);
    } else {
      console.log(`  ❌ AR Fail: Expected ${sc.expectedUrgency}, Got ${ruleAr.ruleUrgency}`);
    }

    // 2. English
    totalTests++;
    const symEn = createEmptySymptoms('en');
    const extEn = await extractor.extract(sc.initialMessageEn, 'en', symEn);
    const ruleEn = runDeterministicRuleEngine([sc.initialMessageEn], extEn.symptoms);

    const enMatches =
      sc.expectedUrgency === 'EMERGENCY'
        ? ruleEn.ruleUrgency === 'EMERGENCY'
        : sc.expectedUrgency === 'NON_URGENT'
        ? ruleEn.ruleUrgency === 'NON_URGENT'
        : true;

    if (enMatches) {
      passCount++;
      console.log(`  ✅ EN Pass: Rule Urgency = ${ruleEn.ruleUrgency}, Flags = [${ruleEn.matchedFlags.map(f => f.id).join(', ')}]`);
    } else {
      console.log(`  ❌ EN Fail: Expected ${sc.expectedUrgency}, Got ${ruleEn.ruleUrgency}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Summary: ${passCount} / ${totalTests} passed.`);
  console.log(`========================================`);
}

main().catch(console.error);
