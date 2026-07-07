'use client';

import Link from 'next/link';
import { useLang } from '@/context/LangContext';

const T = {
  phase_label: {
    de: 'PHASE 2', en: 'PHASE 2', es: 'FASE 2', fr: 'PHASE 2', pt: 'FASE 2',
    ar: 'المرحلة 2', zh: '第二阶段', ja: 'フェーズ2', hi: 'चरण 2', ru: 'ФАЗА 2',
    id: 'FASE 2', tr: 'AŞAMA 2', ko: '단계 2', it: 'FASE 2', nl: 'FASE 2',
    pl: 'FAZA 2', uk: 'ФАЗА 2', vi: 'GIAI ĐOẠN 2', bn: 'পর্যায় ২', fa: 'مرحله ۲',
  },
  title: {
    de: 'Web of Trust.', en: 'Web of Trust.', es: 'Red de confianza.', fr: 'Réseau de confiance.',
    pt: 'Rede de confiança.', ar: 'شبكة الثقة.', zh: '信任网络。', ja: '信頼のウェブ。',
    hi: 'विश्वास का जाल।', ru: 'Сеть доверия.', id: 'Jaringan Kepercayaan.', tr: 'Güven Ağı.',
    ko: '신뢰 네트워크.', it: 'Rete di fiducia.', nl: 'Vertrouwensnetwerk.', pl: 'Sieć Zaufania.',
    uk: 'Мережа довіри.', vi: 'Mạng lưới tin cậy.', bn: 'বিশ্বাসের জাল।', fa: 'شبکه اعتماد.',
  },
  subtitle: {
    de: 'Ein Mensch, ein Zwilling. Keine zentrale Behörde prüft das — stattdessen bürgen Menschen füreinander. Das ist das Web of Trust.',
    en: 'One human, one twin. No central authority verifies this — instead, humans verify each other. This is the Web of Trust.',
    es: 'Un humano, un gemelo. Ninguna autoridad central lo verifica — en cambio, los humanos se verifican mutuamente.',
    fr: 'Un humain, un jumeau. Aucune autorité centrale ne vérifie cela — les humains se vérifient mutuellement.',
    pt: 'Um humano, um gêmeo. Nenhuma autoridade central verifica isso — em vez disso, humanos se verificam mutuamente.',
    ar: 'إنسان واحد، توأم واحد. لا سلطة مركزية تتحقق من ذلك — بدلاً من ذلك، يتحقق البشر من بعضهم البعض.',
    zh: '一个人，一个数字孪生。没有中央机构验证这一点——人们互相验证。',
    ja: '一人の人間、一つのツイン。中央機関は確認しない — 人間同士が互いに確認する。',
    hi: 'एक इंसान, एक ट्विन। कोई केंद्रीय प्राधिकरण इसे सत्यापित नहीं करता — बजाय इसके, इंसान एक-दूसरे को सत्यापित करते हैं।',
    ru: 'Один человек, один двойник. Никакой центральной власти — вместо этого люди верифицируют друг друга.',
    id: 'Satu manusia, satu kembaran. Tidak ada otoritas pusat yang memverifikasi ini — manusia memverifikasi satu sama lain.',
    tr: 'Bir insan, bir ikiz. Hiçbir merkezi otorite bunu doğrulamaz — insanlar birbirini doğrular.',
    ko: '한 사람, 한 트윈. 중앙 기관이 이것을 검증하지 않습니다 — 대신 사람들이 서로를 검증합니다.',
    it: 'Un essere umano, un gemello. Nessuna autorità centrale lo verifica — invece, gli esseri umani si verificano a vicenda.',
    nl: 'Eén mens, één tweeling. Geen centrale autoriteit verifieert dit — mensen verifiëren elkaar.',
    pl: 'Jeden człowiek, jeden bliźniak. Żadna centralna władza tego nie weryfikuje — zamiast tego ludzie weryfikują się nawzajem.',
    uk: 'Одна людина, один двійник. Жодної центральної влади — натомість люди верифікують один одного.',
    vi: 'Một con người, một sinh đôi. Không có cơ quan trung ương nào xác minh điều này — thay vào đó, con người xác minh lẫn nhau.',
    bn: 'একজন মানুষ, একটি যমজ। কোনো কেন্দ্রীয় কর্তৃপক্ষ এটি যাচাই করে না — বরং মানুষ একে অপরকে যাচাই করে।',
    fa: 'یک انسان، یک دوقلو. هیچ مقام مرکزی این را تأیید نمی‌کند — در عوض، انسان‌ها یکدیگر را تأیید می‌کنند.',
  },
  problem_label: {
    de: 'DAS PROBLEM', en: 'THE PROBLEM', es: 'EL PROBLEMA', fr: 'LE PROBLÈME', pt: 'O PROBLEMA',
    ar: 'المشكلة', zh: '问题所在', ja: '問題', hi: 'समस्या', ru: 'ПРОБЛЕМА',
    id: 'MASALAHNYA', tr: 'SORUN', ko: '문제', it: 'IL PROBLEMA', nl: 'HET PROBLEEM',
    pl: 'PROBLEM', uk: 'ПРОБЛЕМА', vi: 'VẤN ĐỀ', bn: 'সমস্যা', fa: 'مشکل',
  },
  problem_title: {
    de: 'Eine Person könnte 10.000 Zwillinge erstellen.',
    en: 'One person could create 10,000 twins.',
    es: 'Una persona podría crear 10.000 gemelos.',
    fr: 'Une personne pourrait créer 10 000 jumeaux.',
    pt: 'Uma pessoa poderia criar 10.000 gêmeos.',
    ar: 'يمكن لشخص واحد إنشاء 10,000 توأم.',
    zh: '一个人可以创建10,000个数字孪生。',
    ja: '一人が1万個のツインを作成できる。',
    hi: 'एक व्यक्ति 10,000 ट्विन बना सकता है।',
    ru: 'Один человек может создать 10,000 двойников.',
    id: 'Satu orang bisa membuat 10.000 kembaran.',
    tr: 'Bir kişi 10.000 ikiz oluşturabilir.',
    ko: '한 사람이 10,000개의 트윈을 만들 수 있습니다.',
    it: 'Una persona potrebbe creare 10.000 gemelli.',
    nl: 'Eén persoon zou 10.000 tweelingen kunnen aanmaken.',
    pl: 'Jedna osoba mogłaby stworzyć 10 000 bliźniaków.',
    uk: 'Одна людина може створити 10,000 двійників.',
    vi: 'Một người có thể tạo 10.000 sinh đôi.',
    bn: 'একজন ব্যক্তি ১০,০০০ যমজ তৈরি করতে পারে।',
    fa: 'یک نفر می‌تواند ۱۰٬۰۰۰ دوقلو بسازد.',
  },
  solution_label: {
    de: 'DIE LÖSUNG', en: 'THE SOLUTION', es: 'LA SOLUCIÓN', fr: 'LA SOLUTION', pt: 'A SOLUÇÃO',
    ar: 'الحل', zh: '解决方案', ja: '解決策', hi: 'समाधान', ru: 'РЕШЕНИЕ',
    id: 'SOLUSINYA', tr: 'ÇÖZÜM', ko: '해결책', it: 'LA SOLUZIONE', nl: 'DE OPLOSSING',
    pl: 'ROZWIĄZANIE', uk: 'РІШЕННЯ', vi: 'GIẢI PHÁP', bn: 'সমাধান', fa: 'راه‌حل',
  },
  solution_title: {
    de: 'Menschen bürgen füreinander.',
    en: 'Humans vouch for each other.',
    es: 'Los humanos responden unos por otros.',
    fr: 'Les humains se portent garants les uns des autres.',
    pt: 'Os humanos respondem uns pelos outros.',
    ar: 'البشر يضمنون بعضهم البعض.',
    zh: '人类互相担保。',
    ja: '人間が互いに保証し合う。',
    hi: 'इंसान एक-दूसरे की गारंटी देते हैं।',
    ru: 'Люди поручаются друг за друга.',
    id: 'Manusia menjamin satu sama lain.',
    tr: 'İnsanlar birbirlerine kefil olur.',
    ko: '인간이 서로를 보증합니다.',
    it: 'Gli esseri umani si garantiscono a vicenda.',
    nl: 'Mensen staan voor elkaar in.',
    pl: 'Ludzie ręczą za siebie nawzajem.',
    uk: 'Люди поручаються один за одного.',
    vi: 'Con người bảo lãnh cho nhau.',
    bn: 'মানুষ একে অপরের জন্য জামিনদার হয়।',
    fa: 'انسان‌ها برای یکدیگر ضمانت می‌دهند.',
  },
  steps: {
    en: [
      { num: '01', title: 'You know someone', body: 'You meet someone in person — a friend, a colleague, a stranger at an event. You scan their QR code or share public keys.' },
      { num: '02', title: 'You attest they are real', body: 'You sign a cryptographic statement: "I vouch that [their key] belongs to a real, unique human I have met." This attestation is published on Nostr.' },
      { num: '03', title: 'Trust becomes a graph', body: 'Each attestation is an edge in a social graph. A twin with 10 vouchers from already-trusted humans carries more weight than an unvouched twin.' },
      { num: '04', title: 'Weight is transparent', body: 'The network aggregate is a trust-weighted average — not a simple count. Every calculation is public and auditable. No black box.' },
    ],
    de: [
      { num: '01', title: 'Du kennst jemanden', body: 'Du triffst jemanden persönlich — einen Freund, Kollegen, Fremden auf einem Event. Du scannst seinen QR-Code oder tauscht öffentliche Schlüssel aus.' },
      { num: '02', title: 'Du bestätigst, dass er real ist', body: 'Du signierst eine kryptografische Aussage: "Ich bürge dafür, dass [ihr Schlüssel] zu einem echten, einzigartigen Menschen gehört, den ich getroffen habe." Diese Attestierung wird auf Nostr veröffentlicht.' },
      { num: '03', title: 'Vertrauen wird ein Graph', body: 'Jede Attestierung ist eine Kante in einem sozialen Graphen. Ein Zwilling mit 10 Bürgen von bereits vertrauenswürdigen Menschen wiegt mehr als ein unbürgter Zwilling.' },
      { num: '04', title: 'Gewicht ist transparent', body: 'Das Netzwerk-Aggregat ist ein vertrauensgewichteter Durchschnitt — keine einfache Zählung. Jede Berechnung ist öffentlich und prüfbar. Keine Black Box.' },
    ],
  },
  alt_label: {
    de: 'WARUM NICHT TELEFON-VERIFIKATION?', en: 'WHY NOT PHONE VERIFICATION?',
    es: '¿POR QUÉ NO VERIFICACIÓN TELEFÓNICA?', fr: 'POURQUOI PAS LA VÉRIFICATION PAR TÉLÉPHONE?',
    pt: 'POR QUE NÃO A VERIFICAÇÃO POR TELEFONE?', ar: 'لماذا لا يمكن التحقق عبر الهاتف؟',
    zh: '为什么不用手机验证？', ja: 'なぜ電話認証ではないのか？',
    hi: 'फोन सत्यापन क्यों नहीं?', ru: 'ПОЧЕМУ НЕ ПРОВЕРКА ПО ТЕЛЕФОНУ?',
    id: 'MENGAPA BUKAN VERIFIKASI TELEPON?', tr: 'NEDEN TELEFON DOĞRULAMASI DEĞİL?',
    ko: '전화 인증은 왜 안 되나요?', it: 'PERCHÉ NON LA VERIFICA VIA TELEFONO?',
    nl: 'WAAROM GEEN TELEFOONVERIFICATIE?', pl: 'DLACZEGO NIE WERYFIKACJA TELEFONICZNA?',
    uk: 'ЧОМУ НЕ ПЕРЕВІРКА ПО ТЕЛЕФОНУ?', vi: 'TẠI SAO KHÔNG XÁC MINH QUA ĐIỆN THOẠI?',
    bn: 'ফোন যাচাই কেন নয়?', fa: 'چرا تأیید تلفن نه؟',
  },
  props_label: {
    de: 'EIGENSCHAFTEN DES WEB OF TRUST', en: 'PROPERTIES OF WEB OF TRUST',
    es: 'PROPIEDADES DE LA RED DE CONFIANZA', fr: 'PROPRIÉTÉS DU RÉSEAU DE CONFIANCE',
    pt: 'PROPRIEDADES DA REDE DE CONFIANÇA', ar: 'خصائص شبكة الثقة',
    zh: '信任网络的特性', ja: '信頼ウェブの特性',
    hi: 'विश्वास नेटवर्क की विशेषताएं', ru: 'СВОЙСТВА СЕТИ ДОВЕРИЯ',
    id: 'SIFAT-SIFAT JARINGAN KEPERCAYAAN', tr: 'GÜVEN AĞININ ÖZELLİKLERİ',
    ko: '신뢰 네트워크의 특성', it: 'PROPRIETÀ DELLA RETE DI FIDUCIA',
    nl: 'EIGENSCHAPPEN VAN HET VERTROUWENSNETWERK', pl: 'WŁAŚCIWOŚCI SIECI ZAUFANIA',
    uk: 'ВЛАСТИВОСТІ МЕРЕЖІ ДОВІРИ', vi: 'ĐẶC ĐIỂM CỦA MẠNG LƯỚI TIN CẬY',
    bn: 'বিশ্বাসের নেটওয়ার্কের বৈশিষ্ট্য', fa: 'ویژگی‌های شبکه اعتماد',
  },
  timeline_label: {
    de: 'WANN STARTET DAS?', en: 'WHEN DOES THIS LAUNCH?',
    es: '¿CUÁNDO SE LANZA ESTO?', fr: 'QUAND CELA SERA-T-IL LANCÉ?',
    pt: 'QUANDO ISSO É LANÇADO?', ar: 'متى يُطلق هذا؟',
    zh: '这什么时候推出？', ja: 'いつリリースされますか？',
    hi: 'यह कब लॉन्च होगा?', ru: 'КОГДА ЭТО ЗАПУСТИТСЯ?',
    id: 'KAPAN INI DILUNCURKAN?', tr: 'BU NE ZAMAN BAŞLATILACAK?',
    ko: '언제 출시되나요?', it: 'QUANDO VIENE LANCIATO?',
    nl: 'WANNEER WORDT DIT GELANCEERD?', pl: 'KIEDY TO SIĘ URUCHOMI?',
    uk: 'КОЛИ ЦЕ ЗАПУСТИТЬСЯ?', vi: 'KHI NÀO RA MẮT?',
    bn: 'এটি কখন চালু হবে?', fa: 'چه زمانی راه‌اندازی می‌شود؟',
  },
  cta_identity: {
    de: 'Meine Identität & Schlüssel', en: 'My Identity & Key',
    es: 'Mi identidad y clave', fr: 'Mon identité et clé', pt: 'Minha identidade e chave',
    ar: 'هويتي ومفتاحي', zh: '我的身份和密钥', ja: '私の身元と鍵',
    hi: 'मेरी पहचान और चाबी', ru: 'Мой ключ и личность',
    id: 'Identitas & Kunci Saya', tr: 'Kimliğim ve Anahtarım', ko: '내 신원 및 키',
    it: 'La mia identità e chiave', nl: 'Mijn identiteit & sleutel', pl: 'Moja tożsamość i klucz',
    uk: 'Моя особистість і ключ', vi: 'Danh tính & Khóa của tôi',
    bn: 'আমার পরিচয় ও চাবি', fa: 'هویت و کلید من',
  },
  cta_vision: {
    de: 'Die gesamte Vision', en: 'Full Vision',
    es: 'Visión completa', fr: 'Vision complète', pt: 'Visão completa',
    ar: 'الرؤية الكاملة', zh: '完整愿景', ja: '完全なビジョン',
    hi: 'पूरी दृष्टि', ru: 'Полное видение',
    id: 'Visi Lengkap', tr: 'Tam Vizyon', ko: '전체 비전',
    it: 'Visione completa', nl: 'Volledig Visie', pl: 'Pełna Wizja',
    uk: 'Повне бачення', vi: 'Tầm Nhìn Đầy Đủ',
    bn: 'সম্পূর্ণ দৃষ্টিভঙ্গি', fa: 'دیدگاه کامل',
  },
};

