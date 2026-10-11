import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Server,
  Database,
  Cpu,
  Shield,
  Info,
} from 'lucide-react';
import { Language } from '../../types/triage';

interface RoadmapModalProps {
  language: Language;
  onClose: () => void;
}

export const RoadmapModal: React.FC<RoadmapModalProps> = ({
  language,
  onClose,
}) => {
  const [technicalDetailsOpen, setTechnicalDetailsOpen] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-left rtl:text-right">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base sm:text-lg text-slate-900">
              {language === 'ar'
                ? 'عن النموذج والخطة المستقبلية'
                : 'About the Prototype & Future Plan'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? 'توضيح حدود النموذج التجريبي الحالي ومسارات التطوير المقترحة'
                : 'Current prototype capabilities and proposed future development'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label={language === 'ar' ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs text-slate-700">
          {/* Main 2-Column Grid: Current Prototype vs Future Plan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. ما يقدمه النموذج الحالي / Current Prototype */}
            <div className="p-4 sm:p-5 rounded-xl border border-teal-200 bg-teal-50/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-sm text-teal-950 mb-3 pb-2 border-b border-teal-200/70">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>
                    {language === 'ar'
                      ? 'ما يقدمه النموذج الحالي'
                      : 'Current Prototype'}
                  </span>
                </div>

                <p className="text-[11px] text-teal-900 mb-3 leading-relaxed">
                  {language === 'ar'
                    ? 'هذا الإصدار هو نموذج عمل تجريبي يوضح تجربة الفرز التوجيهي وقواعد السلامة ضمن القيود التالية:'
                    : 'This version is a functional demonstration prototype showcasing guided triage logic under the following scope:'}
                </p>

                <ul className="space-y-2.5 text-[11px] text-teal-950">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 shrink-0">•</span>
                    <span>
                      <strong className="text-teal-900">
                        {language === 'ar' ? 'محاكي واتساب:' : 'WhatsApp interface:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'محاكاة تفاعلية عبر متصفح الويب لاختبار تجربة المحادثة وتدفق الأسئلة، وليس تطبيق واتساب الحقيقي.'
                        : 'A web-based simulation to test conversation flow and patient experience, not the actual WhatsApp app.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 shrink-0">•</span>
                    <span>
                      <strong className="text-teal-900">
                        {language === 'ar' ? 'العينات الصوتية:' : 'Audio samples:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'تسجيلات تجريبية مسبقة التجهيز لمحاكاة الرسائل الصوتية، دون تسجيل صوتي حي أو تحويل فوري للكلام.'
                        : 'Prepared demo recordings to simulate voice notes without live recording or automated speech-to-text.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 shrink-0">•</span>
                    <span>
                      <strong className="text-teal-900">
                        {language === 'ar' ? 'المنشآت الصحية:' : 'Healthcare facilities:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'بيانات افتراضية وتوضيحية للمستشفيات والعيادات لأغراض المحاكاة والتوجيه الجغرافي فقط.'
                        : 'Fictional demo data used for facility names and geographic routing illustrations only.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 shrink-0">•</span>
                    <span>
                      <strong className="text-teal-900">
                        {language === 'ar' ? 'التخزين ولوحة التحكم:' : 'Case storage & dashboard:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'تُحفظ الحالات محلياً في المتصفح (localStorage)، وتتحدث لوحة التحكم داخل نفس المتصفح فقط وليس عبر أجهزة متعددة.'
                        : 'Cases are stored locally in the browser (localStorage), and the dashboard updates within the same browser, not across devices.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-teal-800 shrink-0">•</span>
                    <span>
                      <strong className="text-teal-900">
                        {language === 'ar' ? 'قواعد الأمان القطعية:' : 'Deterministic safety rules:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'محرك قواعد سريرية يمنع خفض درجة الطوارئ، مع اشتراط الموافقة المسبقة وحفظ الحقول غير المحددة بأمان.'
                        : 'Clinical safety rules preventing emergency downgrades, enforcing explicit consent, and safeguarding unknown symptoms.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* 2. الخطة المستقبلية / Future Plan */}
            <div className="p-4 sm:p-5 rounded-xl border border-sky-200 bg-sky-50/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 font-bold text-sm text-sky-950 mb-3 pb-2 border-b border-sky-200/70">
                  <Calendar className="w-4 h-4 text-sky-700 shrink-0" />
                  <span>
                    {language === 'ar' ? 'الخطة المستقبلية' : 'Future Plan'}
                  </span>
                </div>

                <p className="text-[11px] text-sky-900 mb-3 leading-relaxed">
                  {language === 'ar'
                    ? 'خطوات العمل والتطوير المقترحة للانتقال من النموذج التجريبي إلى بيئة التشغيل الفعلي:'
                    : 'Proposed development steps to evolve from this demonstration prototype toward production:'}
                </p>

                <ul className="space-y-2.5 text-[11px] text-sky-950">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-sky-700 shrink-0">•</span>
                    <span>
                      <strong className="text-sky-900">
                        {language === 'ar' ? 'الربط مع واتساب:' : 'Integrate with WhatsApp:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'الربط المباشر مع تطبيق واتساب عبر واجهات برمجة Meta Cloud API الرسمية لاستقبال الرسائل والمواقع.'
                        : 'Connect directly with WhatsApp via official Meta Cloud API webhooks for inbound text and location messages.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-sky-700 shrink-0">•</span>
                    <span>
                      <strong className="text-sky-900">
                        {language === 'ar' ? 'التسجيل الصوتي والتحويل للنص:' : 'Live audio & speech-to-text:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'إتاحة التسجيل الصوتي الحي وإضافة تحويل الكلام العربي واللهجات المحلية إلى نصوص تلقائياً.'
                        : 'Add live voice recording and automated speech-to-text processing optimized for Arabic dialects.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-sky-700 shrink-0">•</span>
                    <span>
                      <strong className="text-sky-900">
                        {language === 'ar' ? 'بيانات المنشآت الصحية المعتمدة:' : 'Verified facility data:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'ربط أدلة المنشآت الصحية الرسمية المعتمدة ومتابعة الطاقة الاستيعابية لأقسام الطوارئ والعيادات.'
                        : 'Connect verified healthcare-facility directories and real-time emergency department capacity data.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-sky-700 shrink-0">•</span>
                    <span>
                      <strong className="text-sky-900">
                        {language === 'ar' ? 'تخزين سحابي وصلاحيات مشتركة:' : 'Backend storage & shared access:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'بناء خادم خلفي وقاعدة بيانات مركزية آمنة تتيح الوصول المصرح والمشترك للفرق الطبية عبر الأجهزة.'
                        : 'Implement secure backend database storage and authorized, multi-device shared access for medical teams.'}
                    </span>
                  </li>

                  <li className="flex items-start gap-2">
                    <span className="font-bold text-sky-700 shrink-0">•</span>
                    <span>
                      <strong className="text-sky-900">
                        {language === 'ar' ? 'المراجعة والتحقق السريري المتخصص:' : 'Specialist clinical validation:'}
                      </strong>{' '}
                      {language === 'ar'
                        ? 'إجراء مراجعات وتجارب سريرية مع استشاريي العيون والجهات التنظيمية للتحقق من الأمان قبل أي تطبيق عملي.'
                        : 'Conduct specialist ophthalmologist review, safety validation, and regulatory evaluation before real clinical use.'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Collapsible Section: التفاصيل التقنية المقترحة / Proposed Technical Details */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setTechnicalDetailsOpen(!technicalDetailsOpen)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left rtl:text-right cursor-pointer"
              aria-expanded={technicalDetailsOpen}
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  {language === 'ar'
                    ? 'التفاصيل التقنية المقترحة'
                    : 'Proposed Technical Details'}
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {language === 'ar' ? '(مقترح مستقبلي)' : '(Proposed Architecture)'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
                <span>
                  {technicalDetailsOpen
                    ? language === 'ar'
                      ? 'طي التفاصيل'
                      : 'Collapse'
                    : language === 'ar'
                    ? 'عرض التفاصيل'
                    : 'Expand'}
                </span>
                {technicalDetailsOpen ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </div>
            </button>

            {technicalDetailsOpen && (
              <div className="p-4 sm:p-5 space-y-4 border-t border-slate-200 bg-slate-50/50">
                {/* Clear Disclaimer Banner */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start gap-2.5 text-[11px] text-slate-600 leading-relaxed">
                  <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800 block mb-0.5">
                      {language === 'ar'
                        ? 'إخلاء مسؤولية حول البنية المقترحة:'
                        : 'Proposed Technical Architecture Disclaimer:'}
                    </span>
                    <span>
                      {language === 'ar'
                        ? 'التفاصيل الواردة أدناه تمثل مقترحاً هندسياً للدراسة المستقبلية، وليست مكونات مفعلة حالياً. لم يحصل النموذج بعد على اعتماد تنظيمي أو ترخيص كبرمجية طبية، ولا يُزعم تحقيق نسب دقة سريرية مثبتة.'
                        : 'The architecture outlined below represents a proposed engineering design for future development, not currently active infrastructure. The system has not sought or received medical-device regulatory clearance, and no certified clinical performance metrics are claimed.'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Proposed Webhook Architecture */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs">
                      <Server className="w-4 h-4 text-teal-700 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? 'بنية خادم الربط السحابي (مقترح)'
                          : 'Proposed Webhook Orchestration'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'مقترح لاستقبال رسائل المرضى النصية والصوتية عبر خادم وسيط يعتمد واجهات Meta Cloud API مع تشفير المعرفات وحفظ سياق الجلسة.'
                        : 'Proposed design to route inbound text and audio via Meta Cloud API webhooks into a dedicated orchestrator, preserving session state and hashing identifiers.'}
                    </p>
                  </div>

                  {/* Proposed Backend & Relational Database */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs">
                      <Database className="w-4 h-4 text-sky-700 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? 'الخادم الخلفي وقاعدة البيانات (مقترح)'
                          : 'Proposed Backend & Database'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'مقترح لبناء واجهات برمجية للتحقق الصارم من بيانات الأعراض وتخزين الجلسات وسجلات التدقيق وقرارات الأطباء في قاعدة بيانات علائقية مركزية.'
                        : 'Proposed backend API services with strict schema validation, persisting session records, audit trails, and clinician feedback in a central relational database.'}
                    </p>
                  </div>

                  {/* Proposed AI Fine-Tuning & Evaluation */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs">
                      <Cpu className="w-4 h-4 text-indigo-700 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? 'مسار تدريب النماذج واختبارها (مقترح)'
                          : 'Proposed Model Exploration Pipeline'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'مقترح لدراسة تدريب نماذج لغوية متخصصة في اللهجات العربية مع وضع معايير تقييم صارمة تمنع التفريط في تصنيف الحالات الطارئة قبل أي اعتماد.'
                        : 'Proposed future research into domain-adapted Arabic language models with rigorous safety benchmarks prior to any deployment.'}
                    </p>
                  </div>

                  {/* Proposed Governance & Future Regulatory Roadmap */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                    <div className="flex items-center gap-2 font-semibold text-slate-900 text-xs">
                      <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        {language === 'ar'
                          ? 'حوكمة البيانات والمسار التنظيمي (مقترح)'
                          : 'Proposed Governance & Regulatory Path'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {language === 'ar'
                        ? 'مقترح لاستضافة البيانات وفق الأنظمة المحلية لحماية البيانات الشخصية، والتنسيق مع الهيئات الصحية لتحديد المتطلبات التنظيمية للبرمجيات الطبية.'
                        : 'Proposed roadmap to align with local data protection regulations and engage health authorities to determine medical-device software governance.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
