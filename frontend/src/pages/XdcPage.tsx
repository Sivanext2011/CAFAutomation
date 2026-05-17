import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { xdcGetTargets, xdcListCollections, xdcGetCollection, xdcDeleteCollection, xdcCollectImmediate, xdcNewCollection, xdcGetFile, xdcConfigView } from '../api/client';

type Tab = 'collect' | 'collections' | 'config';

export function XdcPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('collect');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  const [target, setTarget] = useState('system');
  const [customTarget, setCustomTarget] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [mode, setMode] = useState<'immediate' | 'async'>('immediate');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  async function run(fn: () => Promise<any>) {
    setLoading(true); setOutput('');
    try {
      const r = await fn();
      if (r.job?.status === 'failed') { setPopup({ type: 'error', message: 'Failed', jobId: r.job.id }); setOutput(r.job?.stderr || ''); }
      else { setOutput(r.job?.stdout || 'Done'); setPopup({ type: 'success', message: 'Success', jobId: r.job?.id }); }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  function getTarget() { return customTarget || target; }

  async function handleCollect() {
    const t = getTarget();
    if (!t) { err('Target required'); return; }
    if (mode === 'immediate') await run(() => xdcCollectImmediate(t));
    else await run(() => xdcNewCollection(t));
  }

  return (
    <div>
      <div className="page-header"><h1>Extended Data Collection</h1></div>

      {popup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', border: `1px solid ${popup.type === 'success' ? '#66bb6a' : '#ef5350'}`, borderRadius: 8, padding: 24, minWidth: 320, maxWidth: 480 }}>
            <h3 style={{ color: popup.type === 'success' ? '#66bb6a' : '#ef5350', marginBottom: 12 }}>{popup.type === 'success' ? '✓ Success' : '✗ Failed'}</h3>
            <p style={{ color: '#e0e0e0', marginBottom: 16 }}>{popup.message}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {popup.jobId && <button className="btn btn-primary" onClick={() => { setPopup(null); navigate(`/jobs?view=${popup.jobId}`); }}>View Log</button>}
              <button className="btn btn-secondary" onClick={() => setPopup(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button className={`btn ${tab === 'collect' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('collect'); setOutput(''); }}>Collect</button>
        <button className={`btn ${tab === 'collections' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('collections'); setOutput(''); }}>Collections</button>
        <button className={`btn ${tab === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('config'); setOutput(''); }}>Config</button>
      </div>

      {/* Collect Tab */}
      {tab === 'collect' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 450, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Collect Data from Target</label>

            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Target</label>
              <select value={target} onChange={e => { setTarget(e.target.value); setCustomTarget(''); }}>
                <option value="system">system</option>
                <option value="">Custom (pod/workload)...</option>
              </select>
            </div>

            {target === '' && (
              <div className="form-group">
                <label>Pod / Workload Name</label>
                <input value={customTarget} onChange={e => setCustomTarget(e.target.value)} placeholder="eric-bss-cha-core-7cd886589d-fqkwc" />
              </div>
            )}

            <div className="form-group">
              <label>Mode</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)}>
                <option value="immediate">Immediate (small data, returns file)</option>
                <option value="async">Async (large data, returns collection ID)</option>
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleCollect} disabled={loading}>
              {loading ? 'Collecting...' : 'Collect'}
            </button>
          </div>

          <button className="btn btn-secondary" onClick={() => run(xdcGetTargets)} disabled={loading} style={{ marginBottom: 12 }}>
            List Available Targets
          </button>

          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}

      {/* Collections Tab */}
      {tab === 'collections' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={() => run(xdcListCollections)} disabled={loading}>List All</button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Manage Collection</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Collection ID *</label>
              <input value={collectionId} onChange={e => setCollectionId(e.target.value)} placeholder="6f33cc17-b7bb-4fb3-991b-0d52d3bbc2e6" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => { if (collectionId) run(() => xdcGetCollection(collectionId)); }} disabled={loading || !collectionId}>Status</button>
              <button className="btn btn-primary" onClick={() => { if (collectionId) run(() => xdcGetFile(collectionId)); }} disabled={loading || !collectionId}>Download</button>
              <button className="btn btn-danger" onClick={() => { if (collectionId && confirm(`Delete collection ${collectionId}?`)) run(() => xdcDeleteCollection(collectionId)); }} disabled={loading || !collectionId}>Delete</button>
            </div>
          </div>

          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div>
          <button className="btn btn-secondary" onClick={() => run(xdcConfigView)} disabled={loading}>View Config</button>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}
    </div>
  );
}
