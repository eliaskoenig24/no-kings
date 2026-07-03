'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getMyTwin, saveMyTwin } from '@/lib/db';
import { TwinProfile, TOPICS, TopicKey } from '@/types';
import dynamic from 'next/dynamic';
const RadarChart = dynamic(() => import('@/components/RadarChart'), { ssr: false });
import { getOrCreateIdentity } from '@/lib/identity';
import { publishTwin } from '@/lib/nostr';
import { useLang } from '@/context/LangContext';
import { SPECTRUM, getTopicLabel, getTopicDesc } from '@/lib/i18n';
import { createTwinFromValues, classifyTwin } from '@/lib/twin-engine';
import { AGENDA } from '@/data/agenda';
import { inferPosition } from '@/lib/inference';
import { DEMO_TWINS_TAGGED } from '@/data/demo-twins';

// World average per dimension
const WORLD_AVGS = (() => {
  const twins = DEMO_TWINS_TAGGED.map(t => t.twin);
  return Object.fromEntries(
    TOPICS.map(k => [k, twins.reduce((s, tw) => s + tw[k], 0) / twins.length])
  ) as Record<TopicKey, number>;
})();

const ARCHETYPE_NAMES: Record<string, Record<string, string>> = {
  progressive:  { de: 'Progressiv', en: 'Progressive', es: 'Progresista', fr: 'Progressiste', pt: 'Progressista', ar: 'تقدمي', zh: '进步派', ja: 'プログレッシブ', hi: 'प्रगतिशील', ru: 'Прогрессист', id: 'Progresif', tr: 'İlerici', ko: '진보적', it: 'Progressista', nl: 'Progressief', pl: 'Progresywny', uk: 'Прогресивний', vi: 'Tiến bộ', bn: 'প্রগতিশীল', fa: 'پیشرو' },
  socialdem:    { de: 'Sozialdemokrat', en: 'Social Democrat', es: 'Socialdemócrata', fr: 'Social-démocrate', pt: 'Social-democrata', ar: 'ديمقراطي اجتماعي', zh: '社会民主', ja: '社会民主', hi: 'सामाजिक लोकतांत्रिक', ru: 'Соц-демократ', id: 'Sosial-demokrat', tr: 'Sosyal-demokrat', ko: '사회민주', it: 'Socialdemocratico', nl: 'Sociaal-democraat', pl: 'Socjaldemokrata', uk: 'Соц-демократ', vi: 'Dân chủ xã hội', bn: 'সোশ্যাল ডেমোক্র্যাট', fa: 'سوسیال دموکرات' },
  liberal:      { de: 'Liberal', en: 'Liberal', es: 'Liberal', fr: 'Libéral', pt: 'Liberal', ar: 'ليبرالي', zh: '自由主义', ja: 'リベラル', hi: 'उदारवादी', ru: 'Либерал', id: 'Liberal', tr: 'Liberal', ko: '자유주의', it: 'Liberale', nl: 'Liberaal', pl: 'Liberał', uk: 'Ліберал', vi: 'Tự do', bn: 'উদারপন্থী', fa: 'لیبرال' },
  conservative: { de: 'Konservativ', en: 'Conservative', es: 'Conservador', fr: 'Conservateur', pt: 'Conservador', ar: 'محافظ', zh: '保守派', ja: '保守', hi: 'रूढ़िवादी', ru: 'Консерватор', id: 'Konservatif', tr: 'Muhafazakâr', ko: '보수', it: 'Conservatore', nl: 'Conservatief', pl: 'Konserwatysta', uk: 'Консерватор', vi: 'Bảo thủ', bn: 'রক্ষণশীল', fa: 'محافظه‌کار' },
  libertarian:  { de: 'Libertär', en: 'Libertarian', es: 'Libertario', fr: 'Libertarien', pt: 'Libertário', ar: 'ليبرتاري', zh: '自由意志', ja: 'リバタリアン', hi: 'स्वतंत्रतावादी', ru: 'Либертарий', id: 'Libertarian', tr: 'Liberteryenist', ko: '자유지상주의', it: 'Libertario', nl: 'Libertariër', pl: 'Libertarianin', uk: 'Лібертаріанець', vi: 'Tự do chủ nghĩa', bn: 'স্বাধীনতাবাদী', fa: 'آزادی‌خواه' },
  centrist:     { de: 'Zentristisch', en: 'Centrist', es: 'Centrista', fr: 'Centriste', pt: 'Centrista', ar: 'وسطي', zh: '中间派', ja: '中道', hi: 'मध्यमार्गी', ru: 'Центрист', id: 'Sentris', tr: 'Merkezi', ko: '중도', it: 'Centrista', nl: 'Centrist', pl: 'Centrysta', uk: 'Центрист', vi: 'Trung dung', bn: 'মধ্যপন্থী', fa: 'میانে‌رو' },
};

