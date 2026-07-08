import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Datenschutzerklärung — no kings',
  robots: { index: false },
};

const H = ({ children }: { children: React.ReactNode }) => (
  <p style={{ margin: '36px 0 8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
    {children}
  </p>
);

export default function DatenschutzPage() {
  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <p className="label" style={{ marginBottom: '24px' }}>Rechtliches</p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 400, marginBottom: '24px' }}>
          Datenschutzerklärung
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
          Stand: Juli 2026 · Verantwortlicher: siehe <a href="/impressum" style={{ color: 'var(--accent)' }}>Impressum</a>
        </p>

        <div style={{ fontSize: '15px', lineHeight: 1.9, color: 'var(--text-2)' }}>

          <H>Das Wichtigste in einem Absatz</H>
          <p>
            no kings ist bewusst so gebaut, dass wir so wenig wie möglich über dich wissen:
            <strong style={{ color: 'var(--text-1)' }}> keine Konten, keine E-Mail-Adressen, kein Tracking,
            keine Werbung, keine eigene Nutzerdatenbank.</strong> Dein Zwilling, deine Antworten und dein
            kryptografischer Schlüssel liegen ausschließlich lokal in deinem Browser (IndexedDB/localStorage)
            und verlassen dein Gerät nur, wenn du ausdrücklich auf „Teilen" klickst.
          </p>

          <H>1. Lokale Datenhaltung (auf deinem Gerät)</H>
          <p>
            Trainingsantworten, Twin-Profil, Verlauf, Spracheinstellung, Relay-Konfiguration sowie dein
            Schlüsselpaar werden nur im Speicher deines Browsers abgelegt. Wir haben darauf keinen Zugriff.
            Du löschst diese Daten jederzeit vollständig über die Website-Daten-Einstellungen deines Browsers.
            Es werden keine Cookies zu Tracking-Zwecken gesetzt; lokale Speicherung dient ausschließlich der
            Funktion (§ 25 Abs. 2 TDDDG).
          </p>

          <H>2. Veröffentlichung deines Zwillings (nur auf deinen Klick)</H>
          <p>
            Wenn du „Ins Netzwerk teilen" wählst, veröffentlichst du dein Twin-Profil (acht Zahlenwerte zu
            politischen Dimensionen) — auf Wunsch ergänzt um Land und grobe Region (z. B. „DE-BY", nie
            genauere Ortsdaten) — <strong style={{ color: 'var(--text-1)' }}>pseudonym</strong> unter deinem
            öffentlichen Schlüssel auf öffentliche, dezentrale Nostr-Relays weltweit. Politische Meinungen sind
            besondere Kategorien personenbezogener Daten (Art. 9 DSGVO); die Veröffentlichung erfolgt
            ausschließlich auf Grundlage deiner ausdrücklichen Einwilligung (Art. 9 Abs. 2 lit. a, Art. 6
            Abs. 1 lit. a DSGVO), die du unmittelbar vor dem Teilen bestätigst.
          </p>
          <p style={{ marginTop: '12px' }}>
            <strong style={{ color: 'var(--text-1)' }}>Wichtig und unumkehrbar:</strong> Nostr-Relays werden
            von unabhängigen Dritten weltweit betrieben und replizieren Inhalte untereinander. Eine einmal
            veröffentlichte Information kann faktisch <strong style={{ color: 'var(--text-1)' }}>nicht
            gelöscht</strong> werden — auch nicht von uns. Ein erneutes Teilen ersetzt deinen Eintrag auf
            kooperierenden Relays, eine garantierte Löschung gibt es nicht. Teile deinen Zwilling nur, wenn
            du damit einverstanden bist.
          </p>

          <H>3. Hosting und Server-Logs</H>
          <p>
            Die Website wird bei Vercel Inc. gehostet. Beim Abruf verarbeitet Vercel technisch notwendig
            deine IP-Adresse und übliche Verbindungsdaten (Server-Logs, kurzfristig, Art. 6 Abs. 1 lit. f
            DSGVO — Bereitstellung und Sicherheit der Website). Zur Voreinstellung deiner Sprache/deines
            Landes wird das Herkunftsland aus den Verbindungs-Headern gelesen; es wird von uns nicht
            gespeichert. Dein Browser verbindet sich außerdem direkt mit den von dir konfigurierten
            Nostr-Relays (Drittanbieter); dabei sehen diese deine IP-Adresse — wie bei jedem Webserver.
          </p>

          <H>4. Deine Rechte</H>
          <p>
            Dir stehen die Rechte aus Art. 15–21 DSGVO zu (Auskunft, Berichtigung, Löschung, Einschränkung,
            Datenübertragbarkeit, Widerspruch) sowie das Recht auf Beschwerde bei einer
            Datenschutz-Aufsichtsbehörde. Beachte: Für lokal auf deinem Gerät gespeicherte Daten bist du
            selbst verfügungsbefugt; für bereits auf dezentrale Relays veröffentlichte, pseudonyme Daten ist
            eine Löschung technisch nicht garantierbar (siehe Ziffer 2). Kontakt: siehe Impressum.
          </p>

          <H>5. Keine Weitergabe, kein Profiling</H>
          <p>
            Wir verkaufen keine Daten, geben keine weiter und treffen keine automatisierten Entscheidungen
            über dich. Der Quellcode der Plattform ist einsehbar, sodass alle Angaben dieser Erklärung
            überprüfbar sind.
          </p>

          <p style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '40px' }}>
            English summary: no accounts, no tracking, no user database. Everything stays in your browser
            unless you explicitly publish your twin — then it is stored pseudonymously and irreversibly on
            public, decentralized Nostr relays, based on your explicit consent (GDPR Art. 9(2)(a)). Hosting
            by Vercel processes IP addresses in short-lived server logs.
          </p>
        </div>
      </div>
    </div>
  );
}
