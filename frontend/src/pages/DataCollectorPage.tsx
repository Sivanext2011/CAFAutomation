import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataCollectorCollect } from '../api/client';

const COMMON_PROFILES = [
  'ApplogsDefaultProfile',
  'HelmChartValues',
  'KubernetesInfo',
  'BasicSystemInfo',
];

export function DataCollectorPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [profile, setProfile] = useState('ApplogsDefaultProfile');
  const [customProfile, setCustomProfile] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  async function handleCollect() {
    const p = customProfile || profile;
    if (!p) { setPopup({ type: 'error', message: 'Profile name is required' }); return; }
    setLoading(true); setOutput('');
    try {
      const r = await dataCollectorCollect(p);
      if (r.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Collection failed', jobId: r.job.id });
        setOutput(r.job?.stderr || '');
      } else {
        setOutput(r.job?.stdout || 'Done');
        setPopup({ type: 'success', message: `Data collected using profile "${p}"`, jobId: r.job?.id });
      }
    } catch (e: any) {
      setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) });
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header"><h1>Data Collection</h1></div>

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

      <div style={{ padding: 16, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 450 }}>
        <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Collect Cluster Data</label>
        <p style={{ color: '#90a4ae', fontSize: 11, margin: '4px 0 12px' }}>
          Collect diagnostic data from the Kubernetes cluster using a DDC profile.
        </p>

        <div className="form-group">
          <label>Profile</label>
          <select value={profile} onChange={e => { setProfile(e.target.value); setCustomProfile(''); }}>
            {COMMON_PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="">Custom...</option>
          </select>
        </div>

        {profile === '' && (
          <div className="form-group">
            <label>Custom Profile Name</label>
            <input value={customProfile} onChange={e => setCustomProfile(e.target.value)} placeholder="MyCustomProfile" />
          </div>
        )}

        <button className="btn btn-primary" onClick={handleCollect} disabled={loading}>
          {loading ? 'Collecting...' : 'Collect Data'}
        </button>
      </div>

      {output && (
        <div style={{ marginTop: 16 }}>
          <label style={{ color: '#90a4ae', fontSize: 12 }}>Output:</label>
          <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>
        </div>
      )}
    </div>
  );
}
