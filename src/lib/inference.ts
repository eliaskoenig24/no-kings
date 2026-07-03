import type { AgendaItem, AgendaAggregate, TwinValues, TwinVote, TopicKey } from '@/types';

/**
 * Core of the autonomous agent concept.
 *
 * Given a twin's values and a political question, computes the twin's position
 * WITHOUT requiring the user to be online or to answer the question manually.
 *
 * Formula: score = 0.5 + Σ (twin[topic] − 0.5) × weight
 *   - Positive weight: dimension agrees with the question's direction
 *   - Negative weight: dimension opposes the question's direction
 *   - score > 0.5 = twin supports the question
 *   - score < 0.5 = twin opposes the question
 */
export function inferPosition(twin: TwinValues, item: AgendaItem): TwinVote {
  let score = 0.5;
  let totalAbsWeight = 0;

  for (const [topic, weight] of Object.entries(item.topicWeights) as [TopicKey, number][]) {
    score += (twin[topic] - 0.5) * weight;
    totalAbsWeight += Math.abs(weight);
  }

  return {
    itemId: item.id,
    score: Math.max(0, Math.min(1, score)),
    confidence: Math.min(1, totalAbsWeight),
  };
}

/** Compute positions for all agenda items at once */
export function inferAllPositions(twin: TwinValues, items: AgendaItem[]): TwinVote[] {
  return items.map((item) => inferPosition(twin, item));
}

/** Aggregate how a population of twins responds to a single question */
export function aggregateForItem(twins: TwinValues[], item: AgendaItem): AgendaAggregate {
  if (twins.length === 0) {
    return { itemId: item.id, support: 0.5, meanScore: 0.5, distribution: Array(10).fill(0), count: 0 };
  }

  const scores = twins.map((t) => inferPosition(t, item).score);
  const support = scores.filter((s) => s >= 0.5).length / scores.length;
  const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const buckets = Array(10).fill(0) as number[];
  for (const s of scores) {
    buckets[Math.min(9, Math.floor(s * 10))]++;
  }
  const maxCount = Math.max(...buckets);
  const distribution = buckets.map((v) => (maxCount > 0 ? v / maxCount : 0));

  return { itemId: item.id, support, meanScore, distribution, count: scores.length };
}

/** Aggregate all items at once */
export function aggregateAll(twins: TwinValues[], items: AgendaItem[]): AgendaAggregate[] {
  return items.map((item) => aggregateForItem(twins, item));
}
