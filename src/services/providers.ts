import {
  Language,
  StructuredSymptoms,
  ModelSuggestion,
  TriageSession,
} from '../types/triage';
import {
  SpeechToTextProvider,
  TranscriptionResult,
  SymptomExtractionProvider,
  UrgencySuggestionProvider,
  SessionRepository,
} from './types';
import {
  RULE_ENGINE_VERSION,
  MODEL_ADAPTER_VERSION,
  DATASET_VERSION,
  SPEECH_MODEL_VERSION,
} from '../data/rulesConfig';
import { DEMO_FACILITIES } from '../data/facilities';
import {
  evaluateClinicalConcept,
  isMatchNegated,
} from '../safety/negationDetector';

/**
 * Creates default empty symptoms according to PRD schema.
 * Note: Boolean fields are initialized to null (unknown), NOT false.
 */
export function createEmptySymptoms(language: Language = 'ar'): StructuredSymptoms {
  return {
    language,
    eye: 'unknown',
    onset: 'unknown',
    duration_hours: null,
    vision_change: 'unknown',
    pain_level: 'unknown',
    trauma: null,
    chemical_exposure: null,
    redness: null,
    discharge: null,
    light_sensitivity: null,
    nausea_vomiting: null,
    recent_eye_surgery: null,
    contact_lens: null,
    other_symptoms: [],
    confidence: 0.85,
  };
}

/**
 * Speech-to-Text Provider (Simulated Pre-recorded/Sample Audio Fixture)
 * Honestly labels simulated transcripts as demo fixtures.
 * Never claims real Whisper transcription or live speech model execution.
 */
export class DemoSpeechToTextProvider implements SpeechToTextProvider {
  async transcribe(
    audioIdOrSampleText: string,
    language: Language
  ): Promise<TranscriptionResult> {
    // Simulated processing latency ~ 300ms
    await new Promise((resolve) => setTimeout(resolve, 300));

    return {
      text: audioIdOrSampleText,
      confidence: 0.90, // Simulated fixture placeholder — not a measured clinical model score
      durationSeconds: Math.floor(Math.random() * 6) + 8,
      provider: `${SPEECH_MODEL_VERSION} (Simulated Sample Fixture)`,
      languageDetected: language,
    };
  }
}

/**
 * Rule-informed Symptom Extractor with Clinical Negation Handling.
 * Accurately discerns positive, negative (negated), and unknown symptoms.
 * Preserves evidence snippets for each field.
 */
