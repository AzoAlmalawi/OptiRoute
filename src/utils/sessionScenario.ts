import { TriageSession, Language, DemoScenario } from '../types/triage';
import { DEMO_SCENARIOS } from '../data/scenarios';

/**
 * Resolves the originating DemoScenario for a triage session.
 * 
 * Strategy:
 * 1. Direct session.scenarioId match (most authoritative, persisted on modern sessions).
 * 2. Reliable existing metadata on older/legacy records:
 *    - Matching audio URL from patient voice message to scenario audio fixture URL.
 *    - Matching initial patient message text or transcript to scenario initial message.
 *    - Matching known seed session ID (e.g. SES-9421-KSA, SES-9418-KSA, SES-9405-KSA).
 * 3. Does NOT guess from symptoms alone. If not matching known metadata, returns null.
 */
export function resolveSessionScenario(
  session: TriageSession | null | undefined
): DemoScenario | null {
  if (!session) return null;

  // 1. Direct scenarioId match
  if (session.scenarioId) {
    const found = DEMO_SCENARIOS.find((s) => s.id === session.scenarioId);
    if (found) return found;
  }

  // 2. Known seed session ID match
  if (session.id === 'SES-9421-KSA') {
    const found = DEMO_SCENARIOS.find((s) => s.id === 'sc-2-chemical-splash');
    if (found) return found;
  }
  if (session.id === 'SES-9418-KSA') {
    const found = DEMO_SCENARIOS.find((s) => s.id === 'sc-4-same-day-urgent');
    if (found) return found;
  }
  if (session.id === 'SES-9405-KSA') {
    const found = DEMO_SCENARIOS.find((s) => s.id === 'sc-5-non-urgent');
    if (found) return found;
  }

  // 3. Inspect messages for reliable audio URL or verbatim scenario initial message fixture
  if (Array.isArray(session.messages)) {
    const firstPatientMsg = session.messages.find((m) => m.sender === 'patient');

    if (firstPatientMsg) {
      // 3a. Audio URL match
      if (firstPatientMsg.audioUrl) {
        const audioUrl = firstPatientMsg.audioUrl;
        const matchedByAudio = DEMO_SCENARIOS.find((sc) => {
          return (
            (sc.audioUrlAr && audioUrl.includes(sc.audioUrlAr)) ||
            (sc.audioUrlEn && audioUrl.includes(sc.audioUrlEn)) ||
            (sc.id === 'sc-1-vision-loss' && audioUrl.includes('01-vision-change.mp3')) ||
            (sc.id === 'sc-2-chemical-splash' && audioUrl.includes('02-chemical-exposure.mp3')) ||
            (sc.id === 'sc-3-eye-trauma' && audioUrl.includes('03-eye-injury.mp3')) ||
            (sc.id === 'sc-4-same-day-urgent' && audioUrl.includes('04-contact-lens.mp3')) ||
            (sc.id === 'sc-5-non-urgent' && audioUrl.includes('05-dryness-itching.mp3')) ||
            (sc.id === 'sc-6-unclear-incomplete' && audioUrl.includes('06-unclear-symptoms.mp3'))
          );
        });
        if (matchedByAudio) return matchedByAudio;
      }

      // 3b. Exact or verbatim initial message text/transcript match
      const textToMatch = (firstPatientMsg.text || firstPatientMsg.transcript || '').trim();
      if (textToMatch) {
        const matchedByText = DEMO_SCENARIOS.find((sc) => {
          return (
            textToMatch === sc.initialMessageAr.trim() ||
            textToMatch === sc.initialMessageEn.trim() ||
            (sc.transcriptAr && textToMatch === sc.transcriptAr.trim()) ||
            (sc.transcriptEn && textToMatch === sc.transcriptEn.trim())
          );
        });
        if (matchedByText) return matchedByText;
      }
    }
  }

  return null;
}

export type CaseLabelKind = 'scenario' | 'free_text' | 'saved_conversation';

export interface CaseDisplayInfo {
  title: string;
  kind: CaseLabelKind;
  scenario?: DemoScenario;
}

/**
 * Returns the localized toolbar badge information for the current session.
 * - If from a demo scenario: localized scenario title (kind: 'scenario')
 * - If freshly created as free-text conversation: "Custom simulated chat" / "محادثة حرة افتراضية" (kind: 'free_text')
 * - If an older restored session whose origin cannot be determined: "Saved conversation" / "محادثة محفوظة" (kind: 'saved_conversation')
 */
export function getSessionCaseDisplay(
  session: TriageSession | null | undefined,
  language: Language,
  queuedScenario?: DemoScenario | null
): CaseDisplayInfo {
  if (queuedScenario) {
    return {
      title: language === 'ar' ? queuedScenario.titleAr : queuedScenario.titleEn,
      kind: 'scenario',
      scenario: queuedScenario,
    };
  }

  const scenario = resolveSessionScenario(session);
  if (scenario) {
    return {
      title: language === 'ar' ? scenario.titleAr : scenario.titleEn,
      kind: 'scenario',
      scenario,
    };
  }

  // Session has no scenario identity
  // If session is an older saved/restored session (has patient messages or events beyond initial blank session)
  // but origin cannot be determined, return neutral "Saved conversation" / "محادثة محفوظة"
  const hasPatientActivity =
    Boolean(session) &&
    ((session?.messages?.some((m) => m.sender === 'patient')) ||
      (session?.events && session.events.length > 2) ||
      session?.status === 'COMPLETED' ||
      session?.isLegacyRecord);

  if (hasPatientActivity) {
    return {
      title: language === 'ar' ? 'محادثة محفوظة' : 'Saved conversation',
      kind: 'saved_conversation',
    };
  }

  // Pure new free-text session
  return {
    title: language === 'ar' ? 'محادثة حرة افتراضية' : 'Custom simulated chat',
    kind: 'free_text',
  };
}
