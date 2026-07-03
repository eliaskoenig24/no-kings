'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/LangContext';
import { SPECTRUM } from '@/lib/i18n';
import { TOPICS, TopicKey } from '@/types';
import { createTwinFromValues, classifyTwin } from '@/lib/twin-engine';
import { saveMyTwin, saveDemographics, type TwinDemographics } from '@/lib/db';
import { DEMO_TWINS_TAGGED } from '@/data/demo-twins';

const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });

// Sorted demo twin values per topic for percentile lookup
const SORTED: Record<TopicKey, number[]> = (() => {
  const twins = DEMO_TWINS_TAGGED.map(t => t.twin);
  return Object.fromEntries(
    TOPICS.map(k => [k, twins.map(tw => tw[k]).sort((a, b) => a - b)])
  ) as Record<TopicKey, number[]>;
})();

function percentile(key: TopicKey, val: number): number {
  const s = SORTED[key];
  const v = val / 100;
  let lo = 0, hi = s.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < v) lo = m + 1; else hi = m; }
  return Math.round((lo / s.length) * 100);
}

const ARCHETYPE_NAMES: Record<string, Record<string, string>> = {
  progressive:  { de: 'Progressiv', en: 'Progressive', es: 'Progresista', fr: 'Progressiste', pt: 'Progressista', ar: 'تقدمي', zh: '进步派', ja: 'プログレッシブ', hi: 'प्रगतिशील', ru: 'Прогрессист', id: 'Progresif', tr: 'İlerici', ko: '진보적', it: 'Progressista', nl: 'Progressief', pl: 'Progresywny', uk: 'Прогресивний', vi: 'Tiến bộ', bn: 'প্রগতিশীল', fa: 'پیشرو' },
  socialdem:    { de: 'Sozialdemokrat', en: 'Social Democrat', es: 'Socialdemócrata', fr: 'Social-démocrate', pt: 'Social-democrata', ar: 'ديمقراطي اجتماعي', zh: '社会民主', ja: '社会民主', hi: 'सामाजिक लोकतांत्रिक', ru: 'Соц-демократ', id: 'Sosial-demokrat', tr: 'Sosyal-demokrat', ko: '사회민주', it: 'Socialdemocratico', nl: 'Sociaal-democraat', pl: 'Socjaldemokrata', uk: 'Соц-демократ', vi: 'Dân chủ xã hội', bn: 'সোশ্যাল ডেমোক্র্যাট', fa: 'سوسیال دموکرات' },
  liberal:      { de: 'Liberal', en: 'Liberal', es: 'Liberal', fr: 'Libéral', pt: 'Liberal', ar: 'ليبرالي', zh: '自由主义', ja: 'リベラル', hi: 'उदारवादी', ru: 'Либерал', id: 'Liberal', tr: 'Liberal', ko: '자유주의', it: 'Liberale', nl: 'Liberaal', pl: 'Liberał', uk: 'Ліберал', vi: 'Tự do', bn: 'উদারপন্থী', fa: 'لیبرال' },
  conservative: { de: 'Konservativ', en: 'Conservative', es: 'Conservador', fr: 'Conservateur', pt: 'Conservador', ar: 'محافظ', zh: '保守派', ja: '保守', hi: 'रूढ़िवादी', ru: 'Консерватор', id: 'Konservatif', tr: 'Muhafazakâr', ko: '보수', it: 'Conservatore', nl: 'Conservatief', pl: 'Konserwatysta', uk: 'Консерватор', vi: 'Bảo thủ', bn: 'রক্ষণশীল', fa: 'محافظه‌کار' },
  libertarian:  { de: 'Libertär', en: 'Libertarian', es: 'Libertario', fr: 'Libertarien', pt: 'Libertário', ar: 'ليبرتاري', zh: '自由意志', ja: 'リバタリアン', hi: 'स्वतंत्रतावादी', ru: 'Либертарий', id: 'Libertarian', tr: 'Liberteryenist', ko: '자유지상주의', it: 'Libertario', nl: 'Libertariër', pl: 'Libertarianin', uk: 'Лібертаріанець', vi: 'Tự do chủ nghĩa', bn: 'স্বাধীনতাবাদী', fa: 'آزادی‌خواه' },
  centrist:     { de: 'Zentristisch', en: 'Centrist', es: 'Centrista', fr: 'Centriste', pt: 'Centrista', ar: 'وسطي', zh: '中间派', ja: '中道', hi: 'मध्यमार्गी', ru: 'Центрист', id: 'Sentris', tr: 'Merkezi', ko: '중도', it: 'Centrista', nl: 'Centrist', pl: 'Centrysta', uk: 'Центрист', vi: 'Trung dung', bn: 'মধ্যপন্থী', fa: 'میانه‌رو' },
};

