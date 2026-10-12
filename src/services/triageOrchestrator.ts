import {
  TriageSession,
  Language,
  ChatMessage,
  StructuredSymptoms,
  Facility,
  SessionEvent,
  QuickReplyOption,
} from '../types/triage';
import {
  DemoSpeechToTextProvider,
  DemoSymptomExtractionProvider,
  DemoUrgencySuggestionProvider,
  LocalStorageSessionRepository,
  createEmptySymptoms,
} from './providers';
import {
  runDeterministicRuleEngine,
  resolveTriageDecision,
} from '../safety/ruleEngine';
import {
  RULE_ENGINE_VERSION,
  MODEL_ADAPTER_VERSION,
  DATASET_VERSION,
  SPEECH_MODEL_VERSION,
} from '../data/rulesConfig';
import { getRecommendedFacility } from '../data/facilities';
import { SEED_SESSIONS } from '../data/seedSessions';

export interface ResolvedQuickReplyAction {
  id: string;
  field: keyof StructuredSymptoms;
  fieldValue: unknown;
  value: string;
  labelAr: string;
  labelEn: string;
}

export const STABLE_QUICK_REPLIES: Record<string, ResolvedQuickReplyAction> = {
  // Vision options
  'vision_change:none': {
    id: 'qr-vision-none',
    field: 'vision_change',
    fieldValue: 'none',
    value: 'vision_change:none',
    labelAr: 'النظر طبيعي',
    labelEn: 'Vision is normal',
  },
  'vision_none': {
    id: 'qr-vision-none',
    field: 'vision_change',
    fieldValue: 'none',
    value: 'vision_change:none',
    labelAr: 'النظر طبيعي',
    labelEn: 'Vision is normal',
  },
  'vision_change:blurred': {
    id: 'qr-vision-blurred',
    field: 'vision_change',
    fieldValue: 'blurred',
    value: 'vision_change:blurred',
    labelAr: 'ضبابية وتشويش',
    labelEn: 'Blurry vision',
  },
  'vision_change:loss': {
    id: 'qr-vision-loss',
    field: 'vision_change',
    fieldValue: 'loss',
    value: 'vision_change:loss',
    labelAr: 'ضعف أو عتمة شديدة',
    labelEn: 'Severe drop/shadow',
  },

  // Pain options
  'pain_level:none': {
    id: 'qr-pain-none',
    field: 'pain_level',
    fieldValue: 'none',
    value: 'pain_level:none',
    labelAr: 'لا يوجد ألم',
    labelEn: 'No pain',
  },
  'pain_none': {
    id: 'qr-pain-none',
    field: 'pain_level',
    fieldValue: 'none',
    value: 'pain_level:none',
    labelAr: 'لا يوجد ألم',
    labelEn: 'No pain',
  },
  'pain_level:mild': {
    id: 'qr-pain-mild',
    field: 'pain_level',
    fieldValue: 'mild',
    value: 'pain_level:mild',
    labelAr: 'ألم خفيف أو حكة',
    labelEn: 'Mild / Itch',
  },
  'pain_level:severe': {
    id: 'qr-pain-severe',
    field: 'pain_level',
    fieldValue: 'severe',
    value: 'pain_level:severe',
    labelAr: 'ألم شديد جداً',
    labelEn: 'Severe unbearable',
  },

  // Contact lens options
  'contact_lens:true': {
    id: 'qr-lens-yes',
    field: 'contact_lens',
    fieldValue: true,
    value: 'contact_lens:true',
    labelAr: 'نعم ألبس عدسات',
    labelEn: 'Yes, wear lenses',
  },
  'contact_lens:false': {
    id: 'qr-lens-no',
    field: 'contact_lens',
    fieldValue: false,
    value: 'contact_lens:false',
    labelAr: 'لا أرتدي عدسات',
    labelEn: 'No lenses',
  },

  // Trauma options
  'trauma:false': {
    id: 'qr-trauma-no',
    field: 'trauma',
    fieldValue: false,
    value: 'trauma:false',
    labelAr: 'لا، لم أتعرض لإصابة',
    labelEn: 'No, no injury',
  },
  'trauma:true': {
    id: 'qr-trauma-yes',
    field: 'trauma',
    fieldValue: true,
    value: 'trauma:true',
    labelAr: 'نعم تعرضت لضربة/إصابة',
    labelEn: 'Yes, had trauma/injury',
  },

  // Chemical exposure options
  'chemical_exposure:false': {
    id: 'qr-chem-no',
    field: 'chemical_exposure',
    fieldValue: false,
    value: 'chemical_exposure:false',
    labelAr: 'لا، لم تدخل مواد كيميائية',
    labelEn: 'No chemical exposure',
  },
  'chemical_exposure:true': {
    id: 'qr-chem-yes',
    field: 'chemical_exposure',
    fieldValue: true,
    value: 'chemical_exposure:true',
    labelAr: 'نعم دخل رذاذ منظف/كيماويات',
    labelEn: 'Yes, chemical splash',
  },

  // Onset options
  'onset:sudden': {
    id: 'qr-onset-sudden',
    field: 'onset',
    fieldValue: 'sudden',
    value: 'onset:sudden',
    labelAr: 'فجأة',
    labelEn: 'Suddenly',
  },
  'onset:gradual': {
    id: 'qr-onset-gradual',
    field: 'onset',
    fieldValue: 'gradual',
    value: 'onset:gradual',
    labelAr: 'تدريجيًا',
    labelEn: 'Gradually',
  },
  'onset:unknown': {
    id: 'qr-onset-unknown',
    field: 'onset',
    fieldValue: 'unknown',
    value: 'onset:unknown',
    labelAr: 'لست متأكدًا',
    labelEn: 'Not sure',
  },
  'vision_change:unknown': {
    id: 'qr-vision-unknown',
    field: 'vision_change',
    fieldValue: 'unknown',
    value: 'vision_change:unknown',
    labelAr: 'لست متأكدًا',
    labelEn: 'Not sure',
  },
  'pain_level:unknown': {
    id: 'qr-pain-unknown',
    field: 'pain_level',
    fieldValue: 'unknown',
    value: 'pain_level:unknown',
    labelAr: 'لست متأكدًا',
    labelEn: 'Not sure',
  },
  'contact_lens:null': {
    id: 'qr-lens-unknown',
    field: 'contact_lens',
    fieldValue: null,
    value: 'contact_lens:null',
    labelAr: 'لست متأكدًا',
    labelEn: 'Not sure',
  },
  'trauma:null': {
    id: 'qr-trauma-unknown',
    field: 'trauma',
    fieldValue: null,
    value: 'trauma:null',
    labelAr: 'لست متأكدًا',
    labelEn: 'Not sure',
  },
  'chemical_exposure:null': {
    id: 'qr-chem-unknown',
    field: 'chemical_exposure',
    fieldValue: null,
    value: 'chemical_exposure:null',
    labelAr: 'لست متأكدًا',
    labelEn: 'Not sure',
  },
};