export class DemoSymptomExtractionProvider implements SymptomExtractionProvider {
  async extract(
    transcript: string,
    language: Language,
    currentSymptoms?: StructuredSymptoms
  ): Promise<{
    symptoms: StructuredSymptoms;
    extractedFields: Record<string, unknown>;
    confidence: number;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const s: StructuredSymptoms = currentSymptoms
      ? { ...currentSymptoms }
      : createEmptySymptoms(language);

    s.language = language;
    const lower = transcript.toLowerCase();
    const extractedFields: Record<string, unknown> = {};

    // 1. Eye affected
    if (lower.includes('اليمين') || lower.includes('اليمنى') || lower.includes('right eye')) {
      s.eye = 'right';
      extractedFields.eye = 'right (evidence: right eye)';
    } else if (lower.includes('اليسار') || lower.includes('اليسرى') || lower.includes('left eye')) {
      s.eye = 'left';
      extractedFields.eye = 'left (evidence: left eye)';
    } else if (
      lower.includes('العينين') ||
      lower.includes('كلتا العينين') ||
      lower.includes('كلتاهما') ||
      lower.includes('الثنتين') ||
      lower.includes('both eyes')
    ) {
      s.eye = 'both';
      extractedFields.eye = 'both (evidence: both eyes)';
    }

    // 2. Chemical Exposure (Negation-aware)
    const chemEval = evaluateClinicalConcept(lower, [
      /chemical.*(splash|exposure|burn|eye)/i,
      /\bchemical\b/i,
      /\bbleach\b/i,
      /\bdetergent\b/i,
      /\bacid\b/i,
      /\balkali\b/i,
      /\btoxic spray\b/i,
      /تعرض.*كيم/i,
      /فلاش/i,
      /كلور/i,
      /منظف/i,
      /كيماوي/i,
      /كيميائي/i,
      /كيميائية/i,
      /مادة حارقة/i,
      /صابون كاو/i,
    ]);
    if (chemEval.status === 'CONFIRMED_POSITIVE') {
      s.chemical_exposure = true;
      extractedFields.chemical_exposure = `true (positive evidence: "${chemEval.evidenceSnippet}")`;
    } else if (chemEval.status === 'CONFIRMED_NEGATIVE') {
      s.chemical_exposure = false;
      extractedFields.chemical_exposure = `false (negated evidence: "${chemEval.evidenceSnippet}")`;
    } else if (chemEval.status === 'UNCERTAIN') {
      s.chemical_exposure = null;
      extractedFields.chemical_exposure = `uncertain (conflicting/unclear evidence: "${chemEval.evidenceSnippet}")`;
    }

    // 3. Trauma / Foreign Object (Negation-aware)
    const traumaEval = evaluateClinicalConcept(lower, [
      /\btrauma\b/i,
      /\binjury\b/i,
      /\binjured\b/i,
      /foreign object/i,
      /metal (fragment|shard|particle)/i,
      /hit directly in the eye/i,
      /punched in the eye/i,
      /penetrat(ed|ing)/i,
      /شظية/i,
      /حديد/i,
      /ورشة/i,
      /ضربة/i,
      /طارت في عيني/i,
      /جسم غريب/i,
      /إصابة/i,
      /اصابة/i,
    ]);
    if (traumaEval.status === 'CONFIRMED_POSITIVE') {
      s.trauma = true;
      extractedFields.trauma = `true (positive evidence: "${traumaEval.evidenceSnippet}")`;
    } else if (traumaEval.status === 'CONFIRMED_NEGATIVE') {
      s.trauma = false;
      extractedFields.trauma = `false (negated evidence: "${traumaEval.evidenceSnippet}")`;
    } else if (traumaEval.status === 'UNCERTAIN') {
      s.trauma = null;
      extractedFields.trauma = `uncertain (conflicting/unclear evidence: "${traumaEval.evidenceSnippet}")`;
    }

    // 4. Vision Change (Negation-aware)
    // Check sudden vision loss
    const lossEval = evaluateClinicalConcept(lower, [
      /vision loss/i,
      /loss of (vision|sight)/i,
      /lost my vision/i,
      /lost vision/i,
      /blindness/i,
      /can't see anything/i,
      /cannot see anything/i,
      /vision change/i,
      /changes in vision/i,
      /فقد(ان)?.*(النظر|البصر|الرؤية|للنظر|للبصر)/i,
      /عمى مفاجئ/i,
      /انعدمت الرؤية/i,
      /سواد تام/i,
      /ضعف مفاجئ في النظر/i,
      /(?:تغير|تغيير).*(?:بالنظر|في النظر|بالرؤية|في الرؤية)/i,
    ]);

    // Check curtain / floaters
    const curtainEval = evaluateClinicalConcept(lower, [
      /\bcurtain\b/i,
      /dark shadow/i,
      /black veil/i,
      /flashes.*curtain/i,
      /ستارة سوداء/i,
      /ستارة سودة/i,
      /ستارة/i,
      /ظل أسود/i,
      /ظل اسود/i,
      /وميض مع ظل/i,
    ]);

    // Check double vision
    const doubleEval = evaluateClinicalConcept(lower, [
      /double vision/i,
      /seeing double/i,
      /ازدواجية/i,
      /رؤية مزدوجة/i,
      /اشوف اثنين/i,
    ]);

    // Check blurred vision
    const blurEval = evaluateClinicalConcept(lower, [
      /blurr(y|ed)/i,
      /تشويش/i,
      /ضباب/i,
      /غشاوة/i,
    ]);

    // Check normal vision affirmation
    const normalVisionEval = evaluateClinicalConcept(lower, [
      /no vision change/i,
      /vision is normal/i,
      /normal vision/i,
      /vision.*not changed/i,
      /vision.*did not change/i,
      /(?:و)?النظر طبيعي/i,
      /(?:و)?ما تغير النظر/i,
      /(?:و)?النظر ما تغير/i,
      /(?:و)?ما تغيرت الرؤية/i,
      /(?:و)?الرؤية طبيعية/i,
      /(?:و)?الرؤية سليمة/i,
      /(?:و)?النظر سليم/i,
      /أشوف زين/i,
      /اشوف زين/i,
      /أشوف كويس/i,
      /اشوف كويس/i,
      /(?:و)?نظري ما (تغير|تغيّر)/i,
      /(?:لا يوجد|ما فيه|مافيه|ولا|مافي).*(?:تغير|تغيير).*(?:بالنظر|في النظر|بالرؤية|في الرؤية)/i,
    ]);

    if (curtainEval.status === 'CONFIRMED_POSITIVE') {
      s.vision_change = 'flashes_floaters';
      extractedFields.vision_change = `flashes_floaters (positive evidence: "${curtainEval.evidenceSnippet}")`;
    } else if (lossEval.status === 'CONFIRMED_POSITIVE') {
      s.vision_change = 'loss';
      extractedFields.vision_change = `loss (positive evidence: "${lossEval.evidenceSnippet}")`;
    } else if (doubleEval.status === 'CONFIRMED_POSITIVE') {
      s.vision_change = 'double';
      extractedFields.vision_change = `double (positive evidence: "${doubleEval.evidenceSnippet}")`;
    } else if (blurEval.status === 'CONFIRMED_POSITIVE') {
      s.vision_change = 'blurred';
      extractedFields.vision_change = `blurred (positive evidence: "${blurEval.evidenceSnippet}")`;
    } else if (normalVisionEval.status === 'CONFIRMED_POSITIVE') {
      s.vision_change = 'none';
      extractedFields.vision_change = `none (affirmed normal vision: "${normalVisionEval.evidenceSnippet}")`;
    } else if (lossEval.status === 'CONFIRMED_NEGATIVE') {
      // Check for corneal / anterior segment risk (contact lenses, red eye, photophobia).
      // In patients with red eye / contact lenses / light sensitivity, negating sudden blindness
      // does not rule out corneal blurriness or decreased acuity, so vision_change remains 'unknown'
      // to prompt necessary clinical follow-up.
      // In patients without anterior segment risk (e.g. mild itching / routine non-urgent cases),
      // negating vision loss safely establishes vision_change = 'none'.
      const contactsRisk = evaluateClinicalConcept(lower, [
        /contact lens/i,
        /\bcontacts\b/i,
        /عدسات لاصقة/i,
        /عدسات/i,
      ]);
      const rednessRisk = evaluateClinicalConcept(lower, [
        /red eye/i,
        /\bredness\b/i,
        /\b(very )?red\b/i,
        /حمراء/i,
        /احمرار/i,
        /محمرّة/i,
        /محمرة/i,
      ]);
      const photoRisk = evaluateClinicalConcept(lower, [
        /light sensitivity/i,
        /photophobia/i,
        /light bothers/i,
        /حساسية من النور/i,
        /ألم مع النور/i,
        /تضايقني الإضاءة/i,
        /النور.*يضايقني/i,
        /الضوء/i,
      ]);

      const hasCornealRisk =
        contactsRisk.status === 'CONFIRMED_POSITIVE' ||
        rednessRisk.status === 'CONFIRMED_POSITIVE' ||
        photoRisk.status === 'CONFIRMED_POSITIVE' ||
        Boolean(currentSymptoms && (currentSymptoms.contact_lens === true || currentSymptoms.redness === true || currentSymptoms.light_sensitivity === true));

      if (hasCornealRisk) {
        if (currentSymptoms && currentSymptoms.vision_change !== 'unknown') {
          s.vision_change = currentSymptoms.vision_change;
          extractedFields.vision_change = `${currentSymptoms.vision_change} (preserved prior established finding)`;
        } else {
          s.vision_change = 'unknown';
          extractedFields.vision_change = `unknown (negated acute loss with corneal/red-eye risk: "${lossEval.evidenceSnippet}")`;
        }
      } else {
        s.vision_change = 'none';
        extractedFields.vision_change = `none (negated vision loss without anterior segment risk: "${lossEval.evidenceSnippet}")`;
      }
    } else if (currentSymptoms && currentSymptoms.vision_change !== 'unknown') {
      s.vision_change = currentSymptoms.vision_change;
      extractedFields.vision_change = `${currentSymptoms.vision_change} (preserved prior established finding)`;
    }

    // 5. Pain Level (Negation-aware)
    const severePainEval = evaluateClinicalConcept(lower, [
      /severe (eye )?pain/i,
      /unbearable (eye )?pain/i,
      /acute excruciating pain/i,
      /(?:^|[\s،,.;:!?])(ألم|الم)(?:[\s،,.;:!?]).*(شديد|فظيع|قوي جدا)/i,
      /ألم شديد/i,
      /ألم فظيع/i,
      /الم قوي جدا/i,
      /تحرقني جدا/i,
    ]);

    const moderatePainEval = evaluateClinicalConcept(lower, [
      /moderate (eye )?pain/i,
      /\baching\b/i,
      /\bache\b/i,
      /\bhurts\b/i,
      /\bhurt\b/i,
      /\bpain is getting worse\b/i,
      /\bpain\b/i,
      /(?:^|[\s،,.;:!?])(ألم|الم)(?:[\s،,.;:!?]).*متوسط/i,
      /ألم متوسط/i,
      /الم متوسط/i,
      /توجعني/i,
      /يوجعني/i,
    ]);

    const mildPainEval = evaluateClinicalConcept(lower, [
      /mild (eye )?pain/i,
      /mild itching/i,
      /\bitching\b/i,
      /\bitch\b/i,
      /\bscratchiness\b/i,
      /\bgrittiness\b/i,
      /(?:^|[\s،,.;:!?])(ألم|الم|وجع)(?:[\s،,.;:!?]).*خفيف/i,
      /ألم خفيف/i,
      /الم خفيف/i,
      /وجع خفيف/i,
      /حكة/i,
      /تحك(ني|ّني)/i,
      /حكة خفيفة/i,
      /إحساس مثل الرمل/i,
      /رمل/i,
    ]);

    const noPainEval = evaluateClinicalConcept(lower, [
      /no pain/i,
      /no eye pain/i,
      /painless/i,
      /without pain/i,
      /لا يوجد ألم/i,
      /لا يوجد الم/i,
      /ما فيه ألم/i,
      /مافيه الم/i,
      /بدون ألم/i,
      /ولا ألم/i,
    ]);

    if (severePainEval.status === 'CONFIRMED_POSITIVE') {
      s.pain_level = 'severe';
      extractedFields.pain_level = `severe (positive evidence: "${severePainEval.evidenceSnippet}")`;
    } else if (moderatePainEval.status === 'CONFIRMED_POSITIVE') {
      s.pain_level = 'moderate';
      extractedFields.pain_level = `moderate (positive evidence: "${moderatePainEval.evidenceSnippet}")`;
    } else if (mildPainEval.status === 'CONFIRMED_POSITIVE') {
      s.pain_level = 'mild';
      extractedFields.pain_level = `mild (positive evidence: "${mildPainEval.evidenceSnippet}")`;
    } else if (noPainEval.status === 'CONFIRMED_POSITIVE') {
      s.pain_level = 'none';
      extractedFields.pain_level = 'none (negated or absent pain)';
    } else if (severePainEval.status === 'CONFIRMED_NEGATIVE') {
      // Negating severe pain does not mean no pain exists if mild/moderate or unknown
      if (currentSymptoms && currentSymptoms.pain_level !== 'unknown') {
        s.pain_level = currentSymptoms.pain_level;
        extractedFields.pain_level = `${currentSymptoms.pain_level} (preserved prior established finding)`;
      } else {
        s.pain_level = 'unknown';
        extractedFields.pain_level = 'unknown (negated severe pain, but general pain status unknown)';
      }
    } else if (currentSymptoms && currentSymptoms.pain_level !== 'unknown') {
      s.pain_level = currentSymptoms.pain_level;
      extractedFields.pain_level = `${currentSymptoms.pain_level} (preserved prior established finding)`;
    }

    // 6. Onset Speed (Negation-aware)
    // Check if "sudden" appears outside of a negated scope
    const suddenMatches = [...lower.matchAll(/\bsudden\b|فجأة|مفاجئ|مفاجئة/gi)];
    let hasAffirmativeSudden = false;
    for (const match of suddenMatches) {
      if (match.index !== undefined && !isMatchNegated(lower, match.index)) {
        hasAffirmativeSudden = true;
        break;
      }
    }

    if (hasAffirmativeSudden) {
      s.onset = 'sudden';
      extractedFields.onset = 'sudden (affirmative evidence)';
    } else if (
      lower.includes('أسبوعين') ||
      lower.includes('اسبوعين') ||
      lower.includes('two weeks') ||
      lower.includes('2 weeks') ||
      lower.includes('تدريجي') ||
      lower.includes('gradual') ||
      lower.includes('weeks') ||
      lower.includes('months') ||
      lower.includes('days') ||
      lower.includes('أيام') ||
      lower.includes('شهور') ||
      lower.includes('أمس') ||
      lower.includes('امس') ||
      lower.includes('yesterday') ||
      lower.includes('24 hours') ||
      lower.includes('24 ساعة')
    ) {
      s.onset = 'gradual';
      if (lower.includes('أسبوعين') || lower.includes('two weeks') || lower.includes('2 weeks') || lower.includes('اسبوعين')) {
        s.duration_hours = 336;
      } else if (lower.includes('أمس') || lower.includes('امس') || lower.includes('yesterday') || lower.includes('24')) {
        s.duration_hours = 24;
      }
      extractedFields.onset = 'gradual (evidence: duration in hours/days/weeks/months)';
    }

    // 7. Contact Lenses (Negation-aware)
    const contactsEval = evaluateClinicalConcept(lower, [
      /contact lens/i,
      /\bcontacts\b/i,
      /عدسات لاصقة/i,
      /عدسات/i,
    ]);
    if (contactsEval.status === 'CONFIRMED_POSITIVE') {
      s.contact_lens = true;
      extractedFields.contact_lens = 'true (positive evidence)';
    } else if (contactsEval.status === 'CONFIRMED_NEGATIVE') {
      s.contact_lens = false;
      extractedFields.contact_lens = 'false (negated evidence)';
    }

    // 8. Redness
    const rednessEval = evaluateClinicalConcept(lower, [
      /red eye/i,
      /\bredness\b/i,
      /\b(very )?red\b/i,
      /حمراء/i,
      /احمرار/i,
    ]);
    if (rednessEval.status === 'CONFIRMED_POSITIVE') {
      s.redness = true;
      extractedFields.redness = 'true (positive evidence)';
    } else if (rednessEval.status === 'CONFIRMED_NEGATIVE') {
      s.redness = false;
      extractedFields.redness = 'false (negated evidence)';
    }

    // 9. Light Sensitivity (Photophobia)
    const photoEval = evaluateClinicalConcept(lower, [
      /light sensitivity/i,
      /photophobia/i,
      /حساسية من النور/i,
      /ألم مع النور/i,
      /تضايقني الإضاءة/i,
      /الضوء/i,
    ]);
    if (photoEval.status === 'CONFIRMED_POSITIVE') {
      s.light_sensitivity = true;
      extractedFields.light_sensitivity = 'true (positive evidence)';
    } else if (photoEval.status === 'CONFIRMED_NEGATIVE') {
      s.light_sensitivity = false;
      extractedFields.light_sensitivity = 'false (negated evidence)';
    }

    // 10. Nausea / Vomiting
    const nauseaEval = evaluateClinicalConcept(lower, [
      /\bnausea\b/i,
      /\bvomit\b/i,
      /threw up/i,
      /غثيان/i,
      /استفراغ/i,
      /قيء/i,
      /ترجيع/i,
    ]);
    if (nauseaEval.status === 'CONFIRMED_POSITIVE') {
      s.nausea_vomiting = true;
      extractedFields.nausea_vomiting = 'true (positive evidence)';
    } else if (nauseaEval.status === 'CONFIRMED_NEGATIVE') {
      s.nausea_vomiting = false;
      extractedFields.nausea_vomiting = 'false (negated evidence)';
    }

    // 11. Recent Eye Surgery
    const surgeryEval = evaluateClinicalConcept(lower, [
      /\bsurgery\b/i,
      /cataract operation/i,
      /\blasik\b/i,
      /عملية/i,
      /جراحة/i,
      /ساد/i,
    ]);
    if (surgeryEval.status === 'CONFIRMED_POSITIVE') {
      s.recent_eye_surgery = true;
      extractedFields.recent_eye_surgery = 'true (positive evidence)';
    } else if (surgeryEval.status === 'CONFIRMED_NEGATIVE') {
      s.recent_eye_surgery = false;
      extractedFields.recent_eye_surgery = 'false (negated evidence)';
    }

    return {
      symptoms: s,
      extractedFields,
      confidence: 0.90, // Note: Prototype heuristic extraction score (not measured ML confidence)
    };
  }
}