const AGE_OPTIONS = ['18-24', '25-34', '35-49', '50-64', '65+'] as const;

const TX = {
  title:      { de: 'Trainiere deinen Zwilling', en: 'Train your twin', es: 'Entrena tu gemelo', fr: 'Entraîne ton jumeau', pt: 'Treine seu gêmeo', ar: 'درّب توأمك', zh: '训练你的孪生', ja: 'ツインを訓練する', hi: 'अपना जुड़वां प्रशिक्षित करें', ru: 'Обучи своего двойника', id: 'Latih kembaranmu', tr: 'İkizini eğit', ko: '트윈을 훈련시키세요', it: 'Allena il tuo gemello', nl: 'Train jouw tweeling', pl: 'Trenuj swojego bliźniaka', uk: 'Навчи свого двійника', vi: 'Huấn luyện sinh đôi', bn: 'তোমার যমজ প্রশিক্ষণ দাও', fa: 'دوقلوی خود را آموزش دهید' },
  sub:        { de: 'Wo stehst du? 8 Dimensionen — kein Login, kein Server.', en: 'Where do you stand? 8 dimensions — no login, no server.', es: '¿Dónde estás? 8 dimensiones — sin inicio de sesión, sin servidor.', fr: 'Où te situes-tu? 8 dimensions — sans connexion, sans serveur.', pt: 'Onde você está? 8 dimensões — sem login, sem servidor.', ar: 'أين تقف؟ 8 أبعاد — بدون تسجيل دخول، بدون خادم.', zh: '你站在哪里？8个维度——无需登录，无需服务器。', ja: 'あなたはどこに立っていますか？8次元 — ログインなし、サーバーなし。', hi: 'आप कहाँ खड़े हैं? 8 आयाम — कोई लॉगिन नहीं, कोई सर्वर नहीं।', ru: 'Где вы стоите? 8 измерений — без входа в систему, без сервера.', id: 'Di mana posisimu? 8 dimensi — tanpa login, tanpa server.', tr: 'Nerede duruyorsun? 8 boyut — giriş yok, sunucu yok.', ko: '어디에 서 있나요? 8가지 차원 — 로그인 없음, 서버 없음.', it: 'Dove stai? 8 dimensioni — nessun login, nessun server.', nl: 'Waar sta jij? 8 dimensies — geen login, geen server.', pl: 'Gdzie stoisz? 8 wymiarów — bez logowania, bez serwera.', uk: 'Де ви стоїте? 8 вимірів — без входу, без сервера.', vi: 'Bạn đứng ở đâu? 8 chiều — không đăng nhập, không máy chủ.', bn: 'তুমি কোথায় দাঁড়িয়ে? ৮ মাত্রা — কোনো লগইন নেই, কোনো সার্ভার নেই।', fa: 'کجا ایستاده‌اید؟ ۸ بُعد — بدون ورود، بدون سرور.' },
  demo_sec:   { de: 'Über dich', en: 'About you', es: 'Sobre ti', fr: 'À ton sujet', pt: 'Sobre você', ar: 'عنك', zh: '关于你', ja: 'あなたについて', hi: 'आपके बारे में', ru: 'О вас', id: 'Tentang kamu', tr: 'Senin hakkında', ko: '나에 대해', it: 'Su di te', nl: 'Over jou', pl: 'O tobie', uk: 'Про вас', vi: 'Về bạn', bn: 'তোমার সম্পর্কে', fa: 'درباره شما' },
  demo_sub:   { de: 'Optional — macht deinen Zwilling regional wertvoller.', en: 'Optional — makes your twin more valuable for regional politics.', es: 'Opcional — hace que tu gemelo sea más valioso para la política regional.', fr: 'Optionnel — rend ton jumeau plus précieux pour la politique régionale.', pt: 'Opcional — torna seu gêmeo mais valioso para a política regional.', ar: 'اختياري — يجعل توأمك أكثر قيمة للسياسة الإقليمية.', zh: '可选 — 使您的孪生对地区政治更有价值。', ja: 'オプション — あなたのツインを地域政治により価値あるものにします。', hi: 'वैकल्पिक — आपके जुड़वां को क्षेत्रीय राजनीति के लिए अधिक मूल्यवान बनाता है।', ru: 'Необязательно — делает вашего двойника более ценным для региональной политики.', id: 'Opsional — membuat kembaranmu lebih berharga untuk politik regional.', tr: 'İsteğe bağlı — ikizini bölgesel siyaset için daha değerli yapar.', ko: '선택 사항 — 트윈을 지역 정치에 더 가치 있게 만듭니다.', it: 'Opzionale — rende il tuo gemello più prezioso per la politica regionale.', nl: 'Optioneel — maakt jouw tweeling waardevoller voor regionale politiek.', pl: 'Opcjonalne — sprawia, że twój bliźniak jest cenniejszy dla lokalnej polityki.', uk: 'Необов\'язково — робить вашого двійника більш цінним для регіональної політики.', vi: 'Tùy chọn — làm cho sinh đôi của bạn có giá trị hơn cho chính trị khu vực.', bn: 'ঐচ্ছিক — তোমার যমজকে আঞ্চলিক রাজনীতির জন্য আরো মূল্যবান করে।', fa: 'اختیاری — دوقلوی شما را برای سیاست منطقه‌ای ارزشمندتر می‌کند.' },
  age_lbl:    { de: 'Altersgruppe', en: 'Age group', es: 'Grupo de edad', fr: 'Groupe d\'âge', pt: 'Faixa etária', ar: 'الفئة العمرية', zh: '年龄组', ja: '年齢層', hi: 'आयु वर्ग', ru: 'Возрастная группа', id: 'Kelompok usia', tr: 'Yaş grubu', ko: '연령대', it: 'Gruppo di età', nl: 'Leeftijdsgroep', pl: 'Grupa wiekowa', uk: 'Вікова група', vi: 'Nhóm tuổi', bn: 'বয়সের গোষ্ঠী', fa: 'گروه سنی' },
  country_lbl:{ de: 'Land', en: 'Country', es: 'País', fr: 'Pays', pt: 'País', ar: 'البلد', zh: '国家', ja: '国', hi: 'देश', ru: 'Страна', id: 'Negara', tr: 'Ülke', ko: '국가', it: 'Paese', nl: 'Land', pl: 'Kraj', uk: 'Країна', vi: 'Quốc gia', bn: 'দেশ', fa: 'کشور' },
  region_lbl: { de: 'Bundesland / Region', en: 'State / Region', es: 'Estado / Región', fr: 'Région / État', pt: 'Estado / Região', ar: 'المنطقة', zh: '省/州', ja: '州/地域', hi: 'राज्य / क्षेत्र', ru: 'Регион', id: 'Provinsi / Wilayah', tr: 'Bölge', ko: '주/지역', it: 'Regione', nl: 'Provincie', pl: 'Region', uk: 'Область', vi: 'Tỉnh/Khu vực', bn: 'রাজ্য / অঞ্চল', fa: 'استان / منطقه' },
  finish:     { de: 'Zwilling speichern', en: 'Save twin', es: 'Guardar gemelo', fr: 'Enregistrer le jumeau', pt: 'Salvar gêmeo', ar: 'حفظ التوأم', zh: '保存孪生', ja: 'ツインを保存', hi: 'जुड़वां सहेजें', ru: 'Сохранить двойника', id: 'Simpan kembaran', tr: 'İkizi kaydet', ko: '트윈 저장', it: 'Salva gemello', nl: 'Tweeling opslaan', pl: 'Zapisz bliźniaka', uk: 'Зберегти двійника', vi: 'Lưu sinh đôi', bn: 'যমজ সংরক্ষণ', fa: 'ذخیره دوقلو' },
  privacy:    { de: 'Alles lokal. Kein Account, keine Cloud.', en: 'All local. No account, no cloud.', es: 'Todo local. Sin cuenta, sin nube.', fr: 'Tout est local. Aucun compte, aucun cloud.', pt: 'Tudo local. Sem conta, sem nuvem.', ar: 'كل شيء محلي. لا حساب، لا سحابة.', zh: '一切本地。无账户，无云端。', ja: 'すべてローカル。アカウントなし、クラウドなし。', hi: 'सब कुछ स्थानीय। कोई खाता नहीं, कोई क्लाउड नहीं।', ru: 'Всё локально. Без аккаунта, без облака.', id: 'Semua lokal. Tanpa akun, tanpa cloud.', tr: 'Her şey yerel. Hesap yok, bulut yok.', ko: '모두 로컬. 계정 없음, 클라우드 없음.', it: 'Tutto in locale. Nessun account, nessun cloud.', nl: 'Alles lokaal. Geen account, geen cloud.', pl: 'Wszystko lokalnie. Brak konta, brak chmury.', uk: 'Все локально. Без аккаунту, без хмари.', vi: 'Tất cả cục bộ. Không tài khoản, không đám mây.', bn: 'সব স্থানীয়। কোনো অ্যাকাউন্ট নেই, কোনো ক্লাউড নেই।', fa: 'همه چیز محلی است. بدون حساب، بدون ابر.' },
  archetype_lbl: { de: 'Profil', en: 'Profile', es: 'Perfil', fr: 'Profil', pt: 'Perfil', ar: 'الملف الشخصي', zh: '档案', ja: 'プロフィール', hi: 'प्रोफ़ाइल', ru: 'Профиль', id: 'Profil', tr: 'Profil', ko: '프로필', it: 'Profilo', nl: 'Profiel', pl: 'Profil', uk: 'Профіль', vi: 'Hồ sơ', bn: 'প্রোফাইল', fa: 'پروفایل' },
};

