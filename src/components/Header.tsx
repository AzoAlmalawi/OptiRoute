import React from 'react';
import { ShieldAlert, BookOpen, Globe2, Activity } from 'lucide-react';
import { Language } from '../types/triage';
import { TRANSLATIONS } from '../data/translations';

interface HeaderProps {
  currentTab: 'simulator' | 'dashboard' | 'safety';
  onTabChange: (tab: 'simulator' | 'dashboard' | 'safety') => void;
  language: Language;
  onLanguageToggle: () => void;
  onOpenRoadmap: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  language,
  onLanguageToggle,
  onOpenRoadmap,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs w-full max-w-full overflow-hidden">
      {/* Persistent unobtrusive prototype banner */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1 px-3 text-center flex items-center justify-center gap-1.5 sm:gap-2 font-medium tracking-wide">
        <ShieldAlert className="w-3.5 h-3.5 text-teal-400 shrink-0" />
        <span className="truncate">{t.prototypeNotice}</span>
        <span className="text-slate-500 hidden sm:inline">|</span>
        <span className="text-slate-400 hidden sm:inline text-[11px]">
          {language === 'ar'
            ? 'نظام فرز تجريبي — لا يقدم تشخيصاً طبياً'
            : 'Simulated triage prototype — not a diagnostic tool'}
        </span>
      </div>

      {/* Top Bar Container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="h-14 md:h-16 flex items-center justify-between gap-2">
          {/* Zone 1: Brand Zone - Single text element wordmark */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onTabChange('simulator')}
              className="text-left font-bold text-base sm:text-xl tracking-tight text-slate-950 flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity"
            >
              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-xs">
                O
              </span>
              <span className="truncate" dir="ltr">{t.appTitle}</span>
            </button>
          </div>

          {/* Zone 2: Desktop Navigation Links (hidden on mobile, rendered below on small screens) */}
          <nav className="hidden md:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onTabChange('simulator')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'simulator'
                  ? 'bg-slate-100 text-slate-950 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.patientSimulatorTab}
            </button>

            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-slate-100 text-slate-950 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {t.hospitalDashboardTab}
            </button>

            <button
              onClick={() => onTabChange('safety')}
              className={`inline-flex px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                currentTab === 'safety'
                  ? 'bg-slate-100 text-slate-950 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Activity className="w-3.5 h-3.5 mr-1 ml-1 text-slate-500" />
              <span>{language === 'ar' ? 'معايير الأمان' : 'Safety Protocols'}</span>
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={onOpenRoadmap}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs whitespace-nowrap"
              title={language === 'ar' ? 'عن النموذج والخطة المستقبلية' : 'About the Prototype & Future Plan'}
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">{t.roadmapBtn}</span>
            </button>

            <button
              onClick={onLanguageToggle}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              aria-label="Toggle language"
            >
              <Globe2 className="w-3.5 h-3.5 text-slate-600" />
              <span>{t.langToggle}</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs (visible on mobile only, clean 100% width segmented bar) */}
        <div className="md:hidden pb-2 pt-0.5 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onTabChange('simulator')}
              className={`py-1.5 text-[11px] font-medium rounded-md transition-colors text-center truncate ${
                currentTab === 'simulator'
                  ? 'bg-white text-slate-950 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'المحاكي' : 'Simulator'}
            </button>

            <button
              onClick={() => onTabChange('dashboard')}
              className={`py-1.5 text-[11px] font-medium rounded-md transition-colors text-center truncate ${
                currentTab === 'dashboard'
                  ? 'bg-white text-slate-950 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
            </button>

            <button
              onClick={() => onTabChange('safety')}
              className={`py-1.5 text-[11px] font-medium rounded-md transition-colors text-center truncate ${
                currentTab === 'safety'
                  ? 'bg-white text-slate-950 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'ar' ? 'قواعد الأمان' : 'Safety'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
