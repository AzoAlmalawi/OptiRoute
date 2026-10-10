import {
  StructuredSymptoms,
  UrgencyLevel,
  RuleEvaluationResult,
  RuleEvidence,
  ModelSuggestion,
  TriageDecision,
  DecisionSource,
} from '../types/triage';
import {
  RED_FLAG_RULES,
  RAW_TEXT_RED_FLAG_PATTERNS,
} from '../data/rulesConfig';
import { isMatchNegated } from './negationDetector';

/**
 * Maps urgency levels to strict ordinal integers for comparison.
 * EMERGENCY (3) > URGENT (2) > NON_URGENT (1)
 */
export const URGENCY_RANK: Record<UrgencyLevel, number> = {
  NON_URGENT: 1,
  URGENT: 2,
  EMERGENCY: 3,
};

export const RANK_TO_URGENCY: Record<number, UrgencyLevel> = {
  1: 'NON_URGENT',
  2: 'URGENT',
  3: 'EMERGENCY',
};

/**
 * Evaluates raw message text directly against deterministic red-flag patterns,
 * completely independent of any model extraction.
 * Negated mentions (e.g. "no chemical exposure", "لا يوجد تعرض كيميائي") are strictly
 * excluded from triggering red flags.
 */
export function evaluateRawTextSafety(rawText: string): {
  matchedRuleIds: string[];
  evidenceList: RuleEvidence[];
} {
  const matchedRuleIds = new Set<string>();
  const evidenceList: RuleEvidence[] = [];

  const textLower = rawText.toLowerCase();

  for (const patternGroup of RAW_TEXT_RED_FLAG_PATTERNS) {
    const allRegexes = [...patternGroup.arPatterns, ...patternGroup.enPatterns];
    for (const regex of allRegexes) {
      // Find all matches in the text to check if any affirmative occurrence exists
      const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
      let match: RegExpExecArray | null;

      while ((match = globalRegex.exec(textLower)) !== null) {
        const matchIdx = match.index;
        const snippet = match[0];
        const negated = isMatchNegated(textLower, matchIdx);

        evidenceList.push({
          field: 'raw_text_scan',
          source: 'raw_text',
          snippet,
          isNegated: negated,
        });

        // Only affirmative (non-negated) mentions can trigger a red flag!
        if (!negated) {
          matchedRuleIds.add(patternGroup.ruleId);
        }
      }
    }
  }

  return {
    matchedRuleIds: Array.from(matchedRuleIds),
    evidenceList,
  };
}

/**
 * Evaluates structured fields against clinical rules.
 * Handles TriState values (true = positive, false = negative, null = unknown).
 * Explicitly false (negated) symptoms never trigger red flags.
 * Missing/unknown fields NEVER clear a red-flag condition.
 */
