import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic, AlertCircle, RefreshCw } from 'lucide-react';
import { Language } from '../../types/triage';
import { getAssetUrl } from '../../utils/assets';

interface AudioPlayerSimProps {
  durationSeconds?: number;
  transcript?: string;
  language: Language;
  audioUrl?: string;
}

export const AudioPlayerSim: React.FC<AudioPlayerSimProps> = ({
  durationSeconds = 12,
  transcript,
  language,
  audioUrl,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [realDuration, setRealDuration] = useState<number>(durationSeconds);
  const [hasError, setHasError] = useState(false);
  const [showTranscriptFallback, setShowTranscriptFallback] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // If audioUrl is present, attach audio element lifecycle
  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = getAssetUrl(audioUrl);
    audioRef.current = audio;
    setHasError(false);
    setShowTranscriptFallback(false);

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setRealDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (hasError) return;

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Audio playback error:', err);
            setHasError(true);
            setIsPlaying(false);
          });
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || hasError || !realDuration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = newProgress * realDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const progressPercent = realDuration > 0 ? (currentTime / realDuration) * 100 : 0;

  const formatTime = (secs: number) => {
    const totalSecs = Math.max(0, Math.floor(secs));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-1.5 w-full">
      {/* Real HTML5 Audio Player Controls */}
      <div className="flex items-center gap-2.5 bg-emerald-950/5 dark:bg-emerald-500/10 p-2 rounded-xl">
        <button
          type="button"
          onClick={togglePlay}
          disabled={hasError}
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors shadow-2xs ${
            hasError
              ? 'bg-slate-400 text-white cursor-not-allowed'
              : 'bg-emerald-700 text-white hover:bg-emerald-800'
          }`}
          aria-label={isPlaying ? 'Pause' : 'Play audio note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Audio Waveform / Progress Scrub Bar */}
        <div
          className="flex-1 flex items-center gap-0.5 h-6 cursor-pointer py-1"
          onClick={handleSeek}
          title={language === 'ar' ? 'التقدم في التسجيل الصوتي' : 'Scrub audio position'}
        >
          {[40, 65, 30, 85, 55, 95, 45, 75, 90, 60, 40, 70, 85, 50, 65, 80, 40, 90, 60, 35].map(
            (heightPercent, idx) => {
              const barProgress = (idx / 20) * 100;
              const isPast = progressPercent >= barProgress;
              return (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-colors duration-150 ${
                    hasError
                      ? 'bg-slate-300'
                      : isPast
                      ? 'bg-emerald-700'
                      : 'bg-emerald-300/80'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              );
            }
          )}
        </div>

        {/* Real Audio Metadata Duration / Elapsed Time */}
        <div className="text-[11px] text-slate-500 tabular-nums font-mono shrink-0">
          {isPlaying ? formatTime(currentTime) : formatTime(realDuration)}
        </div>
      </div>

      {/* Honest Error State if Audio Fails to Load */}
      {hasError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>
              {language === 'ar'
                ? 'تعذر تحميل الملف الصوتي التجريبي'
                : 'Failed to load pre-recorded demo audio file'}
            </span>
          </div>
          <p className="text-[11px] text-rose-700">
            {language === 'ar'
              ? 'يمكنك المتابعة باستخدام النص المسجل المرفق أدناه دون انقطاع الفرز الطبي.'
              : 'You can continue using the attached transcript below without interrupting clinical triage.'}
          </p>
          <button
            type="button"
            onClick={() => setShowTranscriptFallback(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-900 underline hover:text-rose-950 mt-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{language === 'ar' ? 'عرض النص والمتابعة' : 'Display transcript & continue'}</span>
          </button>
        </div>
      )}

      {/* Labeled Transcript Bubble */}
      {transcript && (!hasError || showTranscriptFallback) && (
        <div className="text-[12px] text-slate-700 bg-white/70 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-0.5 font-medium">
            <Mic className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>
              {language === 'ar'
                ? 'صوت اصطناعي تجريبي — نص مُعد مسبقًا'
                : 'Synthetic demo audio — prepared transcript'}
            </span>
          </div>
          <p className="italic font-normal">"{transcript}"</p>
        </div>
      )}
    </div>
  );
};