/**
 * Urgency Classification Model Provider (Simulates the classifier fixture)
 * Honestly labeled as a simulated demo heuristic fixture.
 * Does not claim actual fine-tuning, LoRA adapters, or measured clinical confidence.
 */
export class DemoUrgencySuggestionProvider implements UrgencySuggestionProvider {
  async suggestUrgency(
    symptoms: StructuredSymptoms,
    _transcript: string
  ): Promise<ModelSuggestion> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const rationaleCodes: string[] = [];

    // Red flag indicators in symptoms
    const isEmergency =
      symptoms.chemical_exposure === true ||
      symptoms.trauma === true ||
      symptoms.vision_change === 'loss' ||
      symptoms.vision_change === 'flashes_floaters' ||
      (symptoms.pain_level === 'severe' && symptoms.nausea_vomiting === true);

    if (isEmergency) {
      rationaleCodes.push('HEURISTIC_EMERGENCY_FEATURE_DETECTED');
      return {
        urgency: 'EMERGENCY',
        confidence: 0.95, // Note: Simulated heuristic score placeholder
        rationaleCodes,
        baseModel: 'Simulated Demo Heuristic (Prototype Fixture — Not Fine-Tuned)',
        adapterVersion: MODEL_ADAPTER_VERSION,
      };
    }

