/**
 * Clinical Negation and Certainty Detector for Ophthalmic Triage
 * Handles both Arabic and English dialect expressions.
 * Accurately determines whether a symptom is:
 * - CONFIRMED_POSITIVE: affirmed without negation
 * - CONFIRMED_NEGATIVE: explicitly negated (e.g., "no trauma", "لا يوجد تعرض كيميائي", "ولا إصابة")
 * - UNCERTAIN: expressed with uncertainty (e.g., "not sure", "شاكك") or conflicting statements
 * - ABSENT: not mentioned
 */

export type ClinicalMentionStatus =
  | 'CONFIRMED_POSITIVE'
  | 'CONFIRMED_NEGATIVE'
  | 'UNCERTAIN'
  | 'ABSENT';

export interface ConceptEvaluation {
  status: ClinicalMentionStatus;
  evidenceSnippet?: string;
  isNegated: boolean;
  isAffirmative: boolean;
}

// English negation prefix patterns (with word boundaries)
const EN_NEGATION_PATTERNS: RegExp[] = [
  /\bno\b/i,
  /\bnot\b/i,
  /\bwithout\b/i,
  /\bdenies\b/i,
  /\bdenied\b/i,
  /\bnegative for\b/i,
  /\bfree of\b/i,
  /\bfree from\b/i,
  /\bzero\b/i,
  /\bnever had\b/i,
  /\bnever experienced\b/i,
  /\bnever\b/i,
  /\bdid not have\b/i,
  /\bdidn't have\b/i,
  /\bdo not have\b/i,
  /\bdon't have\b/i,
  /\bhave not had\b/i,
  /\bhaven't had\b/i,
  /\bhas not had\b/i,
  /\bhasn't had\b/i,
  /\brule out\b/i,
  /\bruled out\b/i,
  /\bno signs of\b/i,
  /\bno history of\b/i,
  /\bno evidence of\b/i,
  /\bneither\b/i,
  /\bnor\b/i,
];

const EN_UNCERTAINTY_PATTERNS: RegExp[] = [
  /\bnot sure\b/i,
  /\bunsure\b/i,
  /\bmaybe\b/i,
  /\bpossibly\b/i,
  /\bmight be\b/i,
  /\bhard to tell\b/i,
  /\bcannot tell\b/i,
  /\bcan't tell\b/i,
  /\bquestionable\b/i,
];

// Arabic negation prefix patterns (with word boundaries / exact particles)
const AR_NEGATION_PATTERNS: RegExp[] = [
  /(?:^|\s)(?:و)?لا يوجد(?:\s+أي)?(?:\s|$)/,
  /(?:^|\s)(?:و)?لا توجد(?:\s+أي)?(?:\s|$)/,
  /(?:^|\s)(?:و)?ما فيه(?:\s+أي)?(?:\s|$)/,
  /(?:^|\s)(?:و)?مافيه(?:\s+أي)?(?:\s|$)/,
  /(?:^|\s)(?:و)?بدون(?:\s+أي)?(?:\s|$)/,
  /(?:^|\s)(?:و)?دون(?:\s+أي)?(?:\s|$)/,
  /(?:^|\s)(?:و)?بلا(?:\s+أي)?(?:\s|$)/,
  // Arabic universal jussive/future negation particles: "لم", "ولم", "لن", "ولن"
  /(?:^|\s)(?:و)?لم(?:\s|$)/,
  /(?:^|\s)(?:و)?لن(?:\s|$)/,
  /(?:^|\s)(?:و)?ما (?:تعرضت|انضربت|طاحت|ضربت|نزل|راح|حسيت|شفت|أعاني|اعاني|دخلت|دخل|طش|طشت|صاب|صابت|جاء|جا|صار|حصل|حدث|أشتكي|اشتكي|أشعر|اشعر)(?:\s|$)/,
  /(?:^|\s)(?:و)?(?:ما|ولا) (?:انضربت|انضرب|طش|طشت)(?:\s|$)/,
  /(?:^|\s)(?:و)?ليس(?:ت)?(?:\s|$)/,
  /(?:^|\s)(?:و)?ما (?:عندي|لدي)(?:\s|$)/,
  /(?:^|\s)(?:و)?لا (?:أعاني|اعاني|أشتكي|اشتكي|أشعر|اشعر|أرى|ارى)(?:\s|$)/,
  /(?:^|\s)(?:و)?غير مصحوب(?:\s|$)/,
  /(?:^|\s)(?:و)?غير موجود(?:ة)?(?:\s|$)/,
  /(?:^|\s)(?:و)?خالي(?:ة)? من(?:\s|$)/,
  /(?:^|\s)(?:و)?خلو من(?:\s|$)/,
  /(?:^|\s)(?:و)?(?:أنفي|انفي|أنفيه|انفيه)(?:\s|$)/,
  /(?:^|\s)(?:و)?(?:استبعد|مستبعد|مستبعدة)(?:\s|$)/,
  /(?:^|\s)(?:و)?عدم وجود(?:\s|$)/,
  /(?:^|\s)(?:و)?عدم (?:التعرض|الشعور|وجود)(?:\s|$)/,
  /(?:^|\s)(?:و)?عدم(?:\s|$)/,
  // Single particle wa-la ("ولا إصابة", "ولا ألم", "ولا فقدان")
  /(?:^|\s)ولا(?:\s|$)/,
  // Standalone la ("لا إصابة", "لا ألم")
  /(?:^|\s)لا(?:\s|$)/,
];

