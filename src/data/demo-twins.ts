import { TwinProfile } from '@/types';

// Regional population means — approximate global polling aggregates
const REGIONS: Array<{
  codes: string[];
  weight: number; // relative population weight
  means: Record<string, number>;
}> = [
  {
    // Western Europe
    codes: ['DE', 'FR', 'ES', 'IT', 'NL', 'PL', 'SE', 'BE', 'AT', 'CH'],
    weight: 12,
    means: { klimaschutz: 0.65, sozialstaat: 0.66, wirtschaft: 0.46, bildung: 0.71, gesundheit: 0.73, migration: 0.42, freiheit: 0.60, europa: 0.58 },
  },
  {
    // North America
    codes: ['US', 'CA'],
    weight: 5,
    means: { klimaschutz: 0.55, sozialstaat: 0.48, wirtschaft: 0.40, bildung: 0.62, gesundheit: 0.60, migration: 0.46, freiheit: 0.65, europa: 0.30 },
  },
  {
    // Latin America
    codes: ['BR', 'MX', 'AR', 'CO', 'CL', 'PE'],
    weight: 8,
    means: { klimaschutz: 0.60, sozialstaat: 0.62, wirtschaft: 0.44, bildung: 0.68, gesundheit: 0.67, migration: 0.50, freiheit: 0.55, europa: 0.28 },
  },
  {
    // East Asia
    codes: ['CN', 'JP', 'KR', 'TW'],
    weight: 18,
    means: { klimaschutz: 0.58, sozialstaat: 0.60, wirtschaft: 0.52, bildung: 0.75, gesundheit: 0.70, migration: 0.30, freiheit: 0.45, europa: 0.22 },
  },
  {
    // South Asia
    codes: ['IN', 'PK', 'BD', 'LK'],
    weight: 20,
    means: { klimaschutz: 0.55, sozialstaat: 0.58, wirtschaft: 0.48, bildung: 0.70, gesundheit: 0.65, migration: 0.40, freiheit: 0.50, europa: 0.20 },
  },
  {
    // Southeast Asia
    codes: ['ID', 'PH', 'VN', 'TH', 'MY', 'SG'],
    weight: 9,
    means: { klimaschutz: 0.57, sozialstaat: 0.56, wirtschaft: 0.50, bildung: 0.69, gesundheit: 0.66, migration: 0.38, freiheit: 0.52, europa: 0.18 },
  },
  {
    // Middle East / North Africa
    codes: ['TR', 'EG', 'SA', 'IR', 'MA', 'DZ'],
    weight: 7,
    means: { klimaschutz: 0.50, sozialstaat: 0.55, wirtschaft: 0.45, bildung: 0.63, gesundheit: 0.62, migration: 0.28, freiheit: 0.40, europa: 0.20 },
  },
  {
    // Sub-Saharan Africa
    codes: ['NG', 'ET', 'KE', 'GH', 'ZA', 'TZ', 'UG'],
    weight: 14,
    means: { klimaschutz: 0.58, sozialstaat: 0.60, wirtschaft: 0.47, bildung: 0.72, gesundheit: 0.68, migration: 0.45, freiheit: 0.54, europa: 0.18 },
  },
  {
    // Eastern Europe & Central Asia
    codes: ['RU', 'UA', 'KZ', 'RO', 'HU', 'CZ', 'SK'],
    weight: 5,
    means: { klimaschutz: 0.52, sozialstaat: 0.57, wirtschaft: 0.44, bildung: 0.65, gesundheit: 0.63, migration: 0.30, freiheit: 0.48, europa: 0.42 },
  },
  {
    // Oceania
    codes: ['AU', 'NZ'],
    weight: 2,
    means: { klimaschutz: 0.62, sozialstaat: 0.58, wirtschaft: 0.43, bildung: 0.66, gesundheit: 0.68, migration: 0.50, freiheit: 0.63, europa: 0.25 },
  },
];

const POPULATION_STD = 0.16;

function clamp(v: number): number {
  return Math.max(0.01, Math.min(0.99, v));
}

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return clamp(mean + std * z);
}

// Pick a region by weight, then a country code from that region
function pickRegion(): typeof REGIONS[0] {
  const totalWeight = REGIONS.reduce((s, r) => s + r.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const region of REGIONS) {
    rand -= region.weight;
    if (rand <= 0) return region;
  }
  return REGIONS[0];
}

export interface TaggedTwin {
  twin: TwinProfile;
  country: string;
}

export function generateDemoTwins(count: number = 1000): TwinProfile[] {
  const twins: TwinProfile[] = [];
  for (let i = 0; i < count; i++) {
    const region = pickRegion();
    const m = region.means;
    twins.push({
      id: `demo-${i}`,
      klimaschutz: gaussianRandom(m.klimaschutz, POPULATION_STD),
      sozialstaat: gaussianRandom(m.sozialstaat, POPULATION_STD),
      wirtschaft: gaussianRandom(m.wirtschaft, POPULATION_STD),
      bildung: gaussianRandom(m.bildung, POPULATION_STD),
      gesundheit: gaussianRandom(m.gesundheit, POPULATION_STD),
      migration: gaussianRandom(m.migration, POPULATION_STD),
      freiheit: gaussianRandom(m.freiheit, POPULATION_STD),
      europa: gaussianRandom(m.europa, POPULATION_STD),
      createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
  return twins;
}

export function generateDemoTwinsTagged(count: number = 1000): TaggedTwin[] {
  const tagged: TaggedTwin[] = [];
  for (let i = 0; i < count; i++) {
    const region = pickRegion();
    const m = region.means;
    const country = region.codes[Math.floor(Math.random() * region.codes.length)];
    tagged.push({
      country,
      twin: {
        id: `demo-${i}`,
        klimaschutz: gaussianRandom(m.klimaschutz, POPULATION_STD),
        sozialstaat: gaussianRandom(m.sozialstaat, POPULATION_STD),
        wirtschaft: gaussianRandom(m.wirtschaft, POPULATION_STD),
        bildung: gaussianRandom(m.bildung, POPULATION_STD),
        gesundheit: gaussianRandom(m.gesundheit, POPULATION_STD),
        migration: gaussianRandom(m.migration, POPULATION_STD),
        freiheit: gaussianRandom(m.freiheit, POPULATION_STD),
        europa: gaussianRandom(m.europa, POPULATION_STD),
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  }
  return tagged;
}

export const DEMO_TWINS = generateDemoTwins(1000);
export const DEMO_TWINS_TAGGED = generateDemoTwinsTagged(2500);
