export type TopicKey =
  | 'klimaschutz'
  | 'sozialstaat'
  | 'wirtschaft'
  | 'bildung'
  | 'gesundheit'
  | 'migration'
  | 'freiheit'
  | 'europa';

export const TOPIC_LABELS: Record<TopicKey, string> = {
  klimaschutz: 'Klima',
  sozialstaat: 'Soziales',
  wirtschaft: 'Wirtschaft',
  bildung: 'Bildung',
  gesundheit: 'Gesundheit',
  migration: 'Migration',
  freiheit: 'Freiheit',
  europa: 'Europa',
};

export const TOPIC_DESCRIPTIONS: Record<TopicKey, { low: string; high: string }> = {
  klimaschutz: {
    low: 'Klimaschutz nicht prioritär',
    high: 'Klimaschutz höchste Priorität',
  },
  sozialstaat: {
    low: 'Kleiner Staat, weniger Sozialleistungen',
    high: 'Starker Sozialstaat',
  },
  wirtschaft: {
    low: 'Freier Markt, wenig Regulierung',
    high: 'Starke staatliche Wirtschaftslenkung',
  },
  bildung: {
    low: 'Mehr private Bildungsangebote',
    high: 'Starkes öffentliches Bildungssystem',
  },
  gesundheit: {
    low: 'Mehr private Krankenversorgung',
    high: 'Starkes öffentliches Gesundheitssystem',
  },
  migration: {
    low: 'Strikte Migrationsbeschränkungen',
    high: 'Offene Migrationspolitik',
  },
  freiheit: {
    low: 'Mehr Sicherheit und staatliche Kontrolle',
    high: 'Mehr Bürgerrechte und Freiheit',
  },
  europa: {
    low: 'Mehr nationale Eigenständigkeit',
    high: 'Starke EU-Integration',
  },
};

export const TOPICS: TopicKey[] = [
  'klimaschutz',
  'sozialstaat',
  'wirtschaft',
  'bildung',
  'gesundheit',
  'migration',
  'freiheit',
  'europa',
];

export const TOPIC_EMOJIS: Record<TopicKey, string> = {
  klimaschutz: '🌍',
  sozialstaat: '🤝',
  wirtschaft: '📈',
  bildung: '📚',
  gesundheit: '❤️',
  migration: '🌐',
  freiheit: '⚖️',
  europa: '🇪🇺',
};

export interface TwinValues {
  klimaschutz: number;
  sozialstaat: number;
  wirtschaft: number;
  bildung: number;
  gesundheit: number;
  migration: number;
  freiheit: number;
  europa: number;
}

export interface TwinProfile extends TwinValues {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  topic: TopicKey;
  text: string;
  direction: 'pro' | 'contra'; // 'pro': agree=high value; 'contra': agree=low value
}

export interface Answer {
  questionId: string;
  value: 1 | 2 | 3 | 4 | 5; // 1=strongly disagree, 5=strongly agree
}

export interface TrainingState {
  answers: Answer[];
  currentQuestion: number;
  completed: boolean;
}

export interface Politician {
  id: string;
  name: string;
  party: string;
  partyColor: string;
  role: string;
  profile: TwinValues;
  description: string;
}

export interface NetworkAggregate {
  count: number;
  averages: TwinValues;
}

export interface PoliticianDistance {
  politician: Politician;
  totalDistance: number; // 0-1 (0=perfect match, 1=opposite)
  topicDistances: Record<TopicKey, number>;
  alignedTopics: TopicKey[];
  divergedTopics: TopicKey[];
}

// Real-world anchor of a question: the documented decision, law, treaty or
// ruling where institutions actually dealt with it. Required by the Question
// Constitution so that "no kings" never invents its own agenda.
export interface AgendaSource {
  org: string;   // institution, in English (universal): "European Parliament & Council"
  doc: string;   // document identifier + short title: "Regulation (EU) 2021/1119 — European Climate Law"
  date: string;  // ISO date of adoption/decision/publication
  url?: string;  // only stable official URLs; omitted when none exists — the doc ID is the citation
  relation: 'exact' | 'related'; // exact: the document decides this question in its jurisdiction; related: nearest real instrument
}

// Political question the twin can autonomously answer
export interface AgendaItem {
  id: string;
  text: Record<string, string>;      // 20-lang question text
  description: Record<string, string>; // 20-lang context/explanation
  // Signed weights: positive = high dimension value → support
  //                 negative = high dimension value → oppose
  // |weights| should sum to ~1
  topicWeights: Partial<Record<TopicKey, number>>;
  category: TopicKey;
  addedAt: string; // ISO date
  tags: string[];
  source?: AgendaSource; // real-world anchor; every live question must carry one
}

export interface TwinVote {
  itemId: string;
  score: number;    // 0–1; >0.5 = support, <0.5 = oppose
  confidence: number; // 0–1; how strongly relevant this topic is to the twin
}

export interface AgendaAggregate {
  itemId: string;
  support: number;  // fraction 0–1 of twins that score ≥ 0.5
  meanScore: number;
  distribution: number[]; // 10 buckets [0-10%], [10-20%], …
  count: number;
}
