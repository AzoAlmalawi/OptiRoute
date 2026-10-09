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
import { TriageSession, Language, DemoScenario, QuickReplyOption } from './types/triage';
import { ChevronDown, ChevronUp, Layers, Activity } from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [currentTab, setCurrentTab] = useState<'simulator' | 'dashboard' | 'safety'>('simulator');
  const [currentSession, setCurrentSession] = useState<TriageSession | null>(null);
  const [allSessions, setAllSessions] = useState<TriageSession[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('Riyadh');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | undefined>(undefined);
  const [queuedScenario, setQueuedScenario] = useState<DemoScenario | null>(null);

  // Mobile collapsible sections state
  const [mobileScenariosOpen, setMobileScenariosOpen] = useState(false);
  const [mobileInspectionOpen, setMobileInspectionOpen] = useState(false);

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

  // Initialize fresh session ONCE on startup
  useEffect(() => {
    const init = async () => {
      await loadSessions();
      const newSession = await orchestrator.createNewSession('ar', false);
      setCurrentSession(newSession);
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
  };

  // Handle patient message
  const handleSendMessage = async (
    text: string,
    isVoice?: boolean,
    voiceDuration?: number,
    sessionOverride?: TriageSession,
    cityOverride?: string,
    quickReply?: QuickReplyOption,
    parentMessageId?: string
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
      });
      setCurrentSession(updated);
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
      setCurrentSession(updated);

      if (!granted) {
        setQueuedScenario(null);
      }

      // If user accepted consent and had queued a scenario, process only the newly selected scenario
      if (granted && queuedScenario) {
        const scenarioToRun = queuedScenario;
        setQueuedScenario(null);
        const cityToUse = scenarioToRun.locationCity || selectedCity;
        if (scenarioToRun.locationCity) {
          setSelectedCity(scenarioToRun.locationCity);
        }
        const msgText =
          language === 'ar' ? scenarioToRun.initialMessageAr : scenarioToRun.initialMessageEn;
        await handleSendMessage(
          msgText,
          scenarioToRun.isVoiceSample,
          scenarioToRun.voiceDurationSeconds,
          updated,
          cityToUse
        );
      }
      await loadSessions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle selecting a synthetic demo scenario:
  // Strictly isolates demo scenarios:
  // 1. Create a fresh session with a new ID
  // 2. Preserve previous sessions in the dashboard
  // 3. Reset symptoms to unknown, conversation history, follow-up count, rule findings, classifier output, urgency, and routing
  // 4. Queue the selected scenario and require explicit consent before processing it
  // 5. After consent, process only the newly selected scenario
  const handleSelectScenario = async (scenario: DemoScenario) => {
    setIsProcessing(true);
    try {
      // 1, 2, 3: Create a fresh session with a new ID and reset state
      // (saving the fresh session preserves all existing sessions in the repository)
      const freshSession = await orchestrator.createNewSession(language, true);
      setCurrentSession(freshSession);

      // 4: Queue the selected scenario and require explicit consent before processing it
      setActiveScenarioId(scenario.id);
      setQueuedScenario(scenario);
      if (scenario.locationCity) {
        setSelectedCity(scenario.locationCity);
      }

      // Sync sessions in state so dashboard keeps both previous and current sessions
      await loadSessions();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle resetting patient session (preserves existing dashboard sessions)
  const handleResetSession = async () => {
    setActiveScenarioId(undefined);
    setQueuedScenario(null);
    setIsProcessing(true);
    try {
      const fresh = await orchestrator.createNewSession(language, false);
      setCurrentSession(fresh);
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
      setCurrentSession(fresh);
      setActiveScenarioId(undefined);
      setQueuedScenario(null);
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
      if (updated) setCurrentSession(updated);
    }
  };

  const queuedTitle = queuedScenario
    ? language === 'ar'
      ? queuedScenario.titleAr
      : queuedScenario.titleEn
    : undefined;

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
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 min-w-0 overflow-x-hidden">
        {currentTab === 'simulator' && (
          <div className="space-y-4 w-full max-w-full min-w-0">
            {/* Desktop 3-Column Layout (Hidden on Mobile) */}
            <div className="hidden lg:grid lg:grid-cols-12 gap-6 items-start w-full max-w-full min-w-0">
              {/* Column 1: Synthetic Demo Scenario Selector */}
              <div className="lg:col-span-3 min-w-0">
                <ScenarioSelector
                  language={language}
                  onSelectScenario={handleSelectScenario}
                  activeScenarioId={activeScenarioId}
                  queuedScenarioId={queuedScenario?.id}
                  consentGiven={currentSession?.consentGiven}
                  disabled={isProcessing}
                />
              </div>

              {/* Column 2: Phone-Sized WhatsApp Simulator */}
              <div className="lg:col-span-5 flex justify-center min-w-0">
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
                    queuedScenarioTitle={queuedTitle}
                  />
                )}
              </div>

              {/* Column 3: Live Session Progress & Rule Enforcement Panel */}
              <div className="lg:col-span-4 min-w-0">
                <SessionProgressPanel
                  session={currentSession}
                  language={language}
                />
              </div>
            </div>

            {/* Mobile Responsive Layout: Prioritizes WhatsApp Conversation, with Collapsible Supporting Panels */}
            <div className="lg:hidden space-y-3 w-full max-w-full min-w-0">
              {/* Prioritized Phone-Sized WhatsApp Simulator */}
              <div className="w-full max-w-full min-w-0 flex justify-center">
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
                    queuedScenarioTitle={queuedTitle}
                  />
                )}
              </div>

              {/* Mobile Collapsible 1: Preconfigured Demo Scenarios */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden w-full max-w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileScenariosOpen(!mobileScenariosOpen)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left rtl:text-right transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-slate-900">
                      {language === 'ar'
                        ? '📋 السيناريوهات الافتراضية الجاهزة (6 حالات)'
                        : '📋 Synthetic Demo Scenarios (6 Cases)'}
                    </span>
                  </div>
                  {mobileScenariosOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {mobileScenariosOpen && (
                  <div className="p-3 border-t border-slate-200">
                    <ScenarioSelector
                      language={language}
                      onSelectScenario={(sc) => {
                        handleSelectScenario(sc);
                        setMobileScenariosOpen(false);
                      }}
                      activeScenarioId={activeScenarioId}
                      queuedScenarioId={queuedScenario?.id}
                      consentGiven={currentSession?.consentGiven}
                      disabled={isProcessing}
                    />
                  </div>
                )}
              </div>

              {/* Mobile Collapsible 2: Technical Inspection & Live Engine State */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden w-full max-w-full min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileInspectionOpen(!mobileInspectionOpen)}
                  className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left rtl:text-right transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">
                      {language === 'ar'
                        ? '🔍 الفحص الفني المباشر ومحرك القواعد'
                        : '🔍 Live Technical Inspection & Safety Engine'}
                    </span>
                  </div>
                  {mobileInspectionOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {mobileInspectionOpen && (
                  <div className="p-3 border-t border-slate-200">
                    <SessionProgressPanel
                      session={currentSession}
                      language={language}
                    />
                  </div>
                )}
              </div>
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
