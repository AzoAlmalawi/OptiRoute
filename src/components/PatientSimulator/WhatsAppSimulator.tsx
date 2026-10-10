import React, { useState, useRef, useEffect } from 'react';
import {
  TriageSession,
  Language,
  ChatMessage,
  QuickReplyOption,
} from '../../types/triage';
import { DEMO_CITIES } from '../../data/facilities';
import { AudioPlayerSim } from './AudioPlayerSim';
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
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecordingSim, setIsRecordingSim] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showTechnicalRules, setShowTechnicalRules] = useState<Record<string, boolean>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages, isLoading]);

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
    <div className="flex flex-col h-[680px] sm:h-[740px] md:h-[780px] w-full max-w-full sm:max-w-[480px] md:max-w-[620px] lg:max-w-[680px] mx-auto bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border-2 sm:border-4 border-slate-800">
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

      {/* WhatsApp App Header */}
      <div className="bg-emerald-800 text-white px-4 py-2.5 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-2.5">
          {/* Avatar */}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm shadow-xs border border-emerald-400/30">
              👁️
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-300 ring-2 ring-emerald-800" />
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
              <span className="text-[10px] bg-emerald-900/80 text-emerald-200 px-1.5 py-0.2 rounded font-normal">
                {language === 'ar' ? 'موثّق' : 'Verified'}
              </span>
            </div>
            <span className="text-[10px] text-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{language === 'ar' ? 'متصل الآن (تجريبي)' : 'Online (Simulated)'}</span>
            </span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1">
          {/* City / Location button */}
          <button
            onClick={() => setShowLocationModal(!showLocationModal)}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700/60 rounded-full transition-colors"
            title={language === 'ar' ? 'اختيار الموقع الجغرافي' : 'Select Location'}
            aria-label="Location"
          >
            <MapPin className="w-4 h-4" />
          </button>

          {/* Reset Action */}
          <button
            onClick={onResetSession}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-emerald-700/60 rounded-full transition-colors"
            title={language === 'ar' ? 'بدء جلسة جديدة (مع حفظ السابقة)' : 'New Session (Preserves Previous)'}
            aria-label="Reset session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Location Dropdown Ribbon */}
      {showLocationModal && (
        <div className="bg-emerald-900 text-white text-xs px-3 py-2 border-b border-emerald-700 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>{language === 'ar' ? 'المدينة التوجيهية:' : 'Routing City:'}</span>
            <select
              value={selectedCity}
              onChange={(e) => {
                onSelectCity(e.target.value);
                setShowLocationModal(false);
              }}
              className="bg-emerald-800 text-white rounded px-2 py-0.5 border border-emerald-600 text-xs"
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
            className="text-[11px] underline text-emerald-200 hover:text-white"
          >
            {language === 'ar' ? 'استخدام GPS' : 'Use GPS'}
          </button>
        </div>
      )}

      {/* WhatsApp Chat Wallpaper / Background */}
      <div className="flex-1 bg-[#efeae2] overflow-y-auto p-3.5 space-y-3 relative">
        {/* Date header */}
        <div className="flex justify-center my-1">
          <span className="text-[10px] text-slate-600 bg-white/80 backdrop-blur-xs px-2.5 py-0.5 rounded-full shadow-2xs font-medium">
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
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-amber-50/90 text-amber-950 border border-amber-200 rounded-xl p-3 max-w-[90%] text-xs shadow-2xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>{language === 'ar' ? 'إشعار الموافقة الطبية' : 'Clinical Consent Notice'}</span>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed text-[11px]">
                    {msg.text}
                  </p>

                  {/* Queued scenario pending consent banner */}
                  {queuedScenarioTitle && !session.consentGiven && session.status === 'AWAITING_CONSENT' && (
                    <div className="bg-teal-100/90 text-teal-950 p-2 rounded-lg border border-teal-300 text-[11px] font-semibold flex items-center gap-1.5">
                      <span>📌</span>
                      <span>
                        {language === 'ar'
                          ? `سيناريو محدد: "${queuedScenarioTitle}" — يرجى الموافقة أدناه لبدء المحاكاة.`
                          : `Scenario Queued: "${queuedScenarioTitle}" — Please accept consent below to start.`}
                      </span>
                    </div>
                  )}

                  {/* Consent action buttons */}
                  {msg.quickReplies && !session.consentGiven && session.status === 'AWAITING_CONSENT' && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-amber-200">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr.id}
                          onClick={() => handleQuickReplyClick(qr)}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
                            qr.value === 'CONSENT_GRANTED'
                              ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-2xs'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
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

            return (
              <div key={msg.id} className="flex justify-start my-2 max-w-[92%]">
                <div
                  className={`rounded-2xl p-3.5 shadow-xs space-y-2.5 w-full border ${
                    isEmergency
                      ? 'bg-rose-50/95 border-rose-300 text-rose-950'
                      : isUrgent
                      ? 'bg-amber-50/95 border-amber-300 text-amber-950'
                      : 'bg-teal-50/95 border-teal-300 text-teal-950'
                  }`}
                >
                  {/* Urgency Badge */}
                  <div className="flex items-center justify-between border-b border-black/10 pb-2">
                    <div className="flex items-center gap-1.5">
                      {isEmergency ? (
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0" />
                      )}
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                          {language === 'ar' ? 'نتيجة الفرز الاسترشادي' : 'Triage Assessment'}
                        </span>
                        <span className="font-extrabold text-sm leading-none">
                          {isEmergency
                            ? language === 'ar'
                              ? 'طارئ (طوارئ عيون فورية) 🚨'
                              : 'EMERGENCY (Immediate Care) 🚨'
                            : isUrgent
                            ? language === 'ar'
                              ? 'عاجل (تقييم خلال اليوم) ⚠️'
                              : 'URGENT (Same-Day Evaluation) ⚠️'
                            : language === 'ar'
                            ? 'غير عاجل (رعاية أولية) ℹ️'
                            : 'NON-URGENT (Primary Care) ℹ️'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Immediate Action if chemical splash / trauma */}
                  {(dec.immediateActionTextAr || dec.immediateActionTextEn) && (
                    <div className="bg-rose-100/90 text-rose-950 p-2.5 rounded-xl border border-rose-200 text-xs leading-relaxed font-semibold">
                      {language === 'ar' ? dec.immediateActionTextAr : dec.immediateActionTextEn}
                    </div>
                  )}

                  {/* Grounded Clinical Explanation */}
                  <div className="bg-white/80 p-2.5 rounded-xl border border-black/5 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      {language === 'ar' ? 'سبب التقييم ومطابقة الأعراض:' : 'Assessment Reason:'}
                    </span>
                    <p className="text-xs leading-relaxed text-slate-800">
                      {dec.ruleResult?.matchedFlags && dec.ruleResult.matchedFlags.length > 0 ? (
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

                  {/* Next Step Guidance */}
                  <div className="p-2.5 rounded-xl bg-white/60 border border-black/5 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      {language === 'ar' ? 'الخطوة التالية الموصى بها:' : 'Recommended Next Step:'}
                    </span>
                    <p className="text-xs leading-relaxed text-slate-800 font-medium">
                      {language === 'ar' ? dec.guidanceTextAr : dec.guidanceTextEn}
                    </p>
                  </div>

                  {/* Routed Facility Card or Absence Notice */}
                  {fac ? (
                    <div className="bg-white/95 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="text-[10px] text-teal-800 font-semibold block">
                            {language === 'ar' ? 'الجهة الموصى بالتوجه إليها (افتراضية):' : 'Recommended Facility (Simulated):'}
                          </span>
                          <span className="font-bold text-slate-900 text-xs block">
                            {language === 'ar' ? fac.nameAr : fac.nameEn}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {language === 'ar' ? fac.typeAr : fac.typeEn}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded shrink-0">
                          {fac.isCalculatedDistance
                            ? `${fac.distanceKm} km (GPS)`
                            : language === 'ar'
                            ? `عينة: ~${fac.distanceKm} كم`
                            : `Sample: ~${fac.distanceKm} km`}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{language === 'ar' ? fac.operatingHoursAr : fac.operatingHoursEn}</span>
                      </div>

                      {/* Direct Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          disabled
                          title={language === 'ar' ? 'سجل تجريبي افتراضي — الاتصال معطل' : 'Fictional demo record — telephone dialing disabled'}
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-slate-100 text-slate-500 cursor-not-allowed rounded-lg text-[11px] font-semibold"
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
                          className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{language === 'ar' ? 'خريطة الموقع' : 'Directions'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/95 p-2.5 rounded-xl border border-amber-200 text-xs space-y-1 text-amber-900">
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

                  <div className="text-[10px] text-slate-400 text-right rtl:text-left flex items-center justify-end gap-1">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <CheckCheck className="w-3 h-3 text-teal-600" />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isPatient ? 'justify-end' : 'justify-start'} my-1.5`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs shadow-2xs relative ${
                  isPatient
                    ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-xs'
                    : 'bg-white text-slate-900 rounded-tl-xs'
                }`}
              >
                {/* Voice Note message bubble */}
                {msg.type === 'voice' ? (
                  <AudioPlayerSim
                    durationSeconds={msg.audioDurationSeconds}
                    transcript={msg.transcript}
                    language={msg.audioLanguage || session.language || language}
                    audioUrl={msg.audioUrl}
                  />
                ) : (
                  <p className="whitespace-pre-line leading-relaxed text-[12px]">{msg.text}</p>
                )}

                {/* Quick replies if any attached to bot question */}
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
                          className={`py-1 px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                            isSelected
                              ? 'bg-emerald-700 text-white border border-emerald-800 shadow-2xs cursor-default font-bold'
                              : isDisabled
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 cursor-pointer shadow-2xs'
                          }`}
                        >
                          {isSelected && <span className="mr-1 ml-1 text-[10px]">✓</span>}
                          {language === 'ar' ? qr.labelAr : qr.labelEn}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Timestamp & read receipts */}
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1 select-none">
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isPatient && <CheckCheck className="w-3 h-3 text-sky-500" />}
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

        <div ref={chatBottomRef} />
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
      <div className="bg-[#f0f2f5] px-3 py-2 border-t border-slate-200">
        <form onSubmit={handleSendText} className="flex items-center gap-2">
          {/* Voice note trigger button */}
          <button
            type="button"
            onClick={handleStartSimulatedVoice}
            disabled={!session.consentGiven || isLoading}
            className={`p-2 rounded-full transition-colors shrink-0 ${
              isRecordingSim
                ? 'bg-rose-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-40'
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
            className="flex-1 bg-white rounded-full px-4 py-2 text-xs border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-emerald-600 disabled:bg-slate-100 disabled:text-slate-400 placeholder:text-slate-400"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || !session.consentGiven || isLoading}
            className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center hover:bg-emerald-800 transition-colors disabled:opacity-40 shrink-0 shadow-2xs"
            aria-label="Send"
          >
            <Send className="w-4 h-4 rtl:rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
