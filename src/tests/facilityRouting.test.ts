/**
 * Test Suite: Clinical Urgency Facility Routing Verification
 *
 * Verifies:
 * 1. Urgency-to-facility capability mapping:
 *    - NON_URGENT: select a fictional primary-care facility or routine eye clinic
 *    - URGENT: select a fictional facility configured for same-day eye assessment
 *    - EMERGENCY: select a fictional emergency eye-care facility (24/7)
 * 2. Filter by suitable facility capability BEFORE applying location or distance selection.
 * 3. Arabic demo Scenario 5 in Jeddah returns NON_URGENT and routes to a primary-care/routine clinic,
 *    NEVER recommending the emergency facility ("طوارئ العيون الجامعية التجريبية — مبنى د").
 * 4. All three urgency levels across all 4 available demo cities (12 test combinations).
 * 5. City absence handling: when no suitable demo facility exists in the selected city,
 *    explains that clearly instead of silently recommending an unsuitable facility.
 * 6. Arabic and English facility labels remain consistent.
 */

import {
  DEMO_CITIES,
  DEMO_FACILITIES,
  getRecommendedFacility,
  isFacilitySuitableForUrgency,
} from '../data/facilities';
import { orchestrator } from '../services/triageOrchestrator';
import { DEMO_SCENARIOS } from '../data/scenarios';

