import React from 'react';
import { DemoScenario, Language } from '../../types/triage';
import { DEMO_SCENARIOS } from '../../data/scenarios';
import { Mic, Play } from 'lucide-react';

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
  disabled,
}) => {
  return (
    <div className="bg-[#F5F7FA] rounded-xl border border-slate-200 p-3 sm:p-4">
      <div className="mb-3 text-left rtl:text-right">
        <p className="text-xs text-slate-600">
          {language === 'ar'
            ? 'اختر إحدى الحالات الواقعية لبدء تجربة المحاكاة. يلزم تأكيد الموافقة قبل معالجة الأعراض.'
            : 'Select a clinical case to try the simulation. Explicit consent is requested before processing symptoms.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEMO_SCENARIOS.map((sc) => {
          const isSelected = activeScenarioId === sc.id || queuedScenarioId === sc.id;

          return (
            <div
              key={sc.id}
              className={`p-3.5 rounded-xl border transition-all text-left rtl:text-right flex flex-col justify-between h-full ${
                isSelected
                  ? 'border-[#087F8C] bg-white ring-2 ring-[#087F8C]/20 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-[#087F8C]/50 hover:shadow-xs'
              }`}
            >
              <div className="flex-1 flex flex-col">
                <h3 className="font-semibold text-xs sm:text-sm text-[#172B3A] line-clamp-1">
                  {language === 'ar' ? sc.titleAr : sc.titleEn}
                </h3>

                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed min-h-[2.5rem]">
                  {language === 'ar' ? sc.descriptionAr : sc.descriptionEn}
                </p>

                <div className="mt-auto pt-2.5 flex items-center gap-1.5 text-[11px] text-[#087F8C] font-medium">
                  <Mic className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {language === 'ar' ? 'تسجيل تجريبي جاهز' : 'Prepared demo audio'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectScenario(sc)}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#087F8C] hover:bg-[#066670] active:bg-[#055159] text-white transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
              >
                <Play className="w-3 h-3 fill-current" />
                <span>{language === 'ar' ? 'ابدأ التجربة' : 'Start demo'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
