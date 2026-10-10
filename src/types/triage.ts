/**
 * Core type definitions for Smart Ophthalmic Triage (OptiRoute)
 * Follows the PRD specification for hybrid triage, schemas, and governance.
 */

export type Language = 'ar' | 'en';

export type EyeAffected = 'left' | 'right' | 'both' | 'unknown';
export type OnsetSpeed = 'sudden' | 'gradual' | 'unknown';
export type VisionChange = 'none' | 'blurred' | 'loss' | 'double' | 'flashes_floaters' | 'unknown';
export type PainLevel = 'none' | 'mild' | 'moderate' | 'severe' | 'unknown';

// Tri-state for symptoms: true = confirmed present, false = confirmed absent, null = unknown / omitted
export type TriState = boolean | null;

export interface StructuredSymptoms {
  language: Language;
  eye: EyeAffected;
  onset: OnsetSpeed;
  duration_hours: number | null;
  vision_change: VisionChange;
  pain_level: PainLevel;
  trauma: TriState;
  chemical_exposure: TriState;
  redness: TriState;
  discharge: TriState;
  light_sensitivity: TriState;
  nausea_vomiting: TriState;
  recent_eye_surgery: TriState;
  contact_lens: TriState;
  other_symptoms: string[];
  confidence: number;
}

export type UrgencyLevel = 'EMERGENCY' | 'URGENT' | 'NON_URGENT';

export interface RedFlagRule {
  id: string; // e.g., 'RF-01'
  code: string; // e.g., 'SUDDEN_VISION_LOSS'
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  immediateActionAr?: string;
  immediateActionEn?: string;
  triggersEmergency: boolean;
}

export interface RuleEvidence {
  field: string;
  source: 'raw_text' | 'structured_field';
  snippet?: string;
  isNegated?: boolean;
}

export interface RuleEvaluationResult {
  matchedFlags: RedFlagRule[];
  ruleUrgency: UrgencyLevel;
  rationaleCodes: string[];
  evidenceMatches: RuleEvidence[];
}

export interface ModelSuggestion {
  urgency: UrgencyLevel;
  confidence: number;
  rationaleCodes: string[];
  baseModel: string;
  adapterVersion: string;
}

export type DecisionSource =
  | 'RULE_ENGINE_OVERRIDE'
  | 'HYBRID_AGREEMENT'
  | 'MODEL_ESCALATION'
  | 'CONSERVATIVE_FALLBACK';

export interface TriageDecision {
  finalUrgency: UrgencyLevel;
  isFinalDecision: boolean;
  isPending?: boolean;
  ruleResult: RuleEvaluationResult;
  modelSuggestion?: ModelSuggestion;
  decisionSource: DecisionSource;
  escalatedByUncertainty: boolean;
  guidanceTextAr: string;
  guidanceTextEn: string;
  immediateActionTextAr?: string;
  immediateActionTextEn?: string;
  isRetainedEmergency?: boolean;
  retainedEmergencyReasonAr?: string;
  retainedEmergencyReasonEn?: string;
  evaluatedAt: string;
}

export type FacilityTier = 'EMERGENCY' | 'URGENT' | 'NON_URGENT';

export interface Facility {
  id: string;
  nameAr: string;
  nameEn: string;
  typeAr: string;
  typeEn: string;
  city: string;
  distanceKm: number;
  isCalculatedDistance?: boolean;
  hasEmergencyEyeCare: boolean;
  tier?: FacilityTier;
  supportedUrgencies?: FacilityTier[];
  operatingHoursAr: string;
  operatingHoursEn: string;
  phone: string;
  addressAr: string;
  addressEn: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export type MessageSender = 'patient' | 'system' | 'bot';

export interface QuickReplyOption {
  id: string;
  labelAr: string;
  labelEn: string;
  value: string;
  field?: keyof StructuredSymptoms;
  fieldValue?: unknown;
}

export interface ChatMessage {
  id: string;
  sender: MessageSender;
  type: 'text' | 'voice' | 'consent' | 'result_card' | 'location_prompt' | 'quick_reply';
  text?: string;
  transcript?: string;
  audioDurationSeconds?: number;
  audioUrl?: string;
  audioLanguage?: Language;
  timestamp: string;
  quickReplies?: QuickReplyOption[];
  selectedQuickReplyId?: string;
  isAnswered?: boolean;
  decisionPayload?: TriageDecision;
  facilityPayload?: Facility;
  routingExplanationAr?: string;
  routingExplanationEn?: string;
}

export interface SessionEvent {
  id: string;
  timestamp: string;
  type:
    | 'SESSION_START'
    | 'CONSENT_GRANTED'
    | 'MESSAGE_RECEIVED'
    | 'VOICE_TRANSCRIPTION'
    | 'SAMPLE_AUDIO_FIXTURE_APPLIED'
    | 'SYMPTOM_EXTRACTION'
    | 'RULE_EVALUATION'
    | 'MODEL_CLASSIFICATION'
    | 'URGENCY_RESOLVED'
    | 'FACILITY_ROUTED'
    | 'FOLLOW_UP_ASKED'
    | 'SYMPTOM_CORRECTION'
    | 'CLINICIAN_REVIEWED';
  summaryAr: string;
  summaryEn: string;
  detail?: Record<string, unknown>;
}

export interface ClinicianReview {
  reviewerName: string;
  reviewedAt: string;
  feedback: 'CORRECT' | 'OVER_TRIAGED' | 'UNDER_TRIAGED';
  notes: string;
  isFlagged: boolean;
}

export interface TriageSession {
  id: string;
  patientMaskedPhone: string;
  startedAt: string;
  updatedAt: string;
  language: Language;
  consentGiven: boolean;
  status: 'AWAITING_CONSENT' | 'IN_TRIAGE' | 'FOLLOW_UP' | 'COMPLETED';
  followUpCount: number;
  scenarioId?: string;
  messages: ChatMessage[];
  symptoms: StructuredSymptoms;
  decision?: TriageDecision;
  routedFacility?: Facility;
  routingExplanationAr?: string;
  routingExplanationEn?: string;
  answeredFields?: Record<string, {
    field: keyof StructuredSymptoms;
    value: unknown;
    quickReplyId?: string;
    quickReplyValue?: string;
    labelAr?: string;
    labelEn?: string;
    timestamp: string;
  }>;
  events: SessionEvent[];
  clinicianReview?: ClinicianReview;
  isLegacyRecord?: boolean;
  metadata: {
    ruleVersion: string;
    modelAdapterVersion: string;
    datasetVersion: string;
    speechModelVersion: string;
    isLegacy?: boolean;
  };
}

export interface DemoScenario {
  id: string;
  titleAr: string;
  titleEn: string;
  category: 'EMERGENCY' | 'URGENT' | 'NON_URGENT' | 'UNCLEAR';
  tagAr: string;
  tagEn: string;
  descriptionAr: string;
  descriptionEn: string;
  initialMessageAr: string;
  initialMessageEn: string;
  isVoiceSample?: boolean;
  voiceDurationSeconds?: number;
  audioUrlAr?: string;
  audioUrlEn?: string;
  transcriptAr?: string;
  transcriptEn?: string;
  locationCity?: string;
  expectedUrgency: UrgencyLevel;
  expectedRuleId?: string;
  followUpAnswers?: Record<string, string>;
}
