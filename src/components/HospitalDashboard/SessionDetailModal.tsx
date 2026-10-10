import React, { useState } from 'react';
import {
  TriageSession,
  Language,
  TriState,
} from '../../types/triage';
import {
  X,
  ShieldAlert,
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MapPin,
  Save,
  MessageSquare,
  AlertTriangle,
  History,
} from 'lucide-react';

interface SessionDetailModalProps {
  session: TriageSession | null;
  language: Language;
  onClose: () => void;
  onSubmitReview: (
    sessionId: string,
    review: {
      reviewerName: string;
      feedback: 'CORRECT' | 'OVER_TRIAGED' | 'UNDER_TRIAGED';
      notes: string;
      isFlagged: boolean;
    }
  ) => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({
  session,
  language,
  onClose,
  onSubmitReview,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'timeline' | 'review'>('overview');
  const [reviewerName, setReviewerName] = useState('د. عبد الإله العتيبي (استشاري طب وجراحة العيون)');
  const [feedback, setFeedback] = useState<'CORRECT' | 'OVER_TRIAGED' | 'UNDER_TRIAGED'>('CORRECT');
  const [notes, setNotes] = useState('');
  const [isFlagged, setIsFlagged] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  if (!session) return null;

  const decision = session.decision;
  const s = session.symptoms;
  const fac = session.routedFacility;

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitReview(session.id, {
      reviewerName,
      feedback,
      notes,
      isFlagged,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const renderTriStateBadge = (val: TriState, labelAr: string, labelEn: string) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{language === 'ar' ? labelAr : labelEn}</span>
          <span className="font-mono font-bold">(+)</span>
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          <XCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>{language === 'ar' ? labelAr : labelEn}</span>
          <span className="font-mono">(-)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
        <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
        <span>{language === 'ar' ? labelAr : labelEn}</span>
        <span className="text-[11px] text-amber-600">
          ({language === 'ar' ? 'غير محدد' : 'Unknown'})
        </span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-left rtl:text-right">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-slate-900 font-mono tabular-nums">
                {session.id}
              </span>
              <span className="text-xs text-slate-500">
                · {session.patientMaskedPhone}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  decision?.finalUrgency === 'EMERGENCY'
                    ? 'text-rose-800 bg-rose-50 border-rose-200'
                    : decision?.finalUrgency === 'URGENT'
                    ? 'text-amber-800 bg-amber-50 border-amber-200'
                    : 'text-teal-800 bg-teal-50 border-teal-200'
                }`}
              >
                {decision?.finalUrgency || 'IN_PROGRESS'}
              </span>
              {session.isLegacyRecord && (
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                  {language === 'ar' ? 'سجل تجريبي سابق (تم ترحيله)' : 'Legacy Demo Record (Migrated)'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'فحص تفاصيل الجلسة، الحقول المستخلصة، وتوافق محرك القواعد مع النموذج'
                : 'Session inspection: extracted fields, rule enforcement, and model rationale'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {language === 'ar' ? 'نظرة عامة والفرز السريري' : 'Clinical Overview & Triage'}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'سجل المحادثة' : 'Chat Transcript'}</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
              {(session.messages || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'timeline'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الجدول الزمني للأحداث' : 'Event Timeline'}</span>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full font-mono">
              {(session.events || []).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{language === 'ar' ? 'تدقيق الطبيب (FR-24)' : 'Clinician Audit (FR-24)'}</span>
            {session.clinicianReview ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Decision Banner */}
              {decision && (
                <div
                  className={`p-4 rounded-xl border ${
                    !decision.isFinalDecision
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : decision.finalUrgency === 'EMERGENCY'
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : decision.finalUrgency === 'URGENT'
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-teal-50 border-teal-200 text-teal-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {decision.finalUrgency === 'EMERGENCY' && decision.isFinalDecision ? (
                          <AlertTriangle className="w-5 h-5 text-rose-600" />
                        ) : !decision.isFinalDecision ? (
                          <Clock className="w-5 h-5 text-amber-600 animate-spin" />
                        ) : (
                          <ShieldAlert className="w-5 h-5 text-teal-700" />
                        )}
                        <h3 className="font-bold text-sm">
                          {!decision.isFinalDecision ? (
                            <span>{language === 'ar' ? 'التقييم معلق (المتابعة جارية)' : 'Assessment Pending (Follow-up In Progress)'}</span>
                          ) : (
                            <>
                              <span>{language === 'ar' ? 'القرار السريري النهائي: ' : 'Final Decision: '}</span>
                              <span className="font-extrabold">{decision.finalUrgency}</span>
                            </>
                          )}
                        </h3>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed">
                        {language === 'ar' ? decision.guidanceTextAr : decision.guidanceTextEn}
                      </p>
                    </div>

                    <div className="text-right rtl:text-left text-xs shrink-0">
                      <span className="text-[10px] text-slate-500 block">
                        {language === 'ar' ? 'مصدر القرار:' : 'Decision Source:'}
                      </span>
                      <span className="font-semibold text-slate-900 block font-mono">
                        {decision.decisionSource}
                      </span>
                    </div>
                  </div>

                  {/* Retained emergency notice if applicable */}
                  {decision.isRetainedEmergency && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-100/90 border border-amber-300 text-amber-950 text-xs font-medium leading-relaxed">
                      <span className="font-bold block mb-0.5">
                        🛡️ {language === 'ar' ? 'سياسة الحفاظ على توصية الطوارئ:' : 'Retained Emergency Precaution:'}
                      </span>
                      <span>
                        {language === 'ar'
                          ? decision.retainedEmergencyReasonAr ||
                            'تم تحديث إجابتك. بقيت توصية الطوارئ احترازيًا لأنها صدرت بناءً على إجابة سابقة، وفق سياسة النموذج التجريبي.'
                          : decision.retainedEmergencyReasonEn ||
                            'Your answer has been updated. The emergency recommendation was retained as a safety precaution because it was issued based on a previous answer, per demo safety policy.'}
                      </span>
                    </div>
                  )}

                  {/* Immediate Action note if any (only when not retained after negation) */}
                  {!decision.isRetainedEmergency && (decision.immediateActionTextAr || decision.immediateActionTextEn) && (
                    <div className="mt-3 p-2.5 rounded-lg bg-white/80 border border-black/10 text-xs font-semibold">
                      {language === 'ar' ? decision.immediateActionTextAr : decision.immediateActionTextEn}
                    </div>
                  )}
                </div>
              )}

              {/* Grid: Extracted Symptoms Matrix */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>{language === 'ar' ? 'مصفوفة الأعراض المستخلصة' : 'Structured Symptoms Matrix'}</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {language === 'ar' ? 'القيم الناقصة تبقى غير محددة (وليست سالبة)' : 'Omitted fields remain unknown (never false)'}
                  </span>
                </h4>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">
                        {language === 'ar' ? 'العين المتأثرة' : 'Eye'}
                      </span>
                      <span className="font-semibold text-slate-900 capitalize font-mono">
                        {s.eye}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">
                        {language === 'ar' ? 'بداية العَرَض' : 'Onset'}
                      </span>
                      <span className="font-semibold text-slate-900 capitalize font-mono">
                        {s.onset}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">
                        {language === 'ar' ? 'تغير الإبصار' : 'Vision Change'}
                      </span>
                      <span className="font-semibold text-slate-900 capitalize font-mono">
                        {s.vision_change}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">
                        {language === 'ar' ? 'مستوى الألم' : 'Pain Level'}
                      </span>
                      <span className="font-semibold text-slate-900 capitalize font-mono">
                        {s.pain_level}
                      </span>
                    </div>
                  </div>

                  {/* Tri-state boolean symptoms */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                    {renderTriStateBadge(s.chemical_exposure, 'تعرض كيميائي', 'Chemical Exposure')}
                    {renderTriStateBadge(s.trauma, 'إصابة أو صدمة', 'Trauma')}
                    {renderTriStateBadge(s.contact_lens, 'عدسات لاصقة', 'Contact Lenses')}
                    {renderTriStateBadge(s.light_sensitivity, 'حساسية ضوء', 'Light Sensitivity')}
                    {renderTriStateBadge(s.redness, 'احمرار بالعين', 'Redness')}
                    {renderTriStateBadge(s.discharge, 'إفرازات صديدية', 'Discharge')}
                    {renderTriStateBadge(s.nausea_vomiting, 'غثيان أو قيء', 'Nausea / Vomiting')}
                    {renderTriStateBadge(s.recent_eye_surgery, 'جراحة عيون حديثة', 'Recent Surgery')}
                  </div>
                </div>
              </div>

              {/* Rule Engine vs Model Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule Engine */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-teal-700" />
                      <span>{language === 'ar' ? 'محرك القواعد القطعي' : 'Rule Engine Output'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {session.metadata?.ruleVersion || 'v1.0.0'}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-500">{language === 'ar' ? 'الدرجة:' : 'Urgency:'} </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {decision?.ruleResult?.ruleUrgency || 'N/A'}
                    </span>
                  </div>

                  {decision?.ruleResult?.matchedFlags && decision.ruleResult.matchedFlags.length > 0 ? (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-rose-700 block">
                        🚨 {language === 'ar' ? 'العلامات الحمراء المطابقة:' : 'Matched Red Flags:'}
                      </span>
                      {decision.ruleResult.matchedFlags.map((flag) => (
                        <div key={flag.id} className="text-[11px] p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-950">
                          <span className="font-bold">{flag.id} ({flag.code}):</span> {language === 'ar' ? flag.titleAr : flag.titleEn}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      {language === 'ar' ? 'لا توجد علامات حمراء مطابقة' : 'No red flag patterns matched'}
                    </div>
                  )}

                  {decision?.ruleResult?.evidenceMatches && decision.ruleResult.evidenceMatches.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500 block mb-1">
                        {language === 'ar' ? 'أدلة المطابقة (نص خام / حقول):' : 'Matching Evidence:'}
                      </span>
                      <div className="space-y-1">
                        {decision.ruleResult.evidenceMatches.map((ev, i) => (
                          <div key={i} className="text-[10px] bg-white p-1 rounded border border-slate-200 font-mono text-slate-700">
                            [{ev.source}] {ev.field}: "{ev.snippet}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Model Classifier */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-slate-700" />
                      <span>{language === 'ar' ? 'مصنف ارشادي تجريبي (محاكاة)' : 'Simulated Classifier (Demo Fixture)'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {session.metadata?.modelAdapterVersion || 'v1.0.0'}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-500">{language === 'ar' ? 'الدرجة المقترحة:' : 'Suggested Urgency:'} </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {decision?.modelSuggestion?.urgency || 'N/A'}
                    </span>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-500">{language === 'ar' ? 'درجة المحاكاة (افتراضية):' : 'Simulated Placeholder Score:'} </span>
                    <span className="font-bold text-slate-700 font-mono text-[11px]">
                      {decision?.modelSuggestion ? `~${Math.round(decision.modelSuggestion.confidence * 100)}% (${language === 'ar' ? 'قيمة تقديرية للمحاكاة — غير مقاسة سريرياً' : 'demo placeholder — not measured ML confidence'})` : 'N/A'}
                    </span>
                  </div>

                  {decision?.modelSuggestion?.rationaleCodes && (
                    <div className="pt-2 border-t border-slate-200 text-[11px]">
                      <span className="text-slate-500 block mb-1">
                        {language === 'ar' ? 'أكواد التعليل (FR-14):' : 'Rationale Codes (FR-14):'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {decision.modelSuggestion.rationaleCodes.map((code, idx) => (
                          <span key={idx} className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-2 rounded bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 mt-2">
                    {language === 'ar'
                      ? '⚠️ حماية سريرية: لا يُسمح للنموذج بخفض الطوارئ. تُطبّق معادلة: Max(القواعد, النموذج)'
                      : '⚠️ Clinical Guardrail: Model cannot downgrade an emergency. Max(Rules, Model) enforced.'}
                  </div>
                </div>
              </div>

              {/* Routed Facility */}
              {fac ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-teal-700" />
                      <span>{language === 'ar' ? 'المنشأة الطبية الموجه إليها المريض' : 'Routed Medical Facility'}</span>
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-600">
                      {fac.isCalculatedDistance
                        ? `${fac.distanceKm} km (GPS)`
                        : language === 'ar'
                        ? `عينة مسافة: ~${fac.distanceKm} كم (افتراضية)`
                        : `Sample: ~${fac.distanceKm} km (Simulated)`}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">
                    {language === 'ar' ? fac.nameAr : fac.nameEn}
                  </div>
                  <div className="text-xs text-slate-600">
                    {language === 'ar' ? fac.typeAr : fac.typeEn} · {language === 'ar' ? fac.addressAr : fac.addressEn}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{language === 'ar' ? fac.operatingHoursAr : fac.operatingHoursEn}</span>
                  </div>
                </div>
              ) : session.routingExplanationAr || session.routingExplanationEn ? (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-1.5 text-xs text-amber-900">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-amber-800">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <span>{language === 'ar' ? 'توجيه المنشأة الطبية' : 'Medical Facility Routing'}</span>
                  </span>
                  <p className="text-xs leading-relaxed">
                    {language === 'ar' ? session.routingExplanationAr : session.routingExplanationEn}
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[500px] overflow-y-auto">
              {session.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-lg text-xs leading-relaxed ${
                    m.sender === 'patient'
                      ? 'bg-emerald-50 border border-emerald-200 mr-auto max-w-[85%]'
                      : m.sender === 'bot'
                      ? 'bg-white border border-slate-200 ml-auto max-w-[85%]'
                      : 'bg-amber-50 border border-amber-200 mx-auto max-w-[90%]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <span className="font-semibold uppercase text-slate-700">{m.sender}</span>
                    <span className="font-mono tabular-nums">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-line">{m.text}</p>
                  {m.transcript && m.type === 'voice' && (
                    <p className="mt-1.5 pt-1.5 border-t border-slate-200 italic text-[11px] text-slate-600">
                      🎙️ {language === 'ar' ? 'تفريغ صوتي: ' : 'STT Transcript: '} "{m.transcript}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="relative pl-6 rtl:pr-6 rtl:pl-0 border-l rtl:border-r rtl:border-l-0 border-slate-200 space-y-4 my-2">
              {session.events.map((evt) => (
                <div key={evt.id} className="relative group">
                  <div className="absolute -left-[31px] rtl:-right-[31px] rtl:left-auto top-1.5 w-3 h-3 rounded-full bg-teal-700 ring-4 ring-white" />
                  <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                    {new Date(evt.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 mt-0.5">
                    {language === 'ar' ? evt.summaryAr : evt.summaryEn}
                  </div>
                  {evt.detail && (
                    <pre className="mt-1 text-[10px] bg-slate-100 p-2 rounded border border-slate-200 font-mono text-slate-700 overflow-x-auto">
                      {JSON.stringify(evt.detail, null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'review' && (
            <form onSubmit={handleSaveReview} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="text-xs font-bold text-slate-900">
                  {language === 'ar' ? 'تسجيل تقييم وملاحظات الطبيب الاستشاري (FR-24)' : 'Clinician Review & Feedback (FR-24)'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {language === 'ar'
                    ? 'يُستخدم هذا التقييم لتدريب الإصدار القادم من النموذج (FR-30) ومراقبة حالات التفويت.'
                    : 'Feeds into de-identified evaluation dataset (FR-30) to monitor under-triage.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'اسم الطبيب المراجع:' : 'Reviewer Name:'}
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'تقييم دقة الفرز الطبي:' : 'Triage Accuracy Evaluation:'}
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFeedback('CORRECT')}
                    className={`p-2.5 rounded-lg border font-semibold transition-colors ${
                      feedback === 'CORRECT'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'دقيق وصحيح (Correct)' : 'Correct'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedback('OVER_TRIAGED')}
                    className={`p-2.5 rounded-lg border font-semibold transition-colors ${
                      feedback === 'OVER_TRIAGED'
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'مبالغ فيه (Over-triaged)' : 'Over-triaged'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedback('UNDER_TRIAGED')}
                    className={`p-2.5 rounded-lg border font-semibold transition-colors ${
                      feedback === 'UNDER_TRIAGED'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'ar' ? 'تفريط بالخطورة (Under-triaged)' : 'Under-triaged'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'ar' ? 'الملاحظات السريرية:' : 'Clinical Review Notes:'}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    language === 'ar'
                      ? 'دون أي تعليق حول الأعراض أو جودة التوجيه...'
                      : 'Add comments regarding symptom extraction or triage judgment...'
                  }
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="flagSafety"
                  checked={isFlagged}
                  onChange={(e) => setIsFlagged(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-600"
                />
                <label htmlFor="flagSafety" className="text-xs text-slate-700">
                  {language === 'ar'
                    ? 'تمييز الحالة للمراجعة في لجنة السلامة السريرية'
                    : 'Flag this case for Clinical Safety Audit Review'}
                </label>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                {isSaved && (
                  <span className="text-xs text-emerald-700 font-semibold">
                    ✓ {language === 'ar' ? 'تم حفظ التقييم بنجاح' : 'Review saved successfully'}
                  </span>
                )}
                <button
                  type="submit"
                  className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'حفظ تقييم الحالة' : 'Save Review'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>{language === 'ar' ? 'إصدار القواعد:' : 'Rules:'} {session.metadata.ruleVersion}</span>
            <span>·</span>
            <span>{language === 'ar' ? 'إصدار النموذج:' : 'Adapter:'} {session.metadata.modelAdapterVersion}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