/**
 * Resolves a quick reply action from an explicit QuickReplyOption or from raw user message text
 */
export function resolveQuickReplyFromInput(
  rawText: string,
  quickReply?: QuickReplyOption
): ResolvedQuickReplyAction | null {
  if (quickReply) {
    if (quickReply.field && quickReply.fieldValue !== undefined) {
      return {
        id: quickReply.id,
        field: quickReply.field,
        fieldValue: quickReply.fieldValue,
        value: quickReply.value,
        labelAr: quickReply.labelAr,
        labelEn: quickReply.labelEn,
      };
    }
    if (STABLE_QUICK_REPLIES[quickReply.value]) {
      return STABLE_QUICK_REPLIES[quickReply.value];
    }
  }

  const clean = rawText.trim();
  const lower = clean.toLowerCase();

  if (STABLE_QUICK_REPLIES[clean]) {
    return STABLE_QUICK_REPLIES[clean];
  }

  if (
    clean === 'النظر طبيعي' ||
    clean === 'النظر طبيعي ما تغير' ||
    lower === 'vision is normal' ||
    lower === 'normal vision'
  ) {
    return STABLE_QUICK_REPLIES['vision_change:none'];
  }

  if (
    clean === 'ضبابية وتشويش' ||
    clean === 'فيه تشويش وضبابية' ||
    lower === 'blurry vision' ||
    lower === 'blurred vision'
  ) {
    return STABLE_QUICK_REPLIES['vision_change:blurred'];
  }

  if (
    clean === 'ضعف أو عتمة شديدة' ||
    clean === 'ضعف شديد وعتمة' ||
    lower === 'severe drop/shadow' ||
    lower === 'severe drop'
  ) {
    return STABLE_QUICK_REPLIES['vision_change:loss'];
  }

  if (clean === 'لا يوجد ألم' || lower === 'no pain') {
    return STABLE_QUICK_REPLIES['pain_level:none'];
  }

  if (
    clean === 'ألم خفيف أو حكة' ||
    clean === 'ألم خفيف وحكة' ||
    lower === 'mild / itch' ||
    lower === 'mild itch' ||
    lower === 'mild pain'
  ) {
    return STABLE_QUICK_REPLIES['pain_level:mild'];
  }

  if (
    clean === 'ألم شديد جداً' ||
    clean === 'ألم شديد جداً لا يحتمل' ||
    lower === 'severe unbearable' ||
    lower === 'severe pain'
  ) {
    return STABLE_QUICK_REPLIES['pain_level:severe'];
  }

  if (
    clean === 'نعم ألبس عدسات' ||
    clean === 'نعم أرتدي عدسات لاصقة' ||
    lower === 'yes, wear lenses' ||
    lower === 'yes wear lenses'
  ) {
    return STABLE_QUICK_REPLIES['contact_lens:true'];
  }

  if (
    clean === 'لا أرتدي عدسات' ||
    clean === 'لا أرتدي أي عدسات لاصقة' ||
    lower === 'no lenses'
  ) {
    return STABLE_QUICK_REPLIES['contact_lens:false'];
  }

  if (
    clean === 'لا إصابة ولا كيماويات' ||
    clean === 'لا يوجد أي إصابة ولا مواد كيميائية' ||
    clean === 'لا، لم أتعرض لإصابة' ||
    clean === 'لا لم أتعرض لإصابة' ||
    clean === 'لا إصابة' ||
    lower === 'no trauma or chemicals' ||
    lower === 'no, no injury' ||
    lower === 'no injury'
  ) {
    return STABLE_QUICK_REPLIES['trauma:false'];
  }

  if (
    clean === 'نعم تعرضت لضربة' ||
    clean === 'نعم تعرضت لضربة مباشرة' ||
    clean === 'نعم تعرضت لضربة/إصابة' ||
    lower === 'yes, had trauma' ||
    lower === 'yes had trauma' ||
    lower === 'yes, had trauma/injury'
  ) {
    return STABLE_QUICK_REPLIES['trauma:true'];
  }

  if (
    clean === 'لا، لم تدخل مواد كيميائية' ||
    clean === 'لا لم تدخل مواد كيميائية' ||
    clean === 'لا كيماويات' ||
    lower === 'no chemical exposure' ||
    lower === 'no chemicals'
  ) {
    return STABLE_QUICK_REPLIES['chemical_exposure:false'];
  }

  if (
    clean === 'نعم دخل رذاذ منظف/كيماويات' ||
    clean === 'نعم دخل رذاذ منظف' ||
    clean === 'نعم تعرضت لمواد كيميائية' ||
    lower === 'yes, chemical splash' ||
    lower === 'chemical splash'
  ) {
    return STABLE_QUICK_REPLIES['chemical_exposure:true'];
  }

  if (
    clean === 'فجأة' ||
    clean === 'بدأت فجأة' ||
    lower === 'suddenly' ||
    lower === 'sudden'
  ) {
    return STABLE_QUICK_REPLIES['onset:sudden'];
  }

  if (
    clean === 'تدريجيًا' ||
    clean === 'تدريجيا' ||
    clean === 'بدأت بالتدريج' ||
    lower === 'gradually' ||
    lower === 'gradual'
  ) {
    return STABLE_QUICK_REPLIES['onset:gradual'];
  }

  return null;
}

/**
 * Detects the dominant language from patient text.
 * - Arabic message → 'ar'
 * - English message → 'en'
 * - Mixed message → dominant language (if Arabic letters > English letters: 'ar'; if English > Arabic: 'en')
 * - Short ambiguous replies, numbers, symbols, emojis → preserve currentConversationLanguage (or fallbackLanguage)
 */