const TX = {
  no_twin:    { de: 'Noch kein Zwilling', en: 'No twin yet', es: 'Aún sin gemelo', fr: 'Pas encore de jumeau', pt: 'Ainda sem gêmeo', ar: 'لا توأم بعد', zh: '尚无孪生', ja: 'まだツインがありません', hi: 'अभी कोई जुड़वां नहीं', ru: 'Двойника ещё нет', id: 'Belum ada kembaran', tr: 'Henüz ikiz yok', ko: '아직 트윈 없음', it: 'Ancora nessun gemello', nl: 'Nog geen tweeling', pl: 'Jeszcze brak bliźniaka', uk: 'Двійника ще немає', vi: 'Chưa có sinh đôi', bn: 'এখনো কোনো যমজ নেই', fa: 'هنوز دوقلویی ندارید' },
  create:     { de: 'Zwilling trainieren →', en: 'Train your twin →', es: 'Entrena tu gemelo →', fr: 'Entraîne ton jumeau →', pt: 'Treine seu gêmeo →', ar: 'درّب توأمك ←', zh: '训练你的孪生 →', ja: 'ツインを訓練する →', hi: 'अपना जुड़वां प्रशिक्षित करें →', ru: 'Обучить своего двойника →', id: 'Latih kembaranmu →', tr: 'İkizini eğit →', ko: '트윈 훈련시키기 →', it: 'Allena il tuo gemello →', nl: 'Train jouw tweeling →', pl: 'Trenuj bliźniaka →', uk: 'Навчити двійника →', vi: 'Huấn luyện sinh đôi →', bn: 'যমজ প্রশিক্ষণ দাও →', fa: 'دوقلوی خود را آموزش دهید ←' },
  label:      { de: 'MEIN ZWILLING', en: 'MY TWIN', es: 'MI GEMELO', fr: 'MON JUMEAU', pt: 'MEU GÊMEO', ar: 'توأمي', zh: '我的孪生', ja: '私のツイン', hi: 'मेरा जुड़वां', ru: 'МОЙ ДВОЙНИК', id: 'KEMBARAN SAYA', tr: 'BENİM İKİZİM', ko: '내 트윈', it: 'IL MIO GEMELLO', nl: 'MIJN TWEELING', pl: 'MÓJ BLIŹNIAK', uk: 'МІЙ ДВІЙНИК', vi: 'SINH ĐÔI CỦA TÔI', bn: 'আমার যমজ', fa: 'دوقلوی من' },
  dims:       { de: 'Politische Dimensionen', en: 'Political dimensions', es: 'Dimensiones políticas', fr: 'Dimensions politiques', pt: 'Dimensões políticas', ar: 'الأبعاد السياسية', zh: '政治维度', ja: '政治的次元', hi: 'राजनीतिक आयाम', ru: 'Политические измерения', id: 'Dimensi politik', tr: 'Siyasi boyutlar', ko: '정치적 차원', it: 'Dimensioni politiche', nl: 'Politieke dimensies', pl: 'Wymiary polityczne', uk: 'Політичні виміри', vi: 'Các chiều chính trị', bn: 'রাজনৈতিক মাত্রা', fa: 'ابعاد سیاسی' },
  world:      { de: 'Welt-Ø', en: 'World avg', es: 'Prom. mundial', fr: 'Moy. mondiale', pt: 'Média mundial', ar: 'متوسط العالم', zh: '世界均值', ja: '世界平均', hi: 'विश्व औसत', ru: 'Мировой ср.', id: 'Rata-rata dunia', tr: 'Dünya ort.', ko: '세계 평균', it: 'Media mondiale', nl: 'Wereldgemiddelde', pl: 'Śr. świat.', uk: 'Середнє світу', vi: 'TB thế giới', bn: 'বিশ্ব গড়', fa: 'میانگین جهانی' },
  positions:  { de: 'Mein Zwilling bei globalen Fragen', en: 'My twin on global questions', es: 'Mi gemelo en preguntas globales', fr: 'Mon jumeau sur les questions mondiales', pt: 'Meu gêmeo nas questões globais', ar: 'توأمي حول الأسئلة العالمية', zh: '我的孪生对全球问题的立场', ja: 'グローバルな質問に対する私のツイン', hi: 'वैश्विक प्रश्नों पर मेरा जुड़वां', ru: 'Мой двойник по глобальным вопросам', id: 'Kembaranku tentang pertanyaan global', tr: 'İkizimin küresel sorulara cevabı', ko: '글로벌 질문에 대한 내 트윈', it: 'Il mio gemello sulle questioni globali', nl: 'Mijn tweeling over mondiale vragen', pl: 'Mój bliźniak o globalnych kwestiach', uk: 'Мій двійник з глобальних питань', vi: 'Sinh đôi của tôi về các câu hỏi toàn cầu', bn: 'বৈশ্বিক প্রশ্নে আমার যমজ', fa: 'دوقلوی من در سؤالات جهانی' },
  support:    { de: 'dafür', en: 'supports', es: 'a favor', fr: 'pour', pt: 'a favor', ar: 'مؤيد', zh: '支持', ja: '支持', hi: 'पक्ष में', ru: 'за', id: 'mendukung', tr: 'destek', ko: '찬성', it: 'a favore', nl: 'voor', pl: 'za', uk: 'за', vi: 'ủng hộ', bn: 'সমর্থন', fa: 'موافق' },
  oppose:     { de: 'dagegen', en: 'opposes', es: 'en contra', fr: 'contre', pt: 'contra', ar: 'معارض', zh: '反对', ja: '反対', hi: 'विरोध में', ru: 'против', id: 'menolak', tr: 'karşı', ko: '반대', it: 'contro', nl: 'tegen', pl: 'przeciw', uk: 'проти', vi: 'phản đối', bn: 'বিরোধ', fa: 'مخالف' },
  share_btn:  { de: 'Ins Netzwerk teilen', en: 'Share to network', es: 'Compartir en la red', fr: 'Partager sur le réseau', pt: 'Compartilhar na rede', ar: 'مشاركة في الشبكة', zh: '分享到网络', ja: 'ネットワークに共有', hi: 'नेटवर्क में साझा करें', ru: 'Поделиться в сети', id: 'Bagikan ke jaringan', tr: 'Ağa paylaş', ko: '네트워크에 공유', it: 'Condividi nella rete', nl: 'Delen met netwerk', pl: 'Udostępnij w sieci', uk: 'Поділитися в мережі', vi: 'Chia sẻ lên mạng', bn: 'নেটওয়ার্কে শেয়ার করুন', fa: 'اشتراک‌گذاری در شبکه' },
  shared:     { de: '✓ Zwilling ist im Netzwerk', en: '✓ Twin is in the network', es: '✓ Gemelo está en la red', fr: '✓ Jumeau dans le réseau', pt: '✓ Gêmeo na rede', ar: '✓ التوأم في الشبكة', zh: '✓ 孪生已在网络中', ja: '✓ ツインはネットワーク上', hi: '✓ जुड़वां नेटवर्क में है', ru: '✓ Двойник в сети', id: '✓ Kembaran ada di jaringan', tr: '✓ İkiz ağda', ko: '✓ 트윈이 네트워크에 있음', it: '✓ Gemello nella rete', nl: '✓ Tweeling in netwerk', pl: '✓ Bliźniak jest w sieci', uk: '✓ Двійник у мережі', vi: '✓ Sinh đôi đã trong mạng', bn: '✓ যমজ নেটওয়ার্কে আছে', fa: '✓ دوقلو در شبکه است' },
  sharing:    { de: 'Wird geteilt…', en: 'Sharing…', es: 'Compartiendo…', fr: 'Partage…', pt: 'Compartilhando…', ar: 'جارٍ المشاركة…', zh: '共享中…', ja: '共有中…', hi: 'साझा हो रहा है…', ru: 'Публикуется…', id: 'Berbagi…', tr: 'Paylaşılıyor…', ko: '공유 중…', it: 'Condivisione…', nl: 'Delen…', pl: 'Udostępnianie…', uk: 'Публікація…', vi: 'Đang chia sẻ…', bn: 'শেয়ার হচ্ছে…', fa: 'در حال اشتراک‌گذاری…' },
  share_hint: { de: 'Dein Profil wird anonym via Nostr geteilt — kein Name, kein Login.', en: 'Your profile is shared anonymously via Nostr — no name, no login.', es: 'Tu perfil se comparte de forma anónima a través de Nostr — sin nombre, sin inicio de sesión.', fr: 'Ton profil est partagé anonymement via Nostr — sans nom, sans connexion.', pt: 'Seu perfil é compartilhado anonimamente via Nostr — sem nome, sem login.', ar: 'ملفك الشخصي يُشارك بشكل مجهول عبر نوسترا — بدون اسم، بدون تسجيل دخول.', zh: '您的档案通过Nostr匿名共享——无姓名，无登录。', ja: 'プロフィールはNostr経由で匿名共有されます — 名前なし、ログインなし。', hi: 'आपका प्रोफ़ाइल Nostr के माध्यम से गुमनाम रूप से साझा किया जाता है — कोई नाम नहीं, कोई लॉगिन नहीं।', ru: 'Ваш профиль анонимно публикуется через Nostr — без имени, без входа.', id: 'Profil Anda dibagikan secara anonim melalui Nostr — tanpa nama, tanpa login.', tr: 'Profiliniz Nostr aracılığıyla anonim olarak paylaşılır — isim yok, giriş yok.', ko: '프로필이 Nostr를 통해 익명으로 공유됩니다 — 이름 없음, 로그인 없음.', it: 'Il tuo profilo viene condiviso anonimamente tramite Nostr — nessun nome, nessun login.', nl: 'Je profiel wordt anoniem gedeeld via Nostr — geen naam, geen login.', pl: 'Twój profil jest udostępniany anonimowo przez Nostr — bez nazwy, bez logowania.', uk: 'Ваш профіль анонімно публікується через Nostr — без імені, без входу.', vi: 'Hồ sơ của bạn được chia sẻ ẩn danh qua Nostr — không tên, không đăng nhập.', bn: 'তোমার প্রোফাইল Nostr এর মাধ্যমে বেনামে শেয়ার করা হয় — কোনো নাম নেই, কোনো লগইন নেই।', fa: 'پروفایل شما به صورت ناشناس از طریق Nostr به اشتراک گذاشته می‌شود — بدون نام، بدون ورود.' },
  consent_title: { de: 'Bevor du teilst', en: 'Before you share' },
  consent_body: { de: 'Dein Zwilling wird pseudonym, aber öffentlich und dauerhaft auf dezentralen Nostr-Relays gespeichert. Politische Positionen sind sensible Daten — von den Relays kann nichts gelöscht werden. Es gilt: ein Schlüsselpaar, ein Zwilling; erneutes Teilen ersetzt deinen Eintrag, statt einen zweiten anzulegen.', en: 'Your twin is stored pseudonymously but publicly and permanently on decentralized Nostr relays. Political positions are sensitive data — nothing can be deleted from the relays. One keypair, one twin: sharing again replaces your record instead of adding a second one.' },
  consent_ok: { de: 'Verstanden — jetzt teilen', en: 'Understood — share now' },
  pow_mining: { de: 'Proof-of-Work wird berechnet…', en: 'Computing proof-of-work…' },
  edit:       { de: 'Bearbeiten', en: 'Edit', es: 'Editar', fr: 'Modifier', pt: 'Editar', ar: 'تعديل', zh: '编辑', ja: '編集', hi: 'संपादित करें', ru: 'Изменить', id: 'Edit', tr: 'Düzenle', ko: '편집', it: 'Modifica', nl: 'Bewerken', pl: 'Edytuj', uk: 'Редагувати', vi: 'Sửa', bn: 'সম্পাদনা', fa: 'ویرایش' },
  save:       { de: 'Speichern', en: 'Save', es: 'Guardar', fr: 'Enregistrer', pt: 'Salvar', ar: 'حفظ', zh: '保存', ja: '保存', hi: 'सहेजें', ru: 'Сохранить', id: 'Simpan', tr: 'Kaydet', ko: '저장', it: 'Salva', nl: 'Opslaan', pl: 'Zapisz', uk: 'Зберегти', vi: 'Lưu', bn: 'সংরক্ষণ', fa: 'ذخیره' },
  cancel:     { de: 'Abbrechen', en: 'Cancel', es: 'Cancelar', fr: 'Annuler', pt: 'Cancelar', ar: 'إلغاء', zh: '取消', ja: 'キャンセル', hi: 'रद्द करें', ru: 'Отмена', id: 'Batal', tr: 'İptal', ko: '취소', it: 'Annulla', nl: 'Annuleren', pl: 'Anuluj', uk: 'Скасувати', vi: 'Hủy', bn: 'বাতিল', fa: 'لغو' },
};

