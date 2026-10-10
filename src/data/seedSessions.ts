import { TriageSession } from '../types/triage';
import {
  RULE_ENGINE_VERSION,
  MODEL_ADAPTER_VERSION,
  DATASET_VERSION,
  SPEECH_MODEL_VERSION,
} from './rulesConfig';
import { DEMO_FACILITIES } from './facilities';
import { createEmptySymptoms } from '../services/providers';

/**
 * Generates the three baseline synthetic completed sessions for Baseera:
 * 1. EMERGENCY: Fictional 24/7 ophthalmic emergency department (Chemical splash red flag)
 * 2. URGENT: Fictional same-day eye assessment clinic (Contact lens acute corneal inflammation)
 * 3. NON_URGENT: Fictional primary-care facility or routine eye clinic (Dryness & mild irritation)
 *
 * All timestamps are dynamically relative to baseDate (the current demo day),
 * ensuring date filters (e.g. "Today") and relative audits reflect the current demo day.
 */
export function generateSeedSessions(baseDate: Date = new Date()): TriageSession[] {
  const nowMs = baseDate.getTime();

  // Helper to construct ISO strings offset from baseDate
  const offsetTime = (minutesAgo: number, secondsDelta: number = 0): string => {
    return new Date(nowMs - minutesAgo * 60 * 1000 + secondsDelta * 1000).toISOString();
  };

  // Find exact fictional facilities matching the capability tier in Riyadh demo area
  const emergencyFacility =
    DEMO_FACILITIES.find((f) => f.id === 'fac-demo-emerg-a' && f.tier === 'EMERGENCY') ||
    DEMO_FACILITIES.find((f) => f.tier === 'EMERGENCY')!;

  const urgentFacility =
    DEMO_FACILITIES.find((f) => f.id === 'fac-demo-urgent-riyadh' && f.tier === 'URGENT') ||
    DEMO_FACILITIES.find((f) => f.tier === 'URGENT')!;

  const nonUrgentFacility =
    DEMO_FACILITIES.find((f) => f.id === 'fac-demo-phc-e' && f.tier === 'NON_URGENT') ||
    DEMO_FACILITIES.find((f) => f.tier === 'NON_URGENT')!;

  // --------------------------------------------------------------------------
  // Record 1: EMERGENCY Case (Chemical splash / urgent ocular burn)
  // --------------------------------------------------------------------------
  const emergencyStarted = offsetTime(180, 0); // 3 hours ago today
  const emergencyConsentTime = offsetTime(180, 10);
  const emergencyVoiceTime = offsetTime(180, 32);
  const emergencyEvalTime = offsetTime(180, 35);
  const emergencyReviewTime = offsetTime(150, 0); // 2.5 hours ago today

  const emergencySession: TriageSession = {
    id: 'SES-9421-KSA',
    patientMaskedPhone: '+966 50 *** 3892',
    startedAt: emergencyStarted,
    updatedAt: emergencyEvalTime,
    language: 'ar',
    consentGiven: true,
    status: 'COMPLETED',
    followUpCount: 0,
    symptoms: {
      ...createEmptySymptoms('ar'),
      eye: 'left',
      onset: 'sudden',
      vision_change: 'loss',
      pain_level: 'severe',
      chemical_exposure: true,
      trauma: false,
      contact_lens: false,
      redness: true,
      confidence: 0.98,
    },
    decision: {
      finalUrgency: 'EMERGENCY',
      isFinalDecision: true,
      ruleResult: {
        matchedFlags: [
          {
            id: 'RF-02',
            code: 'CHEMICAL_SPLASH',
            titleAr: 'تعرض العين لمادة كيميائية أو سائل تنظيف حارق',
            titleEn: 'Chemical Exposure or Splash in Eye',
            descriptionAr: 'دخول منظفات كيميائية (فلاش، كلور، حمض، قلوي) في العين.',
            descriptionEn: 'Splash of cleaning detergents or acid.',
            immediateActionAr:
              'اغسل عينك فوراً بماء جارٍ نظيف لمدة 15-20 دقيقة، لا تفرك العين، وتوجه فوراً لطوارئ العيون.',
            immediateActionEn:
              'Flush eye immediately with clean water for 15-20 min. Do not rub.',
            triggersEmergency: true,
          },
        ],
        ruleUrgency: 'EMERGENCY',
        rationaleCodes: ['RED_FLAG_CHEMICAL_SPLASH', 'RULE_CHEMICAL_EXPOSURE'],
        evidenceMatches: [
          { field: 'chemical_exposure', source: 'raw_text', snippet: 'دخل فلاش منظف ومادة كيميائية', isNegated: false },
          { field: 'chemical_exposure', source: 'structured_field', snippet: 'true', isNegated: false },
        ],
      },
      modelSuggestion: {
        urgency: 'EMERGENCY',
        confidence: 0.95,
        rationaleCodes: ['HEURISTIC_EMERGENCY_FEATURE_DETECTED'],
        baseModel: 'Simulated Model Heuristic (Demo Fixture)',
        adapterVersion: MODEL_ADAPTER_VERSION,
      },
      decisionSource: 'RULE_ENGINE_OVERRIDE',
      escalatedByUncertainty: false,
      guidanceTextAr:
        'حالتك مصنفة كحالة طارئة تتطلب فحصاً فورياً في طوارئ العيون لتجنب أي ضرر دائم على البصر. يرجى التوجه فوراً لأقرب مركز طوارئ عيون.',
      guidanceTextEn:
        'Your symptoms indicate an emergency requiring immediate specialized eye care to prevent permanent vision loss.',
      immediateActionTextAr:
        '⚠️ إجراء فوري: اغسل عينك فوراً بماء جارٍ نظيف أو محلول ملحي لمدة 15-20 دقيقة متواصلة مع فتح الجفنين، لا تفرك العين أبداً، ثم توجه فوراً لطوارئ العيون.',
      immediateActionTextEn:
        '⚠️ Immediate Action: Flush the eye immediately with clean running water or saline for 15-20 continuous minutes. Do not rub the eye, then go immediately to an ophthalmic emergency center.',
      evaluatedAt: emergencyEvalTime,
    },
    routedFacility: emergencyFacility,
    routingExplanationAr: `تم التوجيه الفوري لمركز طوارئ عيون افتراضي مجهز (24/7) نظراً لخطورة التعرض الكيميائي: ${emergencyFacility.nameAr}`,
    routingExplanationEn: `Immediate emergency routing to a 24/7 eye emergency center due to chemical splash: ${emergencyFacility.nameEn}`,
    messages: [
      {
        id: 'msg-seed-1-welcome',
        sender: 'system',
        type: 'consent',
        text:
          'مرحبًا بك في OptiRoute. نساعدك على معرفة مدى استعجال أعراض العين والجهة المناسبة للتوجه إليها.\n\n' +
          '⚠️ إشعار هام: هذه تجربة لحالات افتراضية، وليست تشخيصًا طبيًا ولا تقدم وصفات علاجية. في حالات الطوارئ القصوى، اتصل فورًا بالهلال الأحمر (997) أو توجه لأقرب مستشفى.',
        timestamp: emergencyStarted,
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
      },
      {
        id: 'msg-seed-1-consent',
        sender: 'patient',
        type: 'text',
        text: 'أوافق وأبدأ التجربة',
        timestamp: emergencyConsentTime,
      },
      {
        id: 'msg-seed-1-voice',
        sender: 'patient',
        type: 'voice',
        text: 'الحقوني دخل فلاش منظف ومادة كيميائية حارقة بعيني اليسار وأنا أنظف، تحرقني جداً وما أقدر أفتحها!',
        transcript:
          'الحقوني دخل فلاش منظف ومادة كيميائية حارقة بعيني اليسار وأنا أنظف، تحرقني جداً وما أقدر أفتحها!',
        audioDurationSeconds: 11,
        timestamp: emergencyVoiceTime,
      },
      {
        id: 'msg-seed-1-result',
        sender: 'bot',
        type: 'result_card',
        text: 'تم الكشف عن تعرض لمادة كيميائية (علامة حمراء طارئة). يرجى غسل العين فوراً والتوجه للطوارئ.',
        decisionPayload: {
          finalUrgency: 'EMERGENCY',
          isFinalDecision: true,
          decisionSource: 'RULE_ENGINE_OVERRIDE',
          guidanceTextAr:
            'حالتك مصنفة كحالة طارئة تتطلب فحصاً فورياً في طوارئ العيون لتجنب أي ضرر دائم على البصر. يرجى التوجه فوراً لأقرب مركز طوارئ عيون.',
          guidanceTextEn:
            'Your symptoms indicate an emergency requiring immediate specialized eye care.',
          evaluatedAt: emergencyEvalTime,
        } as any,
        facilityPayload: emergencyFacility,
        routingExplanationAr: `التوجيه إلى: ${emergencyFacility.nameAr}`,
        routingExplanationEn: `Routing to: ${emergencyFacility.nameEn}`,
        timestamp: emergencyEvalTime,
      },
    ],
    events: [
      {
        id: 'evt-seed-1-1',
        timestamp: emergencyStarted,
        type: 'SESSION_START',
        summaryAr: 'بدء الجلسة عبر محاكي واتساب وإرسال إشعار الموافقة',
        summaryEn: 'Session initiated via WhatsApp simulator; consent notice sent',
      },
      {
        id: 'evt-seed-1-2',
        timestamp: emergencyConsentTime,
        type: 'CONSENT_GRANTED',
        summaryAr: 'المريض وافق صراحةً على شروط الفرز التجريبي المستنير',
        summaryEn: 'Explicit informed consent granted by user',
      },
      {
        id: 'evt-seed-1-3',
        timestamp: emergencyVoiceTime,
        type: 'VOICE_TRANSCRIPTION',
        summaryAr: 'تم تفريغ الرسالة الصوتية بنجاح عبر نموذج الكلام (سجل تجريبي)',
        summaryEn: 'Voice note transcribed successfully via STT (Simulated demo fixture)',
      },
      {
        id: 'evt-seed-1-4',
        timestamp: emergencyEvalTime,
        type: 'RULE_EVALUATION',
        summaryAr: 'محرك القواعد رصد العلامة الحمراء: RF-02 (تعرض كيميائي حارق)',
        summaryEn: 'Deterministic rule engine flagged RF-02 Chemical Splash',
      },
      {
        id: 'evt-seed-1-5',
        timestamp: emergencyEvalTime,
        type: 'FACILITY_ROUTED',
        summaryAr: `توجيه فوري لمركز طوارئ العيون الافتراضي: ${emergencyFacility.nameAr}`,
        summaryEn: `Emergency routing to ${emergencyFacility.nameEn}`,
      },
    ],
    clinicianReview: {
      reviewerName: 'د. فيصل الشهري (أخصائي عيون)',
      reviewedAt: emergencyReviewTime,
      feedback: 'CORRECT',
      notes:
        'تصنيف سليم ودقيق بنسبة 100%. التوجيه بالإرواء الفوري للعين والتحويل الفوري لطوارئ العيون إجراء منقذ لشفافية القرنية.',
      isFlagged: false,
    },
    metadata: {
      ruleVersion: RULE_ENGINE_VERSION,
      modelAdapterVersion: MODEL_ADAPTER_VERSION,
      datasetVersion: DATASET_VERSION,
      speechModelVersion: SPEECH_MODEL_VERSION,
    },
  };

  // --------------------------------------------------------------------------
  // Record 2: URGENT Case (Contact lens acute corneal inflammation)
  // --------------------------------------------------------------------------
  const urgentStarted = offsetTime(120, 0); // 2 hours ago today
  const urgentConsentTime = offsetTime(120, 10);
  const urgentMsg1Time = offsetTime(120, 35);
  const urgentFollowUpTime = offsetTime(120, 45);
  const urgentMsg2Time = offsetTime(120, 65);
  const urgentEvalTime = offsetTime(120, 70);

  const urgentSession: TriageSession = {
    id: 'SES-9418-KSA',
    patientMaskedPhone: '+966 55 *** 8120',
    startedAt: urgentStarted,
    updatedAt: urgentEvalTime,
    language: 'ar',
    consentGiven: true,
    status: 'COMPLETED',
    followUpCount: 1,
    symptoms: {
      ...createEmptySymptoms('ar'),
      eye: 'right',
      onset: 'gradual',
      vision_change: 'blurred',
      pain_level: 'moderate',
      contact_lens: true,
      redness: true,
      light_sensitivity: true,
      discharge: true,
      trauma: false,
      chemical_exposure: false,
      confidence: 0.92,
    },
    decision: {
      finalUrgency: 'URGENT',
      isFinalDecision: true,
      ruleResult: {
        matchedFlags: [],
        ruleUrgency: 'URGENT',
        rationaleCodes: ['CONTACT_LENS_INFLAMMATION_RISK', 'MODERATE_OCULAR_PAIN'],
        evidenceMatches: [
          { field: 'contact_lens', source: 'structured_field', snippet: 'true', isNegated: false },
          { field: 'redness', source: 'structured_field', snippet: 'true', isNegated: false },
        ],
      },
      modelSuggestion: {
        urgency: 'URGENT',
        confidence: 0.88,
        rationaleCodes: ['HEURISTIC_CORNEAL_INFLAMMATION_SUSPICION'],
        baseModel: 'Simulated Model Heuristic (Demo Fixture)',
        adapterVersion: MODEL_ADAPTER_VERSION,
      },
      decisionSource: 'HYBRID_AGREEMENT',
      escalatedByUncertainty: false,
      guidanceTextAr:
        'حالتك تتطلب تقييماً طبياً متخصصاً في اليوم نفسه (خلال ساعات) لدى عيادة عيون عاجلة للتأكد من سلامة القرنية من الالتهاب الجرثومي.',
      guidanceTextEn:
        'Your symptoms require a same-day specialist ophthalmic evaluation (within hours) at an urgent eye clinic.',
      evaluatedAt: urgentEvalTime,
    },
    routedFacility: urgentFacility,
    routingExplanationAr: `تم التوجيه لعيادات الفحص العاجل للعيون في اليوم نفسه: ${urgentFacility.nameAr}`,
    routingExplanationEn: `Routed to same-day urgent eye assessment clinic: ${urgentFacility.nameEn}`,
    messages: [
      {
        id: 'msg-seed-2-welcome',
        sender: 'system',
        type: 'consent',
        text:
          'مرحبًا بك في OptiRoute. نساعدك على معرفة مدى استعجال أعراض العين والجهة المناسبة للتوجه إليها.\n\n' +
          '⚠️ إشعار هام: هذه تجربة لحالات افتراضية، وليست تشخيصًا طبيًا ولا تقدم وصفات علاجية. في حالات الطوارئ القصوى، اتصل فورًا بالهلال الأحمر (997) أو توجه لأقرب مستشفى.',
        timestamp: urgentStarted,
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
      },
      {
        id: 'msg-seed-2-consent',
        sender: 'patient',
        type: 'text',
        text: 'أوافق وأبدأ التجربة',
        timestamp: urgentConsentTime,
      },
      {
        id: 'msg-seed-2-msg1',
        sender: 'patient',
        type: 'text',
        text: 'السلام عليكم، ألبس عدسات لاصقة ومن أمس عيني اليمين حمراء وتوجعني مع النور وإفرازات خفيفة.',
        timestamp: urgentMsg1Time,
      },
      {
        id: 'msg-seed-2-bot-ask',
        sender: 'bot',
        type: 'text',
        text: 'هل نزعت العدسات اللاصقة حالياً، وهل تلاحظ بقعة بيضاء صغيرة على سواد العين؟',
        timestamp: urgentFollowUpTime,
        isAnswered: true,
        selectedQuickReplyId: 'qr-lens-removed',
        quickReplies: [
          {
            id: 'qr-lens-removed',
            labelAr: 'نزعتها فوراً',
            labelEn: 'Removed immediately',
            value: 'contact_lens:false',
          },
        ],
      },
      {
        id: 'msg-seed-2-msg2',
        sender: 'patient',
        type: 'text',
        text: 'نزعتها فوراً، ولا أرى بقعة بيضاء ولكن لا أستطيع فتح عيني في النور.',
        timestamp: urgentMsg2Time,
      },
      {
        id: 'msg-seed-2-result',
        sender: 'bot',
        type: 'result_card',
        text: 'نتيجة الفرز الطبي: ⚠️ تقييم عاجل (اليوم نفسه)\nيرجى التوجه لعيادة العيون العاجلة للفحص الدقيق.',
        decisionPayload: {
          finalUrgency: 'URGENT',
          isFinalDecision: true,
          decisionSource: 'HYBRID_AGREEMENT',
          guidanceTextAr:
            'حالتك تتطلب تقييماً طبياً متخصصاً في اليوم نفسه لدى عيادة عيون عاجلة للتأكد من سلامة القرنية.',
          guidanceTextEn:
            'Your symptoms require a same-day specialist ophthalmic evaluation.',
          evaluatedAt: urgentEvalTime,
        } as any,
        facilityPayload: urgentFacility,
        routingExplanationAr: `التوجيه إلى: ${urgentFacility.nameAr}`,
        routingExplanationEn: `Routing to: ${urgentFacility.nameEn}`,
        timestamp: urgentEvalTime,
      },
    ],
    events: [
      {
        id: 'evt-seed-2-1',
        timestamp: urgentStarted,
        type: 'SESSION_START',
        summaryAr: 'بدء الجلسة وإرسال إشعار الموافقة الطبية',
        summaryEn: 'Session started; medical consent notice dispatched',
      },
      {
        id: 'evt-seed-2-2',
        timestamp: urgentConsentTime,
        type: 'CONSENT_GRANTED',
        summaryAr: 'المريض وافق على الشروط الطبية والفرز الافتراضي',
        summaryEn: 'Patient accepted triage terms and consent notice',
      },
      {
        id: 'evt-seed-2-3',
        timestamp: urgentMsg1Time,
        type: 'MESSAGE_RECEIVED',
        summaryAr: 'استلام وصف الأعراض الأولية وتحديد ارتداء العدسات اللاصقة والألم',
        summaryEn: 'Received initial symptom description; identified contact lenses and pain',
      },
      {
        id: 'evt-seed-2-4',
        timestamp: urgentFollowUpTime,
        type: 'FOLLOW_UP_ASKED',
        summaryAr: 'طرح سؤال متابعة سريري بخصوص نزع العدسات وفحص القرنية',
        summaryEn: 'Asked clinical follow-up about contact lens removal and cornea',
      },
      {
        id: 'evt-seed-2-5',
        timestamp: urgentMsg2Time,
        type: 'MESSAGE_RECEIVED',
        summaryAr: 'تسجيل إجابة المريض بتأكيد نزع العدسات وغياب البقع البيضاء',
        summaryEn: 'Recorded patient answer confirming lens removal and no white spot',
      },
      {
        id: 'evt-seed-2-6',
        timestamp: urgentEvalTime,
        type: 'URGENCY_RESOLVED',
        summaryAr: 'توافق هجين: عاجل — تقييم عيون في اليوم نفسه (احتمال التهاب القرنية المرتبط بالعدسات)',
        summaryEn: 'Hybrid agreement: Urgent same-day ophthalmic evaluation',
      },
      {
        id: 'evt-seed-2-7',
        timestamp: urgentEvalTime,
        type: 'FACILITY_ROUTED',
        summaryAr: `توجيه المريض لمنشأة تقييم عاجل في اليوم نفسه: ${urgentFacility.nameAr}`,
        summaryEn: `Routed to same-day urgent eye clinic: ${urgentFacility.nameEn}`,
      },
    ],
    // Pending review to reflect active workflow in dashboard
    clinicianReview: undefined,
    metadata: {
      ruleVersion: RULE_ENGINE_VERSION,
      modelAdapterVersion: MODEL_ADAPTER_VERSION,
      datasetVersion: DATASET_VERSION,
      speechModelVersion: SPEECH_MODEL_VERSION,
    },
  };

  // --------------------------------------------------------------------------
  // Record 3: NON_URGENT Case (Superficial dryness and mild itching)
  // --------------------------------------------------------------------------
  const nonUrgentStarted = offsetTime(60, 0); // 1 hour ago today
  const nonUrgentConsentTime = offsetTime(60, 10);
  const nonUrgentMsgTime = offsetTime(60, 25);
  const nonUrgentEvalTime = offsetTime(60, 30);
  const nonUrgentReviewTime = offsetTime(20, 0); // 20 minutes ago today

  const nonUrgentSession: TriageSession = {
    id: 'SES-9405-KSA',
    patientMaskedPhone: '+966 54 *** 4910',
    startedAt: nonUrgentStarted,
    updatedAt: nonUrgentEvalTime,
    language: 'ar',
    consentGiven: true,
    status: 'COMPLETED',
    followUpCount: 0,
    symptoms: {
      ...createEmptySymptoms('ar'),
      eye: 'both',
      onset: 'gradual',
      vision_change: 'none',
      pain_level: 'mild',
      redness: false,
      chemical_exposure: false,
      trauma: false,
      contact_lens: false,
      light_sensitivity: false,
      confidence: 0.94,
    },
    decision: {
      finalUrgency: 'NON_URGENT',
      isFinalDecision: true,
      ruleResult: {
        matchedFlags: [],
        ruleUrgency: 'NON_URGENT',
        rationaleCodes: ['SUPERFICIAL_SYMPTOMS_ONLY'],
        evidenceMatches: [],
      },
      modelSuggestion: {
        urgency: 'NON_URGENT',
        confidence: 0.90,
        rationaleCodes: ['HEURISTIC_SUPERFICIAL_IRRITATION_SIGNS'],
        baseModel: 'Simulated Model Heuristic (Demo Fixture)',
        adapterVersion: MODEL_ADAPTER_VERSION,
      },
      decisionSource: 'RULE_ENGINE_OVERRIDE',
      escalatedByUncertainty: false,
      guidanceTextAr:
        'الأعراض الحالية غير طارئة ويمكن متابعتها في مركز الرعاية الصحية الأولية أو عيادة العيون العامة. في حال حدوث أي تشوش مفاجئ أو ألم حاد، توجه لطوارئ العيون فوراً.',
      guidanceTextEn:
        'Your reported symptoms are non-urgent and suitable for primary healthcare or routine eye care.',
      evaluatedAt: nonUrgentEvalTime,
    },
    routedFacility: nonUrgentFacility,
    routingExplanationAr: `تم التوجيه لمركز الرعاية الصحية الأولية: ${nonUrgentFacility.nameAr}`,
    routingExplanationEn: `Routed to primary healthcare center: ${nonUrgentFacility.nameEn}`,
    messages: [
      {
        id: 'msg-seed-3-welcome',
        sender: 'system',
        type: 'consent',
        text:
          'مرحبًا بك في OptiRoute. نساعدك على معرفة مدى استعجال أعراض العين والجهة المناسبة للتوجه إليها.\n\n' +
          '⚠️ إشعار هام: هذه تجربة لحالات افتراضية، وليست تشخيصًا طبيًا ولا تقدم وصفات علاجية. في حالات الطوارئ القصوى، اتصل فورًا بالهلال الأحمر (997) أو توجه لأقرب مستشفى.',
        timestamp: nonUrgentStarted,
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
      },
      {
        id: 'msg-seed-3-consent',
        sender: 'patient',
        type: 'text',
        text: 'أوافق وأبدأ التجربة',
        timestamp: nonUrgentConsentTime,
      },
      {
        id: 'msg-seed-3-msg',
        sender: 'patient',
        type: 'text',
        text: 'عندي جفاف وحكة في عيوني الثنتين من أسبوعين بسبب مكيف المكتب، وما فيه ألم ولا ضعف نظر.',
        timestamp: nonUrgentMsgTime,
      },
      {
        id: 'msg-seed-3-result',
        sender: 'bot',
        type: 'result_card',
        text: 'نتيجة الفرز الطبي: ℹ️ غير عاجل\nالأعراض مناسبة لمراجعة مركز الرعاية الأولية.',
        decisionPayload: {
          finalUrgency: 'NON_URGENT',
          isFinalDecision: true,
          decisionSource: 'RULE_ENGINE_OVERRIDE',
          guidanceTextAr:
            'الأعراض الحالية غير طارئة ويمكن متابعتها في مركز الرعاية الصحية الأولية.',
          guidanceTextEn:
            'Your reported symptoms are non-urgent and suitable for primary healthcare.',
          evaluatedAt: nonUrgentEvalTime,
        } as any,
        facilityPayload: nonUrgentFacility,
        routingExplanationAr: `التوجيه إلى: ${nonUrgentFacility.nameAr}`,
        routingExplanationEn: `Routing to: ${nonUrgentFacility.nameEn}`,
        timestamp: nonUrgentEvalTime,
      },
    ],
    events: [
      {
        id: 'evt-seed-3-1',
        timestamp: nonUrgentStarted,
        type: 'SESSION_START',
        summaryAr: 'بدء الجلسة وإرسال إشعار الموافقة الطبية',
        summaryEn: 'Session started; medical consent notice dispatched',
      },
      {
        id: 'evt-seed-3-2',
        timestamp: nonUrgentConsentTime,
        type: 'CONSENT_GRANTED',
        summaryAr: 'المريض وافق على الشروط الطبية والفرز الافتراضي',
        summaryEn: 'Patient accepted triage terms and consent notice',
      },
      {
        id: 'evt-seed-3-3',
        timestamp: nonUrgentMsgTime,
        type: 'MESSAGE_RECEIVED',
        summaryAr: 'استلام وصف الأعراض (جفاف وحكة مزمنة دون ألم أو ضعف نظر)',
        summaryEn: 'Received symptoms: chronic dryness and itching without pain or vision loss',
      },
      {
        id: 'evt-seed-3-4',
        timestamp: nonUrgentEvalTime,
        type: 'URGENCY_RESOLVED',
        summaryAr: 'تصنيف الحالة كغير عاجلة وتوجيه لمركز الرعاية الصحية الأولية',
        summaryEn: 'Non-urgent classified; routed to primary healthcare',
      },
      {
        id: 'evt-seed-3-5',
        timestamp: nonUrgentEvalTime,
        type: 'FACILITY_ROUTED',
        summaryAr: `توجيه المريض لمركز الرعاية الأولية التجريبي: ${nonUrgentFacility.nameAr}`,
        summaryEn: `Routed to fictional primary healthcare clinic: ${nonUrgentFacility.nameEn}`,
      },
    ],
    clinicianReview: {
      reviewerName: 'د. ريم الخالدي (استشارية طب عيون وجراحة القرنية)',
      reviewedAt: nonUrgentReviewTime,
      feedback: 'CORRECT',
      notes:
        'توجيه ممتاز للرعاية الأولية لتخفيف الازدحام عن الطوارئ دون المساس بسلامة المريض.',
      isFlagged: false,
    },
    metadata: {
      ruleVersion: RULE_ENGINE_VERSION,
      modelAdapterVersion: MODEL_ADAPTER_VERSION,
      datasetVersion: DATASET_VERSION,
      speechModelVersion: SPEECH_MODEL_VERSION,
    },
  };

  return [emergencySession, urgentSession, nonUrgentSession];
}

export const SEED_SESSIONS: TriageSession[] = generateSeedSessions();
