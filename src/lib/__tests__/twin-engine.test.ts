import { describe, it, expect } from 'vitest';
import {
  calculateTwinProfile,
  calculateNetworkAggregate,
  createTwinFromValues,
  classifyTwin,
  calculatePoliticianDistance,
} from '@/lib/twin-engine';
import { QUESTIONS } from '@/data/questions';
import { TOPICS, type TwinValues, type Answer, type Politician } from '@/types';

const uniform = (v: number): TwinValues => ({
  klimaschutz: v, sozialstaat: v, wirtschaft: v, bildung: v,
  gesundheit: v, migration: v, freiheit: v, europa: v,
});
const NEUTRAL: TwinValues = uniform(0.5);

describe('calculateTwinProfile', () => {
  it('returns 0.5 for every topic when there are no answers', () => {
    const profile = calculateTwinProfile([]);
    for (const topic of TOPICS) expect(profile[topic]).toBe(0.5);
  });

  it('maps "strongly agree" on a pro question to 1.0', () => {
    const pro = QUESTIONS.find((q) => q.direction === 'pro');
    expect(pro).toBeDefined();
    const profile = calculateTwinProfile([{ questionId: pro!.id, value: 5 }]);
    expect(profile[pro!.topic]).toBe(1);
  });

  it('maps "strongly agree" on a contra question to 0.0', () => {
    const contra = QUESTIONS.find((q) => q.direction === 'contra');
    expect(contra).toBeDefined();
    const profile = calculateTwinProfile([{ questionId: contra!.id, value: 5 }]);
    expect(profile[contra!.topic]).toBe(0);
  });

  it('ignores answers to unknown question ids', () => {
    const answers: Answer[] = [{ questionId: 'does-not-exist', value: 5 }];
    const profile = calculateTwinProfile(answers);
    for (const topic of TOPICS) expect(profile[topic]).toBe(0.5);
  });

  it('averages multiple answers within one topic', () => {
    const proQs = QUESTIONS.filter((q) => q.direction === 'pro');
    const topicWithTwo = TOPICS.find(
      (t) => proQs.filter((q) => q.topic === t).length >= 2,
    );
    if (!topicWithTwo) return; // dataset has no topic with 2 pro questions
    const [q1, q2] = proQs.filter((q) => q.topic === topicWithTwo);
    const profile = calculateTwinProfile([
      { questionId: q1.id, value: 5 }, // 1.0
      { questionId: q2.id, value: 1 }, // 0.0
    ]);
    expect(profile[topicWithTwo]).toBeCloseTo(0.5);
  });
});

describe('calculateNetworkAggregate', () => {
  it('returns count 0 and neutral averages for an empty network', () => {
    const agg = calculateNetworkAggregate([]);
    expect(agg.count).toBe(0);
    for (const topic of TOPICS) expect(agg.averages[topic]).toBe(0.5);
  });

  it('averages values across twins', () => {
    const low = createTwinFromValues({ ...NEUTRAL, klimaschutz: 0 });
    const high = createTwinFromValues({ ...NEUTRAL, klimaschutz: 1 });
    const agg = calculateNetworkAggregate([low, high]);
    expect(agg.count).toBe(2);
    expect(agg.averages.klimaschutz).toBeCloseTo(0.5);
  });
});

describe('classifyTwin', () => {
  it('classifies an all-neutral profile as centrist', () => {
    expect(classifyTwin(NEUTRAL)).toBe('centrist');
  });

  it('classifies a green/open/anti-market profile as progressive', () => {
    expect(
      classifyTwin({ ...NEUTRAL, klimaschutz: 1, migration: 1, wirtschaft: 0 }),
    ).toBe('progressive');
  });

  it('classifies a closed/anti-climate/pro-market profile as conservative', () => {
    expect(
      classifyTwin({ ...NEUTRAL, migration: 0, klimaschutz: 0, wirtschaft: 1, freiheit: 0.3 }),
    ).toBe('conservative');
  });
});

describe('calculatePoliticianDistance', () => {
  const politician: Politician = {
    id: 'test', name: 'Test', party: 'T', partyColor: '#fff', role: 'test',
    profile: NEUTRAL, description: '',
  };

  it('is 0 for identical profiles', () => {
    const d = calculatePoliticianDistance(NEUTRAL, politician);
    expect(d.totalDistance).toBe(0);
  });

  it('is 1 for perfectly opposite profiles', () => {
    const zero: Politician = { ...politician, profile: uniform(0) };
    const d = calculatePoliticianDistance(uniform(1), zero);
    expect(d.totalDistance).toBe(1);
  });
});
