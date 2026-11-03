'use client';

import { useCallback, useRef, useState } from 'react';

type Compliance = 'Pass' | 'Review' | 'Action';
type Extraction = {
  activeProjectsCount: number;
  portfolioValueNaira: string;
  riskExposureNaira: string;
  complianceRadar: { reviewScore: number; setbackAndCoverage: Compliance; fireSafetyEgress: Compliance; parkingProvision: Compliance; summary?: string };
  billOfQuantities: Array<{ scopeItem: string; unit: string; quantity: number; ratePerUnitNaira: number; state: 'Pending' | 'Verified' | 'Flagged' }>;
  mepIntelligence: { electricalDemandKva: number; plumbingFlowRate: string; hvacTonnageRequired: number; status: 'Optimal' | 'Review' | 'Action' };
  parserMetrics: { materialsMapped: number; zonesDetected: number; parseLatencySeconds: number };
  projectNameHint?: string;
  notes?: string[];
};

const INITIAL: Extraction = {
  activeProjectsCount: 12,
  portfolioValueNaira: '₦4.82B',
  riskExposureNaira: '₦186.4M',
  complianceRadar: { reviewScore: 92, setbackAndCoverage: 'Pass', fireSafetyEgress: 'Review', parkingProvision: 'Action', summary: 'Your design is structurally sound with a few items needing attention.' },
  billOfQuantities: [
    { scopeItem: 'Reinforced concrete (columns & beams)', unit: 'm³', quantity: 184, ratePerUnitNaira: 185000, state: 'Verified' },
    { scopeItem: 'Blockwork (150mm)', unit: 'm²', quantity: 1260, ratePerUnitNaira: 12500, state: 'Verified' },
    { scopeItem: 'Aluminium windows & doors', unit: 'nr', quantity: 86, ratePerUnitNaira: 145000, state: 'Pending' },
  ],
  mepIntelligence: { electricalDemandKva: 68.4, plumbingFlowRate: '12.4 L/s peak', hvacTonnageRequired: 42, status: 'Optimal' },
  parserMetrics: { materialsMapped: 48, zonesDetected: 12, parseLatencySeconds: 3.2 },
  projectNameHint: 'Lekki Waterfront Residences · Block A',
};

