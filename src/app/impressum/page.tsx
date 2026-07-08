import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Impressum — no kings',
  robots: { index: false },
};

// ⚠️ PLATZHALTER: Vor der Veröffentlichung Name, Anschrift und E-Mail eintragen.
// Ein Impressum ist für öffentlich betriebene Websites in Deutschland Pflicht (§ 5 DDG).
const OPERATOR = {
  name: 'Elias König',
  street: 'Fellhornstraße 5',
  city: '86833 Ettringen',
  country: 'Deutschland',
  email: 'eliaskoenig24@icloud.com',
};

export default function ImpressumPage() {
  return (
    <div style={{ padding: 'clamp(48px, 7vw, 88px) 0 80px' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <p className="label" style={{ marginBottom: '24px' }}>Rechtliches</p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 400, marginBottom: '48px' }}>
          Impressum
        </h1>

        <div style={{ fontSize: '15px', lineHeight: 1.9, color: 'var(--text-2)' }}>
          <p style={{ marginBottom: '8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Angaben gemäß § 5 DDG
          </p>
          <p style={{ marginBottom: '32px' }}>
            {OPERATOR.name}<br />
            {OPERATOR.street}<br />
            {OPERATOR.city}<br />
            {OPERATOR.country}
          </p>

          <p style={{ marginBottom: '8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Kontakt
          </p>
          <p style={{ marginBottom: '32px' }}>
            E-Mail: {OPERATOR.email}
          </p>

          <p style={{ marginBottom: '8px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Hinweis zum Projekt
          </p>
          <p style={{ marginBottom: '32px' }}>
            no kings ist ein nicht-kommerzielles Civic-Tech-Projekt. Die Plattform betreibt
            keine eigene Datenbank mit Nutzerdaten; Inhalte, die Nutzer ausdrücklich
            veröffentlichen, werden auf dezentralen Nostr-Relays Dritter gespeichert,
            auf deren Betrieb der Betreiber dieser Website keinen Einfluss hat.
            Details in der{' '}
            <a href="/datenschutz" style={{ color: 'var(--accent)' }}>Datenschutzerklärung</a>.
          </p>

          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            English: This is the legally required German site-operator notice (Impressum).
            The platform runs no user database of its own; see the privacy policy for details.
          </p>
        </div>
      </div>
    </div>
  );
}
