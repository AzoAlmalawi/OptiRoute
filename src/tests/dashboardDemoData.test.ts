/**
 * Test Suite: OptiRoute Demo Dashboard & Synthetic Seed Sessions Verification
 *
 * Verifies:
 * 1. Reset produces exactly three synthetic completed sessions:
 *    - EMERGENCY: routed to a fictional emergency eye-care facility (24/7)
 *    - URGENT: routed to a fictional same-day eye assessment clinic
 *    - NON_URGENT: routed to a fictional primary-care or routine eye clinic
 * 2. Each seeded session uses the current schema:
 *    - Explicit simulated consent (messages & events)
 *    - Complete conversation and structured symptoms
 *    - Final urgency and decision source
 *    - Suitable facility capability tier
 *    - Chronological audit events
 *    - Current rule and simulated-provider identifiers
 * 3. Clearly labeled synthetic records and relative timestamps from the current demo day.
 * 4. Derived dashboard counts on clean reset:
 *    - Total: 3
 *    - Emergency: 1
 *    - Urgent: 1
 *    - Non-urgent: 1
 *    - Pending-review: 1 (matches seeded review statuses)
 * 5. Safe handling of older locally stored records:
 *    - Migrates older records without silently displaying completed cases as "Pending Follow-up"
 *    - Flags legacy records clearly
 * 6. Refresh preserves records (never resets automatically on load).
 * 7. Completing a new scenario adds a separate record and updates counts.
 * 8. Arabic and English labels remain consistent.
 */

import { generateSeedSessions, SEED_SESSIONS } from '../data/seedSessions';
import {
  LocalStorageSessionRepository,
  normalizeStoredSession,
} from '../services/providers';
import { orchestrator } from '../services/triageOrchestrator';
import { DEMO_SCENARIOS } from '../data/scenarios';
import {
  RULE_ENGINE_VERSION,
  MODEL_ADAPTER_VERSION,
  DATASET_VERSION,
  SPEECH_MODEL_VERSION,
} from '../data/rulesConfig';
import { TriageSession } from '../types/triage';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failCount++;
    throw new Error(msg);
  }
}

