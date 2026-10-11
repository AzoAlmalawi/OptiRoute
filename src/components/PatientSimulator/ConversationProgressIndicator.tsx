import React from 'react';
import { TriageSession, Language } from '../../types/triage';
import { Check, Minus } from 'lucide-react';

export type StageStatus = 'completed' | 'current' | 'upcoming' | 'skipped';

export interface ConversationStage {
  id: 'consent' | 'symptoms' | 'followup' | 'result';
  labelAr: string;
  labelEn: string;
  status: StageStatus;
}

/**
 * Derives conversation progress stages from actual session state.
 *
 * Requirements:
 * - Completed, current, and upcoming stages clearly distinguished.
 * - If an emergency result is produced immediately without follow-up questions,
 *   moves directly to Result and marks Follow-up as 'skipped', NOT completed.
 * - No invented percentages or clinical certainty claims.
 * - Resets to Consent when starting a new session.
 */
export function computeConversationStages(session: TriageSession): ConversationStage[] {
  const isConsentGiven = session.consentGiven === true;
  const status = session.status;

  // Did this session actually conduct follow-up questions?
  const hadFollowUp =
    (session.followUpCount ?? 0) > 0 ||
    session.events?.some((e) => e.type === 'FOLLOW_UP_ASKED') ||
    session.messages.some(
      (m) =>
        m.sender === 'bot' &&
        m.quickReplies &&
        m.quickReplies.length > 0 &&
        m.type !== 'consent'
    );

  let consentStatus: StageStatus = 'upcoming';
  let symptomsStatus: StageStatus = 'upcoming';
  let followupStatus: StageStatus = 'upcoming';
  let resultStatus: StageStatus = 'upcoming';

  if (!isConsentGiven || status === 'AWAITING_CONSENT') {
    consentStatus = 'current';
    symptomsStatus = 'upcoming';
    followupStatus = 'upcoming';
    resultStatus = 'upcoming';
  } else if (status === 'IN_TRIAGE') {
    consentStatus = 'completed';
    symptomsStatus = 'current';
    followupStatus = 'upcoming';
    resultStatus = 'upcoming';
  } else if (status === 'FOLLOW_UP') {
    consentStatus = 'completed';
    symptomsStatus = 'completed';
    followupStatus = 'current';
    resultStatus = 'upcoming';
  } else if (status === 'COMPLETED') {
    consentStatus = 'completed';
    symptomsStatus = 'completed';
    if (hadFollowUp) {
      followupStatus = 'completed';
    } else {
      // Immediate emergency / direct assessment produced without follow-up questions
      followupStatus = 'skipped';
    }
    resultStatus = 'current';
  } else {
    consentStatus = isConsentGiven ? 'completed' : 'current';
    symptomsStatus = 'current';
    followupStatus = 'upcoming';
    resultStatus = 'upcoming';
  }

  return [
    { id: 'consent', labelAr: 'الموافقة', labelEn: 'Consent', status: consentStatus },
    { id: 'symptoms', labelAr: 'وصف الأعراض', labelEn: 'Symptoms', status: symptomsStatus },
    { id: 'followup', labelAr: 'أسئلة المتابعة', labelEn: 'Follow-up', status: followupStatus },
    { id: 'result', labelAr: 'النتيجة', labelEn: 'Result', status: resultStatus },
  ];
}

interface ConversationProgressIndicatorProps {
  session: TriageSession;
  language: Language;
}

export const ConversationProgressIndicator: React.FC<ConversationProgressIndicatorProps> = ({
  session,
  language,
}) => {
  const stages = computeConversationStages(session);

  return (
    <div
      role="region"
      aria-label={language === 'ar' ? 'مؤشر مراحل المحادثة' : 'Conversation Progress Indicator'}
      className="bg-white border-b border-slate-200/80 px-2.5 sm:px-3 py-1.5 select-none shrink-0 z-10 shadow-2xs"
    >
      <div
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        className="flex items-center justify-between gap-1 w-full max-w-full overflow-x-auto no-scrollbar"
      >
        {stages.map((stage, idx) => {
          const isCompleted = stage.status === 'completed';
          const isCurrent = stage.status === 'current';
          const isSkipped = stage.status === 'skipped';
          const isUpcoming = stage.status === 'upcoming';
          const isLast = idx === stages.length - 1;

          return (
            <React.Fragment key={stage.id}>
              {/* Stage Capsule (Non-clickable indicator) */}
              <div
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] whitespace-nowrap transition-colors shrink-0 ${
                  isCurrent
                    ? 'bg-white text-teal-950 font-bold border border-teal-600 shadow-2xs ring-1 ring-teal-600/20'
                    : isCompleted
                    ? 'bg-teal-50 text-teal-800 font-semibold border border-teal-200/80'
                    : isSkipped
                    ? 'bg-slate-100 text-slate-500 font-normal border border-dashed border-slate-300'
                    : 'bg-slate-50/70 text-slate-400 font-normal border border-slate-200/50'
                }`}
                title={
                  isSkipped
                    ? language === 'ar'
                      ? `${stage.labelAr} (تم التجاوز لحالة طارئة مباشرة)`
                      : `${stage.labelEn} (Skipped for immediate emergency)`
                    : isCurrent
                    ? language === 'ar'
                      ? `${stage.labelAr} (المرحلة الحالية)`
                      : `${stage.labelEn} (Current stage)`
                    : isCompleted
                    ? language === 'ar'
                      ? `${stage.labelAr} (مكتملة)`
                      : `${stage.labelEn} (Completed)`
                    : language === 'ar'
                    ? `${stage.labelAr} (قادمة)`
                    : `${stage.labelEn} (Upcoming)`
                }
              >
                {/* State marker icon/dot */}
                {isCompleted && (
                  <Check
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-600 shrink-0"
                    strokeWidth={2.5}
                  />
                )}
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                )}
                {isSkipped && (
                  <Minus className="w-2.5 h-2.5 text-slate-400 shrink-0" strokeWidth={2} />
                )}
                {isUpcoming && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                )}

                {/* Stage Label */}
                <span
                  className={
                    isSkipped ? 'line-through decoration-slate-300 text-slate-500' : undefined
                  }
                >
                  {language === 'ar' ? stage.labelAr : stage.labelEn}
                </span>

                {/* Explicit Skipped Badge */}
                {isSkipped && (
                  <span className="text-[8px] sm:text-[9px] px-1 py-0.2 bg-slate-200 text-slate-600 rounded font-normal leading-none shrink-0">
                    {language === 'ar' ? 'تجاوز' : 'Skipped'}
                  </span>
                )}
              </div>

              {/* Directional Connector Arrow between stages */}
              {!isLast && (
                <span
                  aria-hidden="true"
                  className={`text-[10px] sm:text-xs shrink-0 select-none px-0.5 font-mono ${
                    isCompleted ? 'text-teal-600' : 'text-slate-300'
                  }`}
                >
                  {language === 'ar' ? '←' : '→'}
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
