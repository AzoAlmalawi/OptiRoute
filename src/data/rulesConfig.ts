import { RedFlagRule } from '../types/triage';

export const RULE_ENGINE_VERSION = 'v1.2.0-draft-unvalidated';
export const MODEL_ADAPTER_VERSION = 'simulated-classifier-fixture-v1';
export const DATASET_VERSION = 'synthetic-demo-dataset-v1.0';
export const SPEECH_MODEL_VERSION = 'simulated-speech-fixture-v1';

/**
 * Versioned Red-Flag Rules mapped from PRD FR-10.
 * NOTE: These demonstration rules are draft engineering configurations based on
 * public ophthalmic emergency triage guidelines (AAO / RCOphth / MOH KSA references).
 * They are NOT clinically validated and passing software tests does not establish clinical safety.
 */
export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'RF-01',
    code: 'SUDDEN_VISION_LOSS',
    titleAr: 'فقدان أو انخفاض حاد ومفاجئ في الرؤية',
    titleEn: 'Sudden Acute Vision Loss or Drop',
    descriptionAr: 'انخفاض مفاجئ في حدة الإبصار أو عتمة مفاجئة في إحدى العينين أو كلتيهما خلال دقائق أو ساعات.',
    descriptionEn: 'Rapid painless or painful loss of sight, severe vision blackout within minutes or hours.',
    immediateActionAr: 'توجه فوراً إلى أقرب طوارئ عيون متخصصة. لا تنتظر تحسن النظر.',
    immediateActionEn: 'Go immediately to the nearest emergency eye care department. Do not wait.',
    triggersEmergency: true,
  },
  {
    id: 'RF-02',
    code: 'CHEMICAL_SPLASH',
    titleAr: 'تعرض العين لمادة كيميائية أو سائل تنظيف حارق',
    titleEn: 'Chemical Exposure or Splash in Eye',
    descriptionAr: 'دخول منظفات كيميائية (فلاش، كلور، حمض، قلوي، أسمنت) في العين مما يشكل خطراً حارقاً مباشراً على القرنية.',
    descriptionEn: 'Splash of cleaning detergents, acid, alkali, bleach, or solvents requiring instant emergency irrigation.',
    immediateActionAr: '⚠️ إجراء فوري: اغسل عينك فوراً بماء جارٍ نظيف أو محلول ملحي لمدة 15-20 دقيقة متواصلة مع فتح الجفنين، لا تفرك العين أبداً، ثم توجه فوراً لطوارئ العيون.',
    immediateActionEn: '⚠️ Immediate Action: Flush the eye immediately with clean running water or saline for 15-20 continuous minutes holding the eyelids open. Never rub the eye, then go straight to the nearest eye emergency.',
    triggersEmergency: true,
  },
  {
    id: 'RF-03',
    code: 'PENETRATING_BLUNT_TRAUMA',
    titleAr: 'إصابة أو ضربة مباشرة بالعين أو جسم غريب',
    titleEn: 'Penetrating or Severe Blunt Eye Trauma / Foreign Body',
    descriptionAr: 'تعرض العين لشظية معدنية، أداة حادة، مقذوف، أو ضربة قوية مباشرة مسببة ألماً شديداً أو نزيفاً أو جرحاً.',
    descriptionEn: 'Penetration by metallic foreign body, high-speed projectile, sharp object, or high-impact blunt trauma.',
    immediateActionAr: 'ضع غطاءً واقياً برفق (مثل كوب ورقي نظيف) دون الضغط على العين نهائياً، لا تلمس العين ولا تحاول إزالة الجسم، وتوجه فوراً للطوارئ.',
    immediateActionEn: 'Shield the eye gently without applying any pressure. Do not touch or attempt to remove anything. Seek emergency eye care immediately.',
    triggersEmergency: true,
  },
  {
    id: 'RF-04',
    code: 'SEVERE_PAIN_NAUSEA',
    titleAr: 'ألم شديد جداً في العين مصحوب بغثيان أو قيء',
    titleEn: 'Severe Eye Pain with Nausea / Vomiting',
    descriptionAr: 'ألم حاد عميق في مقلة العين أو حولها مصاحب للغثيان أو الصداع الشديد (علامة محتملة لارتفاع حاد في ضغط العين).',
    descriptionEn: 'Intense periocular ache with systemic nausea or vomiting (concerning for acute angle-closure glaucoma).',
    immediateActionAr: 'يتطلب فحصاً عاجلاً لقياس ضغط العين والتدخل الطارئ لإنقاذ العصب البصري.',
    immediateActionEn: 'Requires urgent ophthalmic tonometry and emergency management to protect the optic nerve.',
    triggersEmergency: true,
  },
  {
    id: 'RF-05',
    code: 'FLASHES_CURTAIN_SHADOW',
    titleAr: 'ومضات ضوئية جديدة مع ستارة أو ظل داكن في مجال الرؤية',
    titleEn: 'New Flashes with Curtain or Shadow across Vision',
    descriptionAr: 'ظهور مفاجئ لبريق ضوئي أو خيوط كثيفة متبوعة بظل معتم يشبه الستارة يغطي جزءاً من الرؤية (اشتباه انفصال شبكية).',
    descriptionEn: 'Sudden onset of photopsia (flashes) and dense dark shadow or curtain encroaching visual field (retinal detachment concern).',
    immediateActionAr: 'امتنع عن الحركة العنيفة وتوجه إلى طوارئ عيون لإجراء فحص قاع العين العاجل.',
    immediateActionEn: 'Avoid vigorous movement and proceed to emergency ophthalmology for immediate dilated fundus examination.',
    triggersEmergency: true,
  },
  {
    id: 'RF-06',
    code: 'SUDDEN_DIPLOPIA_NEURO',
    titleAr: 'ازدواجية رؤية مفاجئة مع أعراض عصبية',
    titleEn: 'Sudden Double Vision with Neurological Signs',
    descriptionAr: 'رؤية مزدوجة مفاجئة مصحوبة بدوار، ضعف في الأطراف، خدر بالوجه، أو صعوبة في النطق.',
    descriptionEn: 'New-onset binocular diplopia associated with dizziness, limb weakness, or cranial nerve involvement.',
    immediateActionAr: 'حالة طبية طارئة تستدعي التقييم الإسعافي الفوري لاستبعاد المشاكل العصبية والوعائية.',
    immediateActionEn: 'Medical emergency requiring urgent neuro-ophthalmic or emergency room evaluation.',
    triggersEmergency: true,
  },
  {
    id: 'RF-07',
    code: 'ACUTE_RED_EYE_HALOS',
    titleAr: 'عين حمراء مؤلمة بشكل حاد مع رؤية هالات ملونة حول الضوء',
    titleEn: 'Acute Painful Red Eye with Rainbow Halos',
    descriptionAr: 'احمرار حاد مصحوب بألم عميق وتشوش نظر مع رؤية هالات قزحية حول مصادر الإضاءة.',
    descriptionEn: 'Marked ciliary injection, intense ache, blurred vision with multicolored halos around light bulbs.',
    immediateActionAr: 'توجه لطوارئ العيون لإجراء فحص فوري لضغط العين والقرنية.',
    immediateActionEn: 'Proceed to eye emergency for immediate corneal and intraocular pressure evaluation.',
    triggersEmergency: true,
  },
  {
    id: 'RF-08',
    code: 'POST_SURGICAL_COMPLICATION',
    titleAr: 'ألم مفاجئ أو تدهور نظر بعد عملية جراحية حديثة في العين',
    titleEn: 'Sudden Pain or Visual Drop Following Recent Eye Surgery',
    descriptionAr: 'حدوث ألم متزايد، احمرار شديد، أو ضعف مفاجئ في النظر خلال أيام أو أسابيع بعد جراحة بالعين (مثل الساد/الماء الأبيض أو الليزك أو الحقن).',
    descriptionEn: 'Worsening pain, marked inflammation, or vision reduction within weeks of cataract, refractive, or intravitreal procedures.',
    immediateActionAr: 'اتصل بجراح العيون أو توجه مباشرة إلى طوارئ المركز الذي أجرى العملية لاستبعاد الالتهاب الداخلي (Endophthalmitis).',
    immediateActionEn: 'Contact your operating surgeon or proceed directly to ophthalmic emergency to rule out post-operative endophthalmitis.',
    triggersEmergency: true,
  },
];