    const isUrgent =
      symptoms.contact_lens === true ||
      symptoms.pain_level === 'moderate' ||
      symptoms.vision_change === 'blurred' ||
      symptoms.light_sensitivity === true;

    if (isUrgent) {
      rationaleCodes.push('HEURISTIC_CORNEAL_INFLAMMATION_SUSPICION');
      return {
        urgency: 'URGENT',
        confidence: 0.88, // Note: Simulated heuristic score placeholder
        rationaleCodes,
        baseModel: 'Simulated Demo Heuristic (Prototype Fixture — Not Fine-Tuned)',
        adapterVersion: MODEL_ADAPTER_VERSION,
      };
    }

    rationaleCodes.push('HEURISTIC_SUPERFICIAL_IRRITATION_SIGNS');
    return {
      urgency: 'NON_URGENT',
      confidence: 0.90, // Note: Simulated heuristic score placeholder
      rationaleCodes,
      baseModel: 'Simulated Demo Heuristic (Prototype Fixture — Not Fine-Tuned)',
      adapterVersion: MODEL_ADAPTER_VERSION,
    };
  }
}

const STORAGE_KEY = 'baseera_ophthalmic_triage_sessions_v1';
export const SESSIONS_UPDATE_EVENT = 'baseera_sessions_updated';

