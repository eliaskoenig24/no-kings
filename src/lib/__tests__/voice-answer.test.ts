import { describe, it, expect } from 'vitest';
import { parseVoiceAnswer, VOICE_ANSWER_LANGS, normalizeTranscript } from '../voice-answer';
import { SUPPORTED_LANGS } from '../i18n';

describe('coverage', () => {
  it('has rules for every supported platform language', () => {
    for (const { code } of SUPPORTED_LANGS) {
      expect(VOICE_ANSWER_LANGS, `missing voice rules for ${code}`).toContain(code);
    }
  });
});

describe('parseVoiceAnswer — agree/disagree per language', () => {
  const CASES: Record<string, { agree: string; disagree: string }> = {
    de: { agree: 'ich stimme zu', disagree: 'ich stimme nicht zu' },
    en: { agree: 'I agree with that', disagree: 'I disagree' },
    es: { agree: 'estoy de acuerdo', disagree: 'estoy en desacuerdo' },
    fr: { agree: "je suis d'accord", disagree: "je ne suis pas d'accord" },
    pt: { agree: 'eu concordo', disagree: 'eu discordo' },
    it: { agree: "sono d'accordo", disagree: "non sono d'accordo" },
    nl: { agree: 'ik ben het er mee eens', disagree: 'ik ben het er niet mee eens' },
    pl: { agree: 'zgadzam się', disagree: 'nie zgadzam się' },
    ru: { agree: 'я согласен', disagree: 'я не согласен' },
    uk: { agree: 'я згоден', disagree: 'я не згоден' },
    tr: { agree: 'katılıyorum', disagree: 'katılmıyorum' },
    ar: { agree: 'أوافق', disagree: 'لا أوافق' },
    fa: { agree: 'موافقم', disagree: 'مخالفم' },
    hi: { agree: 'मैं सहमत हूं', disagree: 'मैं असहमत हूं' },
    bn: { agree: 'আমি একমত', disagree: 'আমি একমত নই' },
    id: { agree: 'saya setuju', disagree: 'saya tidak setuju' },
    vi: { agree: 'tôi đồng ý', disagree: 'tôi không đồng ý' },
    zh: { agree: '我同意', disagree: '我不同意' },
    ja: { agree: '賛成です', disagree: '反対です' },
    ko: { agree: '동의합니다', disagree: '동의하지 않습니다' },
  };

  for (const [lang, { agree, disagree }] of Object.entries(CASES)) {
    it(`${lang}: "${agree}" → agree, "${disagree}" → disagree`, () => {
      expect(parseVoiceAnswer(agree, lang)).toBeGreaterThanOrEqual(0.75);
      expect(parseVoiceAnswer(disagree, lang)!).toBeLessThanOrEqual(0.25);
    });
  }
});

describe('parseVoiceAnswer — ordering traps', () => {
  it('en: "disagree" is not swallowed by "agree"', () => {
    expect(parseVoiceAnswer('I strongly disagree', 'en')).toBe(0);
    expect(parseVoiceAnswer('disagree', 'en')).toBe(0.25);
  });
  it('es: "no sé" is neutral, not a no', () => {
    expect(parseVoiceAnswer('no sé', 'es')).toBe(0.5);
    expect(parseVoiceAnswer('no', 'es')).toBe(0.25);
  });
  it('de: negated agreement beats agreement', () => {
    expect(parseVoiceAnswer('ich stimme überhaupt nicht zu', 'de')).toBe(0);
    expect(parseVoiceAnswer('ich stimme voll und ganz zu', 'de')).toBe(1);
  });
  it('de: "weiß nicht" is neutral, not a no', () => {
    expect(parseVoiceAnswer('ich weiß nicht', 'de')).toBe(0.5);
  });
  it('nl: "niet mee eens" beats "mee eens"', () => {
    expect(parseVoiceAnswer('ik ben het er niet mee eens', 'nl')).toBe(0.25);
    expect(parseVoiceAnswer('helemaal mee eens', 'nl')).toBe(1);
  });
  it('vi: "có lẽ" is neutral although "có" means yes', () => {
    expect(parseVoiceAnswer('có lẽ', 'vi')).toBe(0.5);
    expect(parseVoiceAnswer('có', 'vi')).toBe(0.75);
  });
  it('zh: 反对 is not swallowed by 对', () => {
    expect(parseVoiceAnswer('我反对', 'zh')).toBe(0.25);
    expect(parseVoiceAnswer('对', 'zh')).toBe(0.75);
    expect(parseVoiceAnswer('非常不同意', 'zh')).toBe(0);
  });
  it('ja: 賛成しない beats 賛成', () => {
    expect(parseVoiceAnswer('賛成しない', 'ja')).toBe(0.25);
    expect(parseVoiceAnswer('強く賛成', 'ja')).toBe(1);
  });
  it('ko: agglutinated negation wins over 동의', () => {
    expect(parseVoiceAnswer('전혀 동의하지 않아요', 'ko')).toBe(0);
    expect(parseVoiceAnswer('동의해요', 'ko')).toBe(0.75);
  });
  it('word boundaries: "ja" does not match inside other words', () => {
    expect(parseVoiceAnswer('jahrelang', 'de')).toBeNull();
  });
});

describe('parseVoiceAnswer — edge cases', () => {
  it('returns null for empty or unintelligible input', () => {
    expect(parseVoiceAnswer('', 'de')).toBeNull();
    expect(parseVoiceAnswer('   ', 'en')).toBeNull();
    expect(parseVoiceAnswer('banana rocket', 'en')).toBeNull();
  });
  it('falls back to english rules for unknown languages', () => {
    expect(parseVoiceAnswer('yes', 'xx')).toBe(0.75);
  });
  it('survives punctuation and case from the recognizer', () => {
    expect(parseVoiceAnswer('Ja!', 'de')).toBe(0.75);
    expect(parseVoiceAnswer('  NO.  ', 'en')).toBe(0.25);
    expect(parseVoiceAnswer('D’accord.', 'fr')).toBe(0.75);
  });
  it('normalizeTranscript strips arabic diacritics', () => {
    expect(normalizeTranscript('نَعَمْ')).toBe('نعم');
  });
});