const AR_UNCERTAINTY_PATTERNS: RegExp[] = [
  /(?:^|\s)مو متأكد(?:\s|$)/,
  /(?:^|\s)غير متأكد(?:\s|$)/,
  /(?:^|\s)شاكك(?:\s|$)/,
  /(?:^|\s)شاك(?:\s|$)/,
  /(?:^|\s)محتمل(?:\s|$)/,
  /(?:^|\s)يمكن(?:\s|$)/,
  /(?:^|\s)مادري(?:\s|$)/,
  /(?:^|\s)ما ادري(?:\s|$)/,
  /(?:^|\s)صعب أحدد(?:\s|$)/,
  /(?:^|\s)صعب احدد(?:\s|$)/,
];

// Adversative scope terminators: only these break a preceding negation's scope!
// Notice that commas (,) and coordinations ("and", "or", "و", "أو") DO NOT break negation in a list!
const ADVERSATIVE_SCOPE_TERMINATORS: RegExp[] = [
  /\bbut\b/i,
  /\bhowever\b/i,
  /\balthough\b/i,
  /\bexcept\b/i,
  /\byet\b/i,
  /\bnevertheless\b/i,
  /\bwhereas\b/i,
  /(?:^|[\s،,])(?:و)?لكن(?:[\s،,]|$)/,
  /(?:^|[\s،,])(?:غير أن|غير ان)(?:[\s،,]|$)/,
  /(?:^|[\s،,])(?:إلا أن|الا ان)(?:[\s،,]|$)/,
  /(?:^|[\s،,])بينما(?:[\s،,]|$)/,
  /(?:^|[\s،,])مع ذلك(?:[\s،,]|$)/,
  /(?:^|[\s،,])بل(?:[\s،,]|$)/,
  /\./,
  /;/,
  /!/,
  /\?/,
];

// Post-negations (words immediately following the concept, e.g. "trauma: none", "الألم: منفي")
const POST_NEGATION_PATTERNS: RegExp[] = [
  /\bwas negative\b/i,
  /\bis negative\b/i,
  /\bnegative\b/i,
  /\bdenied\b/i,
  /\bruled out\b/i,
  /\bnone\b/i,
  /\babsent\b/i,
  /\bzero\b/i,
  /\bnormal\b/i,
  /\bunremarkable\b/i,
  /(?:^|\s)منفي(?:ة)?(?:\s|$)/,
  /(?:^|\s)غير موجود(?:ة)?(?:\s|$)/,
  /(?:^|\s)سلبية(?:\s|$)/,
  /(?:^|\s)سليم(?:ة)?(?:\s|$)/,
  /(?:^|\s)طبيعي(?:ة)?(?:\s|$)/,
  /(?:^|\s)مستبعد(?:ة)?(?:\s|$)/,
  /(?:^|\s)صفر(?:\s|$)/,
];

/**
 * Checks whether a given match index in text is preceded by a negation cue
 * within a realistic window (up to ~80 characters) without intervening adversative clause terminators.
 */