export function evaluateStructuredFields(symptoms: StructuredSymptoms): {
  matchedRuleIds: string[];
  evidenceList: RuleEvidence[];
  baseUrgency: UrgencyLevel;
  rationaleCodes: string[];
} {
  const matchedRuleIds = new Set<string>();
  const evidenceList: RuleEvidence[] = [];
  const rationaleCodes: string[] = [];

  // Check chemical exposure (RF-02) - only if positively confirmed true
  if (symptoms.chemical_exposure === true) {
    matchedRuleIds.add('RF-02');
    evidenceList.push({ field: 'chemical_exposure', source: 'structured_field', snippet: 'true', isNegated: false });
    rationaleCodes.push('RULE_CHEMICAL_EXPOSURE');
  } else if (symptoms.chemical_exposure === false) {
    evidenceList.push({ field: 'chemical_exposure', source: 'structured_field', snippet: 'false', isNegated: true });
    rationaleCodes.push('RULE_CHEMICAL_EXPOSURE_NEGATED');
  }

  // Check eye trauma (RF-03) - only if positively confirmed true
  if (symptoms.trauma === true) {
    matchedRuleIds.add('RF-03');
    evidenceList.push({ field: 'trauma', source: 'structured_field', snippet: 'true', isNegated: false });
    rationaleCodes.push('RULE_EYE_TRAUMA');
  } else if (symptoms.trauma === false) {
    evidenceList.push({ field: 'trauma', source: 'structured_field', snippet: 'false', isNegated: true });
    rationaleCodes.push('RULE_TRAUMA_NEGATED');
  }

  // Sudden vision loss / blackout (RF-01) - only if sudden AND loss
  if (symptoms.onset === 'sudden' && symptoms.vision_change === 'loss') {
    matchedRuleIds.add('RF-01');
    evidenceList.push({ field: 'vision_change', source: 'structured_field', snippet: 'onset=sudden, change=loss', isNegated: false });
    rationaleCodes.push('RULE_SUDDEN_VISION_LOSS');
  }

  // Flashes with curtain / floaters (RF-05) - only if flashes_floaters AND sudden
  if (symptoms.vision_change === 'flashes_floaters' && symptoms.onset === 'sudden') {
    matchedRuleIds.add('RF-05');
    evidenceList.push({ field: 'vision_change', source: 'structured_field', snippet: 'flashes_floaters', isNegated: false });
    rationaleCodes.push('RULE_FLASHES_FLOATERS_CURTAIN');
  }

  // Severe pain with nausea/vomiting (RF-04) - only if severe pain AND positive nausea/vomiting
  if (symptoms.pain_level === 'severe' && symptoms.nausea_vomiting === true) {
    matchedRuleIds.add('RF-04');
    evidenceList.push({ field: 'nausea_vomiting', source: 'structured_field', snippet: 'severe_pain_with_nausea', isNegated: false });
    rationaleCodes.push('RULE_SEVERE_PAIN_WITH_NAUSEA');
  }

  // Post eye surgery complication (RF-08)
  if (symptoms.recent_eye_surgery === true && (symptoms.pain_level === 'severe' || symptoms.pain_level === 'moderate' || (symptoms.vision_change !== 'none' && symptoms.vision_change !== 'unknown'))) {
    matchedRuleIds.add('RF-08');
    evidenceList.push({ field: 'recent_eye_surgery', source: 'structured_field', snippet: 'post_op_pain_or_vision_change', isNegated: false });
    rationaleCodes.push('RULE_POST_OP_COMPLICATION');
  }

  // Sudden double vision (RF-06)
  if (symptoms.onset === 'sudden' && symptoms.vision_change === 'double') {
    matchedRuleIds.add('RF-06');
    evidenceList.push({ field: 'vision_change', source: 'structured_field', snippet: 'sudden_double_vision', isNegated: false });
    rationaleCodes.push('RULE_SUDDEN_DIPLOPIA');
  }

  // Determine non-emergency urgency if no red flags matched
  let baseUrgency: UrgencyLevel = 'NON_URGENT';

  if (matchedRuleIds.size > 0) {
    baseUrgency = 'EMERGENCY';
  } else {
    // Urgent same-day criteria:
    // - Contact lens wearer with red eye or pain or light sensitivity
    // - Moderate eye pain
    // - Moderate vision blurring
    // - Marked light sensitivity
    const isContactLensRedEye = symptoms.contact_lens === true && (symptoms.redness === true || symptoms.pain_level !== 'none' || symptoms.light_sensitivity === true);
    const isModeratePain = symptoms.pain_level === 'moderate' || symptoms.pain_level === 'severe';
    const isBlurredVision = symptoms.vision_change === 'blurred';
    const isSignificantPhotophobia = symptoms.light_sensitivity === true;

    if (isContactLensRedEye || isModeratePain || isBlurredVision || isSignificantPhotophobia) {
      baseUrgency = 'URGENT';
      if (isContactLensRedEye) rationaleCodes.push('CONTACT_LENS_INFLAMMATION_RISK');
      if (isModeratePain) rationaleCodes.push('MODERATE_OCULAR_PAIN');
      if (isBlurredVision) rationaleCodes.push('ACUTE_BLURRED_VISION');
    } else {
      baseUrgency = 'NON_URGENT';
      rationaleCodes.push('SUPERFICIAL_SYMPTOMS_ONLY');
    }
  }

  return {
    matchedRuleIds: Array.from(matchedRuleIds),
    evidenceList,
    baseUrgency,
    rationaleCodes,
  };
}

