import { generateSeedSessions } from '../data/seedSessions';
import { LocalStorageSessionRepository } from '../services/providers';
import { TriageSession } from '../types/triage';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runDemoDashboardTests() {
  console.log('--- RUNNING DEMO DASHBOARD TEST SUITE ---');

  // Test 1: generateSeedSessions creates exactly 3 completed sessions
  const seeds = generateSeedSessions(new Date());
  assert(seeds.length === 3, `Expected 3 seed sessions, got ${seeds.length}`);
  console.log('✓ Exactly 3 seed sessions generated');

  // Test 2: Check urgencies and facilities
  const emergencyCase = seeds.find(s => s.decision?.finalUrgency === 'EMERGENCY');
  const urgentCase = seeds.find(s => s.decision?.finalUrgency === 'URGENT');
  const nonUrgentCase = seeds.find(s => s.decision?.finalUrgency === 'NON_URGENT');

  assert(!!emergencyCase, 'EMERGENCY case missing');
  assert(!!urgentCase, 'URGENT case missing');
  assert(!!nonUrgentCase, 'NON_URGENT case missing');
  console.log('✓ Found 1 Emergency, 1 Urgent, 1 Non-Urgent case');

  assert(
    emergencyCase!.routedFacility?.id === 'fac-demo-emerg-a' &&
    emergencyCase!.routedFacility?.tier === 'EMERGENCY',
    'Emergency case facility incorrect'
  );
  console.log('✓ Emergency case routed to 24/7 emergency facility (fac-demo-emerg-a)');

  assert(
    urgentCase!.routedFacility?.id === 'fac-demo-urgent-riyadh' &&
    urgentCase!.routedFacility?.tier === 'URGENT',
    'Urgent case facility incorrect'
  );
  console.log('✓ Urgent case routed to same-day urgent eye clinic (fac-demo-urgent-riyadh)');

  assert(
    nonUrgentCase!.routedFacility?.id === 'fac-demo-phc-e' &&
    nonUrgentCase!.routedFacility?.tier === 'NON_URGENT',
    'Non-urgent case facility incorrect'
  );
  console.log('✓ Non-urgent case routed to primary care clinic (fac-demo-phc-e)');

  // Test 3: Consistency of schema, explicit consent, decision source, audit events
  for (const session of seeds) {
    assert(session.consentGiven === true, `${session.id}: consent must be true`);
    assert(session.status === 'COMPLETED', `${session.id}: status must be COMPLETED`);
    assert(session.messages.length > 0, `${session.id}: messages missing`);
    assert(session.events.length >= 3, `${session.id}: audit events missing`);
    assert(!!session.decision, `${session.id}: decision missing`);
    assert(!!session.decision?.decisionSource, `${session.id}: decision source missing`);
    assert(!!session.metadata.ruleVersion, `${session.id}: ruleVersion missing`);
    assert(!!session.metadata.modelAdapterVersion, `${session.id}: modelAdapterVersion missing`);

    // Check chronological order of events
    for (let i = 1; i < session.events.length; i++) {
      const prev = new Date(session.events[i - 1].timestamp).getTime();
      const curr = new Date(session.events[i].timestamp).getTime();
      assert(curr >= prev, `${session.id}: audit events not chronological`);
    }
  }
  console.log('✓ All 3 sessions satisfy full schema, explicit consent, and chronological audit trail');

  // Test 4: Verify metrics calculation logic
  const total = seeds.length;
  const emergencyCount = seeds.filter(s => s.decision?.finalUrgency === 'EMERGENCY').length;
  const urgentCount = seeds.filter(s => s.decision?.finalUrgency === 'URGENT').length;
  const nonUrgentCount = seeds.filter(s => s.decision?.finalUrgency === 'NON_URGENT').length;
  const pendingReviewCount = seeds.filter(s => !s.clinicianReview).length;

  assert(total === 3, 'Total count mismatch');
  assert(emergencyCount === 1, 'Emergency count mismatch');
  assert(urgentCount === 1, 'Urgent count mismatch');
  assert(nonUrgentCount === 1, 'Non-urgent count mismatch');
  assert(pendingReviewCount === 1, `Pending review count expected 1, got ${pendingReviewCount}`);
  console.log(`✓ Dashboard counts derived correctly: Total=3, Emerg=1, Urgent=1, Non-Urgent=1, PendingReview=${pendingReviewCount}`);

  // Test 5: Verify Legacy Record Migration in LocalStorageSessionRepository
  const legacyRecord: Partial<TriageSession> = {
    id: 'SES-LEGACY-001',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    status: 'COMPLETED',
    consentGranted: true,
    // missing events, missing metadata, missing structured symptoms
    messages: [
      { id: 'm1', role: 'system', text: 'Welcome', timestamp: new Date().toISOString() },
      { id: 'm2', role: 'patient', text: 'I splashed battery acid in my eye', timestamp: new Date().toISOString() },
    ],
    decision: {
      finalUrgency: 'EMERGENCY',
      confidence: 0.99,
      isFinalDecision: true,
      decisionSource: 'HYBRID_AGREEMENT',
      ruleFindings: {
        matchedRules: ['R-RED-001'],
        redFlagsTriggered: ['CHEMICAL_SPLASH'],
        recommendedUrgency: 'EMERGENCY',
        urgencyPrecedenceReason: 'Red flag rule precedence',
        ruleDetails: [],
      },
      classifierOutput: {
        predictedUrgency: 'EMERGENCY',
        probability: 0.99,
        extractedSymptoms: { chemicalSplash: true },
        modelRationale: 'Legacy record',
      },
      selectedFacility: seeds[0].selectedFacility,
      immediateGuidance: 'Irrigate immediately',
    },
  };

  const repo = new LocalStorageSessionRepository();
  await repo.resetToSeed(seeds);
  await repo.saveSession(legacyRecord as TriageSession);

  const retrieved = await repo.getSession('SES-LEGACY-001');
  assert(!!retrieved, 'Failed to retrieve legacy record');
  assert(retrieved!.isLegacyRecord === true, 'Legacy record was not flagged with isLegacyRecord: true');
  assert(retrieved!.status === 'COMPLETED', 'Legacy completed session status changed unexpectedly');
  assert(retrieved!.events.length > 0, 'Legacy record events array was not populated');
  assert(!!retrieved!.metadata.ruleVersion, 'Legacy record metadata was not migrated');
  console.log('✓ Legacy record safely migrated without defaulting to "Pending Follow-up" or crashing');

  console.log('--- ALL DEMO DASHBOARD TESTS PASSED ---');
}

runDemoDashboardTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