export function detectMessageLanguage(
  text: string,
  currentConversationLang?: Language,
  fallbackLanguage: Language = 'en'
): Language {
  if (!text || typeof text !== 'string') {
    return currentConversationLang || fallbackLanguage;
  }

  // Count Arabic letters: [\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]
  const arabicMatches = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  const arabicCount = arabicMatches ? arabicMatches.length : 0;

  // Count Latin letters: [a-zA-Z]
  const englishMatches = text.match(/[a-zA-Z]/g);
  const englishCount = englishMatches ? englishMatches.length : 0;

  // Short ambiguous acknowledgment phrases and numbers/emojis preserve conversation language if established
  const clean = text.trim().toLowerCase();
  const ambiguousShortPhrases = new Set([
    'ok', 'okay', 'k', 'yes', 'no', 'y', 'n', 'yep', 'nope', 'sure',
    'نعم', 'لا', 'تمام', 'اوكي', 'أوكي', 'اي', 'إي', 'ايوا', 'ايوه', 'ماشي', 'حسنا', 'حسناً',
  ]);
  if (currentConversationLang && (ambiguousShortPhrases.has(clean) || clean.length <= 2)) {
    return currentConversationLang;
  }

  // Meaningful text detection: require >= 3 characters of clear dominant script, or words that are clearly language-specific
  if (arabicCount >= 2 && arabicCount > englishCount) {
    return 'ar';
  }

  if (englishCount >= 3 && englishCount > arabicCount) {
    return 'en';
  }

  // If ambiguous or equal, preserve current conversation language if present, else fallback
  return currentConversationLang || fallbackLanguage;
}

export class TriageOrchestrator {
  private sttProvider = new DemoSpeechToTextProvider();
  private extractionProvider = new DemoSymptomExtractionProvider();
  private modelProvider = new DemoUrgencySuggestionProvider();
  public repository = new LocalStorageSessionRepository();

  constructor() {
    // Initialize repository with seed data on boot
    this.repository.seedInitialSessions(SEED_SESSIONS);
  }

  /**
   * Initializes a brand-new patient session
   */
  async createNewSession(
    language: Language = 'en',
    persist: boolean = true,
    scenarioId?: string
  ): Promise<TriageSession> {
    const existing = await this.repository.getAllSessions();
    const existingIds = new Set(existing.map((s) => s.id));
    let randomDigits: number;
    let id: string;
    do {
      randomDigits = Math.floor(1000 + Math.random() * 9000);
      id = `SES-${randomDigits}-KSA`;
    } while (existingIds.has(id));

    const patientMaskedPhone = `+966 5${Math.floor(Math.random() * 9)} *** ${randomDigits}`;
    const now = new Date().toISOString();

    const welcomeTextAr =
      'مرحبًا بك في OptiRoute. نساعدك على معرفة مدى استعجال أعراض العين والجهة المناسبة للتوجه إليها.\n\n' +
      '⚠️ إشعار هام: هذه تجربة لحالات افتراضية، وليست تشخيصًا طبيًا ولا تقدم وصفات علاجية. في حالات الطوارئ القصوى، اتصل فورًا بالهلال الأحمر (997) أو توجه لأقرب مستشفى.';

    const welcomeTextEn =
      'Welcome to OptiRoute. We help you understand the urgency of your eye symptoms and guide you to the appropriate facility.\n\n' +
      '⚠️ Important Notice: This is a prototype for simulated cases only, not a medical diagnosis or treatment prescription. In emergencies, call 997 or go to the nearest hospital immediately.';

    const consentMessage: ChatMessage = {
      id: `msg-${Date.now()}-welcome`,
      sender: 'system',
      type: 'consent',
      text: language === 'ar' ? welcomeTextAr : welcomeTextEn,
      timestamp: now,
      quickReplies: [
        {
          id: 'consent-yes',
          labelAr: 'أوافق وأبدأ التجربة',
          labelEn: 'I agree and start demo',
          value: 'CONSENT_GRANTED',
        },
        {
          id: 'consent-no',
          labelAr: 'لا أوافق (إلغاء)',
          labelEn: 'Decline (Cancel)',
          value: 'CONSENT_DECLINED',
        },
      ],
    };

    const initialEvent: SessionEvent = {
      id: `evt-${Date.now()}-start`,
      timestamp: now,
      type: 'SESSION_START',
      summaryAr: 'بدء جلسة جديدة وإرسال إشعار الموافقة الطبية المستنيرة',
      summaryEn: 'Session initialized; medical consent notice dispatched',
    };

    const session: TriageSession = {
      id,
      patientMaskedPhone,
      startedAt: now,
      updatedAt: now,
      language,
      conversationLanguage: undefined,
      consentGiven: false,
      status: 'AWAITING_CONSENT',
      followUpCount: 0,
      scenarioId,
      messages: [consentMessage],
      symptoms: createEmptySymptoms(language),
      events: [initialEvent],
      metadata: {
        ruleVersion: RULE_ENGINE_VERSION,
        modelAdapterVersion: MODEL_ADAPTER_VERSION,
        datasetVersion: DATASET_VERSION,
        speechModelVersion: SPEECH_MODEL_VERSION,
      },
    };

    if (persist) {
      await this.repository.saveSession(session);
    }
    return session;
  }