export function isMatchNegated(text: string, matchIndex: number, matchLength: number = 0): boolean {
  const textLower = text.toLowerCase();
  // Look at up to 80 characters before the match
  const windowStart = Math.max(0, matchIndex - 80);
  const precedingText = textLower.slice(windowStart, matchIndex);

  // Check all negation patterns in preceding text
  // Find the LAST (closest) negation cue before matchIndex
  let closestNegationEnd = -1;

  for (const pattern of [...EN_NEGATION_PATTERNS, ...AR_NEGATION_PATTERNS]) {
    // Scan all matches of pattern in precedingText
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const regex = new RegExp(pattern.source, flags);
    let m: RegExpExecArray | null;
    while ((m = regex.exec(precedingText)) !== null) {
      const matchEnd = m.index + m[0].length;
      if (matchEnd > closestNegationEnd) {
        closestNegationEnd = matchEnd;
      }
    }
  }

  if (closestNegationEnd !== -1) {
    // There is a negation prefix. Check if any adversative terminator occurs BETWEEN the negation cue and matchIndex
    const between = precedingText.slice(closestNegationEnd);
    const hasTerminator = ADVERSATIVE_SCOPE_TERMINATORS.some((term) => term.test(between));
    if (!hasTerminator) {
      return true;
    }
  }

  // Also check immediately following text (up to ~35 chars) for post-negation cues
  // Notice: check from postStart so the matched concept itself is not considered its own post-negation!
  const postStart = matchIndex + matchLength;
  const followingText = textLower.slice(postStart, Math.min(text.length, postStart + 35));
  for (const post of POST_NEGATION_PATTERNS) {
    if (post.test(followingText)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a matched segment contains uncertainty cues.
 */
export function isMatchUncertain(text: string, matchIndex: number): boolean {
  const textLower = text.toLowerCase();
  const windowText = textLower.slice(
    Math.max(0, matchIndex - 50),
    Math.min(text.length, matchIndex + 50)
  );

  return [...EN_UNCERTAINTY_PATTERNS, ...AR_UNCERTAINTY_PATTERNS].some((cue) =>
    cue.test(windowText)
  );
}

/**
 * Evaluates clinical concept status given a set of concept regexes.
 * Evaluates all occurrences in text.
 * Accurately handles:
 * - Affirmation (CONFIRMED_POSITIVE)
 * - Negation (CONFIRMED_NEGATIVE)
 * - Uncertainty / Conflicting statements (UNCERTAIN)
 * - Absence (ABSENT)
 */
export function evaluateClinicalConcept(
  text: string,
  regexes: RegExp[]
): ConceptEvaluation {
  const textLower = text.toLowerCase();
  let foundAffirmative = false;
  let foundNegated = false;
  let foundUncertain = false;
  let affirmativeSnippet: string | undefined = undefined;
  let negatedSnippet: string | undefined = undefined;

  for (const regex of regexes) {
    const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
    const globalRegex = new RegExp(regex.source, flags);
    let match: RegExpExecArray | null;

    while ((match = globalRegex.exec(textLower)) !== null) {
      const matchIdx = match.index;
      const matchedString = match[0];
      const negated = isMatchNegated(textLower, matchIdx, matchedString.length);
      const uncertain = isMatchUncertain(textLower, matchIdx);

      if (uncertain) {
        foundUncertain = true;
      }

      if (negated) {
        foundNegated = true;
        negatedSnippet = matchedString;
      } else {
        foundAffirmative = true;
        affirmativeSnippet = matchedString;
      }
    }
  }

  // Conflicting statements: if text BOTH affirms and negates the same concept
  // (e.g. "had trauma... wait actually no trauma"),
  // treat conservatively as UNCERTAIN according to PRD safety principles.
  if (foundAffirmative && foundNegated) {
    return {
      status: 'UNCERTAIN',
      evidenceSnippet: `Conflicting: (+)"${affirmativeSnippet}" vs (-)"${negatedSnippet}"`,
      isNegated: false,
      isAffirmative: true,
    };
  }

  if (foundAffirmative) {
    return {
      status: foundUncertain ? 'UNCERTAIN' : 'CONFIRMED_POSITIVE',
      evidenceSnippet: affirmativeSnippet,
      isNegated: false,
      isAffirmative: true,
    };
  }

  if (foundNegated) {
    return {
      status: 'CONFIRMED_NEGATIVE',
      evidenceSnippet: negatedSnippet,
      isNegated: true,
      isAffirmative: false,
    };
  }

  return {
    status: 'ABSENT',
    isNegated: false,
    isAffirmative: false,
  };
}