/**
 * Combines raw text evaluation and structured evaluation into a complete Rule Engine output.
 */
export function runDeterministicRuleEngine(
  rawTexts: string[],
  symptoms: StructuredSymptoms
): RuleEvaluationResult {
  const combinedRawEvidence: RuleEvidence[] = [];
  const rawMatchedRuleIds = new Set<string>();

  for (const text of rawTexts) {
    const { matchedRuleIds, evidenceList } = evaluateRawTextSafety(text);
    matchedRuleIds.forEach((id) => rawMatchedRuleIds.add(id));
    combinedRawEvidence.push(...evidenceList);
  }

  const structuredResult = evaluateStructuredFields(symptoms);

  // Union of all matched red flags, EXCEPT when explicitly negated in structured symptoms
  const allMatchedRuleIds = new Set<string>();

  for (const id of rawMatchedRuleIds) {
    // If the structured field was explicitly negated (false), do not treat raw text scan as an active red flag
    if (id === 'RF-02' && symptoms.chemical_exposure === false) continue;
    if (id === 'RF-03' && symptoms.trauma === false) continue;
    allMatchedRuleIds.add(id);
  }
  for (const id of structuredResult.matchedRuleIds) {
    allMatchedRuleIds.add(id);
  }

  const matchedFlags = RED_FLAG_RULES.filter((rule) => allMatchedRuleIds.has(rule.id));
  const isEmergency = matchedFlags.some((f) => f.triggersEmergency);

  const ruleUrgency: UrgencyLevel = isEmergency
    ? 'EMERGENCY'
    : structuredResult.baseUrgency;

  const rationaleCodes = [
    ...matchedFlags.map((f) => `RED_FLAG_${f.code}`),
    ...structuredResult.rationaleCodes,
  ];

  return {
    matchedFlags,
    ruleUrgency,
    rationaleCodes: Array.from(new Set(rationaleCodes)),
    evidenceMatches: [...combinedRawEvidence, ...structuredResult.evidenceList],
  };
}

/**
 * Checks whether a case has the minimum required clinical information
 * to safely declare a NON_URGENT determination.
 * Follows PRD rule: "Missing or unclear data always escalates urgency, never lowers it."
 */
export function checkHasRequiredNonUrgentInfo(symptoms: StructuredSymptoms): {
  isSafeToCompleteNonUrgent: boolean;
  missingCrucialFields: string[];
} {
  const missingCrucialFields: string[] = [];

  // 1. Vision change must be explicitly resolved (cannot be unknown)
  if (symptoms.vision_change === 'unknown') {
    missingCrucialFields.push('vision_change');
  }

  // 2. Pain level must be explicitly resolved (cannot be unknown)
  if (symptoms.pain_level === 'unknown') {
    missingCrucialFields.push('pain_level');
  }

  // 3. Contact lens status must be known if eye has redness
  if (symptoms.redness === true && symptoms.contact_lens === null) {
    missingCrucialFields.push('contact_lens_with_redness');
  }

  // 4. Trauma & chemical exposure: unknown must NEVER be treated as negative.
  // In the absence of confirmed gradual onset, pending trauma or chemical status cannot be assumed negative.
  if (symptoms.trauma === null && symptoms.onset === 'unknown') {
    missingCrucialFields.push('onset_or_trauma');
  }
  if (symptoms.chemical_exposure === null && (symptoms.pain_level === 'moderate' || symptoms.pain_level === 'severe')) {
    missingCrucialFields.push('chemical_exposure_status');
  }

  return {
    isSafeToCompleteNonUrgent: missingCrucialFields.length === 0,
    missingCrucialFields,
  };
}