  /**
   * Handles user granting or declining consent
   */
  async handleConsent(
    session: TriageSession,
    granted: boolean
  ): Promise<TriageSession> {
    const updated = { ...session };
    const now = new Date().toISOString();

    if (!granted) {
      updated.consentGiven = false;
      updated.status = 'COMPLETED';
      updated.messages.push({
        id: `msg-${Date.now()}-declined`,
        sender: 'system',
        type: 'text',
        text:
          updated.language === 'ar'
            ? 'تم إلغاء الجلسة بناءً على رغبتك. نتمنى لك دوام الصحة والعافية.'
            : 'Session was declined as requested. Wishing you good health.',
        timestamp: now,
      });
      await this.repository.saveSession(updated);
      return updated;
    }

    updated.consentGiven = true;
    updated.status = 'IN_TRIAGE';
    updated.updatedAt = now;

    updated.events.push({
      id: `evt-${Date.now()}-consent`,
      timestamp: now,
      type: 'CONSENT_GRANTED',
      summaryAr: 'المريض وافق على الشروط الطبية والفرز الافتراضي',
      summaryEn: 'Patient accepted triage terms and consent notice',
    });

    const promptMessage: ChatMessage = {
      id: `msg-${Date.now()}-prompt`,
      sender: 'bot',
      type: 'text',
      text:
        updated.language === 'ar'
          ? 'تفضل بوصف ما تشعر به في عينك، أو أرسل تسجيلاً صوتياً. يمكنك ذكر متى بدأت الأعراض وهل تأثر النظر أو تشعر بألم.'
          : 'Please describe what you are feeling in your eye, or send a voice note. You can mention when symptoms began, if vision changed, or if you feel pain.',
      timestamp: now,
    };
    updated.messages.push(promptMessage);

    await this.repository.saveSession(updated);
    return updated;
  }

