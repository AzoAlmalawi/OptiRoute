import React, { useState, useMemo } from 'react';
import {
  TriageSession,
  Language,
  UrgencyLevel,
} from '../../types/triage';
import { TRANSLATIONS } from '../../data/translations';
import { SessionDetailModal } from './SessionDetailModal';
import {
  Search,
  Download,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RotateCcw,
  ExternalLink,
  Filter,
  Calendar,
  ShieldAlert,
  X,
} from 'lucide-react';

interface DashboardViewProps {
  sessions: TriageSession[];
  language: Language;
  onRefreshSessions: () => void;
  onResetToSeed: () => void;
  onSubmitReview: (
    sessionId: string,
    review: {
      reviewerName: string;
      feedback: 'CORRECT' | 'OVER_TRIAGED' | 'UNDER_TRIAGED';
      notes: string;
      isFlagged: boolean;
    }
  ) => void;
  onSwitchToSimulator: () => void;
  initialInspectedSessionId?: string | null;
  onClearInitialInspectedSession?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sessions,
  language,
  onRefreshSessions: _onRefreshSessions,
  onResetToSeed,
  onSubmitReview,
  onSwitchToSimulator,
  initialInspectedSessionId,
  onClearInitialInspectedSession,
}) => {
  const t = TRANSLATIONS[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState<'ALL' | 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM'>('ALL');
  const [customDate, setCustomDate] = useState<string>('');
  const [inspectedSession, setInspectedSession] = useState<TriageSession | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [sessionNotFoundError, setSessionNotFoundError] = useState<string | null>(null);

  // Exact session lookup when navigated from chat
  React.useEffect(() => {
    if (initialInspectedSessionId) {
      const match = sessions.find((s) => s.id === initialInspectedSessionId);
      if (match) {
        setInspectedSession(match);
        setSessionNotFoundError(null);
      } else {
        setSessionNotFoundError(initialInspectedSessionId);
      }
      onClearInitialInspectedSession?.();
    }
  }, [initialInspectedSessionId, sessions, onClearInitialInspectedSession]);

  // Compute summary metrics strictly from stored sessions (No fabricated statistics)
  const metrics = useMemo(() => {
    const total = sessions.length;
    let emergency = 0;
    let urgent = 0;
    let nonUrgent = 0;
    let pendingReview = 0;

    sessions.forEach((s) => {
      const urgency = s.decision?.finalUrgency;
      if (urgency === 'EMERGENCY') emergency += 1;
      else if (urgency === 'URGENT') urgent += 1;
      else if (urgency === 'NON_URGENT') nonUrgent += 1;

      if (!s.clinicianReview) pendingReview += 1;
    });

    return { total, emergency, urgent, nonUrgent, pendingReview };
  }, [sessions]);

  // Client-side filtering & search with WORKING date filter
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Urgency filter
      if (selectedUrgency !== 'ALL') {
        if (s.decision?.finalUrgency !== selectedUrgency) return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (s.status !== selectedStatus) return false;
      }

      // Working Date filter (Custom Date or Preset Ranges)
      if (selectedDateRange === 'CUSTOM' && customDate) {
        const sessionDateStr = new Date(s.startedAt).toISOString().slice(0, 10);
        if (sessionDateStr !== customDate) return false;
      } else if (selectedDateRange !== 'ALL') {
        const sessionTime = new Date(s.startedAt).getTime();
        const now = Date.now();
        if (selectedDateRange === 'TODAY') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          if (sessionTime < startOfToday.getTime()) return false;
        } else if (selectedDateRange === 'LAST_7_DAYS') {
          if (sessionTime < now - 7 * 24 * 60 * 60 * 1000) return false;
        } else if (selectedDateRange === 'LAST_30_DAYS') {
          if (sessionTime < now - 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      // Search query (matches ID, phone, or raw message texts)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = s.id.toLowerCase().includes(query);
        const matchesPhone = s.patientMaskedPhone.includes(query);
        const matchesMessages = s.messages.some(
          (m) =>
            m.text?.toLowerCase().includes(query) ||
            m.transcript?.toLowerCase().includes(query)
        );
        const matchesDecision = s.decision?.finalUrgency.toLowerCase().includes(query);
        if (!matchesId && !matchesPhone && !matchesMessages && !matchesDecision) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, selectedUrgency, selectedStatus, selectedDateRange, searchQuery]);

  // Export CSV Handler (FR-25)
  const handleExportCsv = () => {
    if (sessions.length === 0) return;

    const headers = [
      'SessionID',
      'StartedAt',
      'MaskedPhone',
      'Language',
      'FinalUrgency',
      'IsFinalDecision',
      'DecisionSource',
      'RuleEngineVersion',
      'ModelAdapterVersion',
      'Status',
      'RoutedFacility',
      'ClinicianReview',
    ];

    const rows = filteredSessions.map((s) => [
      s.id,
      s.startedAt,
      `"${s.patientMaskedPhone}"`,
      s.language,
      s.decision?.finalUrgency || 'PENDING',
      s.decision?.isFinalDecision ? 'TRUE' : 'FALSE',
      s.decision?.decisionSource || 'N/A',
      s.metadata.ruleVersion,
      s.metadata.modelAdapterVersion,
      s.status,
      `"${s.routedFacility?.nameEn || 'None'}"`,
      s.clinicianReview ? s.clinicianReview.feedback : 'UNREVIEWED',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `optiroute_triage_sessions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUrgencyBadge = (session: TriageSession) => {
    const decision = session.decision;
    const isCompleted = session.status === 'COMPLETED';

    // If session is completed, NEVER silently display it as "Pending Follow-up"
    if (isCompleted) {
      const urgency = decision?.finalUrgency;
      if (urgency === 'EMERGENCY') {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{language === 'ar' ? 'طارئ 🚨' : 'EMERGENCY 🚨'}</span>
            {session.isLegacyRecord && (
              <span className="text-[10px] bg-rose-100 text-rose-800 px-1 rounded font-normal">
                {language === 'ar' ? 'سجل سابق' : 'Legacy'}
              </span>
            )}
          </span>
        );
      }
      if (urgency === 'URGENT') {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{language === 'ar' ? 'عاجل (اليوم نفسه)' : 'URGENT (Same-Day)'}</span>
            {session.isLegacyRecord && (
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1 rounded font-normal">
                {language === 'ar' ? 'سجل سابق' : 'Legacy'}
              </span>
            )}
          </span>
        );
      }
      if (urgency === 'NON_URGENT') {
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>{language === 'ar' ? 'غير عاجل' : 'NON-URGENT'}</span>
            {session.isLegacyRecord && (
              <span className="text-[10px] bg-teal-100 text-teal-800 px-1 rounded font-normal">
                {language === 'ar' ? 'سجل سابق' : 'Legacy'}
              </span>
            )}
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          <span>{language === 'ar' ? 'مكتمل (سجل سابق)' : 'Completed (Legacy)'}</span>
        </span>
      );
    }

    // Active session still undergoing triage or follow-up
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
        <span>{language === 'ar' ? 'التقييم معلق (متابعة)' : 'Pending Follow-up'}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Prominent Demo Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 text-amber-950 px-3.5 py-2.5 rounded-xl text-xs flex items-start sm:items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
        <span className="leading-relaxed">
          {language === 'ar'
            ? '⚠️ بيئة تجريبية غير محمية بمصادقة خادم: لوحة التحكم تعرض سجلات اصطناعية ومراكز افتراضية فقط لأغراض محاكاة منطق الفرز. لا تتضمن بيانات مرضى فعلية.'
            : '⚠️ Unprotected Synthetic-Data Demo: Dashboard displays fictional simulated records only. No server-side authentication is enforced; do not use with real patient records.'}
        </span>
      </div>

      {/* Session Not Found Banner if navigated with invalid/unknown ID */}
      {sessionNotFoundError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">
              {language === 'ar'
                ? `تعذر العثور على الجلسة (${sessionNotFoundError}) في السجلات المحلية لهذا المتصفح.`
                : `Session (${sessionNotFoundError}) could not be found in this browser’s local records.`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSessionNotFoundError(null)}
            className="p-1 text-rose-500 hover:text-rose-800 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t.dashboardTitle}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.dashboardSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onSwitchToSimulator}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-semibold transition-colors shadow-2xs"
          >
            <span>{language === 'ar' ? '+ محاكاة حالة جديدة' : '+ Simulate New Case'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.exportCsv}</span>
          </button>

          <button
            onClick={() => setShowResetConfirmModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-semibold transition-colors shadow-2xs"
            title={language === 'ar' ? 'إعادة ضبط البيانات التجريبية إلى الحالات الأساسية الثلاث' : 'Reset demo data to 3 baseline synthetic cases'}
            aria-label="Reset demo data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>{language === 'ar' ? 'إعادة ضبط البيانات' : 'Reset Demo Data'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards - Derived strictly from real stored demo sessions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 block">
            {t.totalSessions}
          </span>
          <span className="text-xl font-bold text-slate-950 tabular-nums">
            {metrics.total}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {language === 'ar' ? 'محفوظة بالمخزن المحلي' : 'Local demo storage'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 bg-rose-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 block">
            {t.emergencyCases}
          </span>
          <span className="text-xl font-bold text-rose-900 tabular-nums">
            {metrics.emergency}
          </span>
          <span className="text-[10px] text-rose-600 block mt-0.5">
            {language === 'ar' ? 'أولوية قصوى فورية' : 'Immediate priority'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 block">
            {t.urgentSameDayCases}
          </span>
          <span className="text-xl font-bold text-amber-900 tabular-nums">
            {metrics.urgent}
          </span>
          <span className="text-[10px] text-amber-600 block mt-0.5">
            {language === 'ar' ? 'خلال ساعات اليوم' : 'Within today'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-teal-200 bg-teal-50/20 shadow-2xs">
          <span className="text-[11px] font-semibold text-teal-700 block">
            {t.nonUrgentCases}
          </span>
          <span className="text-xl font-bold text-teal-900 tabular-nums">
            {metrics.nonUrgent}
          </span>
          <span className="text-[10px] text-teal-600 block mt-0.5">
            {language === 'ar' ? 'مراكز الرعاية الأولية' : 'Primary care clinics'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-medium text-slate-500 block">
            {t.awaitingReview}
          </span>
          <span className="text-xl font-bold text-slate-900 tabular-nums">
            {metrics.pendingReview}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {language === 'ar' ? 'تدقيق سريري' : 'Clinical audit'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 rtl:right-3 rtl:left-auto top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full text-xs pl-9 pr-3 rtl:pr-9 rtl:pl-3 py-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Urgency Filter */}
          <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
            {['ALL', 'EMERGENCY', 'URGENT', 'NON_URGENT'].map((u) => (
              <button
                key={u}
                onClick={() => setSelectedUrgency(u)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedUrgency === u
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {u === 'ALL'
                  ? t.filterAll
                  : u === 'EMERGENCY'
                  ? t.filterEmergency
                  : u === 'URGENT'
                  ? t.filterUrgent
                  : t.filterNonUrgent}
              </button>
            ))}
          </div>

          {/* Working Date Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={selectedDateRange}
              onChange={(e) => {
                const val = e.target.value as any;
                setSelectedDateRange(val);
                if (val !== 'CUSTOM') setCustomDate('');
              }}
              className="text-xs bg-transparent text-slate-700 focus:outline-hidden"
              aria-label="Date Filter"
            >
              <option value="ALL">{language === 'ar' ? 'كل التواريخ' : 'All Dates'}</option>
              <option value="TODAY">{language === 'ar' ? 'اليوم فقط' : 'Today Only'}</option>
              <option value="LAST_7_DAYS">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 Days'}</option>
              <option value="LAST_30_DAYS">{language === 'ar' ? 'آخر 30 يوماً' : 'Last 30 Days'}</option>
              <option value="CUSTOM">{language === 'ar' ? 'تاريخ محدد...' : 'Pick Date...'}</option>
            </select>

            {selectedDateRange === 'CUSTOM' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded px-1.5 py-0.5 text-slate-700 focus:outline-hidden"
                aria-label="Select exact date"
              />
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-transparent text-slate-700 focus:outline-hidden"
              aria-label="Status Filter"
            >
              <option value="ALL">{language === 'ar' ? 'كل الحالات' : 'All Statuses'}</option>
              <option value="COMPLETED">{t.statusCompleted}</option>
              <option value="FOLLOW_UP">{t.statusFollowUp}</option>
              <option value="IN_TRIAGE">{t.statusInTriage}</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Density Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden w-full max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-xs text-left rtl:text-right border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">{t.sessionIdCol}</th>
                <th className="py-3 px-4">{t.timeCol}</th>
                <th className="py-3 px-4">{t.phoneCol}</th>
                <th className="py-3 px-4">{t.urgencyCol}</th>
                <th className="py-3 px-4">{t.sourceCol}</th>
                <th className="py-3 px-4">{t.facilityCol}</th>
                <th className="py-3 px-4">{t.reviewCol}</th>
                <th className="py-3 px-4 text-center">{t.actionsCol}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <p className="text-sm">{t.noSessionsFound}</p>
                    <button
                      onClick={onSwitchToSimulator}
                      className="mt-2 text-xs font-semibold text-teal-700 underline"
                    >
                      {language === 'ar' ? 'بدء جلسة جديدة في المحاكي' : 'Start a new session in simulator'}
                    </button>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setInspectedSession(s)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Session ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 tabular-nums">
                        {s.id}
                      </td>

                      {/* Time */}
                      <td className="py-3 px-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                        {new Date(s.startedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Patient Masked Phone */}
                      <td className="py-3 px-4 font-mono text-slate-700 tabular-nums whitespace-nowrap">
                        {s.patientMaskedPhone}
                      </td>

                      {/* Urgency */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getUrgencyBadge(s)}
                      </td>

                      {/* Decision Source */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-slate-600 font-mono">
                          {s.decision?.decisionSource === 'RULE_ENGINE_OVERRIDE' ? (
                            <span className="text-teal-900 font-semibold">{t.ruleOverride}</span>
                          ) : s.decision?.decisionSource === 'HYBRID_AGREEMENT' ? (
                            <span className="text-slate-700">{t.hybridAgreement}</span>
                          ) : s.decision?.decisionSource === 'MODEL_ESCALATION' ? (
                            <span className="text-amber-800 font-semibold">{t.modelEscalation}</span>
                          ) : (
                            <span className="text-rose-800">{t.conservativeFallback}</span>
                          )}
                        </span>
                      </td>

                      {/* Facility */}
                      <td className="py-3 px-4 max-w-[200px] truncate text-slate-700">
                        {s.routedFacility
                          ? language === 'ar'
                            ? s.routedFacility.nameAr
                            : s.routedFacility.nameEn
                          : '—'}
                      </td>

                      {/* Review status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {s.clinicianReview ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ {s.clinicianReview.feedback}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            {t.pendingReview}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedSession(s);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 group-hover:bg-teal-50 group-hover:text-teal-900 rounded-md transition-colors"
                        >
                          <span>{t.viewDetails}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Detail Drawer / Modal */}
      {inspectedSession && (
        <SessionDetailModal
          session={inspectedSession}
          language={language}
          onClose={() => setInspectedSession(null)}
          onReturnToSimulator={() => {
            setInspectedSession(null);
            onSwitchToSimulator();
          }}
          onSubmitReview={(id, rev) => {
            onSubmitReview(id, rev);
            setInspectedSession((prev) =>
              prev ? { ...prev, clinicianReview: { ...rev, reviewedAt: new Date().toISOString() } } : null
            );
          }}
        />
      )}

      {/* Explicit Reset Confirmation Modal (Requirement 5) */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 text-left rtl:text-right">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {language === 'ar'
                      ? 'تأكيد إعادة ضبط البيانات التجريبية'
                      : 'Confirm Demo Data Reset'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'ar'
                      ? 'استرجاع الحالات الاصطناعية الثلاث الأساسية'
                      : 'Restore 3 baseline synthetic cases'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <p>
                {language === 'ar'
                  ? 'سيؤدي هذا الإجراء إلى استبدال كافة جلسات الفرز المحفوظة محلياً في هذا المتصفح واستعادة ثلاث حالات اصطناعية مكتملة بالضبط:'
                  : 'This action will replace all locally stored demo sessions in your browser with exactly three completed synthetic cases:'}
              </p>
              <ul className="space-y-1.5 font-medium text-slate-800 list-disc list-inside">
                <li className="text-rose-700">
                  {language === 'ar'
                    ? 'حالة طارئة (1): تعرض لمادة كيميائية حارقة موجهة لمركز طوارئ العيون 24/7'
                    : 'Emergency (1): Chemical splash routed to fictional 24/7 eye emergency center'}
                </li>
                <li className="text-amber-700">
                  {language === 'ar'
                    ? 'حالة عاجلة (1): التهاب قرنية مرتبط بالعدسات موجهة لعيادات الفحص العاجل في اليوم نفسه'
                    : 'Urgent (1): Contact lens inflammation routed to fictional same-day clinic'}
                </li>
                <li className="text-teal-700">
                  {language === 'ar'
                    ? 'حالة غير عاجلة (1): جفاف وحكة سطحية موجهة لمركز الرعاية الصحية الأولية'
                    : 'Non-urgent (1): Superficial dryness routed to fictional primary care clinic'}
                </li>
              </ul>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 text-amber-950 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                {language === 'ar'
                  ? '⚠️ لن يتم مسح بياناتك أو إعادة ضبطها تلقائياً عند تحديث الصفحة مستقبلاً. هذا الإجراء يتطلب تأكيدك الصريح.'
                  : '⚠️ Data is never reset automatically on page load. Explicit action required.'}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={() => {
                  onResetToSeed();
                  setShowResetConfirmModal(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors shadow-2xs inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {language === 'ar'
                    ? 'تأكيد واسترجاع الحالات الافتراضية'
                    : 'Confirm & Reset Data'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