function tx(lang: string, key: keyof typeof TX): string {
  return (TX[key] as Record<string, string>)[lang] ?? (TX[key] as Record<string, string>)['en'];
}

export default function TrainingPage() {
  const { lang, country: autoCountry } = useLang();
  const router = useRouter();

  const topics = (SPECTRUM[lang as keyof typeof SPECTRUM] ?? SPECTRUM.en);

  const [values, setValues] = useState<Record<TopicKey, number>>(() =>
    Object.fromEntries(TOPICS.map(k => [k, 50])) as Record<TopicKey, number>
  );
  const [age, setAge] = useState<string>('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (autoCountry && !country) setCountry(autoCountry.toUpperCase());
  }, [autoCountry, country]);

  const liveValues = useMemo(() =>
    Object.fromEntries(TOPICS.map(k => [k, values[k] / 100])) as Record<TopicKey, number>,
    [values]
  );

  const liveArchetype = useMemo(() => {
    const twin = createTwinFromValues(liveValues);
    return classifyTwin(twin);
  }, [liveValues]);

  function handleSlider(key: TopicKey, val: number) {
    setValues(v => ({ ...v, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const twin = createTwinFromValues(liveValues);
      await saveMyTwin(twin);
      if (country) {
        await saveDemographics({
          country,
          region: region || undefined,
          ageGroup: (age as TwinDemographics['ageGroup']) || undefined,
        });
      }
      router.push('/twin');
    } finally {
      setSaving(false);
    }
  }

  const archetypeLabel = (ARCHETYPE_NAMES[liveArchetype]?.[lang] ?? ARCHETYPE_NAMES[liveArchetype]?.en ?? '').toUpperCase();

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Header + Live preview */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '56px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '14px' }}>
              no kings
            </p>
            <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 400, lineHeight: 1.15, marginBottom: '12px' }}>
              {tx(lang, 'title')}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
              {tx(lang, 'sub')}
            </p>
          </div>

          {/* Live radar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <RadarChart values={liveValues} animated={false} size={88} />
            {liveArchetype && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', color: '#60a5fa' }}>
                {archetypeLabel}
              </span>
            )}
          </div>
        </div>

        {/* Sliders */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', marginBottom: '72px' }}>
          {topics.map((topic) => {
            const val = values[topic.key];
            const pct = percentile(topic.key, val);
            const barColor = `hsl(${Math.round((val / 100) * 120)},50%,45%)`;
            const pctLabel = pct >= 50
              ? `${pct}%`
              : `${100 - pct}%`;

            return (
              <div key={topic.key}>
                {/* Label row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-2)' }}>
                    {topic.title}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: barColor }}>
                    {pct >= 50
                      ? `↑ ${pctLabel}`
                      : `↓ ${pctLabel}`
                    }
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range" min={0} max={100} step={1}
                  value={val}
                  onChange={e => handleSlider(topic.key, Number(e.target.value))}
                  className="spectrum-slider"
                  aria-label={topic.title}
                />

                {/* Pole labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4, maxWidth: '44%', whiteSpace: 'pre-line' }}>
                    {topic.left}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.4, maxWidth: '44%', textAlign: 'right', whiteSpace: 'pre-line' }}>
                    {topic.right}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Demographics */}
        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: '48px', marginBottom: '48px' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>
            {tx(lang, 'demo_sec')}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '32px', lineHeight: 1.6 }}>
            {tx(lang, 'demo_sub')}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Age */}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '10px' }}>
                {tx(lang, 'age_lbl')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AGE_OPTIONS.map(a => (
                  <button key={a} onClick={() => setAge(age === a ? '' : a)} style={{
                    padding: '8px 18px', fontSize: '13px',
                    background: age === a ? 'var(--text-1)' : 'var(--raised)',
                    color: age === a ? '#000' : 'var(--text-2)',
                    border: `1px solid ${age === a ? 'var(--text-1)' : 'var(--border)'}`,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    transition: 'all 0.12s',
                  }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Country + Region */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px' }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {tx(lang, 'country_lbl')}
                </label>
                <input
                  type="text" value={country}
                  onChange={e => setCountry(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="DE"
                  maxLength={2}
                  style={{
                    width: '100%', background: 'var(--raised)', border: '1px solid var(--border)',
                    color: 'var(--text-1)', padding: '10px 14px', fontSize: '14px',
                    fontFamily: 'var(--font-mono)', outline: 'none', letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                />
              </div>
              <div style={{ flex: 2, minWidth: '200px' }}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {tx(lang, 'region_lbl')}
                </label>
                <input
                  type="text" value={region}
                  onChange={e => setRegion(e.target.value)}
                  placeholder="Bayern, Île-de-France, Texas…"
                  style={{
                    width: '100%', background: 'var(--raised)', border: '1px solid var(--border)',
                    color: 'var(--text-1)', padding: '10px 14px', fontSize: '14px',
                    fontFamily: 'var(--font-sans)', outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {tx(lang, 'privacy')}
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--text-1)', color: '#000',
              border: 'none', padding: '16px 40px',
              fontSize: '13px', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.6 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {saving ? '…' : tx(lang, 'finish')}
          </button>
        </div>

      </div>
    </div>
  );
}