  /**
   * Main entrypoint: process an incoming patient message (text or simulated voice)
   */
  async processPatientMessage(
    session: TriageSession,
    params: {
      text: string;
      isVoice?: boolean;
      voiceDuration?: number;
      userCity?: string;
      userCoords?: { lat: number; lng: number };
      quickReply?: QuickReplyOption;
      parentMessageId?: string;
      audioUrl?: string;
      audioLanguage?: Language;
    }
  ): Promise<TriageSession> {
    const updated: TriageSession = {
      ...session,
      messages: [...session.messages],
      events: [...session.events],
      symptoms: { ...session.symptoms },
      answeredFields: session.answeredFields ? { ...session.answeredFields } : {},
    };

    const now = new Date().toISOString();
    updated.updatedAt = now;

    let rawText = params.text.trim();

    // 0. Resolve if this message corresponds to a stable structured quick reply
    let resolvedAction = resolveQuickReplyFromInput(rawText, params.quickReply);

    // If not resolved from static dictionary and user typed "not sure" / "لست متأكدًا",
    // resolve from the active pending bot prompt's quick reply options
    if (!resolvedAction) {
      const clean = rawText.trim().toLowerCase();
      const isNotSure =
        clean === 'لست متأكدًا' ||
        clean === 'لست متأكدا' ||
        clean === 'مو متأكد' ||
        clean === 'غير متأكد' ||
        clean === 'not sure' ||
        clean === "i'm not sure";

      if (isNotSure) {
        // Find the last bot message with quick replies
        const lastBotWithReplies = [...updated.messages]
          .reverse()
          .find((m) => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0 && (!params.parentMessageId || m.id === params.parentMessageId));

        if (lastBotWithReplies && lastBotWithReplies.quickReplies) {
          const unknownOption = lastBotWithReplies.quickReplies.find(
            (qr) => qr.fieldValue === 'unknown' || qr.fieldValue === null
          );
          if (unknownOption) {
            resolvedAction = resolveQuickReplyFromInput(rawText, unknownOption);
          }
        }
      }
    }

    if (resolvedAction) {
      // Directly and authoritatively set the structured symptom field
      (updated.symptoms as unknown as Record<string, unknown>)[resolvedAction.field] = resolvedAction.fieldValue;

      // Mark answered fields in session state for non-repetition and auditability
      if (!updated.answeredFields) {
        updated.answeredFields = {};
      }
      updated.answeredFields[resolvedAction.field] = {
        field: resolvedAction.field,
        value: resolvedAction.fieldValue,
        quickReplyId: resolvedAction.id,
        quickReplyValue: resolvedAction.value,
        labelAr: resolvedAction.labelAr,
        labelEn: resolvedAction.labelEn,
        timestamp: now,
      };

      // Disable/mark as answered any active bot quick reply prompt in messages
      for (let i = updated.messages.length - 1; i >= 0; i--) {
        const m = updated.messages[i];
        if (m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0) {
          if (!params.parentMessageId || m.id === params.parentMessageId || !m.isAnswered) {
            m.isAnswered = true;
            m.selectedQuickReplyId = resolvedAction.id;
          }
        }
      }

      // Record direct clinical evidence event in session history
      updated.events.push({
        id: `evt-${Date.now()}-qr`,
        timestamp: now,
        type: 'MESSAGE_RECEIVED',
        summaryAr: `إجابة سريعة مسجلة: "${resolvedAction.labelAr}" — تثبيت [${String(resolvedAction.field)} = ${String(resolvedAction.fieldValue)}] كدليل سريري مسجل`,
        summaryEn: `Recorded quick-reply evidence: "${resolvedAction.labelEn}" — affirmed [${String(resolvedAction.field)} = ${String(resolvedAction.fieldValue)}]`,
        detail: {
          field: resolvedAction.field,
          fieldValue: resolvedAction.fieldValue,
          quickReplyId: resolvedAction.id,
          quickReplyValue: resolvedAction.value,
          evidenceType: 'STRUCTURED_QUICK_REPLY',
        },
      });

      // Display quick reply in current conversation language (fallback to UI language)
      const currentActiveLang = updated.conversationLanguage || updated.language;
      rawText = currentActiveLang === 'ar' ? resolvedAction.labelAr : resolvedAction.labelEn;
    }

    // Determine the active conversation language for this turn:
    // - For structured quick replies: preserve current conversation language (or UI language fallback)
    // - For voice notes: use audioLanguage if specified, or detect from transcript/rawText
    // - For text messages: detect language from raw text (dominant language; short ambiguous replies preserve prior language)
    let effectiveConvLang: Language;
    if (resolvedAction) {
      effectiveConvLang = updated.conversationLanguage || updated.language;
    } else if (params.isVoice) {
      if (params.audioLanguage) {
        effectiveConvLang = params.audioLanguage;
      } else {
        effectiveConvLang = detectMessageLanguage(
          rawText,
          updated.conversationLanguage,
          updated.language
        );
      }
    } else {
      effectiveConvLang = detectMessageLanguage(
        rawText,
        updated.conversationLanguage,
        updated.language
      );
    }

    // Persist active conversation language on session state
    updated.conversationLanguage = effectiveConvLang;

    // 1. Record incoming patient message
    const patientMsg: ChatMessage = {
      id: `msg-${Date.now()}-pt`,
      sender: 'patient',
      type: resolvedAction ? 'quick_reply' : params.isVoice ? 'voice' : 'text',
      text: rawText,
      transcript: rawText,
      conversationLanguage: effectiveConvLang,
      audioDurationSeconds: params.isVoice ? params.voiceDuration || 10 : undefined,
      audioUrl: params.isVoice ? params.audioUrl : undefined,
      audioLanguage: params.isVoice ? (params.audioLanguage || effectiveConvLang) : undefined,
      timestamp: now,
    };
    updated.messages.push(patientMsg);

    if (!resolvedAction) {
      updated.events.push({
        id: `evt-${Date.now()}-rcv`,
        timestamp: now,
        type: 'MESSAGE_RECEIVED',
        summaryAr: params.isVoice
          ? `استلام تسجيل صوتي (${params.voiceDuration || 10} ثانية)`
          : `استلام رسالة نصية من المريض`,
        summaryEn: params.isVoice
          ? `Received voice note (${params.voiceDuration || 10}s)`
          : `Received patient text message`,
        detail: { textSnippet: rawText.slice(0, 60), conversationLanguage: effectiveConvLang },
      });
    }

    // 2. Transcribe voice if voice
    if (params.isVoice) {
      const transcription = await this.sttProvider.transcribe(
        rawText,
        effectiveConvLang
      );
      rawText = transcription.text;
      updated.events.push({
        id: `evt-${Date.now()}-stt`,
        timestamp: new Date().toISOString(),
        type: 'SAMPLE_AUDIO_FIXTURE_APPLIED',
        summaryAr: `تم تطبيق عينة نصية صوتية تجريبية مسبقة الإعداد (محاكاة تفريغ — لا يتم تشغيل نموذج تفريغ صوتي فعلي): "${rawText.slice(0, 45)}..."`,
        summaryEn: `Applied pre-recorded sample transcript (simulated speech fixture — no live speech model executed): "${rawText.slice(0, 45)}..."`,
        detail: {
          simulatedPlaceholderScore: transcription.confidence,
          fixtureProvider: transcription.provider,
          isLiveModelExecuted: false,
        },
      });
    }

    // 3. Extract structured symptoms (preserves established findings unless contradicted)
    const extraction = await this.extractionProvider.extract(
      rawText,
      updated.language,
      updated.symptoms
    );
    updated.symptoms = extraction.symptoms;

    // Ensure resolved quick-reply action remains directly set on structured symptoms
    if (resolvedAction) {
      (updated.symptoms as unknown as Record<string, unknown>)[resolvedAction.field] = resolvedAction.fieldValue;
      extraction.extractedFields[resolvedAction.field] = `${String(resolvedAction.fieldValue)} (direct quick-reply: "${rawText}")`;
    }

    // Also update answeredFields for any fields explicitly extracted or corrected from patient text
    if (!updated.answeredFields) {
      updated.answeredFields = {};
    }
    for (const key of Object.keys(extraction.extractedFields) as Array<keyof StructuredSymptoms>) {
      const val = updated.symptoms[key];
      // Only treat known, determinate values as answered (null and 'unknown' remain unknown and need follow-up)
      if (val !== undefined && val !== null && val !== 'unknown') {
        updated.answeredFields[key] = {
          field: key,
          value: val,
          labelAr: String(val),
          labelEn: String(val),
          timestamp: now,
        };
      }
    }

    updated.events.push({
      id: `evt-${Date.now()}-extract`,
      timestamp: new Date().toISOString(),
      type: 'SYMPTOM_EXTRACTION',
      summaryAr: `تم استخلاص الحقول مع نفي الأعراض المنفية (${Object.keys(extraction.extractedFields).length} حقول)`,
      summaryEn: `Symptom extraction finished with negation resolution (${Object.keys(extraction.extractedFields).length} fields)`,
      detail: extraction.extractedFields,
    });

    // Gather all patient texts in this session for raw safety analysis
    const allPatientTexts = updated.messages
      .filter((m) => m.sender === 'patient')
      .map((m) => m.transcript || m.text || '');

    // 4. Deterministic Rule Engine safety check (independent of model)
    const ruleResult = runDeterministicRuleEngine(
      allPatientTexts,
      updated.symptoms
    );

    updated.events.push({
      id: `evt-${Date.now()}-rules`,
      timestamp: new Date().toISOString(),
      type: 'RULE_EVALUATION',
      summaryAr:
        ruleResult.matchedFlags.length > 0
          ? `محرك القواعد: رصد ${ruleResult.matchedFlags.length} علامة حمراء (${ruleResult.matchedFlags.map((f) => f.id).join(', ')}) 🚨`
          : `محرك القواعد: لم يتم رصد علامات حمراء غير منفية (المستوى المبدئي: ${ruleResult.ruleUrgency})`,
      summaryEn:
        ruleResult.matchedFlags.length > 0
          ? `Rule Engine: Flagged ${ruleResult.matchedFlags.length} red flag(s) (${ruleResult.matchedFlags.map((f) => f.id).join(', ')}) 🚨`
          : `Rule Engine: No non-negated red flag (Base: ${ruleResult.ruleUrgency})`,
      detail: {
        matchedFlags: ruleResult.matchedFlags.map((f) => f.id),
        rationale: ruleResult.rationaleCodes,
      },
    });

    // 5. Model suggestion
    const modelSuggestion = await this.modelProvider.suggestUrgency(
      updated.symptoms,
      rawText
    );

    updated.events.push({
      id: `evt-${Date.now()}-model`,
      timestamp: new Date().toISOString(),
      type: 'MODEL_CLASSIFICATION',
      summaryAr: `اقتراح مصنف ارشادي تجريبي (نموذج افتراضي غير مدرب سريرياً): ${modelSuggestion.urgency}`,
      summaryEn: `Simulated demo heuristic suggestion (prototype fixture — not clinically fine-tuned): ${modelSuggestion.urgency}`,
      detail: {
        urgency: modelSuggestion.urgency,
        simulatedPlaceholderScore: modelSuggestion.confidence,
        fixtureVersion: modelSuggestion.adapterVersion,
        isClinicalFineTuningClaimed: false,
      },
    });

    // 6. Emergency Red-Flag Immediate Check
    const hasEmergencyFlag = ruleResult.ruleUrgency === 'EMERGENCY' ||
      (updated.decision && updated.decision.finalUrgency === 'EMERGENCY');

    // 7. Determine if we need follow-up questions
    // Emergency guidance must appear IMMEDIATELY when red flag detected - no follow-up delay!
    // Follow-up is asked only if NOT emergency, followUpCount < 3, and critical fields are still unknown/unanswered
    const isFieldAnswered = (field: keyof StructuredSymptoms): boolean => {
      return Boolean(updated.answeredFields && updated.answeredFields[field]);
    };

    const needsFollowUp =
      !hasEmergencyFlag &&
      updated.followUpCount < 4 &&
      ((updated.symptoms.vision_change === 'unknown' && !isFieldAnswered('vision_change')) ||
        (updated.symptoms.pain_level === 'unknown' && !isFieldAnswered('pain_level')) ||
        (updated.symptoms.redness === true && updated.symptoms.contact_lens === null && !isFieldAnswered('contact_lens')) ||
        (updated.symptoms.trauma === null && !isFieldAnswered('trauma') && updated.symptoms.onset === 'unknown') ||
        (updated.symptoms.chemical_exposure === null && !isFieldAnswered('chemical_exposure') && (updated.symptoms.onset === 'unknown' || updated.symptoms.pain_level === 'moderate' || updated.symptoms.pain_level === 'severe' || updated.symptoms.pain_level === 'unknown')));

    if (needsFollowUp) {
      updated.status = 'FOLLOW_UP';
      updated.followUpCount += 1;

      // Provisional assessment while follow-up is pending
      const provisionalDecision = resolveTriageDecision(
        ruleResult,
        modelSuggestion,
        updated.decision,
        { isFinal: false, symptoms: updated.symptoms }
      );
      updated.decision = provisionalDecision;

      let followUpQuestionAr = '';
      let followUpQuestionEn = '';
      let quickReplies: QuickReplyOption[] = [];

      if (updated.symptoms.vision_change === 'unknown' && !isFieldAnswered('vision_change')) {
        followUpQuestionAr = 'هل لاحظت أي تغير في قوة النظر، مثل ضبابية، عتمة، أو رؤية مزدوجة؟';
        followUpQuestionEn = 'Have you noticed any change in your vision, such as blurriness, darkness, or double vision?';
        quickReplies = [
          {
            id: 'qr-vision-none',
            labelAr: 'النظر طبيعي',
            labelEn: 'Vision is normal',
            value: 'vision_change:none',
            field: 'vision_change',
            fieldValue: 'none',
          },
          {
            id: 'qr-vision-blurred',
            labelAr: 'ضبابية وتشويش',
            labelEn: 'Blurry vision',
            value: 'vision_change:blurred',
            field: 'vision_change',
            fieldValue: 'blurred',
          },
          {
            id: 'qr-vision-loss',
            labelAr: 'ضعف أو عتمة شديدة',
            labelEn: 'Severe drop/shadow',
            value: 'vision_change:loss',
            field: 'vision_change',
            fieldValue: 'loss',
          },
          {
            id: 'qr-vision-unknown',
            labelAr: 'لست متأكدًا',
            labelEn: 'Not sure',
            value: 'vision_change:unknown',
            field: 'vision_change',
            fieldValue: 'unknown',
          },
        ];
      } else if (updated.symptoms.pain_level === 'unknown' && !isFieldAnswered('pain_level')) {
        followUpQuestionAr = 'كيف تصف مستوى الألم في العين حالياً؟';
        followUpQuestionEn = 'How would you describe your eye pain level right now?';
        quickReplies = [
          {
            id: 'qr-pain-none',
            labelAr: 'لا يوجد ألم',
            labelEn: 'No pain',
            value: 'pain_level:none',
            field: 'pain_level',
            fieldValue: 'none',
          },
          {
            id: 'qr-pain-mild',
            labelAr: 'ألم خفيف أو حكة',
            labelEn: 'Mild / Itch',
            value: 'pain_level:mild',
            field: 'pain_level',
            fieldValue: 'mild',
          },
          {
            id: 'qr-pain-severe',
            labelAr: 'ألم شديد جداً',
            labelEn: 'Severe unbearable',
            value: 'pain_level:severe',
            field: 'pain_level',
            fieldValue: 'severe',
          },
          {
            id: 'qr-pain-unknown',
            labelAr: 'لست متأكدًا',
            labelEn: 'Not sure',
            value: 'pain_level:unknown',
            field: 'pain_level',
            fieldValue: 'unknown',
          },
        ];
      } else if (updated.symptoms.redness === true && updated.symptoms.contact_lens === null && !isFieldAnswered('contact_lens')) {
        followUpQuestionAr = 'هل ترتدي عدسات لاصقة في عينك المتأثرة؟';
        followUpQuestionEn = 'Do you currently wear contact lenses in the affected eye?';
        quickReplies = [
          {
            id: 'qr-lens-yes',
            labelAr: 'نعم ألبس عدسات',
            labelEn: 'Yes, wear lenses',
            value: 'contact_lens:true',
            field: 'contact_lens',
            fieldValue: true,
          },
          {
            id: 'qr-lens-no',
            labelAr: 'لا أرتدي عدسات',
            labelEn: 'No lenses',
            value: 'contact_lens:false',
            field: 'contact_lens',
            fieldValue: false,
          },
          {
            id: 'qr-lens-unknown',
            labelAr: 'لست متأكدًا',
            labelEn: 'Not sure',
            value: 'contact_lens:null',
            field: 'contact_lens',
            fieldValue: null,
          },
        ];
      } else if (updated.symptoms.trauma === null && !isFieldAnswered('trauma')) {
        followUpQuestionAr = 'هل تعرضت لأي ضربة، خبطة، أو إصابة مباشرة بالعين؟';
        followUpQuestionEn = 'Did you experience any direct blow, hit, or injury to the eye?';
        quickReplies = [
          {
            id: 'qr-trauma-yes',
            labelAr: 'نعم تعرضت لضربة/إصابة',
            labelEn: 'Yes, had trauma/injury',
            value: 'trauma:true',
            field: 'trauma',
            fieldValue: true,
          },
          {
            id: 'qr-trauma-no',
            labelAr: 'لا، لم أتعرض لإصابة',
            labelEn: 'No, no injury',
            value: 'trauma:false',
            field: 'trauma',
            fieldValue: false,
          },
          {
            id: 'qr-trauma-unknown',
            labelAr: 'لست متأكدًا',
            labelEn: 'Not sure',
            value: 'trauma:null',
            field: 'trauma',
            fieldValue: null,
          },
        ];
      } else if (updated.symptoms.chemical_exposure === null && !isFieldAnswered('chemical_exposure')) {
        followUpQuestionAr = 'هل دخل في عينك أي رذاذ منظف، صابون كيميائي، أو مادة كيميائية؟';
        followUpQuestionEn = 'Did any cleaning product, chemical spray, or detergent splash into your eye?';
        quickReplies = [
          {
            id: 'qr-chem-yes',
            labelAr: 'نعم دخل رذاذ منظف/كيماويات',
            labelEn: 'Yes, chemical splash',
            value: 'chemical_exposure:true',
            field: 'chemical_exposure',
            fieldValue: true,
          },
          {
            id: 'qr-chem-no',
            labelAr: 'لا، لم تدخل مواد كيميائية',
            labelEn: 'No chemical exposure',
            value: 'chemical_exposure:false',
            field: 'chemical_exposure',
            fieldValue: false,
          },
          {
            id: 'qr-chem-unknown',
            labelAr: 'لست متأكدًا',
            labelEn: 'Not sure',
            value: 'chemical_exposure:null',
            field: 'chemical_exposure',
            fieldValue: null,
          },
        ];
      }

      updated.messages.push({
        id: `msg-${Date.now()}-followup`,
        sender: 'bot',
        type: 'text',
        conversationLanguage: effectiveConvLang,
        text: effectiveConvLang === 'ar' ? followUpQuestionAr : followUpQuestionEn,
        quickReplies,
        timestamp: new Date().toISOString(),
      });

      updated.events.push({
        id: `evt-${Date.now()}-followup`,
        timestamp: new Date().toISOString(),
        type: 'FOLLOW_UP_ASKED',
        summaryAr: `طرح سؤال توضيحي (${updated.followUpCount}/4): استيضاح الأعراض والتقييم معلق`,
        summaryEn: `Follow-up question asked (${updated.followUpCount}/4): Assessment pending`,
      });

      await this.repository.saveSession(updated);
      return updated;
    }

    // 8. Triage Completed or Immediate Emergency Escalation:
    // Resolve final decision with full PRD conservative fallback rules
    const finalDecision = resolveTriageDecision(
      ruleResult,
      modelSuggestion,
      updated.decision,
      { isFinal: true, symptoms: updated.symptoms }
    );
    updated.decision = finalDecision;

    updated.events.push({
      id: `evt-${Date.now()}-resolved`,
      timestamp: new Date().toISOString(),
      type: 'URGENCY_RESOLVED',
      summaryAr: `القرار النهائي: ${finalDecision.finalUrgency} (المصدر: ${finalDecision.decisionSource})`,
      summaryEn: `Final urgency: ${finalDecision.finalUrgency} (Source: ${finalDecision.decisionSource})`,
    });

    // 9. Compute routing and deliver Result Card
    const targetCity = params.userCity || 'Riyadh';
    const routingResult = getRecommendedFacility(
      finalDecision.finalUrgency,
      targetCity,
      params.userCoords
    );
    updated.routedFacility = routingResult.facility;
    updated.routingExplanationAr = routingResult.explanationAr;
    updated.routingExplanationEn = routingResult.explanationEn;
    updated.status = 'COMPLETED';

    if (routingResult.facility) {
      updated.events.push({
        id: `evt-${Date.now()}-route`,
        timestamp: new Date().toISOString(),
        type: 'FACILITY_ROUTED',
        summaryAr: `توجيه المريض: ${routingResult.explanationAr}`,
        summaryEn: `Facility routing: ${routingResult.explanationEn}`,
        detail: {
          facilityId: routingResult.facility.id,
          city: routingResult.facility.city,
          tier: routingResult.facility.tier,
        },
      });
    } else {
      updated.events.push({
        id: `evt-${Date.now()}-route-notice`,
        timestamp: new Date().toISOString(),
        type: 'FACILITY_ROUTED',
        summaryAr: `تنبيه التوجيه: ${routingResult.explanationAr}`,
        summaryEn: `Routing notice: ${routingResult.explanationEn}`,
        detail: {
          city: targetCity,
          urgency: finalDecision.finalUrgency,
          noSuitableFacilityFound: true,
        },
      });
    }

    // Bot message delivering Triage Result in the conversation language
    const resultCardMessage: ChatMessage = {
      id: `msg-${Date.now()}-card`,
      sender: 'bot',
      type: 'result_card',
      conversationLanguage: effectiveConvLang,
      timestamp: new Date().toISOString(),
      decisionPayload: finalDecision,
      facilityPayload: routingResult.facility,
      routingExplanationAr: routingResult.explanationAr,
      routingExplanationEn: routingResult.explanationEn,
      text:
        effectiveConvLang === 'ar'
          ? `نتيجة الفرز الطبي: ${finalDecision.finalUrgency === 'EMERGENCY' ? '🚨 حالة طارئة' : finalDecision.finalUrgency === 'URGENT' ? '⚠️ تقييم عاجل (اليوم نفسه)' : 'ℹ️ غير عاجل'}\n${finalDecision.guidanceTextAr}`
          : `Triage Result: ${finalDecision.finalUrgency === 'EMERGENCY' ? '🚨 EMERGENCY' : finalDecision.finalUrgency === 'URGENT' ? '⚠️ URGENT (SAME DAY)' : 'ℹ️ NON-URGENT'}\n${finalDecision.guidanceTextEn}`,
    };
    updated.messages.push(resultCardMessage);

    await this.repository.saveSession(updated);
    return updated;
  }

