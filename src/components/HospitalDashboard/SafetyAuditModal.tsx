import React from 'react';
import { RED_FLAG_RULES, RULE_ENGINE_VERSION } from '../../data/rulesConfig';
import { Language } from '../../types/triage';
import { AlertTriangle, ShieldCheck, CheckCircle2, Lock } from 'lucide-react';

interface SafetyAuditModalProps {
  language: Language;
}

export const SafetyAuditModal: React.FC<SafetyAuditModalProps> = ({
  language,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-700" />
              <span>
                {language === 'ar'
                  ? 'قواعد السلامة السريرية والعلامات الحمراء (FR-10)'
                  : 'Clinical Safety Protocols & Red-Flag Invariants (FR-10)'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'ar'
                ? `محرك القواعد الإصدار: ${RULE_ENGINE_VERSION} — مسودة هندسية خاضعة للمراجعة السريرية`
                : `Rule Engine Engine Spec: ${RULE_ENGINE_VERSION} — Engineering Draft Pending Clinical Board Approval`}
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold self-start">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>{language === 'ar' ? 'قواعد قطعية لا تُخرق' : 'Hardcoded Precedence'}</span>
          </div>
        </div>

        {/* Safety Invariant Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'ar' ? '1. أولوية محرك القواعد المطلقة' : '1. Absolute Rule Precedence'}</span>
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {language === 'ar'
                ? 'لا يمكن لأي نموذج ذكاء اصطناعي، مهما بلغت درجة ثقته، خفض مستوى خطورة حددته القواعد كحالة طارئة.'
                : 'No AI model output, however confident, can lower an urgency level designated by a red-flag safety rule.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'ar' ? '2. حفظ القيم غير المحددة' : '2. Tri-State Missing Data'}</span>
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {language === 'ar'
                ? 'الحقول غير المذكورة تبقى "غير محددة" ولا تُعامل كسالبة أبداً. الغموض يصعد الاستعجال ولا يخفضه.'
                : 'Omitted fields remain strictly unknown and are never assumed negative. Missing data escalates, never lowers.'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="font-bold text-slate-900 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === 'ar' ? '3. إجراءات فورية معتمدة مسبقاً' : '3. Clinician-Approved Fixed Text'}</span>
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {language === 'ar'
                ? 'تعليمات الغسيل العاجل في الإصابات الكيميائية نصوص ثابتة معتمدة لا يُسمح للنموذج بتوليدها.'
                : 'Immediate action texts (e.g. 15-20 min saline irrigation for chemical splash) use fixed clinical templates.'}
            </p>
          </div>
        </div>
      </div>

      {/* Red Flags Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {language === 'ar' ? 'قائمة العلامات الحمراء الثمانية المعتمدة في النظام (FR-10)' : 'The 8 Initial Red-Flag Rules (FR-10 Specification)'}
          </h3>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {RED_FLAG_RULES.map((rule) => (
            <div key={rule.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {rule.id}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {language === 'ar' ? rule.titleAr : rule.titleEn}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-400">
                  CODE: {rule.code}
                </span>
              </div>

              <p className="text-slate-600 leading-relaxed text-[11px]">
                {language === 'ar' ? rule.descriptionAr : rule.descriptionEn}
              </p>

              {(rule.immediateActionAr || rule.immediateActionEn) && (
                <div className="p-2.5 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-950 text-[11px] font-semibold leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{language === 'ar' ? rule.immediateActionAr : rule.immediateActionEn}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
