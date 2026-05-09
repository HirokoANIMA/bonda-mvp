import { useEffect, useState, useCallback } from 'react';
import { Shield, ExternalLink, Check, Loader, Copy, Wallet, Droplets, AlertCircle } from 'lucide-react';
import { shortPubkey, shortSig } from '../lib/solana';
import type { Verification, VerificationKind } from '../lib/solana';
import {
  anchorOnDevnet,
  buildPhantomBrowseUrl,
  connectPhantom,
  detectEnvironmentLabel,
  disconnectPhantom,
  getDevnetBalanceSol,
  getPhantomProvider,
  isMobileDevice,
  requestDevnetAirdrop,
} from '../lib/solanaTrust';

interface Props {
  petName: string;
  petId: string;
  verifications: Verification[];
  onAdd: (v: Verification) => void;
  defaultPayload: string;
}

interface KindOption {
  kind: VerificationKind;
  labelEn: string;
  labelJa: string;
  subEn: string;
  subJa: string;
}

const KIND_OPTIONS: KindOption[] = [
  { kind: 'bond_profile',   labelEn: 'Bond profile',   labelJa: 'Bond profile',   subEn: 'Verify relationship ownership.',                                   subJa: 'Verify relationship ownership.' },
  { kind: 'memory_capsule', labelEn: 'Memory capsule', labelJa: 'Memory capsule', subEn: 'Anchor a hash of a private memory.',                               subJa: 'Anchor a hash of a private memory.' },
  { kind: 'share_moment',   labelEn: 'Share moment',   labelJa: 'Share moment',   subEn: 'Prove the provenance of a shared moment.',                         subJa: 'Prove the provenance of a shared moment.' },
  { kind: 'care_signal',    labelEn: 'Care signal',    labelJa: 'Care signal',    subEn: 'Hash a relationship moment such as hug, petting, or walk.',        subJa: 'Hash a relationship moment such as hug, petting, or walk.' },
];

