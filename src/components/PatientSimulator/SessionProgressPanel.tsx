import React from 'react';
import { TriageSession, Language, TriState } from '../../types/triage';
import { ShieldAlert, Cpu, ArrowUpRight, CheckCircle2, XCircle, HelpCircle, Clock } from 'lucide-react';

interface SessionProgressPanelProps {
  session: TriageSession | null;
  language: Language;
}

export const SessionProgressPanel: React.FC<SessionProgressPanelProps> = ({
  session,
  language,
}) => {
  const renderTriStateBadge = (val: TriState, labelAr: string, labelEn: string) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{language === 'ar' ? labelAr : labelEn}</span>
          <span className="font-mono">(+)</span>
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          <XCircle className="w-3 h-3 text-slate-400" />
          <span>{language === 'ar' ? labelAr : labelEn}</span>
          <span className="font-mono">(-)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50/60 px-2 py-0.5 rounded border border-amber-200">
        <HelpCircle className="w-3 h-3 text-amber-500" />
        <span>{language === 'ar' ? labelAr : labelEn}</span>
        <span className="text-[10px] text-amber-600">
          ({language === 'ar' ? 'غير محدد' : 'Unknown'})
        </span>
      </span>
    );
  };

  if (!session) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex items-center justify-center text-center text-slate-400 text-xs">
        {language === 'ar' ? 'لا توجد جلسة نشطة' : 'No active session'}
      </div>
    );
  }

  const s = session.symptoms;
  const decision = session.decision;
  const isPending = session.status === 'FOLLOW_UP' || (decision && !decision.isFinalDecision);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col h-full space-y-4 text-left rtl:text-right">
      {/* Header */}
      <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
            {language === 'ar' ? 'المعالجة المباشرة ومحرك القواعد' : 'Live State & Safety Inspection'}
          </h2>
          <div className="text-[11px] text-slate-500 tabular-nums font-mono mt-0.5">
            {session.id} · {session.patientMaskedPhone}
          </div>
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
            session.status === 'COMPLETED'
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : session.status === 'FOLLOW_UP'
              ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-slate-600 bg-slate-50 border-slate-200'
          }`}
        >
          {isPending
            ? language === 'ar'
              ? 'بانتظار استكمال التقييم'
              : 'Assessment Pending'
            : session.status}
        </span>
      </div>

      {/* 1. Structured Symptom Fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <span>{language === 'ar' ? 'الحقول المستخلصة (تمييز النفي)' : 'Extracted Symptoms (Negation-aware)'}</span>
          </span>
          <span className="text-[10px] text-slate-400">
            {language === 'ar' ? 'قيم موجبة / سالبة / غير محددة' : '(+) / (-) / (?)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ar' ? 'العين المصابة' : 'Affected Eye'}
            </span>
            <span className="font-semibold text-slate-800 text-[11px] capitalize">
              {s.eye}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ar' ? 'بداية الأعراض' : 'Onset Speed'}
            </span>
            <span className="font-semibold text-slate-800 text-[11px] capitalize">
              {s.onset}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ar' ? 'تغير الرؤية' : 'Vision Change'}
            </span>
            <span className="font-semibold text-slate-800 text-[11px] capitalize">
              {s.vision_change}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">
              {language === 'ar' ? 'مستوى الألم' : 'Pain Level'}
            </span>
            <span className="font-semibold text-slate-800 text-[11px] capitalize">
              {s.pain_level}
            </span>
          </div>
        </div>

        {/* Tri-state badges */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {renderTriStateBadge(s.chemical_exposure, 'مادة كيميائية', 'Chemicals')}
          {renderTriStateBadge(s.trauma, 'إصابة/جسم غريب', 'Trauma')}
          {renderTriStateBadge(s.contact_lens, 'عدسات لاصقة', 'Contact Lens')}
          {renderTriStateBadge(s.light_sensitivity, 'حساسية ضوء', 'Photophobia')}
          {renderTriStateBadge(s.redness, 'احمرار', 'Redness')}
          {renderTriStateBadge(s.nausea_vomiting, 'غثيان/قيء', 'Nausea')}
        </div>
      </div>

      {/* 2. Safety Rule Engine State */}
      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-teal-700" />
            <span>{language === 'ar' ? 'محرك القواعد (مسودة غير معتمدة)' : 'Safety Rule Engine (Draft)'}</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {session.metadata.ruleVersion}
          </span>
        </div>

        {decision ? (
          <div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-600">
                {language === 'ar' ? 'الدرجة المقررة بالقواعد:' : 'Rule Urgency:'}
              </span>
              <span className="font-bold text-slate-900">
                {decision.ruleResult.ruleUrgency}
              </span>
            </div>

            {decision.ruleResult.matchedFlags.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                <span className="text-[10px] text-rose-700 font-semibold block mb-1">
                  🚨 {language === 'ar' ? 'العلامات الحمراء المرصودة:' : 'Matched Red Flags:'}
                </span>
                <div className="space-y-1">
                  {decision.ruleResult.matchedFlags.map((flag) => (
                    <div
                      key={flag.id}
                      className="text-[10px] text-rose-900 bg-rose-50 border border-rose-200 p-1 rounded font-medium"
                    >
                      <span className="font-bold">{flag.id}:</span> {language === 'ar' ? flag.titleAr : flag.titleEn}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic">
            {language === 'ar' ? 'بانتظار تفاصيل الحالة للتقييم' : 'Waiting for symptoms'}
          </div>
        )}
      </div>

      {/* 3. Model Classifier Suggestion (Honestly Labeled) */}
      <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-600" />
            <span>{language === 'ar' ? 'مصنف افتراضي تجريبي (محاكاة)' : 'Simulated Classifier Fixture'}</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            {session.metadata.modelAdapterVersion}
          </span>
        </div>

        {decision?.modelSuggestion ? (
          <div className="text-[11px] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                {language === 'ar' ? 'اقتراح المصنف الافتراضي:' : 'Suggested Urgency:'}
              </span>
              <span className="font-bold text-slate-900">
                {decision.modelSuggestion.urgency}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">
                {language === 'ar' ? 'درجة الثقة الافتراضية:' : 'Simulated Score:'}
              </span>
              <span className="font-mono text-slate-700 text-[10px]">
                ~{Math.round(decision.modelSuggestion.confidence * 100)}% ({language === 'ar' ? 'عينة افتراضية — غير مقاسة سريرياً' : 'fixture placeholder — not measured'})
              </span>
            </div>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 italic">
            {language === 'ar' ? 'لم يتم استدعاء المصنف بعد' : 'Not yet classified'}
          </div>
        )}
      </div>

      {/* 4. Precedence Resolution Outcome / Provisional State */}
      {decision && (
        <div className="p-3 rounded-lg border border-teal-200 bg-teal-50/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-950 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5 text-teal-700" />
              <span>
                {isPending
                  ? language === 'ar'
                    ? 'التقييم المبدئي (قيد الاستكمال)'
                    : 'Provisional Assessment'
                  : language === 'ar'
                  ? 'القرار السريري النهائي'
                  : 'Resolved Final Urgency'}
              </span>
            </span>

            {isPending ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                <Clock className="w-3 h-3 text-amber-700 animate-spin" />
                <span>{language === 'ar' ? 'التقييم معلق' : 'Pending'}</span>
              </span>
            ) : (
              <span
                className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                  decision.finalUrgency === 'EMERGENCY'
                    ? 'bg-rose-600 text-white'
                    : decision.finalUrgency === 'URGENT'
                    ? 'bg-amber-600 text-white'
                    : 'bg-teal-700 text-white'
                }`}
              >
                {decision.finalUrgency}
              </span>
            )}
          </div>

          <p className="text-[11px] text-teal-900 leading-tight">
            <span className="font-semibold">{language === 'ar' ? 'المصدر: ' : 'Source: '}</span>
            {decision.decisionSource}
          </p>

          <p className="text-[10px] text-slate-500 pt-1 border-t border-teal-200/60">
            {language === 'ar'
              ? '🔒 مبدأ الأمان: لا يمكن خفض درجة الطوارئ. البيانات المجهولة تصعّد الاستعجال تحفظياً.'
              : '🔒 Safety Invariant: Emergency cannot be downgraded. Unknown data escalates conservatively.'}
          </p>
        </div>
      )}
    </div>
  );
};
