import React, { useState, useEffect } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { Language } from '../../types/triage';

interface AudioPlayerSimProps {
  durationSeconds?: number;
  transcript?: string;
  language: Language;
}

export const AudioPlayerSim: React.FC<AudioPlayerSimProps> = ({
  durationSeconds = 12,
  transcript,
  language,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 100 / (durationSeconds * 10);
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, durationSeconds]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const elapsed = Math.floor((progress / 100) * durationSeconds);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center gap-2.5 bg-emerald-950/5 dark:bg-emerald-500/10 p-2 rounded-xl">
        <button
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center shrink-0 hover:bg-emerald-800 transition-colors shadow-2xs"
          aria-label={isPlaying ? 'Pause' : 'Play audio note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Simulated Waveform */}
        <div className="flex-1 flex items-center gap-0.5 h-6 cursor-pointer" onClick={togglePlay}>
          {[40, 65, 30, 85, 55, 95, 45, 75, 90, 60, 40, 70, 85, 50, 65, 80, 40, 90, 60, 35].map(
            (heightPercent, idx) => {
              const barProgress = (idx / 20) * 100;
              const isPast = progress >= barProgress;
              return (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-colors duration-150 ${
                    isPast ? 'bg-emerald-700' : 'bg-emerald-300/80'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
              );
            }
          )}
        </div>

        <div className="text-[11px] text-slate-500 tabular-nums font-mono shrink-0">
          {isPlaying ? formatTime(elapsed) : formatTime(durationSeconds)}
        </div>
      </div>

      {transcript && (
        <div className="text-[12px] text-slate-700 bg-white/70 p-2 rounded-lg border border-slate-200/60 leading-relaxed">
          <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-0.5 font-medium">
            <Mic className="w-3 h-3 text-emerald-600" />
            <span>
              {language === 'ar'
                ? 'نص عينة صوتية مسجلة مسبقاً (محاكاة تجريبية — لا يتم استخدام تفريغ صوتي آلي)'
                : 'Pre-recorded sample transcript (Demo fixture — no live speech transcription)'}
            </span>
          </div>
          <p className="italic font-normal">"{transcript}"</p>
        </div>
      )}
    </div>
  );
};
