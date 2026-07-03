import { ImageResponse } from 'next/og';
import { AGENDA } from '@/data/agenda';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Pre-computed world support from demo data (sorted by question order)
// These match the order in AGENDA — computed as mean inferPosition score
const WORLD_SUPPORT: Record<string, number> = {
  'eu-klimaneutral-2035': 59,
  'bedingungsloses-grundeinkommen': 54,
  'verteidigungsausgaben-3-prozent': 47,
  'mietendeckel-national': 61,
  'atomkraft-brueckentechnologie': 46,
  'fachkraefte-migration': 55,
  'sozialmedien-verbot-unter-16': 52,
  'vermoegenssteuer-millionaere': 63,
  'bildung-kostenlos-hochschule': 67,
  'ki-regulierung-global': 58,
  'mietpreisdeckel-national': 60,
  'buergerversicherung-gesundheit': 64,
  'digitale-grundrechte-verschluesselung': 56,
  'globaler-mindestlohn': 58,
  'volksabstimmung-direktdemokratie': 61,
  'waffenrecht-private-kontrolle': 53,
  'bildungsausgaben-verdoppeln': 66,
  'sterbehilfe-legalisierung': 51,
  'massentierhaltung-verbot': 44,
  'wehrpflicht-allgemein': 43,
  'atomwaffen-verbot': 68,
  'digitalsteuer-konzerne': 71,
  'vier-tage-woche': 62,
  'drogenkrieg-entkriminalisierung': 58,
  'welternaehrung-recht': 72,
  'sozialwohnungsbau-pflicht': 64,
  'klimafluechtlinge-aufnahme': 57,
  'patentrecht-impfstoffe': 69,
  'digitale-zentralbankwaehrung': 38,
  'plattformarbeit-rechte': 66,
};

export default function QuestionOGImage({ params }: { params: { id: string } }) {
  const item = AGENDA.find(a => a.id === params.id);
  if (!item) {
    return new ImageResponse(
      <div style={{ width: '100%', height: '100%', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#4B9EFF', fontFamily: 'monospace', fontSize: 24 }}>NO KINGS</div>
      </div>,
      { ...size }
    );
  }

  const pct = WORLD_SUPPORT[item.id] ?? 50;
  const isSupport = pct >= 50;
  const barColor = isSupport ? '#22c55e' : '#ef4444';
  const text = item.text['en'] ?? item.text[Object.keys(item.text)[0]];
  const shortText = text.length > 120 ? text.slice(0, 118) + '…' : text;

  return new ImageResponse(
    (
      <div style={{
        width: '100%',
        height: '100%',
        background: '#080808',
        display: 'flex',
        flexDirection: 'column',
        padding: '52px 64px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '36px' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.18em', color: '#4B9EFF' }}>
            NO KINGS
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', color: '#2A2A2A' }}>
            ·
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', color: '#2A2A2A', textTransform: 'uppercase' }}>
            {item.category.replace('klimaschutz', 'CLIMATE').replace('sozialstaat', 'WELFARE').replace('wirtschaft', 'ECONOMY').replace('bildung', 'EDUCATION').replace('gesundheit', 'HEALTH').replace('migration', 'MIGRATION').replace('freiheit', 'FREEDOM').replace('europa', 'EUROPE')}
          </div>
        </div>

        {/* Question */}
        <div style={{
          fontSize: pct > 99 || shortText.length < 60 ? 34 : 28,
          fontWeight: 400,
          color: '#F0F0F0',
          lineHeight: 1.35,
          marginBottom: 'auto',
          maxWidth: '900px',
        }}>
          &ldquo;{shortText}&rdquo;
        </div>

        {/* Result */}
        <div style={{ marginTop: '40px' }}>
          {/* Bar track */}
          <div style={{ height: '6px', background: '#151515', marginBottom: '20px', position: 'relative' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, height: '100%',
              width: `${pct}%`, background: barColor,
            }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 56, fontWeight: 700, color: barColor, lineHeight: 1 }}>
              {pct}%
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 16, color: isSupport ? '#16a34a' : '#b91c1c', letterSpacing: '0.06em' }}>
              {isSupport ? 'SUPPORT' : 'OPPOSE'}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#2A2A2A', marginLeft: 'auto', letterSpacing: '0.05em' }}>
              2,500 digital twins · no-kings.world
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