  /**
   * Authoritatively corrects a symptom field for an active session.
   * - Overrides the field value in session.symptoms without appending contradictory values.
   * - Updates answeredFields and records a structured audit event.
   * - Appends a patient message showing the correction.
   * - Re-runs the deterministic rule engine and triage decision resolver,
   *   strictly preserving the sticky emergency non-downgrade policy.
   * - Recomputes facility routing and updates the result card message.
   */
  async correctSymptomField(
    session: TriageSession,
    field: keyof StructuredSymptoms,
    value: unknown,
    labelAr: string,
    labelEn: string,
    userCity: string = 'Riyadh'
  ): Promise<TriageSession> {
    const updated = JSON.parse(JSON.stringify(session)) as TriageSession;
    const now = new Date().toISOString();

    // 1. Authoritatively set the structured field
    (updated.symptoms as unknown as Record<string, unknown>)[field] = value;

    // 2. Update answeredFields
    if (!updated.answeredFields) {
      updated.answeredFields = {};
    }
    updated.answeredFields[field] = {
      field,
      value,
      labelAr,
      labelEn,
      timestamp: now,
    };

    // 3. Append patient message documenting the correction
    const patientMsgText =
      updated.language === 'ar'
        ? `تصحيح إجابة: [${labelAr}]`
        : `Answer correction: [${labelEn}]`;

    const correctionMsg: ChatMessage = {
      id: `msg-${Date.now()}-correction-pat`,
      sender: 'patient',
      type: 'text',
      timestamp: now,
      text: patientMsgText,
    };
    updated.messages.push(correctionMsg);

    // 4. Record audit event in session history
    updated.events.push({
      id: `evt-${Date.now()}-correction`,
      timestamp: now,
      type: 'SYMPTOM_CORRECTION',
      summaryAr: `تصحيح يدوي للحقل: ${String(field)} = ${String(value)} (${labelAr})`,
      summaryEn: `Manual correction of field: ${String(field)} = ${String(value)} (${labelEn})`,
      detail: { field, value, labelAr, labelEn },
    });

    // 5. Gather all patient texts for rule engine evaluation
    const allPatientTexts = updated.messages
      .filter((m) => m.sender === 'patient' && typeof m.text === 'string' && m.text.length > 0)
      .map((m) => m.text as string);

    // 6. Re-evaluate rule engine and model suggestion
    const ruleResult = runDeterministicRuleEngine(allPatientTexts, updated.symptoms);
    const modelSuggestion = await this.modelProvider.suggestUrgency(
      updated.symptoms,
      allPatientTexts.join('\n')
    );

    // 7. Re-evaluate triage decision while preserving sticky emergency policy
    const finalDecision = resolveTriageDecision(
      ruleResult,
      modelSuggestion,
      updated.decision,
      { isFinal: true, symptoms: updated.symptoms }
    );
    updated.decision = finalDecision;

    // 8. Recompute facility routing
    const routingResult = getRecommendedFacility(
      finalDecision.finalUrgency,
      userCity
    );
    updated.routedFacility = routingResult.facility;
    updated.routingExplanationAr = routingResult.explanationAr;
    updated.routingExplanationEn = routingResult.explanationEn;
    updated.status = 'COMPLETED';

    // 9. Update existing result card in messages or append new one
    const convLang = updated.conversationLanguage || updated.language;
    const existingResultIndex = updated.messages.findIndex((m) => m.type === 'result_card');
    const resultCardMessage: ChatMessage = {
      id: existingResultIndex >= 0 ? updated.messages[existingResultIndex].id : `msg-${Date.now()}-card`,
      sender: 'bot',
      type: 'result_card',
      conversationLanguage: convLang,
      timestamp: now,
      decisionPayload: finalDecision,
      facilityPayload: routingResult.facility,
      routingExplanationAr: routingResult.explanationAr,
      routingExplanationEn: routingResult.explanationEn,
      text:
        convLang === 'ar'
          ? `نتيجة الفرز الطبي: ${finalDecision.finalUrgency === 'EMERGENCY' ? '🚨 حالة طارئة' : finalDecision.finalUrgency === 'URGENT' ? '⚠️ تقييم عاجل (اليوم نفسه)' : 'ℹ️ غير عاجل'}\n${finalDecision.guidanceTextAr}`
          : `Triage Result: ${finalDecision.finalUrgency === 'EMERGENCY' ? '🚨 EMERGENCY' : finalDecision.finalUrgency === 'URGENT' ? '⚠️ URGENT (SAME DAY)' : 'ℹ️ NON-URGENT'}\n${finalDecision.guidanceTextEn}`,
    };

    if (existingResultIndex >= 0) {
      updated.messages[existingResultIndex] = resultCardMessage;
    } else {
      updated.messages.push(resultCardMessage);
    }

    // 10. Record decision update event
    updated.events.push({
      id: `evt-${Date.now()}-reassessed`,
      timestamp: now,
      type: 'URGENCY_RESOLVED',
      summaryAr: `إعادة تقييم بعد التصحيح: ${finalDecision.finalUrgency} (المصدر: ${finalDecision.decisionSource})`,
      summaryEn: `Re-assessed after correction: ${finalDecision.finalUrgency} (Source: ${finalDecision.decisionSource})`,
      detail: { finalUrgency: finalDecision.finalUrgency, decisionSource: finalDecision.decisionSource },
    });

    await this.repository.saveSession(updated);
    return updated;
  }

