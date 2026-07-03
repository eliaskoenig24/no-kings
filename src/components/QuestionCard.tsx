'use client';

interface QuestionCardProps {
  question: { id: string; topic: string; text: string };
  selectedValue: number | null;
  onSelect: (value: 1 | 2 | 3 | 4 | 5) => void;
  questionNumber: number;
  totalQuestions: number;
}

const OPTIONS: { label: string; value: 1 | 2 | 3 | 4 | 5 }[] = [
  { label: 'Stimme voll zu', value: 5 },
  { label: 'Stimme zu', value: 4 },
  { label: 'Neutral', value: 3 },
  { label: 'Stimme nicht zu', value: 2 },
  { label: 'Stimme gar nicht zu', value: 1 },
];

export default function QuestionCard({
  question,
  selectedValue,
  onSelect,
  questionNumber,
  totalQuestions,
}: QuestionCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-blue-400 uppercase tracking-wide">
          {question.topic}
        </span>
        <span className="text-xs text-slate-500">
          {questionNumber} / {totalQuestions}
        </span>
      </div>

      {/* Question text */}
      <p className="text-xl font-medium text-slate-50 leading-snug">
        {question.text}
      </p>

      {/* Options */}
      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        role="radiogroup"
        aria-label="Antwortoptionen"
      >
        {OPTIONS.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              role="radio"
              aria-checked={isSelected}
              onClick={() => onSelect(option.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(option.value);
                }
              }}
              className={[
                'flex items-center justify-center text-center text-sm font-medium',
                'rounded-lg px-3 py-3 border transition-colors cursor-pointer',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                isSelected
                  ? 'bg-blue-600 border-blue-500 text-white ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-600 hover:text-slate-50',
              ].join(' ')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