export default function SolanaVerification({ petName, petId, verifications, onAdd, defaultPayload }: Props) {
  const [busyKind, setBusyKind] = useState<VerificationKind | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [airdropping, setAirdropping] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [phantomPresent, setPhantomPresent] = useState<boolean>(() => !!getPhantomProvider());
  const [envLabel, setEnvLabel] = useState<string>(() => detectEnvironmentLabel());
  const mobile = isMobileDevice();

  useEffect(() => {
    const recheck = () => {
      setPhantomPresent(!!getPhantomProvider());
      setEnvLabel(detectEnvironmentLabel());
    };
    recheck();
    const t1 = setTimeout(recheck, 300);
    const t2 = setTimeout(recheck, 1000);
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('focus', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, []);

  const openPhantomBrowser = () => {
    window.location.href = buildPhantomBrowseUrl();
  };
  const openPhantomInstall = () => {
    window.open('https://phantom.com/', '_blank', 'noopener,noreferrer');
  };

  const refreshBalance = useCallback(async (pk: string) => {
    try {
      const sol = await getDevnetBalanceSol(pk);
      setBalance(sol);
    } catch {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    const p = getPhantomProvider();
    if (!p) return;
    p.connect({ onlyIfTrusted: true })
      .then(res => {
        const pk = res.publicKey.toString();
        setWallet(pk);
        refreshBalance(pk);
      })
      .catch(() => { /* not trusted */ });
  }, [refreshBalance]);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const handleConnect = async () => {
    if (!phantomPresent) {
      if (mobile) {
        openPhantomBrowser();
      } else {
        showError('Phantom wallet not detected. Please install Phantom.');
      }
      return;
    }
    setConnecting(true);
    try {
      const pk = await connectPhantom();
      setWallet(pk);
      await refreshBalance(pk);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectPhantom();
    setWallet(null);
    setBalance(null);
  };

  const [faucetLimited, setFaucetLimited] = useState(false);

  const handleAirdrop = async (amount: number = 1) => {
    if (!wallet) return;
    setAirdropping(true);
    setError(null);
    try {
      await requestDevnetAirdrop(wallet, amount);
      await refreshBalance(wallet);
      setFaucetLimited(false);
      setFlash(`Received ${amount} devnet SOL`);
      setTimeout(() => setFlash(null), 2200);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      console.log('[BONDA] devnet airdrop error:', raw);
      const rateLimited = /429|rate|limit|faucet|too many/i.test(raw);
      if (rateLimited) {
        setFaucetLimited(true);
        showError('Devnet faucet is rate-limited. Your wallet is connected, but it needs test SOL to anchor records.');
      } else {
        showError('Airdrop unavailable right now. Use the Solana Devnet Faucet to fund your wallet.');
      }
    } finally {
      setAirdropping(false);
    }
  };

  const openFaucet = () => {
    window.open('https://faucet.solana.com/', '_blank', 'noopener,noreferrer');
  };

  const handleAnchor = async (kind: VerificationKind) => {
    if (!wallet) {
      await handleConnect();
      return;
    }
    setBusyKind(kind);
    setError(null);
    try {
      const v = await anchorOnDevnet({
        kind,
        profile: petName,
        payload: `${petId}:${kind}:${defaultPayload}`,
        label: kind,
      });
      onAdd(v);
      setFlash('Anchored on Solana devnet.');
      setTimeout(() => setFlash(null), 2600);
      refreshBalance(wallet);
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      console.log('[BONDA] anchor error:', raw);
      if (/insufficient|lamports|rent|balance/i.test(raw)) {
        showError('Not enough devnet SOL. Fund the wallet and try again.');
      } else if (/reject|denied|user/i.test(raw)) {
        showError('Transaction was cancelled.');
      } else {
        showError('Anchor failed. Check your wallet and connection, then try again.');
      }
    } finally {
      setBusyKind(null);
    }
  };

  const copy = async (txt: string) => {
    try { await navigator.clipboard.writeText(txt); setFlash('Copied'); setTimeout(() => setFlash(null), 1500); } catch { /* noop */ }
  };

  const lowBalance = balance !== null && balance < 0.001;
  const confirmedOnly = verifications.filter(v => v.network === 'devnet' && v.status === 'confirmed' && !!v.tx_signature);
  const legacyDemo = verifications.filter(v => !(v.network === 'devnet' && v.status === 'confirmed'));

  const hasLive = confirmedOnly.length > 0;
  const badgeLabel = hasLive ? 'DEVNET LIVE' : 'DEVNET READY';

  return (
    <div id="solana-trust-layer" className="mx-5 mb-8 rounded-2xl overflow-hidden scroll-mt-4"
      style={{
        background: 'linear-gradient(180deg, rgba(30,22,10,0.95) 0%, rgba(50,36,14,0.96) 100%)',
        border: '1px solid rgba(253,220,140,0.22)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
      }}>
      <div className="px-5 pt-5 pb-3 flex items-center gap-2">
        <Shield size={14} style={{ color: 'rgba(253,220,140,0.95)' }} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em]"
          style={{ color: 'rgba(253,220,140,0.92)' }}>
          SOLANA TRUST LAYER
        </p>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium"
          style={{
            background: hasLive ? 'rgba(180,220,170,0.18)' : 'rgba(253,220,140,0.12)',
            color: hasLive ? 'rgba(200,240,190,0.95)' : 'rgba(253,220,140,0.85)',
          }}>
          {badgeLabel}
        </span>
      </div>

      <p className="px-5 text-[12px] font-light leading-[1.75]" style={{ color: 'rgba(255,240,210,0.80)' }}>
        {`Private memories stay off-chain. BONDA verifies ${petName}'s bond ownership, provenance, consent, and memory hashes on Solana.`}
      </p>

      {/* Wallet row */}
      <div className="mx-5 mt-4 px-3 py-2.5 rounded-xl flex items-center gap-2"
        style={{ background: 'rgba(253,220,140,0.07)', border: '1px solid rgba(253,220,140,0.14)' }}>
        <Wallet size={12} style={{ color: 'rgba(253,220,140,0.75)' }} />
        {wallet ? (
          <>
            <p className="text-[11px] font-mono flex-1 truncate" style={{ color: 'rgba(255,240,210,0.92)' }}>
              {shortPubkey(wallet)}
            </p>
            <span className="text-[10px] font-mono" style={{ color: lowBalance ? 'rgba(240,180,170,0.9)' : 'rgba(200,240,190,0.9)' }}>
              {balance === null ? '—' : `${balance.toFixed(3)} SOL`}
            </span>
            <button onClick={() => copy(wallet)} className="w-6 h-6 flex items-center justify-center rounded"
              style={{ color: 'rgba(253,220,140,0.7)' }}>
              <Copy size={11} />
            </button>
            <button onClick={handleDisconnect} className="text-[9px] uppercase tracking-wider px-2 py-1 rounded"
              style={{ color: 'rgba(253,220,140,0.7)', background: 'rgba(253,220,140,0.06)' }}>
              Disconnect
            </button>
          </>
        ) : phantomPresent ? (
          <>
            <p className="text-[11px] flex-1 truncate" style={{ color: 'rgba(255,240,210,0.7)' }}>
              Phantom detected
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full"
              style={{ color: 'rgba(30,22,10,0.92)', background: 'linear-gradient(135deg,#f5d78e,#c49a4a)' }}>
              {connecting ? 'Connecting…' : 'Connect Phantom'}
            </button>
          </>
        ) : mobile ? (
          <>
            <p className="text-[11px] flex-1 truncate" style={{ color: 'rgba(255,240,210,0.7)' }}>
              Open Phantom first
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={openPhantomBrowser}
                className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full"
                style={{ color: 'rgba(30,22,10,0.92)', background: 'linear-gradient(135deg,#f5d78e,#c49a4a)' }}>
                Open in Phantom
              </button>
              <button
                onClick={openPhantomInstall}
                className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1.5 rounded-full"
                style={{ color: 'rgba(253,220,140,0.85)', background: 'rgba(253,220,140,0.08)', border: '1px solid rgba(253,220,140,0.22)' }}>
                Install
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] flex-1 truncate" style={{ color: 'rgba(255,240,210,0.7)' }}>
              Phantom wallet not detected
            </p>
            <button
              onClick={openPhantomInstall}
              className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full"
              style={{ color: 'rgba(30,22,10,0.92)', background: 'linear-gradient(135deg,#f5d78e,#c49a4a)' }}>
              Install Phantom
            </button>
          </>
        )}
      </div>

      {/* Mobile helper message */}
      {!wallet && !phantomPresent && mobile && (
        <p className="mx-5 mt-2 text-[10.5px] font-light leading-[1.65]" style={{ color: 'rgba(255,220,160,0.68)' }}>
          On mobile, BONDA must be opened inside Phantom Browser to anchor real devnet records.
        </p>
      )}

      {wallet && lowBalance && (
        <div className="mx-5 mt-2 px-3 py-3 rounded-xl"
          style={{ background: 'rgba(240,180,170,0.08)', border: '1px solid rgba(240,180,170,0.22)' }}>
          <div className="flex items-start gap-2">
            <Droplets size={12} className="mt-0.5" style={{ color: 'rgba(240,200,180,0.9)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium" style={{ color: 'rgba(255,230,220,0.92)' }}>
                Low devnet SOL
              </p>
              <p className="text-[10.5px] font-light mt-1 leading-[1.7]" style={{ color: 'rgba(255,230,220,0.78)' }}>
                Wallet connected. Add a small amount of devnet SOL to anchor real BONDA records. Devnet SOL is only for testing and has no real value.
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button onClick={() => handleAirdrop(1)} disabled={airdropping}
              className="text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full disabled:opacity-50"
              style={{ color: 'rgba(30,22,10,0.92)', background: 'rgba(240,200,180,0.92)' }}>
              {airdropping ? 'Requesting…' : 'Airdrop 1 SOL'}
            </button>
            <button onClick={() => handleAirdrop(0.1)} disabled={airdropping}
              className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1.5 rounded-full disabled:opacity-50"
              style={{ color: 'rgba(255,230,220,0.92)', background: 'rgba(240,200,180,0.12)', border: '1px solid rgba(240,200,180,0.28)' }}>
              Try 0.1 SOL
            </button>
            <button onClick={openFaucet}
              className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1.5 rounded-full flex items-center gap-1"
              style={{ color: 'rgba(255,230,220,0.92)', background: 'rgba(240,200,180,0.12)', border: '1px solid rgba(240,200,180,0.28)' }}>
              <ExternalLink size={10} /> Open Faucet
            </button>
            <button onClick={() => copy(wallet)}
              className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1.5 rounded-full flex items-center gap-1"
              style={{ color: 'rgba(255,230,220,0.92)', background: 'rgba(240,200,180,0.12)', border: '1px solid rgba(240,200,180,0.28)' }}>
              <Copy size={10} /> Copy Address
            </button>
            <button onClick={() => refreshBalance(wallet)}
              className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-1.5 rounded-full"
              style={{ color: 'rgba(255,230,220,0.92)', background: 'rgba(240,200,180,0.12)', border: '1px solid rgba(240,200,180,0.28)' }}>
              Refresh
            </button>
          </div>

          {faucetLimited && (
            <p className="mt-2 text-[10px] font-light leading-[1.6]" style={{ color: 'rgba(255,210,195,0.72)' }}>
              Devnet faucet is rate-limited. Try the smaller airdrop or open the Solana Devnet Faucet.
            </p>
          )}
        </div>
      )}

      <div className="px-5 pt-4 pb-2 space-y-2">
        {KIND_OPTIONS.map(opt => {
          const busy = busyKind === opt.kind;
          const existing = confirmedOnly.find(v => v.kind === opt.kind);
          return (
            <button key={opt.kind}
              onClick={() => handleAnchor(opt.kind)}
              disabled={busy || (!phantomPresent && mobile) || (!!wallet && lowBalance)}
              className="w-full text-left px-4 py-3.5 rounded-2xl transition-all disabled:opacity-60"
              style={{
                background: existing ? 'rgba(253,220,140,0.08)' : 'rgba(253,220,140,0.04)',
                border: `1px solid rgba(253,220,140,${existing ? 0.26 : 0.14})`,
              }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium" style={{ color: 'rgba(255,240,210,0.94)' }}>
                    {opt.labelEn}
                  </p>
                  <p className="text-[10px] font-light mt-0.5 leading-[1.6]" style={{ color: 'rgba(255,220,160,0.65)' }}>
                    {opt.subEn}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {busy
                    ? <Loader size={14} className="animate-spin" style={{ color: 'rgba(253,220,140,0.8)' }} />
                    : existing
                    ? <Check size={14} style={{ color: 'rgba(180,220,170,0.95)' }} />
                    : <span className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: 'rgba(253,220,140,0.75)' }}>
                        {wallet
                          ? 'Anchor on Devnet'
                          : phantomPresent
                            ? 'Connect Phantom'
                            : 'Open Phantom first'}
                      </span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {confirmedOnly.length > 0 && (
        <div className="mx-5 mb-2 mt-3 pt-3 border-t space-y-2.5"
          style={{ borderColor: 'rgba(253,220,140,0.14)' }}>
          <p className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: 'rgba(180,220,170,0.75)' }}>
            Live devnet records
          </p>
          {confirmedOnly.slice(0, 8).map(v => (
            <div key={v.id} className="rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(180,220,170,0.06)', border: '1px solid rgba(180,220,170,0.18)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(180,220,170,0.18)', color: 'rgba(200,240,190,0.95)' }}>
                  DEVNET LIVE
                </span>
                <p className="text-[11px] font-medium" style={{ color: 'rgba(255,240,210,0.92)' }}>
                  {v.kind.replace('_', ' ')}
                </p>
                <a href={v.explorer_url} target="_blank" rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full text-[10px]"
                  style={{ background: 'rgba(253,220,140,0.14)', color: 'rgba(253,220,140,0.95)' }}>
                  Explorer
                  <ExternalLink size={10} />
                </a>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,220,160,0.7)' }}>
                  <span className="opacity-70">sig </span>{shortSig(v.tx_signature)}
                </p>
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,220,160,0.55)' }}>
                  <span className="opacity-70">hash </span>{v.content_hash.slice(0, 16)}…
                </p>
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,220,160,0.55)' }}>
                  <span className="opacity-70">owner </span>{shortPubkey(v.owner_pubkey)}
                </p>
                <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,220,160,0.45)' }}>
                  <span className="opacity-70">ts </span>{new Date(v.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {legacyDemo.length > 0 && (
        <div className="mx-5 mt-3 pt-3 border-t space-y-1.5"
          style={{ borderColor: 'rgba(253,220,140,0.10)' }}>
          <p className="text-[9px] uppercase tracking-widest font-semibold"
            style={{ color: 'rgba(253,220,140,0.45)' }}>
            Demo records — not yet on-chain
          </p>
          {legacyDemo.slice(0, 4).map(v => (
            <div key={v.id} className="flex items-center gap-2 py-1">
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(253,220,140,0.08)', color: 'rgba(253,220,140,0.6)' }}>
                DEMO
              </span>
              <p className="text-[11px] font-medium flex-1 truncate" style={{ color: 'rgba(255,240,210,0.7)' }}>
                {v.kind.replace('_', ' ')} · hash {v.content_hash.slice(0, 10)}…
              </p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-xl text-[11px] font-light flex items-start gap-2"
          style={{ background: 'rgba(240,180,170,0.10)', color: 'rgba(255,210,195,0.95)', border: '1px solid rgba(240,180,170,0.28)' }}>
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {flash && (
        <div className="mx-5 mt-3 px-3 py-2 rounded-xl text-[11px] font-light text-center"
          style={{ background: 'rgba(180,220,170,0.12)', color: 'rgba(220,240,200,0.9)', border: '1px solid rgba(180,220,170,0.25)' }}>
          {flash}
        </div>
      )}

      <div className="mx-5 mt-5 mb-2 text-[9px] font-light leading-[1.7]"
        style={{ color: 'rgba(255,220,160,0.48)' }}>
        Real transactions on Solana devnet. Never broadcasts to mainnet.
      </div>

      <div className="mx-5 mb-5 flex items-center gap-3 text-[9px] font-mono"
        style={{ color: 'rgba(255,220,160,0.38)' }}>
        <span>Provider: {phantomPresent ? 'detected' : 'not detected'}</span>
        <span style={{ color: 'rgba(255,220,160,0.20)' }}>·</span>
        <span>Environment: {envLabel}</span>
      </div>
    </div>
  );
}
