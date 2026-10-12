import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WhatsAppSimulator } from './components/PatientSimulator/WhatsAppSimulator';
import { ScenarioSelector } from './components/PatientSimulator/ScenarioSelector';
import { SessionProgressPanel } from './components/PatientSimulator/SessionProgressPanel';
import { DashboardView } from './components/HospitalDashboard/DashboardView';
import { SafetyAuditModal } from './components/HospitalDashboard/SafetyAuditModal';
import { RoadmapModal } from './components/HospitalDashboard/RoadmapModal';
import { orchestrator } from './services/triageOrchestrator';
import { SESSIONS_UPDATE_EVENT } from './services/providers';
import { TriageSession, Language, DemoScenario, QuickReplyOption, StructuredSymptoms } from './types/triage';
import { DEMO_SCENARIOS } from './data/scenarios';
import { getSessionCaseDisplay } from './utils/sessionScenario';
import { ChevronDown, ChevronUp, Layers, Activity, Sparkles, HelpCircle, RotateCcw } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('optiroute_language_preference');
      if (saved === 'ar' || saved === 'en') {
        return saved;
      }
    }
    return 'en'; // Default to English on a first visit
  });
  const [currentTab, setCurrentTab] = useState<'simulator' | 'dashboard' | 'safety'>('simulator');
  const [currentSession, setCurrentSession] = useState<TriageSession | null>(null);
  const [allSessions, setAllSessions] = useState<TriageSession[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Riyadh');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>(undefined);
  const [queuedScenario, setQueuedScenario] = useState<DemoScenario | null>(null);
  const [isAutoPlayback, setIsAutoPlayback] = useState(false);
  const [isAutoPaused, setIsAutoPaused] = useState(false);
  const [queuedAutoPlay, setQueuedAutoPlay] = useState(false);

  // Collapsible panels state for demo cases and decision inspection drawer
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [decisionDrawerOpen, setDecisionDrawerOpen] = useState(false);
  const [inspectedDashboardSessionId, setInspectedDashboardSessionId] = useState<string | null>(null);

  // Sync HTML dir and lang attributes
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Load all sessions from repository
  const loadSessions = useCallback(async () => {
    const list = await orchestrator.repository.getAllSessions();
    setAllSessions(list);
  }, []);

  // Helper to sync active session to state and localStorage
  const updateActiveSession = (session: TriageSession | null) => {
    setCurrentSession(session);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      if (session) {
        localStorage.setItem('optiroute_active_session_id', session.id);
      } else {
        localStorage.removeItem('optiroute_active_session_id');
      }
    }
  };

  // Initialize fresh demo session ONCE on startup/reload
  useEffect(() => {
    const init = async () => {
      await loadSessions();
      // On initial page load or reload, always start a brand new demo session at consent stage
      const newSession = await orchestrator.createNewSession(language, false);
      setCurrentSession(newSession);
      setActiveScenarioId(undefined);
      setQueuedScenario(null);
      setScenariosOpen(false);
      setDecisionDrawerOpen(false);
      // Clean up any stale active session ID pointer from older versions
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('optiroute_active_session_id');
      }
    };
    init();

    // Listen for cross-view updates
    const handleUpdate = () => {
      loadSessions();
    };
    window.addEventListener(SESSIONS_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(SESSIONS_UPDATE_EVENT, handleUpdate);
  }, [loadSessions]);

  // Handle switching language: PRESERVES current session and historical messages
  const handleToggleLanguage = () => {
    const nextLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(nextLang);
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('optiroute_language_preference', nextLang);
    }

    // If there is an active session at the initial consent stage, update its consent notice text
    // and session language immediately without altering historical completed sessions or resetting state.
    if (currentSession) {
      const welcomeText =
        nextLang === 'ar'
          ? 'مرحبًا بك في OptiRoute. نساعدك على معرفة مدى استعجال أعراض العين والجهة المناسبة للتوجه إليها.\n\n⚠️ إشعار هام: هذه تجربة لحالات افتراضية، وليست تشخيصًا طبيًا ولا تقدم وصفات علاجية. في حالات الطوارئ القصوى، اتصل فورًا بالهلال الأحمر (997) أو توجه لأقرب مستشفى.'
          : 'Welcome to OptiRoute. We help you understand the urgency of your eye symptoms and guide you to the appropriate facility.\n\n⚠️ Important Notice: This is a prototype for simulated cases only, not a medical diagnosis or treatment prescription. In emergencies, call 997 or go to the nearest hospital immediately.';

      const updatedMessages = currentSession.messages.map((m) => {
        if (m.type === 'consent' || m.id.includes('welcome')) {
          return {
            ...m,
            text: welcomeText,
          };
        }
        return m;
      });

      setCurrentSession({
        ...currentSession,
        language: nextLang,
        messages: updatedMessages,
      });
    }
  };

  // Handle patient message
  const handleSendMessage = async (
    text: string,
    isVoice?: boolean,
    voiceDuration?: number,
    sessionOverride?: TriageSession,
    cityOverride?: string,
    quickReply?: QuickReplyOption,
    parentMessageId?: string,
    audioUrl?: string,
    audioLanguage?: Language
  ) => {
    const sessionToUse = sessionOverride || currentSession;
    if (!sessionToUse) return;
    setIsProcessing(true);
    try {
      const updated = await orchestrator.processPatientMessage(sessionToUse, {
        text,
        isVoice,
        voiceDuration,
        userCity: cityOverride || selectedCity,
        quickReply,
        parentMessageId,
        audioUrl,
        audioLanguage,
      });
      updateActiveSession(updated);
      await loadSessions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle explicit consent action from user (REQUIRED before processing any symptoms)
  const handleConsent = async (granted: boolean) => {
    if (!currentSession) return;
    setIsProcessing(true);
    try {
      const updated = await orchestrator.handleConsent(currentSession, granted);
      updateActiveSession(updated);

      if (!granted) {
        setQueuedScenario(null);
      }

      // If user accepted consent and had queued a scenario, process only the newly selected scenario
      if (granted && queuedScenario) {
        const scenarioToRun = queuedScenario;
        const willAutoPlay = queuedAutoPlay;
        setQueuedScenario(null);
        setQueuedAutoPlay(false);
        setIsAutoPlayback(willAutoPlay);
        setIsAutoPaused(false);

        const cityToUse = scenarioToRun.locationCity || selectedCity;
        if (scenarioToRun.locationCity) {
          setSelectedCity(scenarioToRun.locationCity);
        }
        const msgText =
          language === 'ar' ? scenarioToRun.initialMessageAr : scenarioToRun.initialMessageEn;
        const audioUrl =
          language === 'ar' ? scenarioToRun.audioUrlAr : scenarioToRun.audioUrlEn;

        await handleSendMessage(
          msgText,
          scenarioToRun.isVoiceSample,
          scenarioToRun.voiceDurationSeconds,
          updated,
          cityToUse,
          undefined,
          undefined,
          audioUrl,
          language
        );
      } else if (!granted) {
        setIsAutoPlayback(false);
        setIsAutoPaused(false);
        setQueuedAutoPlay(false);
      }
      await loadSessions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle selecting a synthetic demo scenario:
  const handleSelectScenario = async (scenario: DemoScenario, autoPlay: boolean = false) => {
    setIsProcessing(true);
    try {
      const freshSession = await orchestrator.createNewSession(language, false, scenario.id);
      updateActiveSession(freshSession);

      setActiveScenarioId(scenario.id);
      setQueuedScenario(scenario);
      setQueuedAutoPlay(autoPlay);
      setIsAutoPlayback(false);
      setIsAutoPaused(false);

      if (scenario.locationCity) {
        setSelectedCity(scenario.locationCity);
      }

      await loadSessions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle resetting patient session (preserves existing dashboard sessions)
  const handleResetSession = async () => {
    setActiveScenarioId(undefined);
    setQueuedScenario(null);
    setQueuedAutoPlay(false);
    setIsAutoPlayback(false);
    setIsAutoPaused(false);
    setDecisionDrawerOpen(false);
    setIsProcessing(true);
    try {
      const fresh = await orchestrator.createNewSession(language, false);
      updateActiveSession(fresh);
      await loadSessions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset to initial seed sessions (triggered after user confirms in Dashboard modal)
  const handleResetToSeed = async () => {
    setIsProcessing(true);
    try {
      const { generateSeedSessions } = await import('./data/seedSessions');
      const freshSeeds = generateSeedSessions(new Date());
      await orchestrator.repository.resetToSeed(freshSeeds);
      await loadSessions();
      const fresh = await orchestrator.createNewSession(language, false);
      updateActiveSession(fresh);
      setActiveScenarioId(undefined);
      setQueuedScenario(null);
      setDecisionDrawerOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle symptom field correction from the answer summary
  const handleCorrectField = async (
    field: keyof StructuredSymptoms,
    value: unknown,
    labelAr: string,
    labelEn: string
  ) => {
    if (!currentSession || isProcessing) return;
    setIsProcessing(true);
    try {
      const updated = await orchestrator.correctSymptomField(
        currentSession,
        field,
        value,
        labelAr,
        labelEn,
        selectedCity
      );
      updateActiveSession(updated);
      await loadSessions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Submit clinician review
  const handleSubmitReview = async (
    sessionId: string,
    review: {
      reviewerName: string;
      feedback: 'CORRECT' | 'OVER_TRIAGED' | 'UNDER_TRIAGED';
      notes: string;
      isFlagged: boolean;
    }
  ) => {
    await orchestrator.submitClinicianReview(sessionId, review);
    await loadSessions();
    if (currentSession && currentSession.id === sessionId) {
      const updated = await orchestrator.repository.getSession(sessionId);
      if (updated) updateActiveSession(updated);
    }
  };

  const caseDisplay = getSessionCaseDisplay(currentSession, language, queuedScenario);
  const activeCaseTitle = caseDisplay.title;

  const hasAnalysisDetails = Boolean(
    currentSession &&
      (currentSession.decision ||
        currentSession.status === 'FOLLOW_UP' ||
        currentSession.status === 'COMPLETED' ||
        (currentSession.events &&
          currentSession.events.some((e) =>
            ['SYMPTOM_EXTRACTION', 'RULE_EVALUATION', 'MODEL_CLASSIFICATION', 'URGENCY_RESOLVED'].includes(e.type)
          )))
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900 w-full max-w-full overflow-x-hidden">
      {/* Top Navigation Bar */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        language={language}
        onLanguageToggle={handleToggleLanguage}
        onOpenRoadmap={() => setShowRoadmap(true)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2 py-2 sm:px-4 sm:py-3 md:py-3.5 min-w-0 overflow-x-hidden">
        {currentTab === 'simulator' && (
          <div className="space-y-2.5 sm:space-y-3 w-full max-w-full min-w-0">
            {/* Top Scenario Banner & Actions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-2.5 sm:p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-500 shrink-0">
                  {language === 'ar' ? 'الحالة الحالية:' : 'Current Case:'}
                </span>
                {caseDisplay.kind === 'scenario' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 truncate max-w-full">
                    <span className="text-teal-700">📌</span>
                    <span className="truncate">{activeCaseTitle}</span>
                  </span>
                ) : caseDisplay.kind === 'saved_conversation' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    <span className="text-slate-500">📁</span>
                    <span>{activeCaseTitle}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    <span className="text-teal-700">💬</span>
                    <span>{activeCaseTitle}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end transition-all duration-150">
                {/* PRIMARY ACTION: Try a demo case */}
                <button
                  type="button"
                  onClick={() => setScenariosOpen(!scenariosOpen)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs cursor-pointer ${
                    scenariosOpen
                      ? 'bg-teal-800 text-white border-teal-900 ring-2 ring-teal-600/30'
                      : 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800'
                  }`}
                  aria-expanded={scenariosOpen}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'جرّب حالة افتراضية' : 'Try a demo case'}</span>
                  {scenariosOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* SECONDARY ACTION 1: Decision details (visible once analysis details are available) */}
                {hasAnalysisDetails && (
                  <button
                    type="button"
                    onClick={() => setDecisionDrawerOpen(!decisionDrawerOpen)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border cursor-pointer animate-fadeIn ${
                      decisionDrawerOpen
                        ? 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                    aria-expanded={decisionDrawerOpen}
                    title={language === 'ar' ? 'كيف اتُّخذ القرار؟ (تفاصيل محرك القواعد)' : 'How was this decision made? (Rule engine details)'}
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                    <span>{language === 'ar' ? 'تفاصيل القرار' : 'Decision details'}</span>
                    {decisionDrawerOpen ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                {/* SECONDARY ACTION 2: Start a new demo */}
                <button
                  type="button"
                  onClick={handleResetSession}
                  disabled={isProcessing}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  title={language === 'ar' ? 'بدء تجربة جديدة مع حفظ السابقة' : 'Start a new demo (preserves previous)'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>{language === 'ar' ? 'بدء تجربة جديدة' : 'New demo'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Panel 1: Try a demo case (6 Scenarios) */}
            {scenariosOpen && (
              <div className="bg-white rounded-2xl border-2 border-teal-200 shadow-md p-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      {language === 'ar' ? 'اختر حالة افتراضية لتجربتها' : 'Select a demo scenario to try'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setScenariosOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    {language === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
                <ScenarioSelector
                  language={language}
                  onSelectScenario={(sc, autoPlay) => {
                    handleSelectScenario(sc, autoPlay);
                    setScenariosOpen(false); // Collapses immediately after selection
                  }}
                  activeScenarioId={activeScenarioId}
                  queuedScenarioId={queuedScenario?.id}
                  consentGiven={currentSession?.consentGiven}
                  disabled={isProcessing}
                />
              </div>
            )}

            {/* Collapsible Panel 2: How was this decision made? (Live progress & safety rules) */}
            {decisionDrawerOpen && hasAnalysisDetails && (
              <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-lg p-4 animate-fadeIn">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-700" />
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      {language === 'ar'
                        ? 'كيف اتُّخذ القرار؟ (تفاصيل محرك القواعد ونموذج الفرز)'
                        : 'How was this decision made? (Rule Engine & Triage details)'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setDecisionDrawerOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    {language === 'ar' ? 'إغلاق' : 'Close'}
                  </button>
                </div>
                <SessionProgressPanel
                  session={currentSession}
                  language={language}
                />
              </div>
            )}

            {/* Main Chat Content Area: Centered, Focused, and Generous Width */}
            <div className="w-full flex justify-center min-w-0">
              <div className="w-full max-w-2xl min-w-0">
                {currentSession && (
                  <WhatsAppSimulator
                    session={currentSession}
                    language={language}
                    onSendMessage={handleSendMessage}
                    onConsent={handleConsent}
                    onResetSession={handleResetSession}
                    selectedCity={selectedCity}
                    onSelectCity={setSelectedCity}
                    isLoading={isProcessing}
                    queuedScenarioTitle={
                      caseDisplay.kind === 'scenario' ? caseDisplay.title : undefined
                    }
                    onCorrectField={handleCorrectField}
                    onViewCaseInDashboard={(sessionId) => {
                      setInspectedDashboardSessionId(sessionId);
                      setCurrentTab('dashboard');
                    }}
                    isAutoPlayback={isAutoPlayback}
                    isAutoPaused={isAutoPaused}
                    onToggleAutoPause={() => setIsAutoPaused((prev) => !prev)}
                    onPauseAutoPlayback={() => setIsAutoPaused(true)}
                    onResumeAutoPlayback={() => setIsAutoPaused(false)}
                    onStopAutoPlayback={() => {
                      setIsAutoPlayback(false);
                      setIsAutoPaused(false);
                    }}
                  />
                )}
              </div>
            </div>

            {/* Subtle mobile note for supporting panels (preserves clean mobile layout) */}
            <div className="lg:hidden text-center text-[11px] text-slate-400">
              {language === 'ar'
                ? 'يمكنك تبديل السيناريوهات أو استعراض أسباب القرار من الأزرار بالأعلى.'
                : 'You can change demo scenarios or inspect decision rationale using the top buttons.'}
            </div>
          </div>
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            sessions={allSessions}
            language={language}
            onRefreshSessions={loadSessions}
            onResetToSeed={handleResetToSeed}
            onSubmitReview={handleSubmitReview}
            onSwitchToSimulator={() => setCurrentTab('simulator')}
            initialInspectedSessionId={inspectedDashboardSessionId}
            onClearInitialInspectedSession={() => setInspectedDashboardSessionId(null)}
          />
        )}

        {currentTab === 'safety' && (
          <SafetyAuditModal language={language} />
        )}
      </main>

      {/* Roadmap & Architecture Modal */}
      {showRoadmap && (
        <RoadmapModal
          language={language}
          onClose={() => setShowRoadmap(false)}
        />
      )}

      {/* Discreet Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-4 sm:px-6 text-center text-xs text-slate-500 w-full max-w-full overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700" dir="ltr">OptiRoute</span>
            <span>·</span>
            <span>{language === 'ar' ? 'الفرز البصري الذكي' : 'Smart Ophthalmic Triage'}</span>
          </div>

          <div className="text-[11px] text-slate-400">
            {language === 'ar'
              ? 'النموذج التجريبي للاسترشاد الأولي والمحاكاة السريرية فقط'
              : 'Demonstration prototype for simulated ophthalmic triage only'}
          </div>
        </div>
      </footer>
    </div>
  );
}
