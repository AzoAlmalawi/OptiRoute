import React from 'react';
import { X, Server, Database, ShieldCheck, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Language } from '../../types/triage';

interface RoadmapModalProps {
  language: Language;
  onClose: () => void;
}

export const RoadmapModal: React.FC<RoadmapModalProps> = ({
  language,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-left rtl:text-right">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              {language === 'ar'
                ? 'خارطة طريق التكامل والامتثال للإنتاج (PRD Architecture)'
                : 'Production Integration Roadmap & Architecture'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'مقارنة شفافة بين النموذج التجريبي الحالي ومتطلبات الإطلاق السريري الكامل'
                : 'Engineering spec: Current prototype capabilities vs full PRD production milestone'}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Honest Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40">
              <div className="flex items-center gap-2 font-bold text-teal-900 mb-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700" />
                <span>
                  {language === 'ar'
                    ? '1. ما تم إنجازه في هذا النموذج التجريبي (Works Now)'
                    : '1. Implemented in Current Prototype (Works Now)'}
                </span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] text-teal-950">
                <li>{language === 'ar' ? 'محاكي واتساب واقعي كامل مع تحكم بالموافقة الطبية' : 'Realistic WhatsApp simulator with mandatory consent gate'}</li>
                <li>{language === 'ar' ? 'لوحة تحكم سريرية للمستشفى متزامنة في الوقت الفعلي بنفس طبقة البيانات' : 'Synchronized live clinical hospital dashboard via shared data layer'}</li>
                <li>{language === 'ar' ? 'محرك قواعد قطعي يمنع خفض أي علامة حمراء (Precedence Invariant)' : 'Deterministic rule engine with strict precedence override: max(Rules, Model)'}</li>
                <li>{language === 'ar' ? 'حفظ الحقول الناقصة كـ "غير محددة" دون افتراض عدم وجودها' : 'Tri-state symptom schema: unknown fields are never treated as false'}</li>
                <li>{language === 'ar' ? '6 سيناريوهات اصطناعية تمثل الطوارئ، المواد الكيميائية، الجفاف، والغموض' : '6 synthetic scenarios covering trauma, chemicals, same-day, and edge cases'}</li>
                <li>{language === 'ar' ? 'دعم كامل ومتقن للغتين العربية (RTL) والإنجليزية (LTR)' : 'Full bilingual RTL/LTR switching across all UI and triage logic'}</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40">
              <div className="flex items-center gap-2 font-bold text-amber-900 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>
                  {language === 'ar'
                    ? '2. عناصر افتراضية تحتاج تكاملاً حقيقياً للإنتاج'
                    : '2. Simulated Components Requiring Production Integrations'}
                </span>
              </div>
              <ul className="space-y-1.5 list-disc list-inside text-[11px] text-amber-950">
                <li>{language === 'ar' ? 'قناة واتساب: محاكاة واجهة ويب (تتطلب Meta Cloud API Webhooks)' : 'WhatsApp channel: Web UI simulation (requires Meta Cloud API webhooks)'}</li>
                <li>{language === 'ar' ? 'تحويل الصوت إلى نص: عينات مسبقة التجهيز (تتطلب استضافة Whisper داخل المملكة)' : 'Speech-to-text: Pre-recorded demo samples (requires in-Kingdom Whisper endpoint)'}</li>
                <li>{language === 'ar' ? 'بيانات المنشآت: مستشفيات وعيادات افتراضية (تتطلب ربطاً رسمياً بقواعد وزارة الصحة)' : 'Healthcare facilities: Synthetic fixtures (requires verified KSA MOH directory)'}</li>
                <li>{language === 'ar' ? 'التخزين: localStorage محلي للمتصفح (يتطلب قاعدة بيانات PostgreSQL موحدة)' : 'Persistence: Browser-local storage (requires production PostgreSQL database)'}</li>
              </ul>
            </div>
          </div>

          {/* Deep Architecture Pillars */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2">
              {language === 'ar' ? 'ركائز بنية النظام للإنتاج (Technical Architecture Pillars)' : 'Production Architecture Pillars'}
            </h4>

            {/* WhatsApp Integration */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Server className="w-4 h-4 text-emerald-700" />
                <span>WhatsApp Business Cloud API Webhook Architecture (FR-1, FR-2)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'يتم استقبال الرسائل والصوتيات ومواقع GPS عبر خادم وسيط (Webhook Orchestrator) في بيئة سحابية وطنية، مع تشفير البيانات ومطابقة معرف الجلسة بالرقم المشفّر للعميل.'
                  : 'Inbound patient text, audio, and location pins will route through Meta Cloud API webhooks into an in-Kingdom FastAPI webhook service, preserving session state and hashing phone identifiers.'}
              </p>
            </div>

            {/* FastAPI + Postgres */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Database className="w-4 h-4 text-blue-700" />
                <span>FastAPI + PostgreSQL Storage Layer (PRD Section 9.5)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'بناء واجهات برمجية سريعة بالبايثون مع التحقق الصارم من JSON Schema (Pydantic)، وتخزين الجلسات وسجلات التدقيق وإصدارات القواعد والتقييمات السريرية في PostgreSQL.'
                  : 'FastAPI provides built-in Pydantic schema validation for symptom JSON. Postgres handles relational audit trails, model registry metadata, rule configurations, and clinical reviewer logs.'}
              </p>
            </div>

            {/* PEFT/LoRA & Release Gate */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>LoRA Fine-Tuning Pipeline & Safety Release Gate (FR-27, FR-29)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'تدريب مهايئات LoRA منفصلة: (1) لاستخلاص لهجات الخليج، (2) لتصنيف الاستعجال. شرط الإطلاق الحاسم: اجتياز مجموعة اختبار السلامة بنسبة تفريط صفرية (Zero Under-Triage Failure).'
                  : 'Supervised fine-tuning using LoRA on open-weight Arabic models (Qwen/Jais). Strict release gate requires F1 ≥ 0.90, Emergency recall ≥ 0.99, and zero under-triage failures across the safety suite.'}
              </p>
            </div>

            {/* Data Residency & SFDA Compliance */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Lock className="w-4 h-4 text-purple-700" />
                <span>Saudi PDPL, SDAIA & SFDA Medical Device Software Governance</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {language === 'ar'
                  ? 'استضافة كافة البيانات وأوزان النماذج والاستدلال داخل المملكة العربية السعودية وفق نظام حماية البيانات الشخصية (PDPL)، مع مراجعة الهيئة العامة للغذاء والدواء لتحديد تصنيف البرمجية الطبية.'
                  : 'All storage, inference, and audit logs remain strictly inside Saudi Arabia (PDPL compliance). Formal regulatory engagement with SFDA to establish whether the guidance triage tool constitutes Software as a Medical Device (SaMD).'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            {language === 'ar' ? 'إغلاق خارطة الطريق' : 'Close Roadmap'}
          </button>
        </div>
      </div>
    </div>
  );
};
