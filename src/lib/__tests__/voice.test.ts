import { describe, it, expect } from 'vitest';
import { pickVoice } from '../voice';

const V = (lang: string, localService = true, name = lang) => ({ lang, localService, name });

describe('pickVoice', () => {
  it('prefers exact locale over bare prefix', () => {
    const voices = [V('de'), V('de-DE'), V('en-US')];
    expect(pickVoice(voices, 'de-DE')?.lang).toBe('de-DE');
  });

  it('matches by language prefix when no exact locale exists', () => {
    const voices = [V('pt-BR'), V('en-GB')];
    expect(pickVoice(voices, 'pt')?.lang).toBe('pt-BR');
  });

  it('prefers on-device voices over network voices', () => {
    const voices = [V('de-DE', false, 'cloud'), V('de-AT', true, 'local')];
    expect(pickVoice(voices, 'de')?.name).toBe('local');
  });

  it('returns null when nothing matches', () => {
    expect(pickVoice([V('ja-JP')], 'ar')).toBeNull();
  });

  it('handles underscore locale formats', () => {
    const voices = [V('zh_CN')];
    expect(pickVoice(voices, 'zh')?.lang).toBe('zh_CN');
  });

  it('never matches a different language sharing a prefix string', () => {
    // "id" (Indonesian) must not match "it" or anything else
    const voices = [V('it-IT')];
    expect(pickVoice(voices, 'id')).toBeNull();
  });
});