function tx(lang: string, key: keyof typeof TX): string {
  return (TX[key] as Record<string, string>)[lang] ?? (TX[key] as Record<string, string>)['en'];
}

export default function TwinPage() {
  const { lang, country } = useLang();
  const topics = SPECTRUM[lang as keyof typeof SPECTRUM] ?? SPECTRUM.en;

  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [confirming, setConfirming] = useState(false);
  const [mining, setMining] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editVals, setEditVals] = useState<Record<TopicKey, number>>(
    Object.fromEntries(TOPICS.map(k => [k, 50])) as Record<TopicKey, number>
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyTwin().then(t => {
      setTwin(t ?? null);
      if (t) setEditVals(Object.fromEntries(TOPICS.map(k => [k, Math.round(t[k] * 100)])) as Record<TopicKey, number>);
      setLoading(false);
    });
  }, []);

  const archetype = useMemo(() => twin ? classifyTwin(twin) : null, [twin]);
  const archetypeLabel = archetype ? (ARCHETYPE_NAMES[archetype]?.[lang] ?? ARCHETYPE_NAMES[archetype]?.en ?? '') : '';

  // Top 10 agenda positions (most decisive = furthest from 50%)
  const agendaPositions = useMemo(() => {
    if (!twin) return [];
    return AGENDA.map(item => ({
      item,
      score: inferPosition(twin, item).score,
    }))
      .sort((a, b) => Math.abs(b.score - 0.5) - Math.abs(a.score - 0.5))
      .slice(0, 10);
  }, [twin]);

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const vals = Object.fromEntries(TOPICS.map(k => [k, editVals[k] / 100])) as Record<TopicKey, number>;
      const updated = createTwinFromValues(vals);
      await saveMyTwin(updated);
      setTwin(updated);
      setEditMode(false);
      setSharing('idle');
    } finally {
      setSaving(false);
    }
  }

  async function handleShare() {
    if (!twin) return;
    if (!confirming) {
      // First click opens the consent notice — publishing is public and irreversible.
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setSharing('loading');
    setMining(true);
    try {
      const identity = await getOrCreateIdentity();
      const result = await publishTwin(twin, identity.privkey, country, () => {
        // proof-of-work in progress; keep the mining hint visible
      });
      setMining(false);
      setSharing(result.success ? 'done' : 'error');
    } catch {
      setMining(false);
      setSharing('error');
    }
  }

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>…</span>
    </div>
  );

  if (!twin) return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0', minHeight: '60vh' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: '24px', textTransform: 'uppercase' }}>
          {tx(lang, 'label')}
        </p>
        <p style={{ fontSize: '20px', color: 'var(--text-2)', marginBottom: '32px' }}>
          {tx(lang, 'no_twin')}
        </p>
        <Link href="/training" style={{
          display: 'inline-block', background: 'var(--text-1)', color: '#000',
          padding: '14px 32px', fontSize: '13px', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
        }}>
          {tx(lang, 'create')}
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px', marginBottom: '56px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-3)', marginBottom: '14px', textTransform: 'uppercase' }}>
              {tx(lang, 'label')}
            </p>
            <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 400, lineHeight: 1.1, marginBottom: '8px' }}>
              {archetypeLabel}
            </h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
              no-kings.world/twin
            </p>
          </div>
          <div style={{ flexShrink: 0 }}>
            <RadarChart values={twin} size={120} animated />
          </div>
        </div>

        {/* 8 Dimension bars */}
        <div style={{ marginBottom: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {tx(lang, 'dims')}
            </p>
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                color: 'var(--text-3)', fontSize: '11px', padding: '4px 12px',
                cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em',
              }}
            >
              {editMode ? tx(lang, 'cancel') : tx(lang, 'edit')}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: editMode ? '32px' : '16px' }}>
            {topics.map(topic => {
              const val = twin[topic.key];
              const worldVal = WORLD_AVGS[topic.key];
              const pct = Math.round(val * 100);
              const worldPct = Math.round(worldVal * 100);
              const hue = Math.round(val * 120);
              const color = `hsl(${hue},50%,50%)`;

              if (editMode) {
                const eVal = editVals[topic.key];
                return (
                  <div key={topic.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-2)' }}>
                        {topic.title}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: `hsl(${Math.round((eVal / 100) * 120)},50%,50%)` }}>
                        {eVal}%
                      </span>
                    </div>
                    <input
                      type="range" min={0} max={100} value={eVal}
                      onChange={e => setEditVals(v => ({ ...v, [topic.key]: Number(e.target.value) }))}
                      className="spectrum-slider"
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{topic.left}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', textAlign: 'right' }}>{topic.right}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={topic.key} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 48px 80px', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-3)' }}>
                    {topic.title}
                  </span>
                  <div style={{ height: '4px', background: 'var(--raised)', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color }} />
                    {/* World avg tick */}
                    <div style={{ position: 'absolute', left: `${worldPct}%`, top: '-2px', transform: 'translateX(-50%)', width: '1px', height: '8px', background: 'var(--text-3)', opacity: 0.4 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color, textAlign: 'right' }}>
                    {pct}%
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {tx(lang, 'world')} {worldPct}%
                  </span>
                </div>
              );
            })}
          </div>

          {editMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '12px' }}>
              <button onClick={() => setEditMode(false)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', padding: '10px 20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                {tx(lang, 'cancel')}
              </button>
              <button onClick={handleSaveEdit} disabled={saving} style={{ background: 'var(--text-1)', color: '#000', border: 'none', padding: '10px 24px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'var(--font-sans)' }}>
                {saving ? '…' : tx(lang, 'save')}
              </button>
            </div>
          )}
        </div>

        {/* Agenda positions */}
        {!editMode && (
          <div style={{ marginBottom: '64px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '24px' }}>
              {tx(lang, 'positions')}
            </p>
            <div>
              {agendaPositions.map(({ item, score }) => {
                const pct = Math.round(score * 100);
                const isFor = pct >= 50;
                const color = isFor ? '#22c55e' : '#ef4444';
                return (
                  <div key={item.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--divider)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <p style={{ flex: 1, fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                      {item.text[lang] ?? item.text['en']}
                    </p>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color, flexShrink: 0 }}>
                      {isFor ? tx(lang, 'support') : tx(lang, 'oppose')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Share */}
        {!editMode && (
          <div style={{
            border: sharing === 'done' ? '1px solid rgba(74,222,128,0.3)' : '1px solid var(--border)',
            padding: '32px',
            background: sharing === 'done' ? 'rgba(74,222,128,0.03)' : 'var(--surface)',
            transition: 'all 300ms',
          }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '12px' }}>
              nostr
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '24px', maxWidth: '480px' }}>
              {tx(lang, 'share_hint')}
            </p>
            {confirming && (
              <div style={{
                border: '1px solid rgba(250,180,50,0.45)',
                background: 'rgba(250,180,50,0.05)',
                padding: '20px 24px',
                marginBottom: '24px',
                maxWidth: '520px',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgb(250,180,50)', marginBottom: '10px' }}>
                  {tx(lang, 'consent_title')}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
                  {tx(lang, 'consent_body')}
                </p>
              </div>
            )}
            {mining && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '16px' }}>
                ⛏ {tx(lang, 'pow_mining')}
              </p>
            )}
            <button
              onClick={handleShare}
              disabled={sharing === 'loading' || sharing === 'done'}
              style={{
                background: sharing === 'done' ? 'transparent' : 'var(--text-1)',
                color: sharing === 'done' ? 'var(--positive)' : '#000',
                border: sharing === 'done' ? '1px solid var(--positive)' : 'none',
                padding: '14px 32px', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: sharing === 'loading' || sharing === 'done' ? 'default' : 'pointer',
                opacity: sharing === 'loading' ? 0.6 : 1,
                fontFamily: 'var(--font-sans)',
                transition: 'all 300ms',
              }}
            >
              {sharing === 'loading' ? tx(lang, 'sharing') :
               sharing === 'done' ? tx(lang, 'shared') :
               confirming ? tx(lang, 'consent_ok') :
               tx(lang, 'share_btn')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