async function runFacilityRoutingTests() {
  console.log('=== Running OptiRoute Facility Routing Test Suite ===\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
      failCount++;
    }
  }

  // --- GROUP 1: All 3 urgency levels across all 4 demo cities (12 combinations) ---
  console.log('--- Group 1: 3 Urgency Levels across 4 Demo Cities ---');
  const urgencies: Array<'EMERGENCY' | 'URGENT' | 'NON_URGENT'> = [
    'EMERGENCY',
    'URGENT',
    'NON_URGENT',
  ];

  for (const city of DEMO_CITIES) {
    for (const urgency of urgencies) {
      const res = getRecommendedFacility(urgency, city.nameEn);
      assert(res.isSuitableMatch === true, `${city.nameEn} + ${urgency}: found suitable match`);
      assert(!!res.facility, `${city.nameEn} + ${urgency}: facility object returned`);
      if (res.facility) {
        assert(
          isFacilitySuitableForUrgency(res.facility, urgency),
          `${city.nameEn} + ${urgency}: facility (${res.facility.nameEn}) matches required capability`
        );

        if (urgency === 'EMERGENCY') {
          assert(
            res.facility.hasEmergencyEyeCare === true && res.facility.tier === 'EMERGENCY',
            `${city.nameEn} + EMERGENCY: facility is emergency-capable (hasEmergencyEyeCare=true)`
          );
        } else if (urgency === 'URGENT') {
          assert(
            res.facility.hasEmergencyEyeCare === false && res.facility.tier === 'URGENT',
            `${city.nameEn} + URGENT: facility is configured for same-day assessment (tier=URGENT)`
          );
        } else if (urgency === 'NON_URGENT') {
          assert(
            res.facility.hasEmergencyEyeCare === false && res.facility.tier === 'NON_URGENT',
            `${city.nameEn} + NON_URGENT: facility is primary-care/routine clinic (tier=NON_URGENT)`
          );
        }

        // Check bilingual label consistency
        assert(
          res.facility.nameAr.length > 0 && res.facility.nameEn.length > 0,
          `${city.nameEn} + ${urgency}: bilingual names populated`
        );
        assert(
          res.facility.typeAr.length > 0 && res.facility.typeEn.length > 0,
          `${city.nameEn} + ${urgency}: bilingual types populated`
        );
      }
    }
  }

  // --- GROUP 2: Reproduced Issue Verification (Scenario 5 in Jeddah) ---
  console.log('\n--- Group 2: Reproduced Scenario 5 Issue in Jeddah ---');
  const sc5 = DEMO_SCENARIOS.find((s) => s.id === 'sc-5-non-urgent');
  assert(!!sc5, 'Scenario 5 exists');
  assert(sc5?.locationCity === 'Jeddah', 'Scenario 5 is configured for Jeddah');

  // Test getRecommendedFacility directly for NON_URGENT in Jeddah
  const jeddahNonUrgent = getRecommendedFacility('NON_URGENT', 'Jeddah');
  assert(jeddahNonUrgent.isSuitableMatch === true, 'Jeddah NON_URGENT: suitable match found');
  assert(!!jeddahNonUrgent.facility, 'Jeddah NON_URGENT: facility returned');
  assert(
    jeddahNonUrgent.facility?.id === 'fac-demo-phc-jeddah',
    'Jeddah NON_URGENT: routes to primary care facility fac-demo-phc-jeddah'
  );
  assert(
    jeddahNonUrgent.facility?.hasEmergencyEyeCare === false,
    'Jeddah NON_URGENT: facility does NOT have emergency department'
  );
  assert(
    jeddahNonUrgent.facility?.nameEn.includes('Primary Care') === true,
    'Jeddah NON_URGENT: facility name contains Primary Care'
  );
  assert(
    jeddahNonUrgent.facility?.id !== 'fac-demo-univ-d',
    'SAFETY INVARIANT: Jeddah NON_URGENT does NOT route to emergency hospital fac-demo-univ-d'
  );

  // Full end-to-end triage orchestrator execution of Scenario 5
  console.log('\n--- Group 3: End-to-End Orchestrator Run for Scenario 5 ---');
  let session = await orchestrator.createNewSession('ar');
  session = await orchestrator.handleConsent(session, true);
  session = await orchestrator.processPatientMessage(session, {
    text: sc5!.initialMessageAr,
    isVoice: sc5!.isVoiceSample,
    voiceDuration: sc5!.voiceDurationSeconds,
    userCity: sc5!.locationCity,
  });

  assert(session.status === 'COMPLETED', 'Scenario 5 completes triage');
  assert(session.decision?.finalUrgency === 'NON_URGENT', 'Scenario 5 urgency is NON_URGENT');
  assert(!!session.routedFacility, 'Scenario 5 has routedFacility');
  assert(
    session.routedFacility?.tier === 'NON_URGENT',
    'Scenario 5 routedFacility tier is NON_URGENT'
  );
  assert(
    session.routedFacility?.hasEmergencyEyeCare === false,
    'Scenario 5 routedFacility hasEmergencyEyeCare is false'
  );
  assert(
    session.routedFacility?.id === 'fac-demo-phc-jeddah',
    'Scenario 5 routedFacility is the fictional primary care clinic in Jeddah'
  );
  assert(
    session.routedFacility?.id !== 'fac-demo-univ-d',
    'Scenario 5 did NOT recommend emergency hospital'
  );

  // --- GROUP 4: Capability Filter Before Distance/Location ---
  console.log('\n--- Group 4: Capability Filter Precedence Invariant ---');
  // For EMERGENCY in any city, even if a primary care clinic is closer, it must NEVER select primary care
  const emergencyRiyadh = getRecommendedFacility('EMERGENCY', 'Riyadh', {
    // Coords right next to Primary Health Center Epsilon (24.665, 46.728)
    lat: 24.6651,
    lng: 46.7281,
  });
  assert(
    emergencyRiyadh.facility?.hasEmergencyEyeCare === true,
    'EMERGENCY in Riyadh selects emergency facility despite closer primary clinic'
  );
  assert(
    emergencyRiyadh.facility?.tier === 'EMERGENCY',
    'EMERGENCY in Riyadh tier is EMERGENCY'
  );

  // For NON_URGENT in Riyadh, even if emergency center is right next door, it must NEVER select emergency
  const nonUrgentRiyadh = getRecommendedFacility('NON_URGENT', 'Riyadh', {
    // Coords right next to Emergency Center Alpha (24.7083, 46.6612)
    lat: 24.7083,
    lng: 46.6612,
  });
  assert(
    nonUrgentRiyadh.facility?.hasEmergencyEyeCare === false,
    'NON_URGENT in Riyadh selects non-emergency facility despite closer emergency center'
  );
  assert(
    nonUrgentRiyadh.facility?.tier === 'NON_URGENT',
    'NON_URGENT in Riyadh tier is NON_URGENT'
  );

  // --- GROUP 5: Absence of Suitable Facility in Selected City ---
  console.log('\n--- Group 5: Clear Explanation When City Has No Suitable Facility ---');
  const unservicedCityResult = getRecommendedFacility('EMERGENCY', 'Tabuk');
  assert(
    unservicedCityResult.isSuitableMatch === false,
    'Tabuk EMERGENCY: isSuitableMatch is false'
  );
  assert(
    unservicedCityResult.facility === undefined,
    'Tabuk EMERGENCY: facility is undefined (not silently recommending unsuitable clinic)'
  );
  assert(
    unservicedCityResult.explanationAr.includes('Tabuk') ||
      unservicedCityResult.explanationAr.includes('لا توجد منشأة تجريبية'),
    'Tabuk EMERGENCY: Arabic explanation clearly states absence'
  );
  assert(
    unservicedCityResult.explanationEn.includes('Tabuk') &&
      unservicedCityResult.explanationEn.includes('No suitable demo facility'),
    'Tabuk EMERGENCY: English explanation clearly states absence'
  );
  assert(
    unservicedCityResult.explanationAr.includes('997'),
    'Tabuk EMERGENCY: Arabic guidance advises calling 997'
  );

  const unservicedUrgentResult = getRecommendedFacility('URGENT', 'Hail');
  assert(
    unservicedUrgentResult.isSuitableMatch === false,
    'Hail URGENT: isSuitableMatch is false'
  );
  assert(
    unservicedUrgentResult.facility === undefined,
    'Hail URGENT: facility is undefined'
  );
  assert(
    unservicedUrgentResult.explanationEn.includes('same-day acute eye assessment'),
    'Hail URGENT: explains missing same-day assessment facility'
  );

  const unservicedNonUrgentResult = getRecommendedFacility('NON_URGENT', 'Najran');
  assert(
    unservicedNonUrgentResult.isSuitableMatch === false,
    'Najran NON_URGENT: isSuitableMatch is false'
  );
  assert(
    unservicedNonUrgentResult.facility === undefined,
    'Najran NON_URGENT: facility is undefined'
  );
  assert(
    unservicedNonUrgentResult.explanationAr.includes('رعاية صحية أولية'),
    'Najran NON_URGENT: explains missing primary care facility in Arabic'
  );

  console.log('\n========================================');
  console.log(`Facility Routing: ${passCount} Passed, ${failCount} Failed.`);
  console.log('========================================\n');

  return { passCount, failCount };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('facilityRouting.test')) {
  runFacilityRoutingTests().then(({ failCount }) => {
    if (failCount > 0) {
      process.exit(1);
    }
  });
}
