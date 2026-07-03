'use client';

interface ProgressBarProps {
  current: number;   // 0-based current question index
  total: number;
  topicName?: string; // e.g. "Klima"
}

export default function ProgressBar({ current, total, topicName }: ProgressBarProps) {
  const displayNumber = current + 1;
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Labels row */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">
          Frage{' '}
          <span className="text-slate-200 font-medium">{displayNumber}</span>
          {' '}von{' '}
          <span className="text-slate-200 font-medium">{total}</span>
        </span>

        {topicName && (
          <span className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-3 py-0.5 text-xs font-medium text-blue-400">
            {topicName}
          </span>
        )}
      </div>

      {/* Bar */}
      <div
        className="w-full h-2 bg-slate-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={displayNumber}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Frage ${displayNumber} von ${total}`}
      >
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