  /**
   * Records clinician review feedback on the hospital dashboard (FR-24)
   */
  async submitClinicianReview(
    sessionId: string,
    review: {
      reviewerName: string;
      feedback: 'CORRECT' | 'OVER_TRIAGED' | 'UNDER_TRIAGED';
      notes: string;
      isFlagged: boolean;
    }
  ): Promise<TriageSession | null> {
    const session = await this.repository.getSession(sessionId);
    if (!session) return null;

    const now = new Date().toISOString();
    session.clinicianReview = {
      reviewerName: review.reviewerName,
      reviewedAt: now,
      feedback: review.feedback,
      notes: review.notes,
      isFlagged: review.isFlagged,
    };
    session.updatedAt = now;

    session.events.push({
      id: `evt-${Date.now()}-review`,
      timestamp: now,
      type: 'CLINICIAN_REVIEWED',
      summaryAr: `تم تسجيل مراجعة الطبيب: ${review.feedback} بواسطة ${review.reviewerName}`,
      summaryEn: `Clinician review recorded: ${review.feedback} by ${review.reviewerName}`,
      detail: { feedback: review.feedback, flagged: review.isFlagged },
    });

    await this.repository.saveSession(session);
    return session;
  }
}

export const orchestrator = new TriageOrchestrator();
