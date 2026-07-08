'use client';

import { ID_TX } from './page.tx';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { makeTx } from '@/lib/tx';
import { getOrCreateIdentity, encodeSecretKey, importIdentity } from '@/lib/identity';
import type { Identity } from '@/lib/identity';
import { fetchTwinByPubkey } from '@/lib/nostr-reader';
import { saveMyTwin } from '@/lib/db';
import { useLang } from '@/context/LangContext';
import { t } from '@/lib/i18n';

function truncateKey(key: string): string {
  return key.slice(0, 8) + '…' + key.slice(-8);
}

const idTx = makeTx(ID_TX);
const tx = (key: keyof typeof ID_TX & string, lang: string) => idTx(lang, key);

export default function IdentityPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [importVal, setImportVal] = useState('');
  const [importState, setImportState] = useState<'idle' | 'busy' | 'invalid' | 'ok-twin' | 'ok-notwin'>('idle');
  const { lang } = useLang();
  const router = useRouter();
  const isRtl = lang === 'ar' || lang === 'fa';

  useEffect(() => {
    getOrCreateIdentity().then((id) => {
      setIdentity(id);
      setLoading(false);
    });
  }, []);

  async function handleCopy() {
    if (!identity) return;
    await navigator.clipboard.writeText(identity.pubkey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopySecret() {
    if (!identity) return;
    await navigator.clipboard.writeText(encodeSecretKey(identity.privkey));
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }

  async function handleImport() {
    setImportState('busy');
    const imported = await importIdentity(importVal);
    if (!imported) {
      setImportState('invalid');
      return;
    }
    setIdentity(imported);
    setImportVal('');
    setRevealed(false);
    // Adopt the twin this identity already published, if any
    try {
      const networkTwin = await fetchTwinByPubkey(imported.pubkey, 6000);
      if (networkTwin) {
        await saveMyTwin(networkTwin);
        setImportState('ok-twin');
        return;
      }
    } catch { /* network unavailable — identity import still succeeded */ }
    setImportState('ok-notwin');
  }

  function shareLink() {
    if (!identity) return;
    const url = `${window.location.origin}/twin/${identity.pubkey}`;
    if (navigator.share) {
      navigator.share({ url, title: tx('share_twin', lang) });
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p className="label">{tx('loading', lang)}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 'clamp(60px, 8vw, 100px) 0' }} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="container">

        <div style={{ marginBottom: '80px' }}>
          <p className="label" style={{ marginBottom: '24px' }}>{tx('page_label', lang)}</p>
          <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', marginBottom: '16px' }}>
            {tx('key_title', lang)}
          </h1>
          <p style={{ color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
            {tx('created_at', lang)} {identity ? new Date(identity.createdAt).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
            {' · '}{tx('locally_stored', lang)}
          </p>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '40px',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(13px, 2vw, 16px)',
            color: 'var(--accent, #4B9EFF)',
            letterSpacing: '0.06em',
            wordBreak: 'break-all',
            marginBottom: '16px',
          }}>
            {identity ? truncateKey(identity.pubkey) : '—'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', lineHeight: 1.6 }}>
            {tx('key_desc', lang)}
          </p>
        </div>

        {/* QR Code block */}
        {identity && (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            padding: '40px',
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
          }}>
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-3)',
              margin: 0,
              letterSpacing: '0.08em',
            }}>
              {t(lang, 'identity_qr_label')}
            </p>
            <QRCodeSVG
              value={`nostr:${identity.pubkey}`}
              size={160}
              bgColor="#080808"
              fgColor="#F0F0F0"
            />
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-3)',
              margin: 0,
            }}>
              {t(lang, 'identity_qr_hint')}
            </p>
          </div>
        )}

        {/* Transfer / backup — the secret key moves you between devices */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '40px',
        }}>
          <p className="label" style={{ marginBottom: '12px' }}>{tx('transfer_title', lang)}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '24px', maxWidth: '560px' }}>
            {tx('transfer_desc', lang)}
          </p>
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              style={{
                background: 'transparent', color: 'var(--text-2)',
                border: '1px solid var(--border)', padding: '12px 24px',
                fontSize: '12px', letterSpacing: '0.06em', cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {tx('reveal_btn', lang)}
            </button>
          ) : identity && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-start' }}>
              <QRCodeSVG
                value={encodeSecretKey(identity.privkey)}
                size={160}
                bgColor="#080808"
                fgColor="#F0F0F0"
              />
              <p style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)',
                wordBreak: 'break-all', margin: 0, maxWidth: '480px',
              }}>
                {encodeSecretKey(identity.privkey)}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                {tx('scan_hint', lang)}
              </p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCopySecret}
                  style={{
                    background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                    padding: '10px 20px', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
                  }}
                >
                  {secretCopied ? tx('copied', lang) : tx('copy_secret', lang)}
                </button>
                <button
                  onClick={() => setRevealed(false)}
                  style={{
                    background: 'transparent', color: 'var(--text-3)',
                    border: '1px solid var(--border)', padding: '10px 20px',
                    fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                  }}
                >
                  {tx('hide_btn', lang)}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Import — become the same person as on your other device */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          padding: '40px',
          marginBottom: '40px',
        }}>
          <p className="label" style={{ marginBottom: '12px' }}>{tx('import_title', lang)}</p>
          <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '20px', maxWidth: '560px' }}>
            {tx('import_desc', lang)}
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', maxWidth: '560px' }}>
            <input
              value={importVal}
              onChange={(e) => { setImportVal(e.target.value); setImportState('idle'); }}
              placeholder="nsec1…"
              autoComplete="off"
              spellCheck={false}
              style={{
                flex: '1 1 260px', background: 'var(--raised, #111)', color: 'var(--text-1)',
                border: '1px solid var(--border)', padding: '12px 14px',
                fontFamily: 'var(--font-mono)', fontSize: '12px',
              }}
            />
            <button
              onClick={handleImport}
              disabled={importState === 'busy' || importVal.trim().length === 0}
              style={{
                background: 'var(--text-1)', color: 'var(--bg)', border: 'none',
                padding: '12px 24px', fontSize: '12px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                cursor: importState === 'busy' ? 'default' : 'pointer',
                opacity: importState === 'busy' || importVal.trim().length === 0 ? 0.6 : 1,
              }}
            >
              {importState === 'busy' ? tx('importing', lang) : tx('import_btn', lang)}
            </button>
          </div>
          {importState === 'invalid' && (
            <p style={{ fontSize: '12px', color: 'var(--negative, #ef4444)', marginTop: '14px', fontFamily: 'var(--font-mono)' }}>
              {tx('import_invalid', lang)}
            </p>
          )}
          {importState === 'ok-twin' && (
            <p style={{ fontSize: '12px', color: 'var(--positive, #22c55e)', marginTop: '14px', fontFamily: 'var(--font-mono)' }}>
              {tx('import_ok_twin', lang)}
            </p>
          )}
          {importState === 'ok-notwin' && (
            <p style={{ fontSize: '12px', color: 'var(--positive, #22c55e)', marginTop: '14px', fontFamily: 'var(--font-mono)' }}>
              {tx('import_ok_notwin', lang)}
            </p>
          )}
        </div>

        {/* Pseudonym explanation */}
        <p style={{
          fontSize: '13px',
          color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)',
          lineHeight: 1.7,
          marginBottom: '40px',
          maxWidth: '560px',
        }}>
          {tx('pseudonym', lang)}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? 'var(--raised)' : 'var(--text-1)',
              color: copied ? 'var(--text-2)' : '#000',
              border: copied ? '1px solid var(--border)' : 'none',
              padding: '14px 32px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {copied ? tx('copied', lang) : tx('copy_id', lang)}
          </button>
          <button
            onClick={() => router.push('/twin')}
            style={{
              background: 'transparent',
              color: 'var(--text-2)',
              border: '1px solid var(--border)',
              padding: '14px 32px',
              fontSize: '13px',
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            {tx('share_twin', lang)}
          </button>
        </div>

        {/* Share twin link */}
        {identity && (
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={shareLink}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '12px',
                color: 'var(--text-3)',
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.04em',
              }}
            >
              {t(lang, 'identity_share_link')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