/**
 * Keyword matchers for raw text in Gulf Arabic and English.
 * Evaluated independently of model extraction to ensure deterministic safety.
 */
export const RAW_TEXT_RED_FLAG_PATTERNS: {
  ruleId: string;
  arPatterns: RegExp[];
  enPatterns: RegExp[];
}[] = [
  {
    ruleId: 'RF-01',
    arPatterns: [
      /فقد(ان)?.*(النظر|البصر|الرؤية|للنظر|للبصر)/i,
      /عمى مفاجئ/i,
      /ما (أشوف|اشوف|صرت اشوف) (شي|شيء)/i,
      /انعدمت الرؤية/i,
      /انطفأ (النظر|النور)/i,
      /ضعف مفاجئ في النظر/i,
      /سواد تام/i,
    ],
    enPatterns: [
      /\bsudden vision loss\b/i,
      /sudden(ly)? (lost|loss of|drop in) (vision|sight|eyesight)/i,
      /can('?t| not) see anything/i,
      /went completely blind/i,
      /blackout in (my )?eye/i,
      /sudden blindness/i,
    ],
  },
  {
    ruleId: 'RF-02',
    arPatterns: [
      /(مادة|مواد) كيميائية/i,
      /(كلور|فلاش|منظف|صابون كاو|مبيض|حمض|تيزاب|اسيد|قلوي)/i,
      /رش في عيني (منظف|كلور|كيماوي)/i,
      /بخاخ حارق/i,
      /دخول مادة حارقة/i,
    ],
    enPatterns: [
      /chemical.*(splash|exposure|burn|eye)/i,
      /bleach.*eye/i,
      /detergent.*eye/i,
      /acid.*eye/i,
      /alkali/i,
      /drain cleaner/i,
    ],
  },
  {
    ruleId: 'RF-03',
    arPatterns: [
      /شظية (حديد|معدن|زجاج)/i,
      /طارت في عيني/i,
      /ضربة (قوية|مباشرة) (في|على) عيني/i,
      /جسم غريب دخل/i,
      /نزيف في بؤبؤ العين/i,
      /طعنة|سكين|مسمار في العين/i,
      /إصابة (في|بالعين|مباشرة)/i,
    ],
    enPatterns: [
      /\b(eye trauma|eye injury)\b/i,
      /metal (fragment|shard|particle) in (my )?eye/i,
      /foreign object in (my )?eye/i,
      /hit directly in the eye/i,
      /punched in the eye/i,
      /penetrat(ed|ing) (eye|wound)/i,
    ],
  },
  {
    ruleId: 'RF-04',
    arPatterns: [
      /ألم (شديد|فظيع|لا يحتمل) (مع|ومعه) (غثيان|استفراغ|ترجيع|قيء)/i,
      /الم قوي جدا بالعين مع دوخة واستفراغ/i,
    ],
    enPatterns: [
      /severe (eye )?pain with (nausea|vomiting)/i,
      /unbearable eye ache and threw up/i,
    ],
  },
  {
    ruleId: 'RF-05',
    arPatterns: [
      /ستارة (سوداء|سودة|معتمة|مظلمة)/i,
      /ظل أسود نازل/i,
      /ومضات (نور|ضوئية) مع (ستارة|ظل)/i,
      /برق في العين مع سواد/i,
    ],
    enPatterns: [
      /curtain (coming )?over (my )?vision/i,
      /black (shadow|veil) in eye/i,
      /flashes (of light )?with shadow/i,
      /dark shadow covering vision/i,
    ],
  },
  {
    ruleId: 'RF-06',
    arPatterns: [
      /اشوف (اثنين|اثنين مفاجئ)/i,
      /ازدواجية (مفاجئة)? مع (دوخة|ثقل|خدر|تنميل)/i,
      /رؤية مزدوجة مع ضعف/i,
    ],
    enPatterns: [
      /sudden double vision with (dizziness|numbness|weakness)/i,
      /seeing double and slurred speech/i,
    ],
  },
  {
    ruleId: 'RF-07',
    arPatterns: [
      /عين حمراء (جدا|كثير) مع هالات/i,
      /هالات (ملونة|قوس قزح) حول (اللمبات|الضوء|النور)/i,
      /ألم حاد مع هالات حول النور/i,
    ],
    enPatterns: [
      /halos around lights with (severe )?red eye/i,
      /rainbow halos around lights with pain/i,
    ],
  },
  {
    ruleId: 'RF-08',
    arPatterns: [
      /بعد (عملية|جراحة) (الماء الأبيض|الساد|الليزك|العين)/i,
      /سويت عملية بعيني ومن أمس ألم شديد/i,
      /حقنة بالعين وبدأ ألم وضعف نظر/i,
    ],
    enPatterns: [
      /after eye surgery.*pain/i,
      /recent cataract surgery.*pain/i,
      /vision drop after (lasik|cataract|eye injection)/i,
    ],
  },
];