/**
 * Safely normalizes and migrates locally stored sessions.
 * Prevents older records from crashing or silently displaying completed emergency cases as "Pending Follow-up".
 * Ensures all required schema fields exist, fills missing audit structures, and flags legacy records when migrated.
 */
export function normalizeStoredSession(raw: any): TriageSession {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `SES-LEGACY-${Date.now()}`,
      patientMaskedPhone: '+966 50 *** 0000',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      language: 'ar',
      consentGiven: true,
      status: 'COMPLETED',
      followUpCount: 0,
      messages: [],
      symptoms: createEmptySymptoms('ar'),
      events: [],
      isLegacyRecord: true,
      metadata: {
        ruleVersion: RULE_ENGINE_VERSION,
        modelAdapterVersion: MODEL_ADAPTER_VERSION,
        datasetVersion: DATASET_VERSION,
        speechModelVersion: SPEECH_MODEL_VERSION,
        isLegacy: true,
      },
    };
  }

  let isLegacy = Boolean(raw.isLegacyRecord);
  const lang: Language = raw.language === 'en' ? 'en' : 'ar';
  const symptoms: StructuredSymptoms = {
    ...createEmptySymptoms(lang),
    ...(raw.symptoms || {}),
  };

  // Inspect status and decision
  let status = raw.status || 'COMPLETED';
  let decision = raw.decision ? { ...raw.decision } : undefined;

  // Safe migration for older records:
  // If a case is COMPLETED and has a decision, guarantee isFinalDecision is true
  if (status === 'COMPLETED' && decision) {
    if (decision.isFinalDecision === undefined || !decision.isFinalDecision) {
      decision.isFinalDecision = true;
      isLegacy = true;
    }
    // Normalize urgency format
    if (decision.finalUrgency) {
      decision.finalUrgency = String(decision.finalUrgency).toUpperCase() as any;
    }
  } else if (
    decision &&
    decision.finalUrgency &&
    status !== 'FOLLOW_UP' &&
    status !== 'IN_TRIAGE' &&
    status !== 'AWAITING_CONSENT'
  ) {
    // If urgency is finalized and not actively running, mark COMPLETED
    status = 'COMPLETED';
    decision.isFinalDecision = true;
  } else if (status === 'COMPLETED' && !decision) {
    // Older record saved without decision object — reconstruct from messages or symptoms
    isLegacy = true;
    const resultCard = (raw.messages || []).find(
      (m: any) => m.type === 'result_card' || m.decisionPayload
    );
    const urgency =
      resultCard?.decisionPayload?.finalUrgency ||
      (symptoms.chemical_exposure === true ||
      symptoms.trauma === true ||
      symptoms.pain_level === 'severe' ||
      symptoms.vision_change === 'loss'
        ? 'EMERGENCY'
        : symptoms.contact_lens === true ||
          symptoms.pain_level === 'moderate' ||
          symptoms.vision_change === 'blurred'
        ? 'URGENT'
        : 'NON_URGENT');

    decision = {
      finalUrgency: urgency,
      isFinalDecision: true,
      decisionSource: resultCard?.decisionPayload?.decisionSource || 'RULE_ENGINE_OVERRIDE',
      guidanceTextAr:
        resultCard?.decisionPayload?.guidanceTextAr ||
        (urgency === 'EMERGENCY'
          ? 'حالة طارئة تتطلب فحصاً فورياً في طوارئ العيون.'
          : urgency === 'URGENT'
          ? 'تقييم عيون عاجل في اليوم نفسه.'
          : 'متابعة في مركز الرعاية الأولية.'),
      guidanceTextEn:
        resultCard?.decisionPayload?.guidanceTextEn ||
        (urgency === 'EMERGENCY'
          ? 'Emergency requiring immediate specialized eye care.'
          : urgency === 'URGENT'
          ? 'Same-day urgent eye assessment.'
          : 'Suitable for primary healthcare.'),
      evaluatedAt: raw.updatedAt || raw.startedAt || new Date().toISOString(),
      ruleResult: {
        matchedFlags: [],
        ruleUrgency: urgency,
        rationaleCodes: ['MIGRATED_LEGACY_RECORD'],
        evidenceMatches: [],
      },
      modelSuggestion: {
        urgency: urgency,
        confidence: 0.88,
        rationaleCodes: ['MIGRATED_LEGACY_RECORD'],
        baseModel: 'Simulated Model Heuristic (Demo Fixture)',
        adapterVersion: MODEL_ADAPTER_VERSION,
      },
    };
  }

  // Facility check / fallback
  let routedFacility = raw.routedFacility;
  if (!routedFacility && decision?.finalUrgency) {
    routedFacility =
      DEMO_FACILITIES.find((f) => f.tier === decision.finalUrgency) || DEMO_FACILITIES[0];
  }

  // Metadata check
  let metadata = raw.metadata;
  if (!metadata || !metadata.ruleVersion) {
    isLegacy = true;
    metadata = {
      ruleVersion: RULE_ENGINE_VERSION,
      modelAdapterVersion: MODEL_ADAPTER_VERSION,
      datasetVersion: DATASET_VERSION,
      speechModelVersion: SPEECH_MODEL_VERSION,
      isLegacy: true,
    };
  }

  // Audit events check: if missing or empty on legacy completed records, synthesize standard audit trail
  let events = Array.isArray(raw.events) ? [...raw.events] : [];
  if (events.length === 0) {
    isLegacy = true;
    const startTs = raw.startedAt || new Date().toISOString();
    const updateTs = raw.updatedAt || startTs;
    events = [
      {
        id: `evt-migrated-${raw.id || 'legacy'}-1`,
        timestamp: startTs,
        type: 'SESSION_START',
        summaryAr: 'بدء الجلسة (سجل تجريبي سابق تم ترحيله)',
        summaryEn: 'Session started (Migrated legacy demo record)',
      },
      {
        id: `evt-migrated-${raw.id || 'legacy'}-2`,
        timestamp: startTs,
        type: 'CONSENT_GRANTED',
        summaryAr: 'الموافقة الصريحة للمريض موثقة مسبقاً',
        summaryEn: 'Patient explicit consent recorded',
      },
      {
        id: `evt-migrated-${raw.id || 'legacy'}-3`,
        timestamp: updateTs,
        type: 'URGENCY_RESOLVED',
        summaryAr: `تم ترحيل تصنيف الفرز النهائي بنجاح: ${decision?.finalUrgency || 'COMPLETED'}`,
        summaryEn: `Final triage urgency safely migrated: ${decision?.finalUrgency || 'COMPLETED'}`,
      },
    ];
  }

  return {
    id: raw.id || `SES-${Math.floor(1000 + Math.random() * 9000)}-KSA`,
    patientMaskedPhone: raw.patientMaskedPhone || '+966 50 *** 0000',
    startedAt: raw.startedAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.startedAt || new Date().toISOString(),
    language: lang,
    consentGiven: raw.consentGiven !== undefined ? Boolean(raw.consentGiven) : true,
    status,
    followUpCount: typeof raw.followUpCount === 'number' ? raw.followUpCount : 0,
    messages: Array.isArray(raw.messages) ? raw.messages : [],
    symptoms,
    decision,
    routedFacility,
    routingExplanationAr: raw.routingExplanationAr,
    routingExplanationEn: raw.routingExplanationEn,
    answeredFields: raw.answeredFields || {},
    events,
    clinicianReview: raw.clinicianReview,
    isLegacyRecord: isLegacy,
    metadata,
  };
}

