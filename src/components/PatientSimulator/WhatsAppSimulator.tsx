import React, { useState, useRef, useEffect } from 'react';
import {
  TriageSession,
  Language,
  ChatMessage,
  QuickReplyOption,
  StructuredSymptoms,
} from '../../types/triage';
import { DEMO_CITIES } from '../../data/facilities';
import { AudioPlayerSim } from './AudioPlayerSim';
import { ConversationProgressIndicator } from './ConversationProgressIndicator';
import {
  Send,
  Mic,
  MapPin,
  RotateCcw,
  AlertTriangle,
  PhoneCall,
  ExternalLink,
  ShieldCheck,
  CheckCheck,
  Clock,
  Compass,
  ChevronDown,
  ChevronUp,
  Edit3,
  HelpCircle,
  Check,
  X,
  ArrowDown,
} from 'lucide-react';

interface WhatsAppSimulatorProps {
  session: TriageSession;
  language: Language;
  onSendMessage: (
    text: string,
    isVoice?: boolean,
    voiceDuration?: number,
    sessionOverride?: TriageSession,
    cityOverride?: string,
    quickReply?: QuickReplyOption,
    parentMessageId?: string
  ) => void;
  onConsent: (granted: boolean) => void;
  onResetSession: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  isLoading?: boolean;
  queuedScenarioTitle?: string;
  onCorrectField?: (
    field: keyof StructuredSymptoms,
    value: unknown,
    labelAr: string,
    labelEn: string
  ) => void;
  onViewCaseInDashboard?: (sessionId: string) => void;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  session,
  language,
  onSendMessage,
  onConsent,
  onResetSession,
  selectedCity,
  onSelectCity,
  isLoading = false,
  queuedScenarioTitle,
  onCorrectField,
  onViewCaseInDashboard,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingSim, setIsRecordingSim] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTechnicalRules, setShowTechnicalRules] = useState<Record<string, boolean>>({});
  const [summaryExpanded, setSummaryExpanded] = useState<Record<string, boolean>>({});
  const [correctingField, setCorrectingField] = useState<keyof StructuredSymptoms | null>(null);
  const [hasUnreadBelow, setHasUnreadBelow] = useState(false);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(session.messages.length);
  const isNearBottomRef = useRef<boolean>(true);

  // Reset expandable panels, correction mode, and scroll position when a new session is loaded
  useEffect(() => {
    setShowTechnicalRules({});
    setSummaryExpanded({});
    setCorrectingField(null);
    setInputText('');
    setIsRecordingSim(false);
    setRecordingSeconds(0);
    // On new session (e.g. reload or fresh demo), reset internal scroll to top
    if (chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [session.id]);

  // Helper to scroll only the chat internal container to bottom without moving the outer page
  const scrollChatToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = chatScrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior });
      setHasUnreadBelow(false);
      isNearBottomRef.current = true;
    }
  };

  // Track whether user is reading earlier messages
  const handleChatScroll = () => {
    const el = chatScrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 80;
    isNearBottomRef.current = nearBottom;
    if (nearBottom && hasUnreadBelow) {
      setHasUnreadBelow(false);
    }
  };

  // Auto-scroll chat internally only when a new message arrives, and only if user was near bottom
  useEffect(() => {
    const currentCount = session.messages.length;
    const prevCount = prevMessagesCountRef.current;
    prevMessagesCountRef.current = currentCount;

    // Only respond to actual message additions or new session loading
    if (currentCount > prevCount && prevCount > 0) {
      if (isNearBottomRef.current || session.status === 'COMPLETED') {
        scrollChatToBottom('smooth');
      } else {
        setHasUnreadBelow(true);
      }
    } else if (prevCount === 0 && currentCount > 0) {
      // First mount or session reset: ensure scrolled to top
      if (chatScrollContainerRef.current) {
        chatScrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [session.messages.length, session.id, session.status]);

  // Voice recording simulation timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecordingSim) {
      timer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecordingSim]);

  const handleSendText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText.trim(), false);
    setInputText('');
  };

  const handleStartSimulatedVoice = () => {
    if (isRecordingSim) {
      // Finish recording and send
      setIsRecordingSim(false);
      const sampleVoiceText =
        session.language === 'ar'
          ? 'عندي ألم شديد في عيني اليسار مع احمرار وتشوش مفاجئ بالنظر من ساعة.'
          : 'I have severe pain in my left eye with marked redness and sudden blurred vision since one hour.';
      onSendMessage(sampleVoiceText, true, Math.max(4, recordingSeconds));
    } else {
      setIsRecordingSim(true);
    }
  };

  const handleCancelVoice = () => {
    setIsRecordingSim(false);
    setRecordingSeconds(0);
  };

  const handleQuickReplyClick = (reply: QuickReplyOption, parentMessageId?: string) => {
    if (reply.value === 'CONSENT_GRANTED') {
      onConsent(true);
    } else if (reply.value === 'CONSENT_DECLINED') {
      onConsent(false);
    } else {
      const displayLabel = language === 'ar' ? reply.labelAr : reply.labelEn;
      onSendMessage(
        displayLabel,
        false,
        undefined,
        undefined,
        undefined,
        reply,
        parentMessageId
      );
    }
  };

  const handleBrowserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setShowLocationModal(false);
          // Set to Riyadh or detected
          onSelectCity('Riyadh');
        },
        () => {
          // Graceful fallback
          setShowLocationModal(false);
        }
      );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-80px)] sm:h-[calc(100dvh-95px)] md:h-[calc(100dvh-100px)] min-h-[520px] max-h-[880px] w-full max-w-full sm:max-w-[480px] md:max-w-[620px] lg:max-w-[690px] mx-auto bg-slate-900 rounded-2xl sm:rounded-[28px] overflow-hidden shadow-xl shadow-slate-900/15 border-2 sm:border-4 border-slate-800">
      {/* Top Phone Camera / Speaker notch simulation */}
      <div className="bg-slate-900 px-4 sm:px-6 pt-2 pb-1 flex items-center justify-between text-[11px] text-slate-400 select-none">
        <span className="font-mono">09:41</span>
        <div className="w-12 sm:w-16 h-2.5 sm:h-3 bg-slate-800 rounded-full" />
        <div className="flex items-center gap-1">
          <span className="font-mono">5G</span>
          <div className="w-4 h-2 border border-slate-400 rounded-xs flex items-center p-0.5">
            <div className="w-full h-full bg-slate-300 rounded-2xs" />
          </div>
        </div>
      </div>

      {/* WhatsApp App Header - Refined deep teal */}
      <div className="bg-[#0e483e] text-white px-4 py-2.5 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-teal-800 flex items-center justify-center font-bold text-sm shadow-xs border border-teal-600/30">
              👁️
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-teal-300 ring-2 ring-[#0e483e]" />
          </div>

          <div>
            <div className="font-semibold text-xs leading-tight flex items-center gap-1.5">
              <span className="flex items-center gap-1">
                {language === 'ar' ? (
                  <>
                    <span dir="ltr">OptiRoute</span>
                    <span>— الفرز البصري</span>
                  </>
                ) : (
                  'OptiRoute — Eye Triage'
                )}
              </span>
              <span className="text-[10px] bg-teal-950/80 text-teal-200 px-1.5 py-0.2 rounded font-normal">
                {language === 'ar' ? 'تجريبي' : 'Demo'}
              </span>
            </div>
            <span className="text-[10px] text-teal-100/90 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-300" />
              <span>{language === 'ar' ? 'متصل الآن (تجريبي)' : 'Online (Simulated)'}</span>
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {/* City / Location button */}
          <button
            onClick={() => setShowLocationModal(!showLocationModal)}
            className="p-1.5 text-teal-100 hover:text-white hover:bg-teal-700/60 rounded-full transition-colors cursor-pointer"
            title={language === 'ar' ? 'اختيار المدينة التوجيهية' : 'Select Routing City'}
            aria-label="Location"
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location Dropdown Ribbon */}
      {showLocationModal && (
        <div className="bg-[#0b3b33] text-white text-xs px-3 py-2 border-b border-teal-900 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-teal-300 shrink-0" />
            <span>{language === 'ar' ? 'المدينة التوجيهية:' : 'Routing City:'}</span>
            <select
              value={selectedCity}
              onChange={(e) => {
                onSelectCity(e.target.value);
                setShowLocationModal(false);
              }}
              className="bg-teal-900 text-white rounded px-2 py-0.5 border border-teal-700 text-xs"
            >
              {DEMO_CITIES.map((c) => (
                <option key={c.id} value={c.nameEn}>
                  {language === 'ar' ? c.nameAr : c.nameEn}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleBrowserLocation}
            className="text-[11px] underline text-teal-200 hover:text-white cursor-pointer"
          >
            {language === 'ar' ? 'استخدام GPS' : 'Use GPS'}
          </button>
        </div>
      )}

      {/* Compact Conversation Progress Indicator */}
      <ConversationProgressIndicator session={session} language={language} />

      {/* WhatsApp Chat Wallpaper / Background - #F5F7FA */}
      <div
        ref={chatScrollContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 bg-[#F5F7FA] overflow-y-auto p-3.5 space-y-3 relative"
      >
        {/* Date header */}
        <div className="flex justify-center my-1">
          <span className="text-[11px] text-slate-600 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs font-medium border border-slate-200/80">
            {new Date(session.startedAt).toLocaleDateString(
              language === 'ar' ? 'ar-SA' : 'en-US',
              { weekday: 'short', month: 'short', day: 'numeric' }
            )}
          </span>
        </div>

        {/* Message bubbles */}
        {(() => {
          const latestFollowUpMsgId = [...session.messages]
            .reverse()
            .find((m) => m.sender === 'bot' && m.quickReplies && m.quickReplies.length > 0)?.id;

          return session.messages.map((msg: ChatMessage) => {
            const isPatient = msg.sender === 'patient';
            const isSystem = msg.sender === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2.5 animate-msg-entry">
                <div className="bg-white text-[#172B3A] border border-slate-200 rounded-2xl p-4 max-w-[92%] shadow-xs space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#172B3A] text-xs sm:text-sm">
                    <ShieldCheck className="w-4 h-4 text-[#087F8C] shrink-0" />
                    <span>{language === 'ar' ? 'إشعار الموافقة الطبية' : 'Clinical Consent Notice'}</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed text-[14px] text-[#172B3A]">
                    {msg.text}
                  </p>

                  {/* Queued scenario pending consent banner */}
                  {queuedScenarioTitle && !session.consentGiven && session.status === 'AWAITING_CONSENT' && (
                    <div className="bg-[#DCF3EA] text-[#172B3A] p-2.5 rounded-xl border border-[#087F8C]/20 text-[11px] font-semibold flex items-center gap-1.5">
                      <span className="text-[#087F8C]">📌</span>
                      <span>
                        {language === 'ar'
                          ? `سيناريو محدد: "${queuedScenarioTitle}" — يرجى الموافقة أدناه لبدء المحاكاة.`
                          : `Scenario Queued: "${queuedScenarioTitle}" — Please accept consent below to start.`}
                      </span>
                    </div>
                  )}

                  {/* Consent action buttons */}
                  {msg.quickReplies && !session.consentGiven && session.status === 'AWAITING_CONSENT' && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          onClick={() => handleQuickReplyClick(qr)}
                          className={`w-full py-2 px-3.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                            qr.value === 'CONSENT_GRANTED'
                              ? 'bg-[#087F8C] hover:bg-[#066772] text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-[#172B3A]'
                          }`}
                        >
                          {language === 'ar' ? qr.labelAr : qr.labelEn}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          if (msg.type === 'result_card' && msg.decisionPayload) {
            const dec = msg.decisionPayload;
            const isEmergency = dec.finalUrgency === 'EMERGENCY';
            const isUrgent = dec.finalUrgency === 'URGENT';
            const fac = msg.facilityPayload;
            const sym = session.symptoms;

            const formatFieldTriState = (val: boolean | null | undefined, labelAr: string, labelEn: string) => {
              if (val === true) {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>{language === 'ar' ? labelAr : labelEn}:</span>
                    <span>{language === 'ar' ? '(+) نعم' : '(+) Yes'}</span>
                  </span>
                );
              }
              if (val === false) {
                return (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    <X className="w-3 h-3 text-slate-500" />
                    <span>{language === 'ar' ? labelAr : labelEn}:</span>
                    <span>{language === 'ar' ? '(-) لا' : '(-) No'}</span>
                  </span>
                );
              }
              return (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <HelpCircle className="w-3 h-3 text-amber-500" />
                  <span>{language === 'ar' ? labelAr : labelEn}:</span>
                  <span>{language === 'ar' ? '(?) غير محدد' : '(?) Unknown'}</span>
                </span>
              );
            };

            const formatVisionText = (val: string) => {
              switch (val) {
                case 'none':
                  return language === 'ar' ? 'طبيعي' : 'Normal';
                case 'blurred':
                  return language === 'ar' ? 'تشوش / ضبابية' : 'Blurred';
                case 'loss':
                  return language === 'ar' ? 'فقدان / ضعف شديد' : 'Loss / Severely reduced';
                case 'double':
                  return language === 'ar' ? 'ازدواجية الرؤية' : 'Double vision';
                case 'flashes_floaters':
                  return language === 'ar' ? 'ومضات / شوائب' : 'Flashes / Floaters';
                default:
                  return language === 'ar' ? '(?) غير محدد' : '(?) Unknown';
              }
            };

            const formatPainText = (val: string) => {
              switch (val) {
                case 'none':
                  return language === 'ar' ? 'لا يوجد ألم' : 'No pain';
                case 'mild':
                  return language === 'ar' ? 'ألم خفيف أو حكة' : 'Mild / Itch';
                case 'moderate':
                  return language === 'ar' ? 'ألم متوسط' : 'Moderate';
                case 'severe':
                  return language === 'ar' ? 'ألم شديد جداً' : 'Severe / Unbearable';
                default:
                  return language === 'ar' ? '(?) غير محدد' : '(?) Unknown';
              }
            };

            const formatEyeText = (val: string) => {
              switch (val) {
                case 'left':
                  return language === 'ar' ? 'اليسرى' : 'Left';
                case 'right':
                  return language === 'ar' ? 'اليمنى' : 'Right';
                case 'both':
                  return language === 'ar' ? 'كلتا العينين' : 'Both eyes';
                default:
                  return language === 'ar' ? '(?) غير محدد' : '(?) Unknown';
              }
            };

            const formatOnsetText = (val: string) => {
              switch (val) {
                case 'sudden':
                  return language === 'ar' ? 'مفاجئ (فجأة)' : 'Sudden';
                case 'gradual':
                  return language === 'ar' ? 'تدريجي' : 'Gradual';
                default:
                  return language === 'ar' ? '(?) غير محدد' : '(?) Unknown';
              }
            };

            const isSummaryOpen = summaryExpanded[msg.id] ?? false; // Collapsed by default to avoid crowding the final assessment

            // Generate a concise preview of confirmed findings or chief symptoms
            const summaryPreviewItems: string[] = [];
            if (sym.chemical_exposure === true) summaryPreviewItems.push(language === 'ar' ? 'مادة كيميائية (+)' : 'Chemical splash (+)');
            if (sym.trauma === true) summaryPreviewItems.push(language === 'ar' ? 'إصابة بالعين (+)' : 'Eye trauma (+)');
            if (sym.vision_change && sym.vision_change !== 'unknown' && sym.vision_change !== 'none') {
              summaryPreviewItems.push(language === 'ar' ? `تغير رؤية: ${formatVisionText(sym.vision_change)}` : `Vision: ${formatVisionText(sym.vision_change)}`);
            }
            if (sym.pain_level && sym.pain_level !== 'unknown' && sym.pain_level !== 'none') {
              summaryPreviewItems.push(language === 'ar' ? `ألم: ${formatPainText(sym.pain_level)}` : `Pain: ${formatPainText(sym.pain_level)}`);
            }
            if (sym.contact_lens === true) summaryPreviewItems.push(language === 'ar' ? 'عدسات (+)' : 'Lenses (+)');
            if (sym.light_sensitivity === true) summaryPreviewItems.push(language === 'ar' ? 'حساسية ضوء (+)' : 'Photophobia (+)');
            if (sym.redness === true) summaryPreviewItems.push(language === 'ar' ? 'احمرار (+)' : 'Redness (+)');
            if (sym.discharge === true) summaryPreviewItems.push(language === 'ar' ? 'إفرازات (+)' : 'Discharge (+)');
            if (summaryPreviewItems.length === 0) {
              summaryPreviewItems.push(language === 'ar' ? 'تم تسجيل وتوثيق إجابات الفرز' : 'Triage answers recorded');
            }
            const previewText = summaryPreviewItems.slice(0, 3).join(' • ');

            return (
              <div key={msg.id} className="flex justify-start my-2 max-w-[94%] sm:max-w-[92%] animate-msg-entry">
                <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/90 space-y-3.5 w-full text-[#172B3A]">
                  {/* 1. Urgency Badge - Compact with icon, clear urgency text, and explicit 'OptiRoute Assessment' title */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isEmergency
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/90'
                            : isUrgent
                            ? 'bg-amber-50 text-amber-800 border border-amber-200/90'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200/90'
                        }`}
                      >
                        {isEmergency ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        ) : isUrgent ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="text-[12px] font-semibold text-slate-600 block">
                            👁️ {language === 'ar' ? 'تقييم OptiRoute' : 'OptiRoute Assessment'}
                          </span>
                        </div>
                        <span
                          className={`font-bold text-sm sm:text-base leading-tight block mt-0.5 ${
                            isEmergency
                              ? 'text-rose-700'
                              : isUrgent
                              ? 'text-amber-800'
                              : 'text-emerald-800'
                          }`}
                        >
                          {isEmergency
                            ? language === 'ar'
                              ? 'طارئ (طوارئ عيون فورية)'
                              : 'EMERGENCY (Immediate Eye Care)'
                            : isUrgent
                            ? language === 'ar'
                              ? 'عاجل — تقييم في اليوم نفسه'
                              : 'Urgent — Same-day evaluation'
                            : language === 'ar'
                            ? 'غير عاجل (رعاية أولية)'
                            : 'NON-URGENT (Primary Care)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Action (if emergency chemical splash / trauma) */}
                  {!dec.isRetainedEmergency && (dec.immediateActionTextAr || dec.immediateActionTextEn) && (
                    <div className="bg-rose-50 text-rose-950 p-2.5 rounded-xl border border-rose-200 text-xs leading-relaxed font-semibold">
                      {language === 'ar' ? dec.immediateActionTextAr : dec.immediateActionTextEn}
                    </div>
                  )}

                  {/* 2. Brief Reason */}
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      {language === 'ar' ? 'سبب التقييم ومطابقة الأعراض:' : 'Assessment Reason:'}
                    </span>
                    <p className="text-[13px] leading-relaxed text-slate-700">
                      {dec.isRetainedEmergency ? (
                        <span className="text-amber-900 font-medium">
                          {language === 'ar'
                            ? dec.retainedEmergencyReasonAr ||
                              'تم تحديث إجابتك. بقيت توصية الطوارئ احترازيًا لأنها صدرت بناءً على إجابة سابقة، وفق سياسة النموذج التجريبي.'
                            : dec.retainedEmergencyReasonEn ||
                              'Your answer has been updated. The emergency recommendation was retained as a safety precaution because it was issued based on a previous answer, per demo safety policy.'}
                        </span>
                      ) : dec.ruleResult?.matchedFlags && dec.ruleResult.matchedFlags.length > 0 ? (
                        <span>
                          {language === 'ar'
                            ? `تم رصد مؤشرات حرجة: ${dec.ruleResult.matchedFlags.map((f) => f.titleAr).join('، ')}.`
                            : `Critical indicators detected: ${dec.ruleResult.matchedFlags.map((f) => f.titleEn).join(', ')}.`}
                        </span>
                      ) : dec.decisionSource === 'CONSERVATIVE_FALLBACK' ? (
                        <span>
                          {language === 'ar'
                            ? 'نظراً لعدم اكتمال أو غموض بعض البيانات الواردة في الوصف، يوصى بالفحص الطبي في اليوم نفسه كإجراء احترازي لسلامتك.'
                            : 'Due to insufficient or unclear information in the description, a same-day medical assessment is recommended as a safety precaution.'}
                        </span>
                      ) : (
                        <span>
                          {language === 'ar'
                            ? dec.finalUrgency === 'URGENT'
                              ? 'أعراض عاجلة تتطلب فحصاً تخصصياً في اليوم نفسه بناءً على استمرار الألم أو حساسية الضوء.'
                              : 'أعراض سطحية مستقرة لا تشير إلى علامات خطورة حادة.'
                            : dec.finalUrgency === 'URGENT'
                            ? 'Urgent symptoms warrant same-day specialist assessment based on persistent pain or light sensitivity.'
                            : 'Superficial, stable symptoms with no acute red-flag indicators.'}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* 3. Next Action */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                      {language === 'ar' ? 'الخطوة التالية الموصى بها:' : 'Recommended Action:'}
                    </span>
                    <p className="text-[13px] leading-relaxed text-slate-900 font-medium">
                      {language === 'ar' ? dec.guidanceTextAr : dec.guidanceTextEn}
                    </p>
                  </div>

                  {/* 4. Routed Facility Card or Absence Notice */}
                  {fac ? (
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs space-y-2 shadow-2xs">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[10px] text-teal-800 font-semibold block">
                            {language === 'ar' ? 'الجهة الموصى بالتوجه إليها (افتراضية):' : 'Recommended Demo Facility:'}
                          </span>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm block">
                            {language === 'ar' ? fac.nameAr : fac.nameEn}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium block">
                            {language === 'ar' ? fac.typeAr : fac.typeEn}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded shrink-0">
                          {fac.isCalculatedDistance
                            ? `${fac.distanceKm} km (GPS)`
                            : language === 'ar'
                            ? `عينة: ~${fac.distanceKm} كم`
                            : `Sample: ~${fac.distanceKm} km`}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{language === 'ar' ? fac.operatingHoursAr : fac.operatingHoursEn}</span>
                      </div>

                      {/* Direct Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                        <button
                          type="button"
                          disabled
                          title={language === 'ar' ? 'سجل تجريبي افتراضي — الاتصال معطل' : 'Fictional demo record — telephone dialing disabled'}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-400 cursor-not-allowed rounded-lg text-[11px] font-semibold"
                        >
                          <PhoneCall className="w-3 h-3 text-slate-400" />
                          <span>{language === 'ar' ? 'هاتف (معطل تجريبياً)' : 'Phone (Disabled)'}</span>
                        </button>

                        <button
                          onClick={() => {
                            window.open(
                              `https://maps.google.com/?q=${fac.coordinates.lat},${fac.coordinates.lng}`,
                              '_blank'
                            );
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3 h-3 text-teal-700" />
                          <span>{language === 'ar' ? 'خريطة الموقع' : 'Directions'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 text-xs space-y-1 text-amber-900">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          {language === 'ar' ? 'تنبيه توجيه المنشآت التجريبية' : 'Demo Facility Routing Notice'}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {language === 'ar'
                          ? msg.routingExplanationAr || session.routingExplanationAr || 'لا توجد منشأة تجريبية مناسبة في هذه المدينة.'
                          : msg.routingExplanationEn || session.routingExplanationEn || 'No suitable demo facility found in the selected city.'}
                      </p>
                    </div>
                  )}

                  {/* 5. Collapsible Section: ملخص إجاباتك / Your answers */}
                  <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 overflow-hidden text-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setSummaryExpanded((prev) => ({
                          ...prev,
                          [msg.id]: !isSummaryOpen,
                        }))
                      }
                      className="w-full flex items-center justify-between p-2.5 bg-slate-50/90 hover:bg-slate-100 transition-colors text-left rtl:text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2 rtl:pr-0 rtl:pl-2">
                        <CheckCheck className="w-4 h-4 text-teal-700 shrink-0" />
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-900 block leading-tight">
                            {language === 'ar' ? 'ملخص إجاباتك والأعراض' : 'Your Answers & Symptoms'}
                          </span>
                          {!isSummaryOpen && (
                            <span className="text-[11px] text-slate-500 truncate block font-normal mt-0.5">
                              {previewText}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-teal-800 font-semibold bg-white hover:bg-teal-50 px-2 py-1 rounded-md border border-teal-200/80 shrink-0 transition-colors shadow-2xs">
                        <span>{isSummaryOpen ? (language === 'ar' ? 'طي الملخص' : 'Collapse') : (language === 'ar' ? 'عرض التفاصيل' : 'Expand')}</span>
                        {isSummaryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </div>
                    </button>

                    {isSummaryOpen && (
                      <div className="p-3 space-y-2.5 text-xs border-t border-slate-200">
                        {/* Tri-state summary badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {formatFieldTriState(sym.chemical_exposure, 'مادة كيميائية', 'Chemicals')}
                          {formatFieldTriState(sym.trauma, 'إصابة/جسم غريب', 'Trauma/Injury')}
                          {formatFieldTriState(sym.contact_lens, 'عدسات لاصقة', 'Contact Lens')}
                          {formatFieldTriState(sym.light_sensitivity, 'حساسية ضوء', 'Photophobia')}
                          {formatFieldTriState(sym.redness, 'احمرار', 'Redness')}
                          {formatFieldTriState(sym.discharge, 'إفرازات', 'Discharge')}
                        </div>

                        {/* Categorical details */}
                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 text-[11px]">
                          <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">{language === 'ar' ? 'تغير الرؤية' : 'Vision Change'}</span>
                            <span className="font-semibold text-slate-800">{formatVisionText(sym.vision_change)}</span>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">{language === 'ar' ? 'مستوى الألم' : 'Pain Level'}</span>
                            <span className="font-semibold text-slate-800">{formatPainText(sym.pain_level)}</span>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">{language === 'ar' ? 'العين المصابة' : 'Affected Eye'}</span>
                            <span className="font-semibold text-slate-800">{formatEyeText(sym.eye)}</span>
                          </div>
                          <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                            <span className="text-[10px] text-slate-500 block">{language === 'ar' ? 'بداية الأعراض' : 'Onset'}</span>
                            <span className="font-semibold text-slate-800">{formatOnsetText(sym.onset)}</span>
                          </div>
                        </div>

                        {/* Interactive Correction Button and Selection Modal */}
                        {onCorrectField && (
                          <div className="pt-2 border-t border-slate-100">
                            {correctingField === null ? (
                              <button
                                type="button"
                                onClick={() => setCorrectingField('vision_change')}
                                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-lg text-xs font-semibold transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                                <span>{language === 'ar' ? 'تصحيح إجابة أو تعديل عرض' : 'Correct an answer / modify symptom'}</span>
                              </button>
                            ) : (
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-teal-200 space-y-2 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-xs text-slate-900">
                                    {language === 'ar' ? 'اختر الحقل المراد تصحيحه:' : 'Select field to correct:'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setCorrectingField(null)}
                                    className="text-[11px] text-slate-400 hover:text-slate-600 underline"
                                  >
                                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                  </button>
                                </div>

                                {/* Select Field Selector */}
                                <select
                                  value={correctingField}
                                  onChange={(e) => setCorrectingField(e.target.value as keyof StructuredSymptoms)}
                                  className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white text-slate-800 font-medium"
                                >
                                  <option value="vision_change">{language === 'ar' ? 'تغير الرؤية' : 'Vision change'}</option>
                                  <option value="pain_level">{language === 'ar' ? 'مستوى الألم' : 'Pain level'}</option>
                                  <option value="trauma">{language === 'ar' ? 'إصابة أو خبطة بالعين' : 'Trauma / Eye injury'}</option>
                                  <option value="chemical_exposure">{language === 'ar' ? 'رذاذ مواد كيميائية أو منظفات' : 'Chemical / Cleaning splash'}</option>
                                  <option value="contact_lens">{language === 'ar' ? 'ارتداء العدسات اللاصقة' : 'Contact lens wear'}</option>
                                  <option value="light_sensitivity">{language === 'ar' ? 'حساسية الضوء' : 'Light sensitivity'}</option>
                                  <option value="redness">{language === 'ar' ? 'احمرار العين' : 'Eye redness'}</option>
                                  <option value="discharge">{language === 'ar' ? 'إفرازات العين' : 'Eye discharge'}</option>
                                  <option value="eye">{language === 'ar' ? 'العين المصابة' : 'Affected eye'}</option>
                                  <option value="onset">{language === 'ar' ? 'سرعة بداية الأعراض' : 'Onset speed'}</option>
                                </select>

                                {/* Value Options for Selected Field */}
                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 font-semibold block">
                                    {language === 'ar' ? 'اختر القيمة المصححة:' : 'Select corrected value:'}
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                                    {correctingField === 'vision_change' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('vision_change', 'none', 'النظر طبيعي', 'Vision is normal');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'النظر طبيعي' : 'Vision is normal'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('vision_change', 'blurred', 'ضبابية أو تشوش', 'Blurred vision');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'ضبابية أو تشوش' : 'Blurred vision'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('vision_change', 'loss', 'ضعف أو فقدان شديد', 'Severe vision loss');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-rose-50 border border-slate-200 text-rose-800"
                                        >
                                          {language === 'ar' ? 'ضعف أو فقدان شديد' : 'Severe vision loss'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('vision_change', 'unknown', 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? 'لست متأكداً' : 'Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'pain_level' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('pain_level', 'none', 'لا يوجد ألم', 'No pain');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'لا يوجد ألم' : 'No pain'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('pain_level', 'mild', 'ألم خفيف أو حكة', 'Mild pain / itch');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'ألم خفيف أو حكة' : 'Mild pain / itch'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('pain_level', 'moderate', 'ألم متوسط', 'Moderate pain');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'ألم متوسط' : 'Moderate pain'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('pain_level', 'severe', 'ألم شديد جداً', 'Severe unbearable pain');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-rose-50 border border-slate-200 text-rose-800"
                                        >
                                          {language === 'ar' ? 'ألم شديد جداً' : 'Severe unbearable pain'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('pain_level', 'unknown', 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? 'لست متأكداً' : 'Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'trauma' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('trauma', true, 'نعم تعرضت لإصابة', 'Yes, had eye injury');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-rose-50 border border-slate-200 text-rose-800"
                                        >
                                          {language === 'ar' ? '(+) نعم تعرضت لإصابة' : '(+) Yes, had eye injury'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('trauma', false, 'لا لم أتعرض لإصابة', 'No injury');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(-) لا لم أتعرض لإصابة' : '(-) No injury'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('trauma', null, 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? '(?) لست متأكداً' : '(?) Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'chemical_exposure' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('chemical_exposure', true, 'نعم رذاذ منظف أو مواد كيميائية', 'Yes, chemical splash');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-rose-50 border border-slate-200 text-rose-800"
                                        >
                                          {language === 'ar' ? '(+) نعم رذاذ كيميائي/منظف' : '(+) Yes, chemical/cleaner splash'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('chemical_exposure', false, 'لا لم يدخل أي رذاذ كيميائي', 'No chemical splash');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(-) لا مواد كيميائية' : '(-) No chemicals'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('chemical_exposure', null, 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? '(?) لست متأكداً' : '(?) Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'contact_lens' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('contact_lens', true, 'نعم أرتدي عدسات لاصقة', 'Yes, wear contact lenses');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(+) نعم أرتدي عدسات' : '(+) Yes, wear lenses'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('contact_lens', false, 'لا أرتدي عدسات', 'No lenses');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(-) لا أرتدي عدسات' : '(-) No lenses'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('contact_lens', null, 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? '(?) لست متأكداً' : '(?) Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'light_sensitivity' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('light_sensitivity', true, 'نعم حساسية من الضوء', 'Yes, light sensitivity');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(+) نعم حساسية ضوء' : '(+) Yes, photophobia'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('light_sensitivity', false, 'لا توجد حساسية ضوء', 'No light sensitivity');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(-) لا حساسية ضوء' : '(-) No photophobia'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('light_sensitivity', null, 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? '(?) لست متأكداً' : '(?) Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'redness' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('redness', true, 'نعم احمرار في العين', 'Yes, eye redness');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(+) نعم احمرار' : '(+) Yes, redness'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('redness', false, 'لا يوجد احمرار', 'No redness');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(-) لا يوجد احمرار' : '(-) No redness'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('redness', null, 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? '(?) لست متأكداً' : '(?) Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'discharge' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('discharge', true, 'نعم إفرازات في العين', 'Yes, eye discharge');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(+) نعم إفرازات' : '(+) Yes, discharge'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('discharge', false, 'لا توجد إفرازات', 'No discharge');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? '(-) لا توجد إفرازات' : '(-) No discharge'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('discharge', null, 'لست متأكداً', 'Not sure');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-amber-50 border border-slate-200 text-amber-800"
                                        >
                                          {language === 'ar' ? '(?) لست متأكداً' : '(?) Not sure'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'eye' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('eye', 'right', 'العين اليمنى', 'Right eye');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'اليمنى' : 'Right eye'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('eye', 'left', 'العين اليسرى', 'Left eye');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'اليسرى' : 'Left eye'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('eye', 'both', 'كلتا العينين', 'Both eyes');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'كلتا العينين' : 'Both eyes'}
                                        </button>
                                      </>
                                    )}

                                    {correctingField === 'onset' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('onset', 'sudden', 'مفاجئ (فجأة)', 'Sudden');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'مفاجئ (فجأة)' : 'Sudden'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onCorrectField('onset', 'gradual', 'تدريجي', 'Gradual');
                                            setCorrectingField(null);
                                          }}
                                          className="text-left rtl:text-right p-1.5 rounded bg-white hover:bg-teal-50 border border-slate-200 text-slate-800"
                                        >
                                          {language === 'ar' ? 'تدريجي' : 'Gradual'}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>



                  {/* Collapsible Technical Rules Section */}
                  <div className="pt-1 border-t border-black/10">
                    <button
                      type="button"
                      onClick={() =>
                        setShowTechnicalRules((prev) => ({
                          ...prev,
                          [msg.id]: !prev[msg.id],
                        }))
                      }
                      className="inline-flex items-center justify-between w-full text-[10px] text-slate-500 hover:text-slate-700 py-1"
                    >
                      <span>
                        {language === 'ar'
                          ? 'تفاصيل القواعد التقنية (للمطورين والتدقيق)'
                          : 'Technical Rule Engine Details (Auditing)'}
                      </span>
                      {showTechnicalRules[msg.id] ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {showTechnicalRules[msg.id] && (
                      <div className="mt-1 p-2 bg-black/5 rounded-lg text-[10px] text-slate-600 space-y-1 font-mono">
                        <div>
                          <strong>{language === 'ar' ? 'مصدر القرار:' : 'Decision Source:'}</strong>{' '}
                          {dec.decisionSource}
                        </div>
                        <div>
                          <strong>{language === 'ar' ? 'قواعد مطابقة:' : 'Matched Rules:'}</strong>{' '}
                          {dec.ruleResult?.rationaleCodes?.join(', ') || 'NONE'}
                        </div>
                        <div className="text-slate-500 text-[9px] pt-0.5">
                          {language === 'ar'
                            ? 'نموذج أولي هندسي — لم يحصل على اعتماد سريري'
                            : 'Engineering prototype — not clinically validated'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hospital Dashboard Link Button for Hackathon Demo */}
                  {onViewCaseInDashboard && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <button
                        type="button"
                        onClick={() => onViewCaseInDashboard(session.id)}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3.5 bg-[#087F8C] hover:bg-[#066772] active:bg-[#05555e] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {language === 'ar'
                            ? 'عرض هذه الحالة في لوحة المستشفى'
                            : 'View this case in the hospital dashboard'}
                        </span>
                      </button>
                      <p className="text-[11px] text-slate-500 leading-tight text-center px-1">
                        {language === 'ar'
                          ? 'يفتح هذا الإجراء الحالة الافتراضية في لوحة تحكم هذا المتصفح فقط. لا يتم إرسال أي إحالة لمستشفى حقيقي.'
                          : 'This opens the simulated case in this browser’s dashboard. No referral is sent to a real hospital.'}
                      </p>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 text-right rtl:text-left flex items-center justify-end gap-1">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <CheckCheck className="w-3.5 h-3.5 text-[#087F8C]" />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isPatient ? 'justify-end' : 'justify-start'} my-2.5 animate-msg-entry`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-2xs relative border ${
                  isPatient
                    ? 'bg-[#DCF3EA] border-[#087F8C]/20 text-[#172B3A] rounded-tr-xs rtl:rounded-tr-2xl rtl:rounded-tl-xs'
                    : 'bg-white border-slate-200/90 text-[#172B3A] rounded-tl-xs rtl:rounded-tl-2xl rtl:rounded-tr-xs'
                }`}
              >
                {/* Speaker label: 12-13px semibold, readable, with icon for assistant */}
                <div className="flex items-center gap-1.5 mb-1.5 select-none">
                  {isPatient ? (
                    <span className="text-[12px] sm:text-[13px] font-semibold text-[#087F8C]">
                      {language === 'ar' ? 'أنت' : 'You'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] sm:text-[13px] font-semibold text-slate-700">
                      <span className="text-[12px]">👁️</span>
                      <span>{language === 'ar' ? 'مساعد OptiRoute' : 'OptiRoute Assistant'}</span>
                    </span>
                  )}
                </div>

                {/* Voice Note message bubble */}
                {msg.type === 'voice' ? (
                  <AudioPlayerSim
                    durationSeconds={msg.audioDurationSeconds}
                    transcript={msg.transcript}
                    language={msg.audioLanguage || session.language || language}
                    audioUrl={msg.audioUrl}
                  />
                ) : (
                  <p className="whitespace-pre-line leading-relaxed text-[14px] sm:text-[15px] font-normal text-[#172B3A]">
                    {msg.text}
                  </p>
                )}

                {/* Quick replies if any attached to assistant question */}
                {msg.quickReplies && (
                  <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-slate-100">
                    {msg.quickReplies.map((qr) => {
                      const isPriorQuestion = msg.id !== latestFollowUpMsgId;
                      const isQuestionAnswered = Boolean(msg.isAnswered || isPriorQuestion);
                      const isSelected = msg.selectedQuickReplyId === qr.id;
                      const isDisabled = isQuestionAnswered || session.status !== 'FOLLOW_UP' || isLoading;

                      return (
                        <button
                          key={qr.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => handleQuickReplyClick(qr, msg.id)}
                          className={`py-1.5 px-3 rounded-full text-xs font-semibold transition-all ${
                            isSelected
                              ? 'bg-[#087F8C] text-white border border-[#066772] shadow-2xs cursor-default font-bold'
                              : isDisabled
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-white hover:bg-[#DCF3EA] text-[#172B3A] border border-slate-300 hover:border-[#087F8C] cursor-pointer shadow-2xs'
                          }`}
                        >
                          {isSelected && <span className="mr-1 ml-1 text-[11px]">✓</span>}
                          {language === 'ar' ? qr.labelAr : qr.labelEn}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Timestamp & read receipts - clearly separated from message body */}
                <div className="text-[11px] text-slate-500 pt-1.5 mt-1 border-t border-black/[0.04] flex items-center justify-end gap-1 select-none">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isPatient && <CheckCheck className="w-3.5 h-3.5 text-[#087F8C]" />}
                </div>
              </div>
            </div>
          );
        });
      })()}

        {/* Loading typing indicator */}
        {isLoading && (
          <div className="flex justify-start my-1">
            <div className="bg-white rounded-full px-3 py-1.5 shadow-2xs flex items-center gap-1.5 text-slate-500 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-slate-400 mr-1 ml-1">
                {language === 'ar' ? 'جارٍ تحليل الأعراض...' : 'Analyzing symptoms...'}
              </span>
            </div>
          </div>
        )}

        {/* Floating "New message" pill if user is reading earlier messages */}
        {hasUnreadBelow && (
          <div className="sticky bottom-2 flex justify-center z-20 pointer-events-none">
            <button
              type="button"
              onClick={() => scrollChatToBottom('smooth')}
              className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-lg text-xs font-semibold animate-bounce transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'رسالة جديدة' : 'New message'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Voice Recording Active Banner */}
      {isRecordingSim && (
        <div className="bg-rose-50 px-4 py-2 border-t border-rose-200 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2 text-rose-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
            <span>
              {language === 'ar' ? 'تسجيل رسالة صوتية تجريبية:' : 'Recording simulated voice note:'}
            </span>
            <span className="font-mono text-sm">{recordingSeconds}s</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelVoice}
              className="text-slate-500 hover:text-slate-700 text-xs underline"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleStartSimulatedVoice}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold"
            >
              {language === 'ar' ? 'إرسال' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Message Input Bar */}
      <div className="bg-slate-50 px-3.5 py-2.5 border-t border-slate-200">
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          {/* Voice note trigger button */}
          <button
            type="button"
            onClick={handleStartSimulatedVoice}
            disabled={!session.consentGiven || isLoading}
            className={`p-2 rounded-full transition-colors shrink-0 cursor-pointer ${
              isRecordingSim
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-[#172B3A] hover:bg-slate-200/80 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
            title={language === 'ar' ? 'تسجيل صوتي تجريبي' : 'Simulated Voice Note'}
            aria-label="Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={!session.consentGiven || isLoading}
            placeholder={
              !session.consentGiven
                ? language === 'ar'
                  ? 'يرجى الموافقة على الشروط أولاً...'
                  : 'Please accept consent first...'
                : language === 'ar'
                ? 'اكتب وصفاً للأعراض هنا...'
                : 'Describe eye symptoms here...'
            }
            className="flex-1 bg-white rounded-full px-4 py-2 text-[14px] text-[#172B3A] border border-slate-300 focus:outline-hidden focus:border-[#087F8C] focus:ring-2 focus:ring-[#087F8C]/20 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400 shadow-2xs transition-all"
          />

          {/* Send Button - Primary #087F8C with white text */}
          <button
            type="submit"
            disabled={!inputText.trim() || !session.consentGiven || isLoading}
            className="w-8.5 h-8.5 rounded-full bg-[#087F8C] text-white flex items-center justify-center hover:bg-[#066772] active:bg-[#05555e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-2xs cursor-pointer"
            aria-label="Send"
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
