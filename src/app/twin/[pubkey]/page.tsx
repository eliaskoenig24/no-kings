'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchTwinByPubkey } from '@/lib/nostr-reader';
import type { TwinProfile } from '@/types';
import { TOPICS } from '@/types';
import RadarChart from '@/components/RadarChart';
import { useLang } from '@/context/LangContext';
import { t, getTopicLabel, getTopicDesc } from '@/lib/i18n';
import { classifyTwin, type ArchetypeKey } from '@/lib/twin-engine';
import { getMyTwin } from '@/lib/db';
import { AGENDA } from '@/data/agenda';
import { inferAllPositions } from '@/lib/inference';

const ARCHETYPE_NAMES: Record<ArchetypeKey, Record<string, string>> = {
  progressive:  { de: 'Progressiv', en: 'Progressive', es: 'Progresista', fr: 'Progressiste', pt: 'Progressista', ar: 'تقدمي', zh: '进步派', ja: 'プログレッシブ', hi: 'प्रगतिशील', ru: 'Прогрессивный', id: 'Progresif', tr: 'İlerici', ko: '진보', it: 'Progressista', nl: 'Progressief', pl: 'Progresywny', uk: 'Прогресивний', vi: 'Tiến bộ', bn: 'প্রগতিশীল', fa: 'مترقی' },
  socialdem:    { de: 'Sozialdemokrat', en: 'Social Democrat', es: 'Socialdemócrata', fr: 'Social-démocrate', pt: 'Social-democrata', ar: 'ديمقراطي اجتماعي', zh: '社会民主', ja: '社会民主主義', hi: 'सामाजिक लोकतांत्रिक', ru: 'Социал-демократ', id: 'Demokrat Sosial', tr: 'Sosyal Demokrat', ko: '사회민주주의', it: 'Socialdemocratico', nl: 'Sociaal-democraat', pl: 'Socjaldemokrata', uk: 'Соціал-демократ', vi: 'Dân chủ xã hội', bn: 'সোশ্যাল ডেমোক্র্যাট', fa: 'سوسیال دموکرات' },
  liberal:      { de: 'Liberal', en: 'Liberal', es: 'Liberal', fr: 'Libéral', pt: 'Liberal', ar: 'ليبرالي', zh: '自由主义', ja: 'リベラル', hi: 'उदारवादी', ru: 'Либерал', id: 'Liberal', tr: 'Liberal', ko: '자유주의', it: 'Liberale', nl: 'Liberaal', pl: 'Liberał', uk: 'Ліберал', vi: 'Tự do', bn: 'উদারপন্থী', fa: 'لیبرال' },
  conservative: { de: 'Konservativ', en: 'Conservative', es: 'Conservador', fr: 'Conservateur', pt: 'Conservador', ar: 'محافظ', zh: '保守派', ja: '保守', hi: 'रूढ़िवादी', ru: 'Консерватор', id: 'Konservatif', tr: 'Muhafazakâr', ko: '보수', it: 'Conservatore', nl: 'Conservatief', pl: 'Konserwatysta', uk: 'Консерватор', vi: 'Bảo thủ', bn: 'রক্ষণশীল', fa: 'محافظه‌کار' },
  libertarian:  { de: 'Libertär', en: 'Libertarian', es: 'Libertario', fr: 'Libertarien', pt: 'Libertário', ar: 'ليبرتاري', zh: '自由意志主义', ja: 'リバタリアン', hi: 'स्वतंत्रतावादी', ru: 'Либертарианец', id: 'Libertarian', tr: 'Liberteryenist', ko: '자유지상주의', it: 'Libertario', nl: 'Libertariër', pl: 'Libertarianin', uk: 'Лібертаріанець', vi: 'Tự do chủ nghĩa', bn: 'স্বাধীনতাবাদী', fa: 'آزادی‌خواه' },
  centrist:     { de: 'Zentrismus', en: 'Centrist', es: 'Centrista', fr: 'Centriste', pt: 'Centrista', ar: 'وسطي', zh: '中间派', ja: '中道', hi: 'मध्यमार्गी', ru: 'Центрист', id: 'Sentris', tr: 'Merkez', ko: '중도', it: 'Centrista', nl: 'Centrumgericht', pl: 'Centrysta', uk: 'Центрист', vi: 'Trung dung', bn: 'মধ্যপন্থী', fa: 'میانه‌رو' },
};