/**
 * Shared Session Repository:
 * Persists demo sessions to localStorage with browser fallback and cross-tab/view synchronization.
 */
export class LocalStorageSessionRepository implements SessionRepository {
  private memorySessions: TriageSession[] = [];

  private notifyListeners() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSIONS_UPDATE_EVENT));
    }
  }

  async getAllSessions(): Promise<TriageSession[]> {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeStoredSession);
      } catch {
        return [];
      }
    }
    return this.memorySessions.map(normalizeStoredSession);
  }

  async getSession(id: string): Promise<TriageSession | null> {
    const all = await this.getAllSessions();
    return all.find((s) => s.id === id) || null;
  }

  async saveSession(session: TriageSession): Promise<void> {
    const normalized = normalizeStoredSession(session);
    const all = await this.getAllSessions();
    const existingIndex = all.findIndex((s) => s.id === normalized.id);
    if (existingIndex >= 0) {
      all[existingIndex] = normalized;
    } else {
      all.unshift(normalized);
    }
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      this.notifyListeners();
    } else {
      this.memorySessions = all;
    }
  }

  async updateSession(session: TriageSession): Promise<void> {
    await this.saveSession(session);
  }

  async seedInitialSessions(sessions: TriageSession[]): Promise<void> {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const existing = await this.getAllSessions();
      if (existing.length === 0) {
        const normalized = sessions.map(normalizeStoredSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        this.notifyListeners();
      }
    } else {
      if (this.memorySessions.length === 0) {
        this.memorySessions = sessions.map(normalizeStoredSession);
      }
    }
  }

  async resetToSeed(sessions: TriageSession[]): Promise<void> {
    const normalized = sessions.map(normalizeStoredSession);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      this.notifyListeners();
    } else {
      this.memorySessions = [...normalized];
    }
  }
}
