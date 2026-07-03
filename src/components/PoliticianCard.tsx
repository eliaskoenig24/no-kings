'use client';

import type { PoliticianDistance } from '@/types';
import TopicPill from './TopicPill';

interface PoliticianCardProps {
  distance: PoliticianDistance;
  rank: number;
}

function alignmentColor(score: number): string {
  if (score >= 70) return 'text-green-400';
  if (score >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

export default function PoliticianCard({ distance, rank }: PoliticianCardProps) {
  const { politician, totalDistance, alignedTopics, divergedTopics } = distance;
  const alignmentScore = Math.round((1 - totalDistance) * 100);
  const colorClass = alignmentColor(alignmentScore);

  // Show up to 2 aligned and 2 diverged topics
  const topAligned = alignedTopics.slice(0, 2);
  const topDiverged = divergedTopics.slice(0, 2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        {/* Rank + name + meta */}
        <div className="flex items-start gap-3 min-w-0">
          <span className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-400">
            {rank}
          </span>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-slate-50 font-semibold truncate">{politician.name}</span>
            <span className="text-slate-500 text-sm truncate">{politician.role}</span>
          </div>
        </div>

        {/* Alignment score */}
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          <span className={`text-2xl font-bold tabular-nums leading-none ${colorClass}`}>
            {alignmentScore}%
          </span>
          <span className="text-xs text-slate-500">Übereinstimmung</span>
        </div>
      </div>

      {/* Party badge */}
      <div>
        <span
          className="inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: politician.partyColor }}
        >
          {politician.party}
        </span>
      </div>

      {/* Topics */}
      {(topAligned.length > 0 || topDiverged.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {topAligned.map((topic) => (
            <TopicPill key={topic} topic={topic} variant="aligned" size="sm" />
          ))}
          {topDiverged.map((topic) => (
            <TopicPill key={topic} topic={topic} variant="diverged" size="sm" />
          ))}
        </div>
      )}
    </div>
  );
}
