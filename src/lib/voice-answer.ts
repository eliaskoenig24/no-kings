/**
 * Voice answer parsing — maps a spoken transcript to a Likert stance.
 * Pure logic (no audio here): the on-device recognizer produces text,
 * this file understands it in all 20 platform languages.
 *
 * Values mirror the training buttons: 0 strongly against … 1 strongly for.
 */

export type LikertValue = 0 | 0.25 | 0.5 | 0.75 | 1;

type Rule = [pattern: string, value: LikertValue];

/**
 * Ordered rules per language — FIRST MATCH WINS, so order is load-bearing:
 * negated phrases must precede their positive substrings ("stimme nicht zu"
 * before "stimme zu", "disagree" before "agree"), and ambiguous neutral
 * phrases containing negation words come first of all ("no sé" before "no").
 */
const RULES: Record<string, Rule[]> = {
  de: [
    ['weiß nicht', 0.5], ['weiss nicht', 0.5], ['keine ahnung', 0.5],
    ['überhaupt nicht', 0], ['gar nicht', 0], ['absolut nicht', 0], ['auf keinen fall', 0], ['niemals', 0], ['klar dagegen', 0],
    ['stimme nicht zu', 0.25], ['nicht einverstanden', 0.25], ['lehne ab', 0.25], ['dagegen', 0.25], ['eher nicht', 0.25], ['nein', 0.25],
    ['stimme voll', 1], ['voll und ganz', 1], ['voll zu', 1], ['klar dafür', 1], ['absolut', 1], ['auf jeden fall', 1], ['definitiv', 1], ['unbedingt', 1],
    ['stimme zu', 0.75], ['einverstanden', 0.75], ['dafür', 0.75], ['eher ja', 0.75], ['ja', 0.75],
    ['teils', 0.5], ['neutral', 0.5], ['unentschieden', 0.5], ['vielleicht', 0.5], ['kommt drauf an', 0.5], ['kommt darauf an', 0.5],
  ],
  en: [
    ['not sure', 0.5], ["don't know", 0.5], ['dont know', 0.5], ['no idea', 0.5],
    ['strongly disagree', 0], ['strongly against', 0], ['absolutely not', 0], ['definitely not', 0], ['no way', 0], ['never', 0],
    ['disagree', 0.25], ['not really', 0.25], ['against', 0.25], ['no', 0.25],
    ['strongly agree', 1], ['fully agree', 1], ['totally agree', 1], ['absolutely', 1], ['definitely', 1], ['of course', 1], ['totally', 1],
    ['agree', 0.75], ['in favor', 0.75], ['in favour', 0.75], ['yes', 0.75], ['yeah', 0.75], ['sure', 0.75],
    ['neutral', 0.5], ['maybe', 0.5], ['it depends', 0.5], ['depends', 0.5], ['undecided', 0.5], ['partly', 0.5],
  ],
  es: [
    ['no sé', 0.5], ['no se', 0.5], ['no lo sé', 0.5], ['no lo se', 0.5], ['ni idea', 0.5],
    ['totalmente en desacuerdo', 0], ['muy en contra', 0], ['para nada', 0], ['de ninguna manera', 0], ['nunca', 0],
    ['en desacuerdo', 0.25], ['no estoy de acuerdo', 0.25], ['en contra', 0.25], ['no', 0.25],
    ['totalmente de acuerdo', 1], ['muy a favor', 1], ['absolutamente', 1], ['por supuesto', 1], ['sin duda', 1], ['claro que sí', 1], ['claro que si', 1],
    ['de acuerdo', 0.75], ['a favor', 0.75], ['sí', 0.75], ['si', 0.75],
    ['neutral', 0.5], ['depende', 0.5], ['tal vez', 0.5], ['quizás', 0.5], ['quizas', 0.5], ['en parte', 0.5],
  ],
  fr: [
    ['je ne sais pas', 0.5], ['sais pas', 0.5], ['aucune idée', 0.5],
    ["pas du tout d'accord", 0], ['absolument pas', 0], ['fermement contre', 0], ['jamais', 0],
    ["pas d'accord", 0.25], ['contre', 0.25], ['non', 0.25], ['plutôt pas', 0.25],
    ["tout à fait d'accord", 1], ["totalement d'accord", 1], ['absolument', 1], ['bien sûr', 1], ['certainement', 1],
    ["d'accord", 0.75], ['oui', 0.75], ['plutôt oui', 0.75],
    ['neutre', 0.5], ['ça dépend', 0.5], ['ca dépend', 0.5], ['peut-être', 0.5], ['peut être', 0.5], ['indécis', 0.5],
  ],
  pt: [
    ['não sei', 0.5], ['nao sei', 0.5], ['sei lá', 0.5],
    ['discordo totalmente', 0], ['totalmente contra', 0], ['de jeito nenhum', 0], ['nunca', 0],
    ['não concordo', 0.25], ['nao concordo', 0.25], ['discordo', 0.25], ['contra', 0.25], ['não', 0.25], ['nao', 0.25],
    ['concordo totalmente', 1], ['concordo plenamente', 1], ['com certeza', 1], ['absolutamente', 1], ['claro', 1],
    ['concordo', 0.75], ['a favor', 0.75], ['sim', 0.75],
    ['neutro', 0.5], ['depende', 0.5], ['talvez', 0.5], ['em parte', 0.5],
  ],
  it: [
    ['non lo so', 0.5], ['non saprei', 0.5],
    ["per niente d'accordo", 0], ['assolutamente no', 0], ['fortemente contrario', 0], ['mai', 0],
    ["non sono d'accordo", 0.25], ['in disaccordo', 0.25], ['contrario', 0.25], ['contraria', 0.25], ['no', 0.25],
    ["pienamente d'accordo", 1], ["completamente d'accordo", 1], ['assolutamente', 1], ['certamente', 1], ['certo', 1],
    ["d'accordo", 0.75], ['a favore', 0.75], ['sì', 0.75], ['si', 0.75],
    ['neutrale', 0.5], ['dipende', 0.5], ['forse', 0.5], ['in parte', 0.5],
  ],
  nl: [
    ['weet niet', 0.5], ['weet het niet', 0.5], ['geen idee', 0.5],
    ['helemaal niet mee eens', 0], ['helemaal oneens', 0], ['absoluut niet', 0], ['sterk tegen', 0], ['nooit', 0],
    ['niet mee eens', 0.25], ['oneens', 0.25], ['tegen', 0.25], ['nee', 0.25],
    ['helemaal mee eens', 1], ['helemaal eens', 1], ['sterk voor', 1], ['absoluut', 1], ['zeker', 1],
    ['mee eens', 0.75], ['eens', 0.75], ['voor', 0.75], ['ja', 0.75],
    ['neutraal', 0.5], ['misschien', 0.5], ['hangt ervan af', 0.5], ['deels', 0.5],
  ],
  pl: [
    ['nie wiem', 0.5],
    ['zdecydowanie się nie zgadzam', 0], ['zdecydowanie nie', 0], ['absolutnie nie', 0], ['nigdy', 0],
    ['nie zgadzam się', 0.25], ['się nie zgadzam', 0.25], ['nie zgadzam', 0.25], ['przeciw', 0.25], ['nie', 0.25],
    ['zdecydowanie się zgadzam', 1], ['zdecydowanie tak', 1], ['absolutnie', 1], ['oczywiście', 1], ['jak najbardziej', 1],
    ['zgadzam się', 0.75], ['zgadzam', 0.75], ['tak', 0.75],
    ['neutralnie', 0.5], ['może', 0.5], ['to zależy', 0.5], ['zależy', 0.5], ['częściowo', 0.5],
  ],
  ru: [
    ['не знаю', 0.5], ['затрудняюсь', 0.5],
    ['совершенно не согласен', 0], ['совершенно не согласна', 0], ['категорически не согласен', 0], ['категорически не согласна', 0], ['абсолютно нет', 0], ['никогда', 0], ['решительно против', 0],
    ['не согласен', 0.25], ['не согласна', 0.25], ['против', 0.25], ['нет', 0.25],
    ['полностью согласен', 1], ['полностью согласна', 1], ['решительно за', 1], ['абсолютно', 1], ['конечно', 1], ['обязательно', 1],
    ['согласен', 0.75], ['согласна', 0.75], ['да', 0.75],
    ['нейтрально', 0.5], ['может быть', 0.5], ['зависит', 0.5], ['частично', 0.5],
  ],
  uk: [
    ['не знаю', 0.5],
    ['зовсім не згоден', 0], ['зовсім не згодна', 0], ['категорично ні', 0], ['ніколи', 0], ['рішуче проти', 0],
    ['не згоден', 0.25], ['не згодна', 0.25], ['проти', 0.25], ['ні', 0.25],
    ['повністю згоден', 1], ['повністю згодна', 1], ['рішуче за', 1], ['абсолютно', 1], ['звичайно', 1], ['обов’язково', 1], ["обов'язково", 1],
    ['згоден', 0.75], ['згодна', 0.75], ['так', 0.75],
    ['нейтрально', 0.5], ['можливо', 0.5], ['залежить', 0.5], ['частково', 0.5],
  ],
  tr: [
    ['bilmiyorum', 0.5], ['emin değilim', 0.5],
    ['kesinlikle katılmıyorum', 0], ['hiç katılmıyorum', 0], ['kesinlikle karşıyım', 0], ['asla', 0],
    ['katılmıyorum', 0.25], ['karşıyım', 0.25], ['hayır', 0.25],
    ['kesinlikle katılıyorum', 1], ['tamamen katılıyorum', 1], ['kesinlikle', 1], ['elbette', 1], ['tabii ki', 1],
    ['katılıyorum', 0.75], ['destekliyorum', 0.75], ['evet', 0.75],
    ['kararsızım', 0.5], ['belki', 0.5], ['duruma göre', 0.5], ['kısmen', 0.5],
  ],
  ar: [
    ['لا أعرف', 0.5], ['لا أدري', 0.5], ['لا اعرف', 0.5], ['لا ادري', 0.5],
    ['لا أوافق بشدة', 0], ['لا اوافق بشدة', 0], ['أرفض بشدة', 0], ['ارفض بشدة', 0], ['أبدا', 0], ['ابدا', 0], ['مستحيل', 0],
    ['لا أوافق', 0.25], ['لا اوافق', 0.25], ['أرفض', 0.25], ['ارفض', 0.25], ['أعارض', 0.25], ['اعارض', 0.25], ['ضد', 0.25], ['لا', 0.25],
    ['أوافق بشدة', 1], ['اوافق بشدة', 1], ['موافق بشدة', 1], ['بالتأكيد', 1], ['بالتاكيد', 1], ['طبعا', 1], ['أكيد', 1], ['اكيد', 1],
    ['أوافق', 0.75], ['اوافق', 0.75], ['موافق', 0.75], ['أؤيد', 0.75], ['نعم', 0.75],
    ['محايد', 0.5], ['ربما', 0.5], ['يعتمد', 0.5], ['جزئيا', 0.5],
  ],
  fa: [
    ['نمی دانم', 0.5], ['نمیدانم', 0.5], ['نمی دونم', 0.5],
    ['کاملا مخالفم', 0], ['کاملا مخالف', 0], ['به هیچ وجه', 0], ['هرگز', 0], ['اصلا', 0],
    ['مخالفم', 0.25], ['مخالف', 0.25], ['نه', 0.25], ['خیر', 0.25],
    ['کاملا موافقم', 1], ['کاملا موافق', 1], ['قطعا', 1], ['حتما', 1], ['صد در صد', 1],
    ['موافقم', 0.75], ['موافق', 0.75], ['بله', 0.75], ['آره', 0.75], ['اره', 0.75],
    ['بی طرف', 0.5], ['بیطرف', 0.5], ['شاید', 0.5], ['بستگی دارد', 0.5], ['بستگی داره', 0.5], ['تا حدی', 0.5],
  ],
  hi: [
    ['पता नहीं', 0.5], ['मालूम नहीं', 0.5],
    ['बिल्कुल असहमत', 0], ['पूरी तरह असहमत', 0], ['बिल्कुल नहीं', 0], ['बिलकुल नहीं', 0], ['कभी नहीं', 0],
    ['असहमत', 0.25], ['सहमत नहीं', 0.25], ['विरोध', 0.25], ['नहीं', 0.25],
    ['पूरी तरह सहमत', 1], ['बिल्कुल सहमत', 1], ['बिल्कुल', 1], ['ज़रूर', 1], ['जरूर', 1], ['अवश्य', 1],
    ['सहमत', 0.75], ['हां', 0.75], ['हाँ', 0.75], ['जी हां', 0.75], ['जी हाँ', 0.75],
    ['तटस्थ', 0.5], ['शायद', 0.5], ['निर्भर करता है', 0.5], ['आंशिक', 0.5],
  ],
  bn: [
    ['জানি না', 0.5],
    ['সম্পূর্ণ অসম্মত', 0], ['একদম না', 0], ['কখনো না', 0], ['কখনোই না', 0], ['তীব্র বিরোধী', 0],
    ['অসম্মত', 0.25], ['একমত নই', 0.25], ['বিরোধী', 0.25], ['না', 0.25],
    ['সম্পূর্ণ একমত', 1], ['পুরোপুরি একমত', 1], ['অবশ্যই', 1], ['নিশ্চয়ই', 1],
    ['একমত', 0.75], ['হ্যাঁ', 0.75], ['পক্ষে', 0.75],
    ['নিরপেক্ষ', 0.5], ['হয়তো', 0.5], ['নির্ভর করে', 0.5], ['আংশিক', 0.5],
  ],
  id: [
    ['tidak tahu', 0.5], ['nggak tahu', 0.5], ['gak tahu', 0.5],
    ['sangat tidak setuju', 0], ['sama sekali tidak', 0], ['tidak pernah', 0], ['sangat menolak', 0],
    ['tidak setuju', 0.25], ['menolak', 0.25], ['tidak', 0.25], ['nggak', 0.25], ['gak', 0.25],
    ['sangat setuju', 1], ['setuju sekali', 1], ['tentu saja', 1], ['pasti', 1],
    ['setuju', 0.75], ['mendukung', 0.75], ['ya', 0.75], ['iya', 0.75],
    ['netral', 0.5], ['mungkin', 0.5], ['tergantung', 0.5], ['sebagian', 0.5],
  ],
  vi: [
    ['không biết', 0.5], ['có lẽ', 0.5],
    ['hoàn toàn không đồng ý', 0], ['rất không đồng ý', 0], ['không bao giờ', 0], ['phản đối mạnh', 0],
    ['không đồng ý', 0.25], ['phản đối', 0.25], ['không', 0.25],
    ['hoàn toàn đồng ý', 1], ['rất đồng ý', 1], ['chắc chắn', 1], ['tất nhiên', 1], ['ủng hộ mạnh', 1],
    ['đồng ý', 0.75], ['ủng hộ', 0.75], ['có', 0.75], ['vâng', 0.75], ['đúng', 0.75],
    ['trung lập', 0.5], ['tùy', 0.5], ['một phần', 0.5], ['chưa chắc', 0.5],
  ],
  // CJK: matched by substring (no word boundaries in the script)
  zh: [
    ['不知道', 0.5], ['不清楚', 0.5], ['不确定', 0.5],
    ['非常不同意', 0], ['完全不同意', 0], ['强烈反对', 0], ['绝对不', 0], ['绝不', 0], ['从不', 0],
    ['不同意', 0.25], ['不太同意', 0.25], ['反对', 0.25], ['不是', 0.25], ['不', 0.25],
    ['非常同意', 1], ['完全同意', 1], ['强烈支持', 1], ['绝对', 1], ['当然', 1], ['肯定', 1],
    ['同意', 0.75], ['支持', 0.75], ['赞成', 0.75], ['是的', 0.75], ['是', 0.75], ['对', 0.75], ['好', 0.75],
    ['中立', 0.5], ['也许', 0.5], ['看情况', 0.5], ['一半', 0.5],
  ],
  ja: [
    ['わからない', 0.5], ['分からない', 0.5], ['わかりません', 0.5], ['分かりません', 0.5],
    ['全く反対', 0], ['まったく反対', 0], ['絶対に反対', 0], ['強く反対', 0], ['絶対にない', 0],
    ['同意しない', 0.25], ['賛成しない', 0.25], ['反対', 0.25], ['いいえ', 0.25], ['違う', 0.25], ['ちがう', 0.25],
    ['強く賛成', 1], ['大賛成', 1], ['絶対に', 1], ['もちろん', 1], ['完全に同意', 1],
    ['賛成', 0.75], ['同意', 0.75], ['そう思う', 0.75], ['はい', 0.75],
    ['中立', 0.5], ['たぶん', 0.5], ['多分', 0.5], ['場合による', 0.5], ['どちらでもない', 0.5],
  ],
  ko: [
    ['모르겠', 0.5], ['잘 모르', 0.5],
    ['전혀 동의하지 않', 0], ['절대 아니', 0], ['절대 안', 0], ['강력 반대', 0],
    ['동의하지 않', 0.25], ['동의 안', 0.25], ['반대', 0.25], ['아니요', 0.25], ['아니오', 0.25], ['아니에요', 0.25], ['아냐', 0.25],
    ['전적으로 동의', 1], ['완전히 동의', 1], ['완전 동의', 1], ['강력 찬성', 1], ['물론', 1], ['당연', 1],
    ['동의', 0.75], ['찬성', 0.75], ['맞아', 0.75], ['그렇', 0.75], ['네', 0.75], ['예', 0.75],
    ['중립', 0.5], ['아마', 0.5], ['글쎄', 0.5], ['상황에 따라', 0.5],
  ],
};

/** Languages matched by raw substring instead of word boundaries. */
const SUBSTRING_LANGS = new Set(['zh', 'ja', 'ko']);

export const VOICE_ANSWER_LANGS = Object.keys(RULES);

/** Lowercase, unify apostrophes, drop punctuation/diacritic noise, collapse spaces. */
export function normalizeTranscript(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/‌/g, ' ')                      // ZWNJ (fa) → space
    .replace(/[ً-ٟـ]/g, '')        // Arabic diacritics + tatweel
    .replace(/[.,!?;:"«»„“”…()[\]{}¡¿،؛؟。、！？・「」『』]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Maps a transcript to a Likert value, or null when nothing matches —
 * the UI then shows what was heard and falls back to tapping.
 */
export function parseVoiceAnswer(transcript: string, lang: string): LikertValue | null {
  const rules = RULES[lang] ?? RULES.en;
  const norm = normalizeTranscript(transcript);
  if (!norm) return null;
  const padded = ` ${norm} `;
  const substring = SUBSTRING_LANGS.has(lang);
  for (const [pattern, value] of rules) {
    const hit = substring ? norm.includes(pattern) : padded.includes(` ${pattern} `);
    if (hit) return value;
  }
  return null;
}
