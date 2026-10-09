import React from 'react';
import { DemoScenario, Language } from '../../types/triage';
import { DEMO_SCENARIOS } from '../../data/scenarios';
import { PlayCircle, AlertTriangle, ShieldCheck, HelpCircle, Clock } from 'lucide-react';

interface ScenarioSelectorProps {
  language: Language;
  onSelectScenario: (scenario: DemoScenario) => void;
  activeScenarioId?: string;
  queuedScenarioId?: string;
  consentGiven?: boolean;
  disabled?: boolean;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  language,
  onSelectScenario,
  activeScenarioId,
  queuedScenarioId,
  consentGiven = false,
  disabled,
}) => {
  const getBadgeStyle = (category: string) => {
    switch (category) {
      case 'EMERGENCY':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'URGENT':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'NON_URGENT':
        return 'text-teal-700 bg-teal-50 border-teal-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'EMERGENCY':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
      case 'URGENT':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
      case 'NON_URGENT':
        return <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col h-full">
      <div className="border-b border-slate-100 pb-3 mb-3">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center justify-between">
          <span>{language === 'ar' ? 'السيناريوهات التجريبية الجاهزة' : 'Preconfigured Synthetic Scenarios'}</span>
          <span className="text-[11px] font-normal text-slate-500">
            {language === 'ar' ? '6 حالات افتراضية' : '6 Synthetic Cases'}
          </span>
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {language === 'ar'
            ? 'انقر لتجهيز السيناريو. تتطلب كل حالة موافقة طبية صريحة قبل معالجة الأعراض.'
            : 'Select to queue a case. Explicit medical consent is required before processing symptoms.'}
        </p>
      </div>

      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[560px]">
        {DEMO_SCENARIOS.map((sc) => {
          const isSelected = activeScenarioId === sc.id || queuedScenarioId === sc.id;
          const isQueued = queuedScenarioId === sc.id && !consentGiven;

          return (
            <div
              key={sc.id}
              className={`p-3 rounded-lg border transition-all text-left rtl:text-right ${
                isQueued
                  ? 'border-amber-400 bg-amber-50/50 ring-1 ring-amber-300'
                  : isSelected
                  ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-semibold text-xs text-slate-900 line-clamp-1">
                  {language === 'ar' ? sc.titleAr : sc.titleEn}
                </span>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded border inline-flex items-center gap-1 shrink-0 ${getBadgeStyle(
                    sc.category
                  )}`}
                >
                  {getCategoryIcon(sc.category)}
                  <span>{sc.expectedUrgency}</span>
                </span>
              </div>

              <p className="text-[11px] text-slate-600 mb-2 leading-relaxed line-clamp-2">
                {language === 'ar' ? sc.descriptionAr : sc.descriptionEn}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                <span className="text-[10px] text-slate-400">
                  {sc.isVoiceSample
                    ? language === 'ar'
                      ? '🎙️ عينة صوتية'
                      : '🎙️ Voice note'
                    : language === 'ar'
                    ? '💬 رسالة نصية'
                    : '💬 Text message'}
                </span>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectScenario(sc)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors disabled:opacity-40 ${
                    isQueued
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100'
                  }`}
                >
                  {isQueued ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-700 animate-spin" />
                      <span>{language === 'ar' ? 'جاهز (بانتظار الموافقة)' : 'Queued (Need Consent)'}</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>{language === 'ar' ? 'تجهيز الحالة' : 'Queue Case'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
