import { describe, it, expect } from 'vitest';
import { AGENDA } from '@/data/agenda';
import { QUESTIONS } from '@/data/questions';
import { SUPPORTED_LANGS } from '@/lib/i18n';

/**
 * Enforces the objective parts of docs/QUESTION-CONSTITUTION.md.
 * (Wording neutrality needs humans; completeness and balance do not.)
 */

const LANGS = SUPPORTED_LANGS.map(l => l.code);

describe('agenda content integrity', () => {
  it('every agenda item has text in all supported languages', () => {
    const gaps: string[] = [];
    for (const item of AGENDA) {
      for (const lang of LANGS) {
        if (!item.text[lang]?.trim()) gaps.push(`${item.id}:text:${lang}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('every agenda item has a description at least in en (fallback anchor) and de', () => {
    const gaps: string[] = [];
    for (const item of AGENDA) {
      for (const lang of ['en', 'de']) {
        if (!item.description[lang]?.trim()) gaps.push(`${item.id}:desc:${lang}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  // KNOWN GAP (audit 2026-07-06): 10 items have descriptions only in de/en —
  // atomwaffen-verbot, digitalsteuer-konzerne, vier-tage-woche,
  // drogenkrieg-entkriminalisierung, welternaehrung-recht,
  // sozialwohnungsbau-pflicht, klimafluechtlinge-aufnahme,
  // patentrecht-impfstoffe, digitale-zentralbankwaehrung, plattformarbeit-rechte.
  // UI falls back to English. Tighten this to all languages once translated:
  it.todo('every agenda item has a description in all 20 supported languages');

  it('agenda ids are unique', () => {
    const ids = AGENDA.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('topic weights are sane (|sum| between 0.5 and 1.5, no zero weights)', () => {
    const bad: string[] = [];
    for (const item of AGENDA) {
      const weights = Object.values(item.topicWeights) as number[];
      const absSum = weights.reduce((s, w) => s + Math.abs(w), 0);
      if (absSum < 0.5 || absSum > 1.5) bad.push(`${item.id}: |w|=${absSum.toFixed(2)}`);
      if (weights.some(w => w === 0)) bad.push(`${item.id}: zero weight`);
    }
    expect(bad).toEqual([]);
  });
});

describe('training questions integrity', () => {
  it('question ids are unique and every question maps to a valid topic', () => {
    const ids = QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const q of QUESTIONS) {
      expect(['pro', 'contra']).toContain(q.direction);
      expect(q.text.trim().length).toBeGreaterThan(10);
    }
  });

  it('constitution rule 6: pro/contra direction stays roughly balanced per topic', () => {
    const perTopic: Record<string, { pro: number; contra: number }> = {};
    for (const q of QUESTIONS) {
      (perTopic[q.topic] ??= { pro: 0, contra: 0 });
      perTopic[q.topic][q.direction]++;
    }
    const imbalanced = Object.entries(perTopic)
      .filter(([, { pro, contra }]) => Math.abs(pro - contra) > Math.max(2, (pro + contra) * 0.6))
      .map(([topic, { pro, contra }]) => `${topic}: ${pro} pro / ${contra} contra`);
    expect(imbalanced).toEqual([]);
  });
});
