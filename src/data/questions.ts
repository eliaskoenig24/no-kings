import { Question } from '@/types';

export const QUESTIONS: Question[] = [
  // ── KLIMASCHUTZ ──────────────────────────────────────────────────────────────
  {
    id: 'klima_1',
    topic: 'klimaschutz',
    text: 'Der Staat soll erneuerbare Energien stark fördern, auch wenn es kurzfristig teurer wird.',
    direction: 'pro',
  },
  {
    id: 'klima_2',
    topic: 'klimaschutz',
    text: 'Unternehmen sollen für den Ausstoß von CO₂ eine Abgabe zahlen müssen.',
    direction: 'pro',
  },
  {
    id: 'klima_3',
    topic: 'klimaschutz',
    text: 'Der Ausstieg aus Öl und Gas sollte so schnell wie möglich erfolgen, unabhängig von wirtschaftlichen Kosten.',
    direction: 'pro',
  },
  {
    id: 'klima_4',
    topic: 'klimaschutz',
    text: 'Klimaschutzmaßnahmen schaden der deutschen Wirtschaft mehr, als sie nützen.',
    direction: 'contra',
  },
  {
    id: 'klima_5',
    topic: 'klimaschutz',
    text: 'Technologischer Fortschritt allein wird das Klimaproblem lösen – staatliche Eingriffe sind nicht nötig.',
    direction: 'contra',
  },

  // ── SOZIALSTAAT ──────────────────────────────────────────────────────────────
  {
    id: 'sozial_1',
    topic: 'sozialstaat',
    text: 'Der Staat soll sicherstellen, dass niemand in Armut lebt, auch wenn das höhere Steuern bedeutet.',
    direction: 'pro',
  },
  {
    id: 'sozial_2',
    topic: 'sozialstaat',
    text: 'Reiche Menschen und Unternehmen sollen mehr Steuern zahlen als heute.',
    direction: 'pro',
  },
  {
    id: 'sozial_3',
    topic: 'sozialstaat',
    text: 'Der Mindestlohn soll regelmäßig erhöht werden, um mit den Lebenshaltungskosten Schritt zu halten.',
    direction: 'pro',
  },
  {
    id: 'sozial_4',
    topic: 'sozialstaat',
    text: 'Sozialleistungen machen Menschen abhängig und sollten deshalb gekürzt werden.',
    direction: 'contra',
  },
  {
    id: 'sozial_5',
    topic: 'sozialstaat',
    text: 'Der Staat soll sich möglichst wenig in die wirtschaftliche Absicherung der Bürger einmischen.',
    direction: 'contra',
  },

  // ── WIRTSCHAFT ───────────────────────────────────────────────────────────────
  {
    id: 'wirtschaft_1',
    topic: 'wirtschaft',
    text: 'Der Staat soll strategisch wichtige Industrien aktiv unterstützen und lenken.',
    direction: 'pro',
  },
  {
    id: 'wirtschaft_2',
    topic: 'wirtschaft',
    text: 'Große Unternehmen sollen stärker reguliert werden, um Wettbewerb zu sichern.',
    direction: 'pro',
  },
  {
    id: 'wirtschaft_3',
    topic: 'wirtschaft',
    text: 'Manche Bereiche der Daseinsvorsorge – wie Energie oder Bahn – gehören in staatliche Hand.',
    direction: 'pro',
  },
  {
    id: 'wirtschaft_4',
    topic: 'wirtschaft',
    text: 'Bürokratie und Regulierung sind das größte Hemmnis für wirtschaftliches Wachstum in Deutschland.',
    direction: 'contra',
  },
  {
    id: 'wirtschaft_5',
    topic: 'wirtschaft',
    text: 'Privatunternehmen wirtschaften in der Regel effizienter als staatliche Betriebe.',
    direction: 'contra',
  },

  // ── BILDUNG ──────────────────────────────────────────────────────────────────
  {
    id: 'bildung_1',
    topic: 'bildung',
    text: 'Bildung von der Kita bis zur Universität soll für alle kostenlos sein.',
    direction: 'pro',
  },
  {
    id: 'bildung_2',
    topic: 'bildung',
    text: 'Der Staat soll deutlich mehr in Schulen und Lehrer investieren.',
    direction: 'pro',
  },
  {
    id: 'bildung_3',
    topic: 'bildung',
    text: 'Kinder aus einkommensschwachen Familien sollen besonders gefördert werden, um Chancengleichheit herzustellen.',
    direction: 'pro',
  },
  {
    id: 'bildung_4',
    topic: 'bildung',
    text: 'Privatschulen und private Hochschulen sind eine sinnvolle Ergänzung zum öffentlichen Bildungssystem.',
    direction: 'contra',
  },
  {
    id: 'bildung_5',
    topic: 'bildung',
    text: 'Eltern sollen mehr Wahlfreiheit bei der Schulwahl ihrer Kinder haben, auch wenn das öffentliche Schulen schwächt.',
    direction: 'contra',
  },

  // ── GESUNDHEIT ───────────────────────────────────────────────────────────────
  {
    id: 'gesundheit_1',
    topic: 'gesundheit',
    text: 'Alle Menschen in Deutschland sollen unabhängig von ihrem Einkommen die gleiche Gesundheitsversorgung erhalten.',
    direction: 'pro',
  },
  {
    id: 'gesundheit_2',
    topic: 'gesundheit',
    text: 'Gesetzliche und private Krankenversicherung sollen zu einer einheitlichen Versicherung zusammengeführt werden.',
    direction: 'pro',
  },
  {
    id: 'gesundheit_3',
    topic: 'gesundheit',
    text: 'Krankenhäuser sollen nicht nach Gewinn streben, sondern vollständig im öffentlichen Interesse betrieben werden.',
    direction: 'pro',
  },
  {
    id: 'gesundheit_4',
    topic: 'gesundheit',
    text: 'Wer mehr einzahlt oder privat versichert ist, soll schneller und besser behandelt werden dürfen.',
    direction: 'contra',
  },
  {
    id: 'gesundheit_5',
    topic: 'gesundheit',
    text: 'Private Anbieter im Gesundheitswesen steigern die Qualität und Effizienz der Versorgung.',
    direction: 'contra',
  },

  // ── MIGRATION ────────────────────────────────────────────────────────────────
  {
    id: 'migration_1',
    topic: 'migration',
    text: 'Deutschland soll Flüchtlinge und Schutzsuchende großzügig aufnehmen.',
    direction: 'pro',
  },
  {
    id: 'migration_2',
    topic: 'migration',
    text: 'Zuwanderung bereichert Deutschland kulturell und wirtschaftlich.',
    direction: 'pro',
  },
  {
    id: 'migration_3',
    topic: 'migration',
    text: 'Der Familiennachzug für Geflüchtete soll erleichtert werden.',
    direction: 'pro',
  },
  {
    id: 'migration_4',
    topic: 'migration',
    text: 'Die Einreise nach Deutschland soll an den Außengrenzen stärker kontrolliert und eingeschränkt werden.',
    direction: 'contra',
  },
  {
    id: 'migration_5',
    topic: 'migration',
    text: 'Wer keine Aufenthaltserlaubnis hat, soll konsequent und zügig abgeschoben werden.',
    direction: 'contra',
  },

  // ── FREIHEIT ─────────────────────────────────────────────────────────────────
  {
    id: 'freiheit_1',
    topic: 'freiheit',
    text: 'Der Schutz der Privatsphäre soll Vorrang vor staatlicher Sicherheitsüberwachung haben.',
    direction: 'pro',
  },
  {
    id: 'freiheit_2',
    topic: 'freiheit',
    text: 'Versammlungsfreiheit und das Recht auf Protest sollen auch dann geschützt sein, wenn sie unbequem sind.',
    direction: 'pro',
  },
  {
    id: 'freiheit_3',
    topic: 'freiheit',
    text: 'Staatliche Stellen sollen keine anlasslose Massenüberwachung von Bürgerinnen und Bürgern betreiben.',
    direction: 'pro',
  },
  {
    id: 'freiheit_4',
    topic: 'freiheit',
    text: 'Mehr Videoüberwachung im öffentlichen Raum macht uns sicherer und ist deshalb sinnvoll.',
    direction: 'contra',
  },
  {
    id: 'freiheit_5',
    topic: 'freiheit',
    text: 'Behörden sollen bei Verdacht auf Terrorismus auch ohne richterliche Genehmigung überwachen dürfen.',
    direction: 'contra',
  },

  // ── EUROPA ───────────────────────────────────────────────────────────────────
  {
    id: 'europa_1',
    topic: 'europa',
    text: 'Die Europäische Union soll mehr gemeinsame Kompetenzen erhalten, zum Beispiel in der Außenpolitik.',
    direction: 'pro',
  },
  {
    id: 'europa_2',
    topic: 'europa',
    text: 'Europa soll gemeinsam Schulden aufnehmen dürfen, um Krisen zu bewältigen.',
    direction: 'pro',
  },
  {
    id: 'europa_3',
    topic: 'europa',
    text: 'Eine gemeinsame europäische Armee wäre ein sinnvoller Schritt für die Sicherheit Europas.',
    direction: 'pro',
  },
  {
    id: 'europa_4',
    topic: 'europa',
    text: 'Deutschland soll in der EU mehr auf nationale Interessen beharren, statt immer Kompromisse zu suchen.',
    direction: 'contra',
  },
  {
    id: 'europa_5',
    topic: 'europa',
    text: 'Die EU hat zu viel Macht – wichtige Entscheidungen sollen wieder stärker in den Mitgliedstaaten getroffen werden.',
    direction: 'contra',
  },
];