/**
 * Core Safety Arbiter: enforces FR-15 and Safety Governance.
 * Urgency = max(rule engine, model suggestion).
 * The model CAN NEVER downgrade a rule urgency.
 * If model confidence is low (< 0.70) or uncertain, escalate urgency by one level.
 * Emergency is sticky: once an emergency, always an emergency.
 * If crucial data remains unknown at final decision, conservative fallback policy applies.
 */
export function resolveTriageDecision(
  ruleResult: RuleEvaluationResult,
  modelSuggestion?: ModelSuggestion,
  previousDecision?: TriageDecision,
  options?: {
    isFinal?: boolean;
    symptoms?: StructuredSymptoms;
  }
): TriageDecision {
  const isFinal = options?.isFinal ?? true;
  const symptoms = options?.symptoms;

  const ruleRank = URGENCY_RANK[ruleResult.ruleUrgency];
  let modelRank = 1;
  let escalatedByUncertainty = false;

  if (modelSuggestion) {
    modelRank = URGENCY_RANK[modelSuggestion.urgency];

    // FR-15: Low model confidence (< 0.70) escalates by one level
    if (modelSuggestion.confidence < 0.70 && modelRank < 3) {
      modelRank = Math.min(3, modelRank + 1);
      escalatedByUncertainty = true;
    }
  }

  // Precedence rule: max(rule, model)
  let resolvedRank = Math.max(ruleRank, modelRank);

  // Safety invariant: Sticky Emergency across session lifetime
  let isRetainedEmergency = false;
  let retainedEmergencyReasonAr: string | undefined = undefined;
  let retainedEmergencyReasonEn: string | undefined = undefined;

  if (previousDecision && URGENCY_RANK[previousDecision.finalUrgency] === 3) {
    resolvedRank = 3;
    // Check if the current rules/model on their own would NOT have yielded EMERGENCY
    if (Math.max(ruleRank, modelRank) < 3) {
      isRetainedEmergency = true;
      retainedEmergencyReasonAr =
        'تم تحديث إجابتك. بقيت توصية الطوارئ احترازيًا لأنها صدرت بناءً على إجابة سابقة، وفق سياسة النموذج التجريبي.';
      retainedEmergencyReasonEn =
        'Your answer has been updated. The emergency recommendation was retained as a safety precaution because it was issued based on a previous answer, per demo safety policy.';
    }
  }

  // PRD Conservative Fallback Policy for Incomplete / Unknown data:
  // "Missing or unclear data always escalates urgency, never lowers it."
  // If final decision is reached and the outcome would otherwise be NON_URGENT,
  // verify whether minimum required data was obtained.
  if (isFinal && resolvedRank === 1 && symptoms) {
    const completenessCheck = checkHasRequiredNonUrgentInfo(symptoms);
    if (!completenessCheck.isSafeToCompleteNonUrgent) {
      resolvedRank = 2; // Escalate to URGENT (Same-day in-person clinic evaluation)
      escalatedByUncertainty = true;
    }
  }

  const finalUrgency = RANK_TO_URGENCY[resolvedRank];

  let decisionSource: DecisionSource = 'RULE_ENGINE_OVERRIDE';
  if (resolvedRank === 3) {
    decisionSource = 'RULE_ENGINE_OVERRIDE';
  } else if (escalatedByUncertainty && resolvedRank > ruleRank) {
    decisionSource = 'CONSERVATIVE_FALLBACK';
  } else if (modelRank > ruleRank) {
    decisionSource = 'MODEL_ESCALATION';
  } else if (modelSuggestion && modelRank === ruleRank) {
    decisionSource = 'HYBRID_AGREEMENT';
  } else {
    decisionSource = 'RULE_ENGINE_OVERRIDE';
  }

  // Find immediate action for chemical splashes or specific flags
  const chemicalFlag = ruleResult.matchedFlags.find((f) => f.id === 'RF-02');
  const traumaFlag = ruleResult.matchedFlags.find((f) => f.id === 'RF-03');

  const immediateActionTextAr = chemicalFlag?.immediateActionAr || traumaFlag?.immediateActionAr;
  const immediateActionTextEn = chemicalFlag?.immediateActionEn || traumaFlag?.immediateActionEn;

  // Guidance texts adhering to guardrails (never diagnose, never name prescription medication)
  let guidanceTextAr = '';
  let guidanceTextEn = '';

  if (!isFinal) {
    guidanceTextAr = 'التقييم قيد الاستكمال. جارٍ استيضاح الأعراض المتبقية للتحقق من درجة الاستعجال.';
    guidanceTextEn = 'Assessment pending. Asking clarifying questions to complete clinical urgency triage.';
  } else if (finalUrgency === 'EMERGENCY') {
    if (isRetainedEmergency) {
      guidanceTextAr =
        'تم تحديث إجابتك. بقيت توصية الطوارئ احترازيًا لأنها صدرت بناءً على إجابة سابقة، وفق سياسة النموذج التجريبي. يوصى بالتقييم الفوري للتأكد التام من سلامة العين.';
      guidanceTextEn =
        'Your answer has been updated. The emergency recommendation was retained as a safety precaution because it was issued based on a previous answer, per demo safety policy. Immediate evaluation is recommended to ensure eye safety.';
    } else {
      guidanceTextAr =
        'حالتك مصنفة كحالة طارئة تتطلب فحصاً فورياً في طوارئ العيون لتجنب أي ضرر دائم على البصر. يرجى التوجه فوراً لأقرب مركز طوارئ عيون.';
      guidanceTextEn =
        'Your symptoms indicate an emergency requiring immediate specialized eye care to prevent potential vision loss. Please proceed straight to the nearest emergency eye department.';
    }
  } else if (finalUrgency === 'URGENT') {
    if (decisionSource === 'CONSERVATIVE_FALLBACK') {
      guidanceTextAr =
        'نظراً لعدم اكتمال أو غموض بعض البيانات السريرية، تم تصعيد الحالة تحفظياً للتقييم السريري في اليوم نفسه لضمان أمان المريض (سياسة أمان هندسية — غير معتمدة سريرياً). إذا اشتد الألم أو حدث ضعف نظر مفاجئ توجه فوراً للطوارئ.';
      guidanceTextEn =
        'Due to incomplete or unclear clinical details, this case has been conservatively routed for same-day specialist assessment to ensure safety (draft engineering policy - not clinically validated). If pain worsens or vision suddenly drops, go to the emergency room immediately.';
    } else {
      guidanceTextAr =
        'حالتك تتطلب تقييماً طبياً متخصصاً في اليوم نفسه (خلال ساعات) لدى طبيب عيون. إذا اشتد الألم فجأة أو حدث انخفاض بالنظر توجه فوراً للطوارئ.';
      guidanceTextEn =
        'Your symptoms require a same-day specialist ophthalmic evaluation (within hours). If severe pain develops or vision suddenly drops, proceed immediately to the emergency room.';
    }
  } else {
    guidanceTextAr =
      'الأعراض الحالية غير طارئة ويمكن متابعتها في مركز الرعاية الصحية الأولية أو عيادة العيون العامة. في حال حدوث أي تشوش مفاجئ أو ألم حاد، توجه لطوارئ العيون فوراً.';
    guidanceTextEn =
      'Your reported symptoms are non-urgent and suitable for primary healthcare or general ophthalmic consultation. If you experience sudden vision changes or acute severe pain, seek emergency care immediately.';
  }

  return {
    finalUrgency,
    isFinalDecision: isFinal,
    isPending: !isFinal,
    ruleResult,
    modelSuggestion,
    decisionSource,
    escalatedByUncertainty,
    guidanceTextAr,
    guidanceTextEn,
    immediateActionTextAr,
    immediateActionTextEn,
    isRetainedEmergency,
    retainedEmergencyReasonAr,
    retainedEmergencyReasonEn,
    evaluatedAt: new Date().toISOString(),
  };
}