function tx(key: keyof typeof T, lang: string): string {
  const block = T[key] as Record<string, string>;
  return block[lang] ?? block.en;
}

export default function TrustPage() {
  const { lang } = useLang();
  const isRtl = lang === 'ar' || lang === 'fa';
  const steps = T.steps[lang as keyof typeof T.steps] ?? T.steps.en;

  return (
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0' }} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container" style={{ maxWidth: '720px' }}>

        {/* Header */}
        <p className="label" style={{ marginBottom: '40px' }}>{tx('phase_label', lang)}</p>
        <h1 style={{ marginBottom: '32px', lineHeight: 1.15 }}>
          {tx('title', lang)}
        </h1>
        <p style={{ fontSize: '18px', lineHeight: 1.85, marginBottom: '64px', maxWidth: '560px' }}>
          {tx('subtitle', lang)}
        </p>

        <hr style={{ marginBottom: '64px' }} />

        {/* The Problem */}
        <div style={{ marginBottom: '72px' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx('problem_label', lang)}</p>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '24px' }}>
            {tx('problem_title', lang)}
          </h2>
          <p style={{ fontSize: '15px', lineHeight: 1.9, marginBottom: '16px' }}>
            The strength of no kings rests on one axiom: every twin represents one real human.
            If someone creates thousands of fake twins, they become a king — a single person
            with amplified influence. This is called a Sybil attack.
          </p>
          <p style={{ fontSize: '15px', lineHeight: 1.9 }}>
            Traditional solutions require central identity verification: a phone number, a government ID,
            a biometric scan. Each of these creates a gatekeeper — which is exactly what no kings must avoid.
          </p>
        </div>

        {/* The Solution */}
        <div style={{ marginBottom: '72px' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx('solution_label', lang)}</p>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '32px' }}>
            {tx('solution_title', lang)}
          </h2>

          {steps.map(step => (
            <div key={step.num} style={{
              display: 'grid',
              gridTemplateColumns: '56px 1fr',
              gap: '24px',
              paddingBottom: '40px',
              marginBottom: '40px',
              borderBottom: '1px solid var(--divider)',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-3)',
                letterSpacing: '0.1em',
                paddingTop: '4px',
              }}>
                {step.num}
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-sans)', marginBottom: '12px', fontWeight: 500 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: '14px', lineHeight: 1.9 }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Why not alternatives */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '72px',
        }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx('alt_label', lang)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { method: 'Phone number', problem: 'Telecom companies become gatekeepers. Burner phones enable Sybil attacks. Millions have no phone.' },
              { method: 'Government ID', problem: 'Requires trusting a central government — which may be authoritarian. Excludes undocumented people.' },
              { method: 'Biometrics', problem: 'Permanent, irrevocable data. If leaked, cannot be changed. Creates single point of failure.' },
              { method: 'Proof of Work (crypto)', problem: 'Rewards wealth: more computing power → more fake twins. Creates plutocracy, not equality.' },
            ].map(({ method, problem }) => (
              <div key={method} style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                gap: '24px',
                alignItems: 'start',
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--text-2)',
                  letterSpacing: '0.04em',
                  paddingTop: '2px',
                }}>
                  {method}
                </span>
                <span style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--text-3)' }}>
                  {problem}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Properties */}
        <div style={{ marginBottom: '72px' }}>
          <p className="label" style={{ marginBottom: '32px' }}>{tx('props_label', lang)}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)' }}>
            {[
              { label: 'No central authority', value: 'No company controls who is trusted' },
              { label: 'Gradual', value: 'Trust builds over time through real connections' },
              { label: 'Transparent', value: 'Every attestation is public and auditable' },
              { label: 'Recoverable', value: 'Lost keys can be re-attested by your network' },
              { label: 'Attack-resistant', value: 'Mass Sybil attacks require mass real-world coordination' },
              { label: 'Privacy-preserving', value: 'No real name or ID is ever revealed' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--surface)',
                padding: '20px 24px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}>
                  {label}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phase Timeline */}
        <div style={{ marginBottom: '72px' }}>
          <p className="label" style={{ marginBottom: '32px' }}>{tx('timeline_label', lang)}</p>
          {[
            { phase: 'Phase 0', label: 'NOW', status: 'current', text: 'Twins are published. No trust weighting yet. Every twin counts equally — including fakes. This is acceptable at the start: the network is small and the data is exploratory.' },
            { phase: 'Phase 1', label: 'SOON', status: 'next', text: 'Manual attestations via QR code scanning. Trust graph visible but not yet affecting network aggregate. Community can experiment.' },
            { phase: 'Phase 2', label: 'FUTURE', status: 'future', text: 'Trust-weighted aggregate becomes the primary signal. Unvouched twins have reduced weight in global calculations. Web of Trust is the primary Sybil defense.' },
          ].map(({ phase, label, status, text }) => (
            <div key={phase} style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr',
              gap: '24px',
              paddingBottom: '32px',
              marginBottom: '32px',
              borderBottom: '1px solid var(--divider)',
              opacity: status === 'future' ? 0.6 : 1,
            }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: status === 'current' ? 'var(--positive)' : 'var(--text-3)',
                  letterSpacing: '0.08em',
                  marginBottom: '4px',
                }}>
                  {label}
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '13px',
                  color: 'var(--text-2)',
                }}>
                  {phase}
                </div>
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.85 }}>{text}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/identity" style={{
            display: 'inline-block',
            background: 'var(--text-1)',
            color: 'var(--bg)',
            padding: '13px 28px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {tx('cta_identity', lang)}
          </Link>
          <Link href="/about" style={{
            display: 'inline-block',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            padding: '13px 28px',
            fontSize: '12px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {tx('cta_vision', lang)}
          </Link>
        </div>

      </div>
    </div>
  );
}
