import {
  Answer,
  TOPICS,
  TwinValues,
  TwinProfile,
  NetworkAggregate,
  Politician,
  PoliticianDistance,
  TopicKey,
} from '@/types';
import { QUESTIONS } from '@/data/questions';
import { v4 as uuidv4 } from 'uuid';

// Convert answers to a TwinProfile
export function calculateTwinProfile(answers: Answer[]): TwinProfile {
  const topicSums: Record<TopicKey, number[]> = {
    klimaschutz: [],
    sozialstaat: [],
    wirtschaft: [],
    bildung: [],
    gesundheit: [],
    migration: [],
    freiheit: [],
    europa: [],
  };

  for (const answer of answers) {
    const question = QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) continue;
    // Convert 1-5 to 0-1, reverse if 'contra'
    const raw = (answer.value - 1) / 4;
    const value = question.direction === 'pro' ? raw : 1 - raw;
    topicSums[question.topic].push(value);
  }

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5;

  return {
    id: uuidv4(),
    klimaschutz: avg(topicSums.klimaschutz),
    sozialstaat: avg(topicSums.sozialstaat),
    wirtschaft: avg(topicSums.wirtschaft),
    bildung: avg(topicSums.bildung),
    gesundheit: avg(topicSums.gesundheit),
    migration: avg(topicSums.migration),
    freiheit: avg(topicSums.freiheit),
    europa: avg(topicSums.europa),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Compute network aggregate from list of twin profiles
export function calculateNetworkAggregate(twins: TwinProfile[]): NetworkAggregate {
  if (twins.length === 0) {
    return {
      count: 0,
      averages: {
        klimaschutz: 0.5,
        sozialstaat: 0.5,
        wirtschaft: 0.5,
        bildung: 0.5,
        gesundheit: 0.5,
        migration: 0.5,
        freiheit: 0.5,
        europa: 0.5,
      },
    };
  }

  const avg = (topic: TopicKey) =>
    twins.reduce((sum, t) => sum + t[topic], 0) / twins.length;

  return {
    count: twins.length,
    averages: {
      klimaschutz: avg('klimaschutz'),
      sozialstaat: avg('sozialstaat'),
      wirtschaft: avg('wirtschaft'),
      bildung: avg('bildung'),
      gesundheit: avg('gesundheit'),
      migration: avg('migration'),
      freiheit: avg('freiheit'),
      europa: avg('europa'),
    },
  };
}

// Calculate distance between a twin and a politician
export function calculatePoliticianDistance(
  twin: TwinValues,
  politician: Politician,
): PoliticianDistance {
  const topicDistances = {} as Record<TopicKey, number>;
  let totalDistance = 0;

  for (const topic of TOPICS) {
    const d = Math.abs(twin[topic] - politician.profile[topic]);
    topicDistances[topic] = d;
    totalDistance += d;
  }

  totalDistance = totalDistance / TOPICS.length;

  const sorted = [...TOPICS].sort(
    (a, b) => topicDistances[a] - topicDistances[b],
  );
  const alignedTopics = sorted.slice(0, 3);
  const divergedTopics = sorted.slice(-3).reverse();

  return {
    politician,
    totalDistance,
    topicDistances,
    alignedTopics,
    divergedTopics,
  };
}

// Create a TwinProfile directly from 0-1 slider values
export function createTwinFromValues(values: TwinValues): TwinProfile {
  return {
    id: uuidv4(),
    ...values,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export type ArchetypeKey = 'progressive' | 'socialdem' | 'liberal' | 'conservative' | 'libertarian' | 'centrist';

export function classifyTwin(twin: TwinValues): ArchetypeKey {
  const scores: Record<ArchetypeKey, number> = {
    progressive:  (twin.klimaschutz + twin.migration + (1 - twin.wirtschaft)) / 3,
    socialdem:    (twin.sozialstaat + twin.gesundheit + twin.bildung) / 3,
    liberal:      (twin.freiheit + twin.wirtschaft + (1 - twin.sozialstaat)) / 3,
    conservative: ((1 - twin.migration) + (1 - twin.klimaschutz) + twin.wirtschaft) / 3,
    libertarian:  (twin.freiheit + twin.wirtschaft + (1 - twin.migration)) / 3,
    centrist:     0.5,
  };

  const allClose = (Object.entries(scores) as [ArchetypeKey, number][])
    .filter(([k]) => k !== 'centrist')
    .every(([, v]) => Math.abs(v - 0.5) < 0.12);
  if (allClose) return 'centrist';

  return (Object.entries(scores) as [ArchetypeKey, number][])
    .filter(([k]) => k !== 'centrist')
    .reduce((best, curr) => curr[1] > best[1] ? curr : best)[0];
}