function formatNaira(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

export default function CommandCenterPage() {
  const [data, setData] = useState<Extraction>(INITIAL);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [mode, setMode] = useState<'idle' | 'demo' | 'live' | 'demo-fallback'>('idle');
  const [lastFile, setLastFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runParse = useCallback(async (file: File) => {
    setBusy(true); setError(null); setLastFile(file.name);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/blueprint-parser', { method: 'POST', body: form });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Parse failed');
      setData(json.data);
      setMode(json.mode || 'demo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) runParse(file);
  }, [runParse]);

  const score = data.complianceRadar.reviewScore;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AJ</div>
          <div className="brand-text"><strong>AJ-IBS</strong><span>Command Center</span></div>
        </div>
        <div>
          <div className="nav-label">Workspace</div>
          <select className="workspace-select" defaultValue="vi">
            <option value="vi">Victoria Island HQ</option>
            <option value="lekki">Lekki Waterfront</option>
          </select>
        </div>
        <nav className="nav-section">
          <div className="nav-label">Workspace</div>
          <div className="nav-item active">Overview</div>
          <div className="nav-item">Blueprint parser</div>
          <div className="nav-item">Projects</div>
          <div className="nav-item">Investor desk</div>
        </nav>
        <nav className="nav-section">
          <div className="nav-label">Manage</div>
          <div className="nav-item">Team & access</div>
          <div className="nav-item">Activity log</div>
          <div className="nav-item">Settings</div>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="date-line">{today}</div>
            <div className="greeting">Good morning, Adewale</div>
          </div>
          <div className="topbar-right">
            <div className="pill">Last synced just now</div>
            <div className="avatar">AO</div>
          </div>
        </header>

        <div className="content">
          <div className="section-head">
            <div>
              <div className="live-dot">Live Operations</div>
              <h1>Project intelligence, at a glance.</h1>
            </div>
          </div>

          {mode !== 'idle' && (
            <div className="mode-banner">
              {mode === 'live' && 'Live Gemini extraction active'}
              {mode === 'demo' && 'Demo mode — realistic sample data (add GOOGLE_GENERATIVE_AI_API_KEY for live AI)'}
              {mode === 'demo-fallback' && 'Model fallback — showing demo extraction'}
              {lastFile ? ` · File: ${lastFile}` : ''}
            </div>
          )}
          {error && <div className="mode-banner" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}>{error}</div>}

          <div className="metrics">
            <div className="card">
              <div className="metric-label">Active projects</div>
              <div className="metric-value">{data.activeProjectsCount}</div>
              <div className="metric-sub up">+2 this month</div>
            </div>
            <div className="card">
              <div className="metric-label">Portfolio value</div>
              <div className="metric-value">{data.portfolioValueNaira}</div>
              <div className="metric-sub up">+8.4% projected</div>
            </div>
            <div className="card">
              <div className="metric-label">Risk exposure</div>
              <div className="metric-value">{data.riskExposureNaira}</div>
              <div className="metric-sub warn">3 alerts require action</div>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-title">AI blueprint parser <span className="badge">Generative UI</span></div>
              <div className="card-desc">Upload technical drawings to generate an intelligent project model.</div>
              <div
                className={`dropzone ${drag ? 'drag' : ''} ${busy ? 'busy' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
              >
                <div>
                  <div className="drop-icon">{busy ? '...' : 'UP'}</div>
                  <div className="drop-title">{busy ? 'Parsing engineering files...' : 'Drop engineering files here'}</div>
                  <div className="drop-sub">or click to browse · DWG, DXF, PDF up to 50MB</div>
                </div>
              </div>
              <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.dwg,.dxf,application/pdf,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) runParse(f); }} />
              <div className="stats-row">
                <div className="stat-box"><strong>{data.parserMetrics.materialsMapped}</strong><span>Materials mapped</span></div>
                <div className="stat-box"><strong>{data.parserMetrics.zonesDetected}</strong><span>Zones detected</span></div>
                <div className="stat-box"><strong>{data.parserMetrics.parseLatencySeconds}s</strong><span>Parse latency</span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Compliance radar <span className="badge">3 findings</span></div>
              <div className="card-desc">LASPPPA building code review</div>
              <div className="score-wrap">
                <div className="score-ring" style={{ ['--score' as string]: score }}><div className="score-inner">{score}</div></div>
                <div className="score-text">
                  <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 4 }}>Review score</strong>
                  {data.complianceRadar.summary || 'Your design is structurally sound with a few items needing attention.'}
                </div>
              </div>
              <div className="check-list">
                <div className="check-row"><span>Setback & coverage</span><span className={`status ${data.complianceRadar.setbackAndCoverage}`}>{data.complianceRadar.setbackAndCoverage}</span></div>
                <div className="check-row"><span>Fire safety egress</span><span className={`status ${data.complianceRadar.fireSafetyEgress}`}>{data.complianceRadar.fireSafetyEgress}</span></div>
                <div className="check-row"><span>Parking provision</span><span className={`status ${data.complianceRadar.parkingProvision}`}>{data.complianceRadar.parkingProvision}</span></div>
              </div>
              <button className="btn btn-primary">Open full compliance report</button>
            </div>
          </div>

          <div className="grid-2">
            <div className="card">
              <div className="card-title" style={{ justifyContent: 'space-between' }}>
                <span>Streaming bill of quantities <span className="badge">Live model</span></span>
              </div>
              <div className="card-desc">{data.projectNameHint || 'Lekki Waterfront Residences · Block A'}</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Scope item</th><th>Unit</th><th>Qty</th><th>Rate / unit</th><th>State</th></tr></thead>
                  <tbody>
                    {data.billOfQuantities.map((row, i) => (
                      <tr key={i}>
                        <td>{row.scopeItem}</td>
                        <td>{row.unit}</td>
                        <td>{row.quantity}</td>
                        <td>{formatNaira(row.ratePerUnitNaira)}</td>
                        <td><span className={`status ${row.state === 'Verified' ? 'Pass' : row.state === 'Flagged' ? 'Action' : 'Review'}`}>{row.state}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.notes && data.notes.length > 0 && (
                <div className="notes">{data.notes.map((n, i) => <div className="note" key={i}>{n}</div>)}</div>
              )}
            </div>

            <div className="card">
              <div className="card-title">MEP load intelligence <span className="badge" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' }}>{data.mepIntelligence.status}</span></div>
              <div className="card-desc">Generated from current floor plans</div>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span>Electrical demand</span><strong>{data.mepIntelligence.electricalDemandKva} kVA</strong>
                </div>
                <div className="mep-bar"><div className="mep-fill" style={{ width: `${Math.min(100, (data.mepIntelligence.electricalDemandKva / 120) * 100)}%` }} /></div>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Plumbing flow</span><span>{data.mepIntelligence.plumbingFlowRate}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>HVAC tonnage</span><span>{data.mepIntelligence.hvacTonnageRequired} tons</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