async function runDashboardDemoDataTests() {
  console.log('=== Running OptiRoute Demo Dashboard & Seed Data Test Suite ===\n');

  // --------------------------------------------------------------------------
  // Group 1: Exactly Three Seeded Records & Relative Timestamps
  // --------------------------------------------------------------------------
  console.log('--- Group 1: Exactly Three Synthetic Baseline Sessions ---');
  const now = new Date();
  const seedSessions = generateSeedSessions(now);

  assert(seedSessions.length === 3, 'Seed sessions produce exactly 3 records');

  const emergencyCase = seedSessions.find((s) => s.decision?.finalUrgency === 'EMERGENCY');
  const urgentCase = seedSessions.find((s) => s.decision?.finalUrgency === 'URGENT');
  const nonUrgentCase = seedSessions.find((s) => s.decision?.finalUrgency === 'NON_URGENT');

  assert(Boolean(emergencyCase), 'Contains exactly one EMERGENCY case');
  assert(Boolean(urgentCase), 'Contains exactly one URGENT case');
  assert(Boolean(nonUrgentCase), 'Contains exactly one NON_URGENT case');

  // Verify synthetic identifiers
  assert(emergencyCase?.id === 'SES-9421-KSA', 'EMERGENCY case has synthetic ID SES-9421-KSA');
  assert(urgentCase?.id === 'SES-9418-KSA', 'URGENT case has synthetic ID SES-9418-KSA');
  assert(nonUrgentCase?.id === 'SES-9405-KSA', 'NON_URGENT case has synthetic ID SES-9405-KSA');

  // Verify timestamps are relative to current demo day (within last 24h)
  const nowMs = now.getTime();
  for (const s of seedSessions) {
    const startedMs = new Date(s.startedAt).getTime();
    const diffHours = (nowMs - startedMs) / (1000 * 60 * 60);
    assert(diffHours >= 0 && diffHours < 12, `${s.id} started within today (< 12 hours ago, actual: ${diffHours.toFixed(1)}h)`);

    // Verify events are in chronological order
    for (let i = 1; i < s.events.length; i++) {
      const prevTime = new Date(s.events[i - 1].timestamp).getTime();
      const currTime = new Date(s.events[i].timestamp).getTime();
      assert(currTime >= prevTime, `${s.id} audit event ${i} is chronologically ordered`);
    }
  }

  // --------------------------------------------------------------------------
  // Group 2: Suitable Facility Capability Routing
  // --------------------------------------------------------------------------
  console.log('\n--- Group 2: Suitable Facility Capability Routing ---');

  // Emergency: must route to emergency eye care facility (24/7)
  assert(Boolean(emergencyCase?.routedFacility), 'EMERGENCY case has routedFacility');
  assert(emergencyCase?.routedFacility?.tier === 'EMERGENCY', 'EMERGENCY case routed to tier=EMERGENCY facility');
  assert(emergencyCase?.routedFacility?.hasEmergencyEyeCare === true, 'EMERGENCY facility has 24/7 emergency eye department');
  assert(
    Boolean(emergencyCase?.routedFacility?.nameEn.includes('Emergency')),
    'EMERGENCY facility name clearly reflects emergency capability'
  );

  // Urgent: must route to facility configured for same-day eye assessment
  assert(Boolean(urgentCase?.routedFacility), 'URGENT case has routedFacility');
  assert(urgentCase?.routedFacility?.tier === 'URGENT', 'URGENT case routed to tier=URGENT facility');
  assert(urgentCase?.routedFacility?.hasEmergencyEyeCare === false, 'URGENT facility is NOT an emergency department');
  assert(
    Boolean(urgentCase?.routedFacility?.nameEn.includes('Urgent Eye Assessment')),
    'URGENT facility name reflects same-day assessment clinic'
  );

  // Non-urgent: must route to primary care facility or routine eye clinic
  assert(Boolean(nonUrgentCase?.routedFacility), 'NON_URGENT case has routedFacility');
  assert(nonUrgentCase?.routedFacility?.tier === 'NON_URGENT', 'NON_URGENT case routed to tier=NON_URGENT facility');
  assert(nonUrgentCase?.routedFacility?.hasEmergencyEyeCare === false, 'NON_URGENT facility is NOT an emergency department');
  assert(
    Boolean(nonUrgentCase?.routedFacility?.nameEn.includes('Primary Health')),
    'NON_URGENT facility name reflects primary care clinic'
  );

  // --------------------------------------------------------------------------
  // Group 3: Data Schema & Audit Events Consistency
  // --------------------------------------------------------------------------
  console.log('\n--- Group 3: Current Data Schema & Explicit Consent ---');

  for (const s of seedSessions) {
    // Explicit consent
    assert(s.consentGiven === true, `${s.id} has consentGiven=true`);
    const hasConsentMsg = s.messages.some(
      (m) =>
        m.type === 'consent' ||
        Boolean(m.text && (m.text.includes('الموافقة') || m.text.includes('أوافق')))
    );
    assert(hasConsentMsg, `${s.id} messages contain explicit simulated consent exchange`);
    const hasConsentEvent = s.events.some((e) => e.type === 'CONSENT_GRANTED');
    assert(hasConsentEvent, `${s.id} audit events contain CONSENT_GRANTED event`);

    // Status is completed
    assert(s.status === 'COMPLETED', `${s.id} status is COMPLETED`);
    assert(s.decision?.isFinalDecision === true, `${s.id} decision.isFinalDecision is true`);

    // Current metadata versions
    assert(s.metadata.ruleVersion === RULE_ENGINE_VERSION, `${s.id} metadata.ruleVersion matches current engine`);
    assert(s.metadata.modelAdapterVersion === MODEL_ADAPTER_VERSION, `${s.id} metadata.modelAdapterVersion matches current adapter`);
    assert(s.metadata.datasetVersion === DATASET_VERSION, `${s.id} metadata.datasetVersion matches current dataset`);
    assert(s.metadata.speechModelVersion === SPEECH_MODEL_VERSION, `${s.id} metadata.speechModelVersion matches current speech model`);
  }

  // --------------------------------------------------------------------------
  // Group 4: Dashboard Counts Derived from Stored Sessions
  // --------------------------------------------------------------------------
  console.log('\n--- Group 4: Derived Dashboard Metrics on Clean Reset ---');

  const repo = new LocalStorageSessionRepository();
  await repo.resetToSeed(seedSessions);

  const stored = await repo.getAllSessions();
  assert(stored.length === 3, 'Stored sessions count is exactly 3');

  let emergencyCount = 0;
  let urgentCount = 0;
  let nonUrgentCount = 0;
  let pendingReviewCount = 0;

  stored.forEach((s) => {
    if (s.decision?.finalUrgency === 'EMERGENCY') emergencyCount += 1;
    else if (s.decision?.finalUrgency === 'URGENT') urgentCount += 1;
    else if (s.decision?.finalUrgency === 'NON_URGENT') nonUrgentCount += 1;

    if (!s.clinicianReview) pendingReviewCount += 1;
  });

  assert(stored.length === 3, 'Dashboard total count: 3');
  assert(emergencyCount === 1, 'Dashboard emergency count: 1');
  assert(urgentCount === 1, 'Dashboard urgent count: 1');
  assert(nonUrgentCount === 1, 'Dashboard non-urgent count: 1');
  assert(pendingReviewCount === 1, 'Dashboard pending review count: 1 (URGENT case awaiting review)');

  // Verify reviewed statuses match seeded values
  assert(Boolean(emergencyCase?.clinicianReview), 'EMERGENCY case is reviewed (CORRECT)');
  assert(!urgentCase?.clinicianReview, 'URGENT case is pending review (clinicianReview is undefined)');
  assert(Boolean(nonUrgentCase?.clinicianReview), 'NON_URGENT case is reviewed (CORRECT)');

  // --------------------------------------------------------------------------
  // Group 5: Safe Handling & Migration of Older / Legacy Stored Records
  // --------------------------------------------------------------------------
  console.log('\n--- Group 5: Safe Handling of Older / Legacy Records ---');

  // Test case A: Completed emergency case from older schema missing isFinalDecision
  const legacyRecordA: any = {
    id: 'SES-LEGACY-001',
    patientMaskedPhone: '+966 50 *** 1111',
    startedAt: '2026-10-01T10:00:00.000Z',
    status: 'COMPLETED',
    language: 'ar',
    decision: {
      finalUrgency: 'EMERGENCY',
      // isFinalDecision is missing!
      decisionSource: 'RULE_ENGINE_OVERRIDE',
    },
    symptoms: {
      chemical_exposure: true,
      pain_level: 'severe',
    },
  };

  const migratedA = normalizeStoredSession(legacyRecordA);
  assert(migratedA.status === 'COMPLETED', 'Legacy record A status is COMPLETED');
  assert(migratedA.decision?.isFinalDecision === true, 'Legacy record A isFinalDecision safely migrated to true');
  assert(migratedA.decision?.finalUrgency === 'EMERGENCY', 'Legacy record A urgency preserved as EMERGENCY');
  assert(migratedA.isLegacyRecord === true, 'Legacy record A tagged as legacy record');

  // Test case B: Completed case missing decision object completely
  const legacyRecordB: any = {
    id: 'SES-LEGACY-002',
    patientMaskedPhone: '+966 50 *** 2222',
    startedAt: '2026-10-01T11:00:00.000Z',
    status: 'COMPLETED',
    language: 'en',
    messages: [
      {
        id: 'msg-legacy',
        sender: 'bot',
        type: 'result_card',
        decisionPayload: {
          finalUrgency: 'URGENT',
          decisionSource: 'HYBRID_AGREEMENT',
        },
      },
    ],
  };

  const migratedB = normalizeStoredSession(legacyRecordB);
  assert(migratedB.status === 'COMPLETED', 'Legacy record B status is COMPLETED');
  assert(migratedB.decision?.isFinalDecision === true, 'Legacy record B reconstructed decision has isFinalDecision=true');
  assert(migratedB.decision?.finalUrgency === 'URGENT', 'Legacy record B reconstructed urgency is URGENT');
  assert(migratedB.isLegacyRecord === true, 'Legacy record B tagged as legacy');

  // Test case C: In-flight follow-up case remains in follow-up
  const followUpCase: any = {
    id: 'SES-INFLIGHT-003',
    startedAt: new Date().toISOString(),
    status: 'FOLLOW_UP',
    language: 'ar',
    decision: {
      finalUrgency: 'URGENT',
      isFinalDecision: false,
    },
  };
  const normalizedC = normalizeStoredSession(followUpCase);
  assert(normalizedC.status === 'FOLLOW_UP', 'In-flight follow up case preserves status=FOLLOW_UP');
  assert(normalizedC.decision?.isFinalDecision === false, 'In-flight follow up case isFinalDecision remains false');

  // --------------------------------------------------------------------------
  // Group 6: Refresh Preservation & Adding New Scenario Session
  // --------------------------------------------------------------------------
  console.log('\n--- Group 6: New Simulator Session & Refresh Survival ---');

  // Clean reset
  await orchestrator.repository.resetToSeed(generateSeedSessions(new Date()));
  let sessionsAfterReset = await orchestrator.repository.getAllSessions();
  assert(sessionsAfterReset.length === 3, 'Initial sessions count after reset is exactly 3');

  // Creating an unstarted scratchpad in simulator does NOT pollute dashboard
  const scratchpad = await orchestrator.createNewSession('ar', false);
  let sessionsAfterScratchpad = await orchestrator.repository.getAllSessions();
  assert(sessionsAfterScratchpad.length === 3, 'Unstarted simulator scratchpad does not pollute stored sessions (still 3)');

  // Patient grants consent and completes a new scenario (Scenario 1: Chemical splash in Al-Ahsa)
  const sc1 = DEMO_SCENARIOS[0];
  const consentedSession = await orchestrator.handleConsent(scratchpad, true);

  // Now the interactive session is persisted
  let sessionsAfterConsent = await orchestrator.repository.getAllSessions();
  assert(sessionsAfterConsent.length === 4, 'Interactive simulator session is persisted (total: 4)');

  // Process scenario 1 message
  const completedNewSession = await orchestrator.processPatientMessage(consentedSession, {
    text: sc1.initialMessageAr,
    userCity: 'Al-Ahsa / Hofuf',
  });

  assert(completedNewSession.status === 'COMPLETED', 'New scenario session completes successfully');
  assert(completedNewSession.decision?.finalUrgency === 'EMERGENCY', 'New scenario urgency is EMERGENCY');

  // Verify dashboard counts updated dynamically
  const updatedSessions = await orchestrator.repository.getAllSessions();
  assert(updatedSessions.length === 4, 'Dashboard total count is now 4');

  let updatedEmerg = 0;
  let updatedUrg = 0;
  let updatedNonUrg = 0;
  updatedSessions.forEach((s) => {
    if (s.decision?.finalUrgency === 'EMERGENCY') updatedEmerg += 1;
    else if (s.decision?.finalUrgency === 'URGENT') updatedUrg += 1;
    else if (s.decision?.finalUrgency === 'NON_URGENT') updatedNonUrg += 1;
  });

  assert(updatedEmerg === 2, 'Emergency count updated to 2 (1 seeded + 1 newly completed)');
  assert(updatedUrg === 1, 'Urgent count remains 1');
  assert(updatedNonUrg === 1, 'Non-urgent count remains 1');

  // Simulate page refresh: re-reading repository preserves all 4 records intact
  const refreshedSessions = await orchestrator.repository.getAllSessions();
  assert(refreshedSessions.length === 4, 'All 4 records survived page refresh');
  const foundNewSession = refreshedSessions.find((s) => s.id === completedNewSession.id);
  assert(Boolean(foundNewSession), 'Newly completed session found in refreshed store');
  assert(foundNewSession?.decision?.finalUrgency === 'EMERGENCY', 'Preserved correct urgency after refresh');

  // --------------------------------------------------------------------------
  // Group 7: Bilingual Label Consistency
  // --------------------------------------------------------------------------
  console.log('\n--- Group 7: Bilingual Consistency Across Seed Records ---');

  for (const s of seedSessions) {
    assert(Boolean(s.decision?.guidanceTextAr), `${s.id} guidanceTextAr is populated`);
    assert(Boolean(s.decision?.guidanceTextEn), `${s.id} guidanceTextEn is populated`);
    assert(Boolean(s.routedFacility?.nameAr), `${s.id} routedFacility nameAr is populated`);
    assert(Boolean(s.routedFacility?.nameEn), `${s.id} routedFacility nameEn is populated`);
    assert(Boolean(s.routedFacility?.typeAr), `${s.id} routedFacility typeAr is populated`);
    assert(Boolean(s.routedFacility?.typeEn), `${s.id} routedFacility typeEn is populated`);
    assert(Boolean(s.routingExplanationAr), `${s.id} routingExplanationAr is populated`);
    assert(Boolean(s.routingExplanationEn), `${s.id} routingExplanationEn is populated`);
  }

  console.log('\n========================================');
  console.log(`Demo Dashboard Tests: ${passCount} Passed, ${failCount} Failed.`);
  console.log('========================================\n');
}

runDashboardDemoDataTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