const TX = {
  archetype_label: { de: 'POLITISCHER TYPUS', en: 'POLITICAL ARCHETYPE', es: 'ARQUETIPO POLÍTICO', fr: 'ARCHÉTYPE POLITIQUE', pt: 'ARQUÉTIPO POLÍTICO', ar: 'النمط السياسي', zh: '政治类型', ja: '政治タイプ', hi: 'राजनीतिक प्रकार', ru: 'ПОЛИТИЧЕСКИЙ ТИП', id: 'TIPE POLITIK', tr: 'SİYASİ TİP', ko: '정치 유형', it: 'TIPO POLITICO', nl: 'POLITIEK TYPE', pl: 'TYP POLITYCZNY', uk: 'ПОЛІТИЧНИЙ ТИП', vi: 'KIỂU CHÍNH TRỊ', bn: 'রাজনৈতিক ধরন', fa: 'نوع سیاسی' },
  create_cta: { de: 'Erstelle deinen eigenen Zwilling', en: 'Create your own twin', es: 'Crea tu propio gemelo', fr: 'Crée ton propre jumeau', pt: 'Crie seu próprio gêmeo', ar: 'أنشئ توأمك الخاص', zh: '创建你自己的数字孪生', ja: '自分のツインを作成', hi: 'अपना खुद का ट्विन बनाएं', ru: 'Создайте своего двойника', id: 'Buat kembaranmu sendiri', tr: 'Kendi ikizini oluştur', ko: '자신만의 트윈 만들기', it: 'Crea il tuo gemello', nl: 'Maak je eigen tweeling', pl: 'Utwórz własnego bliźniaka', uk: 'Створіть свого двійника', vi: 'Tạo sinh đôi của riêng bạn', bn: 'আপনার নিজের যমজ তৈরি করুন', fa: 'دوقلوی خود را بسازید' },
  create_sub: { de: '2 Minuten. 8 Schieberegler. Deine politische Stimme — permanent aktiv.', en: '2 minutes. 8 sliders. Your political voice — permanently active.', es: '2 minutos. 8 controles. Tu voz política — permanentemente activa.', fr: '2 minutes. 8 curseurs. Ta voix politique — en permanence active.', pt: '2 minutos. 8 controles. Sua voz política — permanentemente ativa.', ar: 'دقيقتان. 8 شرائح. صوتك السياسي — نشط باستمرار.', zh: '2分钟。8个滑块。你的政治声音——永远活跃。', ja: '2分間。8つのスライダー。あなたの政治的声 — 永続的に有効。', hi: '2 मिनट। 8 स्लाइडर। आपकी राजनीतिक आवाज़ — स्थायी रूप से सक्रिय।', ru: '2 минуты. 8 слайдеров. Ваш политический голос — активен навсегда.', id: '2 menit. 8 penggeser. Suara politikmu — aktif selamanya.', tr: '2 dakika. 8 kaydırıcı. Politik sesin — kalıcı olarak aktif.', ko: '2분. 8개의 슬라이더. 당신의 정치적 목소리 — 영구적으로 활성화.', it: '2 minuti. 8 cursori. La tua voce politica — permanentemente attiva.', nl: '2 minuten. 8 schuifregelaars. Jouw politieke stem — blijvend actief.', pl: '2 minuty. 8 suwaków. Twój polityczny głos — na stałe aktywny.', uk: '2 хвилини. 8 повзунків. Твій політичний голос — постійно активний.', vi: '2 phút. 8 thanh trượt. Giọng nói chính trị của bạn — luôn hoạt động.', bn: '২ মিনিট। ৮টি স্লাইডার। আপনার রাজনৈতিক কণ্ঠ — স্থায়ীভাবে সক্রিয়।', fa: '۲ دقیقه. ۸ لغزنده. صدای سیاسی شما — همیشه فعال.' },
  you_agree:   { de: 'Ihr stimmt überein bei', en: 'You agree on', es: 'Están de acuerdo en', fr: 'Vous êtes d\'accord sur', pt: 'Vocês concordam em', ar: 'أنتما متفقان على', zh: '你们在此意见一致', ja: '合意している点', hi: 'आप सहमत हैं', ru: 'Вы согласны по', id: 'Anda setuju tentang', tr: 'Katıldığınız konular', ko: '동의하는 항목', it: 'Siete d\'accordo su', nl: 'Jullie zijn het eens over', pl: 'Zgadzacie się w', uk: 'Ви згодні щодо', vi: 'Bạn đồng ý về', bn: 'আপনারা একমত', fa: 'توافق دارید در' },
  you_differ:  { de: 'Ihr seht es anders bei', en: 'You differ on', es: 'Difieren en', fr: 'Vous différez sur', pt: 'Vocês diferem em', ar: 'أنتما مختلفان في', zh: '你们在此看法不同', ja: '意見が分かれる点', hi: 'आप अलग हैं', ru: 'Вы расходитесь по', id: 'Anda berbeda tentang', tr: 'Farklılaştığınız konular', ko: '의견이 다른 항목', it: 'Siete in disaccordo su', nl: 'Jullie verschillen over', pl: 'Różnicie się w', uk: 'Ви розходитесь щодо', vi: 'Bạn không đồng ý về', bn: 'আপনারা ভিন্নমত', fa: 'اختلاف دارید در' },
  quick_compare: { de: 'Schnellvergleich', en: 'Quick comparison', es: 'Comparación rápida', fr: 'Comparaison rapide', pt: 'Comparação rápida', ar: 'مقارنة سريعة', zh: '快速比较', ja: 'クイック比較', hi: 'त्वरित तुलना', ru: 'Быстрое сравнение', id: 'Perbandingan cepat', tr: 'Hızlı karşılaştırma', ko: '빠른 비교', it: 'Confronto rapido', nl: 'Snelle vergelijking', pl: 'Szybkie porównanie', uk: 'Швидке порівняння', vi: 'So sánh nhanh', bn: 'দ্রুত তুলনা', fa: 'مقایسه سریع' },
  searching: { de: 'Suche Zwilling…', en: 'Searching for twin…', es: 'Buscando gemelo…', fr: 'Recherche du jumeau…', pt: 'Procurando gêmeo…', ar: 'البحث عن توأم…', zh: '搜索数字孪生…', ja: 'ツインを検索中…', hi: 'ट्विन खोज रहे हैं…', ru: 'Поиск двойника…', id: 'Mencari kembaran…', tr: 'İkiz aranıyor…', ko: '트윈 검색 중…', it: 'Ricerca del gemello…', nl: 'Tweeling zoeken…', pl: 'Szukam bliźniaka…', uk: 'Пошук двійника…', vi: 'Đang tìm sinh đôi…', bn: 'যমজ খুঁজছে…', fa: 'در حال جستجوی دوقلو…' },
  not_found: { de: 'Kein Zwilling für diesen Public Key gefunden.', en: 'No twin found for this public key.', es: 'No se encontró gemelo para esta clave pública.', fr: 'Aucun jumeau trouvé pour cette clé publique.', pt: 'Nenhum gêmeo encontrado para esta chave pública.', ar: 'لم يُعثر على توأم لهذا المفتاح العام.', zh: '未找到此公钥的数字孪生。', ja: 'この公開鍵のツインが見つかりません。', hi: 'इस पब्लिक की के लिए कोई ट्विन नहीं मिला।', ru: 'Двойник для этого публичного ключа не найден.', id: 'Tidak ada kembaran untuk kunci publik ini.', tr: 'Bu genel anahtar için ikiz bulunamadı.', ko: '이 공개 키의 트윈을 찾을 수 없습니다.', it: 'Nessun gemello trovato per questa chiave pubblica.', nl: 'Geen tweeling gevonden voor deze publieke sleutel.', pl: 'Nie znaleziono bliźniaka dla tego klucza publicznego.', uk: 'Двійника для цього відкритого ключа не знайдено.', vi: 'Không tìm thấy sinh đôi cho khóa công khai này.', bn: 'এই পাবলিক কী-এর জন্য কোনো যমজ পাওয়া যায়নি।', fa: 'برای این کلید عمومی دوقلویی پیدا نشد.' },
  twin_of: { de: 'ZWILLING VON', en: 'TWIN OF', es: 'GEMELO DE', fr: 'JUMEAU DE', pt: 'GÊMEO DE', ar: 'توأم', zh: '数字孪生', ja: 'ツイン', hi: 'ट्विन', ru: 'ДВОЙНИК', id: 'KEMBARAN', tr: 'İKİZ', ko: '트윈', it: 'GEMELLO DI', nl: 'TWEELING VAN', pl: 'BLIŹNIAK', uk: 'ДВІЙНИК', vi: 'SINH ĐÔI CỦA', bn: 'যমজ', fa: 'دوقلوی' },
  dimensions: { de: '8 Dimensionen', en: '8 Dimensions', es: '8 Dimensiones', fr: '8 Dimensions', pt: '8 Dimensões', ar: '٨ أبعاد', zh: '8个维度', ja: '8つの次元', hi: '8 आयाम', ru: '8 измерений', id: '8 Dimensi', tr: '8 Boyut', ko: '8가지 차원', it: '8 Dimensioni', nl: '8 Dimensies', pl: '8 Wymiarów', uk: '8 вимірів', vi: '8 Chiều', bn: '৮টি মাত্রা', fa: '۸ بُعد' },
  match_score: { de: 'Übereinstimmung', en: 'Compatibility', es: 'Compatibilidad', fr: 'Compatibilité', pt: 'Compatibilidade', ar: 'التوافق', zh: '匹配度', ja: '一致度', hi: 'संगतता', ru: 'Совместимость', id: 'Kompatibilitas', tr: 'Uyumluluk', ko: '호환성', it: 'Compatibilità', nl: 'Compatibiliteit', pl: 'Zgodność', uk: 'Сумісність', vi: 'Tương thích', bn: 'সামঞ্জস্যতা', fa: 'سازگاری' },
  policy_compare: { de: 'Politische Positionen im Vergleich', en: 'Policy positions compared', es: 'Posiciones políticas comparadas', fr: 'Positions politiques comparées', pt: 'Posições políticas comparadas', ar: 'مقارنة المواقف السياسية', zh: '政策立场对比', ja: '政策立場比較', hi: 'नीतिगत स्थितियों की तुलना', ru: 'Сравнение политических позиций', id: 'Perbandingan posisi kebijakan', tr: 'Politika pozisyonları karşılaştırması', ko: '정책 입장 비교', it: 'Posizioni politiche a confronto', nl: 'Beleidsposities vergeleken', pl: 'Porównanie stanowisk politycznych', uk: 'Порівняння політичних позицій', vi: 'So sánh lập trường chính sách', bn: 'নীতি অবস্থানের তুলনা', fa: 'مقایسه موضع‌گیری‌های سیاسی' },
  both_agree: { de: 'Beide stimmen zu', en: 'Both agree', es: 'Ambos coinciden', fr: 'Les deux sont d\'accord', pt: 'Ambos concordam', ar: 'كلاهما يتفق', zh: '双方同意', ja: '両方が同意', hi: 'दोनों सहमत', ru: 'Оба согласны', id: 'Keduanya setuju', tr: 'İkisi de katılıyor', ko: '둘 다 동의', it: 'Entrambi d\'accordo', nl: 'Beiden eens', pl: 'Oboje zgodni', uk: 'Обоє згодні', vi: 'Cả hai đồng ý', bn: 'উভয়ই একমত', fa: 'هر دو موافق' },
  both_oppose: { de: 'Beide lehnen ab', en: 'Both oppose', es: 'Ambos se oponen', fr: 'Les deux s\'opposent', pt: 'Ambos se opõem', ar: 'كلاهما يعارض', zh: '双方反对', ja: '両方が反対', hi: 'दोनों विरोध करते हैं', ru: 'Оба против', id: 'Keduanya menolak', tr: 'İkisi de karşı', ko: '둘 다 반대', it: 'Entrambi contrari', nl: 'Beiden tegen', pl: 'Oboje przeciw', uk: 'Обоє проти', vi: 'Cả hai phản đối', bn: 'উভয়ই বিরোধী', fa: 'هر دو مخالف' },
  views_clash: { de: 'Verschiedene Ansichten', en: 'Views clash', es: 'Opiniones opuestas', fr: 'Opinions divergentes', pt: 'Opiniões divergentes', ar: 'آراء متضاربة', zh: '观点冲突', ja: '見解が衝突', hi: 'विचारों में टकराव', ru: 'Взгляды расходятся', id: 'Pandangan bertentangan', tr: 'Görüşler çatışıyor', ko: '의견 충돌', it: 'Opinioni contrastanti', nl: 'Meningen botsen', pl: 'Poglądy się różnią', uk: 'Погляди розходяться', vi: 'Quan điểm mâu thuẫn', bn: 'মতামত সংঘাত', fa: 'دیدگاه‌ها در تضادند' },
  compare_cta: { de: 'Meinen Zwilling vergleichen', en: 'Compare my twin', es: 'Comparar mi gemelo', fr: 'Comparer mon jumeau', pt: 'Comparar meu gêmeo', ar: 'قارن توأمي', zh: '比较我的孪生', ja: '私のツインを比較', hi: 'मेरा ट्विन तुलना करें', ru: 'Сравнить моего двойника', id: 'Bandingkan kembaranku', tr: 'İkizimi karşılaştır', ko: '내 트윈 비교하기', it: 'Confronta il mio gemello', nl: 'Mijn tweeling vergelijken', pl: 'Porównaj mojego bliźniaka', uk: 'Порівняти мого двійника', vi: 'So sánh sinh đôi của tôi', bn: 'আমার যমজ তুলনা করুন', fa: 'دوقلوی من را مقایسه کنید' },
};

function truncateKey(key: string): string {
  return key.slice(0, 8) + '…' + key.slice(-8);
}

function twinMatchScore(a: TwinProfile, b: TwinProfile): number {
  const dist = TOPICS.reduce((sum, topic) => sum + Math.abs(a[topic] - b[topic]), 0) / TOPICS.length;
  return Math.round((1 - dist) * 100);
}

function matchScoreColor(score: number): string {
  if (score >= 75) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

function ValueBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{
        flex: 1,
        height: '3px',
        background: 'var(--divider)',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${pct}%`,
          background: 'var(--text-1)',
          transition: 'width 0.8s ease',
        }} />
      </div>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        color: 'var(--text-2)',
        minWidth: '36px',
        textAlign: 'right',
      }}>
        {pct}%
      </span>
    </div>
  );
}

type Phase = 'loading' | 'found' | 'not-found';

export default function TwinByPubkeyPage({
  params,
}: {
  params: { pubkey: string };
}) {
  const { lang } = useLang();
  const [phase, setPhase] = useState<Phase>('loading');
  const [twin, setTwin] = useState<TwinProfile | null>(null);
  const [myTwin, setMyTwin] = useState<TwinProfile | null>(null);

  const hasOwnTwin = !!myTwin;

  useEffect(() => {
    fetchTwinByPubkey(params.pubkey).then((result) => {
      if (result) {
        setTwin(result);
        setPhase('found');
      } else {
        setPhase('not-found');
      }
    });
    getMyTwin().then(t => setMyTwin(t ?? null));
  }, [params.pubkey]);

  if (phase === 'loading') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <p className="label">{TX.searching[lang as keyof typeof TX.searching] ?? TX.searching.en}</p>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: 'var(--text-3)',
        }}>
          {truncateKey(params.pubkey)}
        </p>
      </div>
    );
  }

  if (phase === 'not-found') {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px' }}>
        <p className="label" style={{ marginBottom: '32px' }}>
          {TX.not_found[lang as keyof typeof TX.not_found] ?? TX.not_found.en}
        </p>
        <Link href="/network" style={{
          display: 'inline-block',
          background: 'transparent',
          color: 'var(--text-2)',
          padding: '14px 28px',
          fontSize: '13px',
          letterSpacing: '0.04em',
          border: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          {t(lang, 'nav_network')}
        </Link>
      </div>
    );
  }

  if (!twin) return null;

  const archetype = classifyTwin(twin);
  const archetypeLabel = (ARCHETYPE_NAMES[archetype] as Record<string, string>)[lang] ?? ARCHETYPE_NAMES[archetype].en;
  const matchScore = myTwin ? twinMatchScore(twin, myTwin) : null;

  return (
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0' }}>
      <div className="container">

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{TX.twin_of[lang as keyof typeof TX.twin_of] ?? TX.twin_of.en}</p>
          <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '20px', wordBreak: 'break-all' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'clamp(13px, 2vw, 16px)',
              color: 'var(--accent, #4B9EFF)',
              letterSpacing: '0.06em',
            }}>
              {truncateKey(params.pubkey)}
            </span>
          </h1>
          {/* Archetype badge + optional match score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid rgba(96,165,250,0.25)',
              background: 'rgba(96,165,250,0.06)',
              padding: '6px 14px',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
              }}>
                {(TX.archetype_label as Record<string, string>)[lang] ?? TX.archetype_label.en}
              </span>
              <span style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(96,165,250,0.9)',
              }}>
                {archetypeLabel}
              </span>
            </div>
            {matchScore !== null && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                border: `1px solid ${matchScoreColor(matchScore)}33`,
                background: `${matchScoreColor(matchScore)}0a`,
                padding: '6px 14px',
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
                  {(TX.match_score as Record<string, string>)[lang] ?? TX.match_score.en}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: matchScoreColor(matchScore) }}>
                  {matchScore}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Radar Chart — shows comparison when visitor has own twin */}
        <div style={{ maxWidth: '280px', margin: '0 auto 12px' }}>
          <RadarChart values={twin} compare={myTwin ?? undefined} animated />
        </div>
        {myTwin && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '40px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#4B9EFF', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '2px', background: '#4B9EFF' }} />
              {(TX.twin_of as Record<string, string>)[lang] ?? TX.twin_of.en}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '16px', height: '2px', background: 'var(--text-3)', borderBottom: '1px dashed var(--text-3)' }} />
              {({ de: 'Du', en: 'You', es: 'Tú', fr: 'Toi', pt: 'Tu', ar: 'أنت', zh: '你', ja: 'あなた', hi: 'आप', ru: 'Вы', id: 'Anda', tr: 'Sen', ko: '당신', it: 'Tu', nl: 'Jij', pl: 'Ty', uk: 'Ви', vi: 'Bạn', bn: 'আপনি', fa: 'شما' } as Record<string, string>)[lang] ?? 'You'}
            </span>
          </div>
        )}
        {!myTwin && <div style={{ marginBottom: '48px' }} />}

        {/* Topic breakdown */}
        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '40px' }}>{TX.dimensions[lang as keyof typeof TX.dimensions] ?? TX.dimensions.en}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {TOPICS.map((topic) => {
              const value = twin[topic];
              const pct = Math.round(value * 100);
              const desc = getTopicDesc(topic, lang);
              return (
                <div key={topic} className="twin-topic-row" style={{
                  padding: '32px 0',
                  borderTop: '1px solid var(--divider)',
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  gap: '40px',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>
                      {getTopicLabel(topic, lang)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                      {pct}%
                    </div>
                  </div>
                  <div>
                    <ValueBar value={value} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: '45%' }}>
                        {desc.low}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: '45%', textAlign: 'right' }}>
                        {desc.high}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick comparison — only when viewer has own twin */}
        {myTwin && (
          <div style={{ marginBottom: '48px' }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
              margin: '0 0 20px',
            }}>
              {(TX.quick_compare as Record<string, string>)[lang] ?? TX.quick_compare.en}
            </p>
            {(() => {
              const diffs = TOPICS.map(topic => ({
                topic,
                label: getTopicLabel(topic, lang),
                delta: myTwin[topic] - (twin[topic] ?? 0.5),
              })).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
              const agreements = diffs.filter(d => Math.abs(d.delta) < 0.15);
              const divergences = diffs.filter(d => Math.abs(d.delta) >= 0.15);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{
                    background: 'rgba(74,222,128,0.04)',
                    border: '1px solid rgba(74,222,128,0.2)',
                    padding: '16px 18px',
                  }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--positive)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                      ✓ {(TX.you_agree as Record<string, string>)[lang] ?? TX.you_agree.en}
                    </p>
                    {agreements.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>—</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {agreements.map(d => (
                          <span key={d.topic} style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                            {d.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{
                    background: 'rgba(239,68,68,0.04)',
                    border: '1px solid rgba(239,68,68,0.15)',
                    padding: '16px 18px',
                  }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--negative)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                      ≠ {(TX.you_differ as Record<string, string>)[lang] ?? TX.you_differ.en}
                    </p>
                    {divergences.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>—</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {divergences.map(d => (
                          <span key={d.topic} style={{ fontSize: '12px', color: 'var(--text-2)' }}>
                            {d.label}
                            <span style={{
                              marginLeft: '6px',
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              color: d.delta > 0 ? 'var(--positive)' : 'var(--negative)',
                            }}>
                              {d.delta > 0 ? '+' : ''}{Math.round(d.delta * 100)}%
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Policy comparison — only when viewer has own twin */}
        {myTwin && (() => {
          const myPositions = inferAllPositions(myTwin, AGENDA);
          const theirPositions = inferAllPositions(twin, AGENDA);
          type Row = { item: typeof AGENDA[0]; myScore: number; theirScore: number; agree: boolean };
          const rows: Row[] = AGENDA.map((item, i) => {
            const myScore = myPositions[i].score;
            const theirScore = theirPositions[i].score;
            return {
              item,
              myScore,
              theirScore,
              agree: (myScore >= 0.5) === (theirScore >= 0.5),
            };
          });
          const agreed = rows.filter(r => r.agree);
          const clashed = rows.filter(r => !r.agree);
          const policyLabel = (TX.policy_compare as Record<string, string>)[lang] ?? TX.policy_compare.en;
          const agreeLabel = (TX.both_agree as Record<string, string>)[lang] ?? TX.both_agree.en;
          const clashLabel = (TX.views_clash as Record<string, string>)[lang] ?? TX.views_clash.en;
          return (
            <div style={{ marginBottom: '48px' }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                margin: '0 0 20px',
              }}>
                {policyLabel}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Agreed */}
                <div style={{ background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.2)', padding: '16px 18px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--positive)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                    ✓ {agreeLabel} ({agreed.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {agreed.slice(0, 6).map(r => (
                      <Link key={r.item.id} href={`/question/${r.item.id}`} style={{ textDecoration: 'none' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.4, display: 'block' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: r.myScore >= 0.5 ? 'var(--positive)' : 'var(--negative)', marginRight: '4px' }}>
                            {r.myScore >= 0.5 ? '↑' : '↓'}
                          </span>
                          {(r.item.text[lang] ?? r.item.text['en']).slice(0, 60)}{(r.item.text[lang] ?? r.item.text['en']).length > 60 ? '…' : ''}
                        </span>
                      </Link>
                    ))}
                    {agreed.length > 6 && <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>+{agreed.length - 6} more</span>}
                  </div>
                </div>
                {/* Clashed */}
                <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', padding: '16px 18px' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--negative)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
                    ≠ {clashLabel} ({clashed.length})
                  </p>
                  {clashed.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>—</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {clashed.slice(0, 6).map(r => (
                        <Link key={r.item.id} href={`/question/${r.item.id}`} style={{ textDecoration: 'none' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-2)', lineHeight: 1.4, display: 'block' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--negative)', marginRight: '4px' }}>≠</span>
                            {(r.item.text[lang] ?? r.item.text['en']).slice(0, 60)}{(r.item.text[lang] ?? r.item.text['en']).length > 60 ? '…' : ''}
                          </span>
                        </Link>
                      ))}
                      {clashed.length > 6 && <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>+{clashed.length - 6} more</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '48px' }}>
          {hasOwnTwin ? (
            <Link href="/compare" style={{
              display: 'inline-block',
              background: 'var(--text-1)',
              color: 'var(--bg)',
              padding: '14px 28px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              {TX.compare_cta[lang as keyof typeof TX.compare_cta] ?? TX.compare_cta.en}
            </Link>
          ) : (
            <Link href="/training" style={{
              display: 'inline-block',
              background: 'var(--text-1)',
              color: 'var(--bg)',
              padding: '14px 28px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              {TX.create_cta[lang as keyof typeof TX.create_cta] ?? TX.create_cta.en} →
            </Link>
          )}
          <Link href="/network" style={{
            display: 'inline-block',
            background: 'transparent',
            color: 'var(--text-2)',
            padding: '14px 28px',
            fontSize: '13px',
            letterSpacing: '0.04em',
            border: '1px solid var(--border)',
            textAlign: 'center',
          }}>
            {t(lang, 'nav_network')}
          </Link>
        </div>

        {/* Create twin CTA for new visitors */}
        {!hasOwnTwin && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '32px 28px',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              margin: '0 0 12px',
            }}>no kings</p>
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-1)',
              margin: '0 0 8px',
              lineHeight: 1.3,
            }}>
              {TX.create_sub[lang as keyof typeof TX.create_sub] ?? TX.create_sub.en}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 24px', lineHeight: 1.6 }}>
              {t(lang, 'twin_compare_desc')}
            </p>
            <Link href="/training" style={{
              display: 'inline-block',
              background: 'var(--text-1)',
              color: 'var(--bg)',
              padding: '12px 28px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textDecoration: 'none',
            }}>
              {TX.create_cta[lang as keyof typeof TX.create_cta] ?? TX.create_cta.en} →
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
