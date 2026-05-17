import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNfProfileConfig, updateNfProfileConfig, deleteNfProfileConfig } from '../api/client';

export function NfProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Current config
  const [rawOutput, setRawOutput] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);

  // Update form
  const [appGroup, setAppGroup] = useState('global');
  const [nfType, setNfType] = useState('CHF');
  const [nfStatus, setNfStatus] = useState('REGISTERED');
  const [fqdn, setFqdn] = useState('');
  const [ipv4, setIpv4] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [priority, setPriority] = useState('0');
  const [jsonPayload, setJsonPayload] = useState('');
  const [editMode, setEditMode] = useState<'form' | 'json'>('form');

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    setLoading(true);
    try {
      const result = await listNfProfileConfig();
      const stdout = result.job?.stdout || '';
      setRawOutput(stdout);
      try {
        const parsed = JSON.parse(stdout);
        if (typeof parsed === 'object' && !Array.isArray(parsed)) {
          setProfiles(Object.entries(parsed).map(([key, val]: [string, any]) => ({ _id: key, ...val })));
        } else if (Array.isArray(parsed)) {
          setProfiles(parsed);
        } else {
          setProfiles([]);
        }
      } catch { setProfiles([]); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  function buildPayload(): any {
    const payload: any = { nfType, nfStatus };
    if (fqdn) payload.fqdn = fqdn;
    if (ipv4) payload.ipv4Addresses = ipv4.split(',').map(s => s.trim()).filter(Boolean);
    if (capacity) payload.capacity = parseInt(capacity);
    if (priority) payload.priority = parseInt(priority);
    return payload;
  }

  async function handleUpdate() {
    setError('');
    let payload: any;
    if (editMode === 'json') {
      try { payload = JSON.parse(jsonPayload); } catch { setError('Invalid JSON'); return; }
    } else {
      payload = buildPayload();
      setJsonPayload(JSON.stringify(payload, null, 2));
    }
    setLoading(true);
    try {
      const result = await updateNfProfileConfig(appGroup, { app_group_name: appGroup, payload });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Update failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `NF Profile updated for ${appGroup}`, jobId: result.job?.id });
        loadProfiles();
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDelete(group: string) {
    if (!confirm(`Delete NF Profile for ${group}?`)) return;
    setLoading(true);
    try {
      const result = await deleteNfProfileConfig(group);
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Delete failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `${group} deleted`, jobId: result.job?.id });
        loadProfiles();
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  function loadIntoForm(profile: any) {
    setAppGroup(profile._id || profile.appGroupName || 'global');
    setNfType(profile.nfType || 'CHF');
    setNfStatus(profile.nfStatus || 'REGISTERED');
    setFqdn(profile.fqdn || '');
    setIpv4((profile.ipv4Addresses || []).join(', '));
    setCapacity(String(profile.capacity ?? '100'));
    setPriority(String(profile.priority ?? '0'));
    setJsonPayload(JSON.stringify(profile, null, 2));
  }

  return (
    <div>
      <div className="page-header">
        <h1>NF Profile Configuration</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

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

      {/* Current Profiles */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="btn btn-secondary" onClick={loadProfiles} disabled={loading}>Refresh</button>
        </div>
        {profiles.length > 0 ? (
          <table className="data-table">
            <thead><tr><th>App Group</th><th>NF Type</th><th>Status</th><th>FQDN</th><th>IPv4</th><th>Capacity</th><th>Priority</th><th></th></tr></thead>
            <tbody>
              {profiles.map((p, i) => (
                <tr key={i}>
                  <td>{p._id || '-'}</td>
                  <td>{p.nfType || '-'}</td>
                  <td>{p.nfStatus || '-'}</td>
                  <td style={{ fontSize: 11 }}>{p.fqdn || '-'}</td>
                  <td style={{ fontSize: 11 }}>{(p.ipv4Addresses || []).join(', ') || '-'}</td>
                  <td>{p.capacity ?? '-'}</td>
                  <td>{p.priority ?? '-'}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => loadIntoForm(p)}>Edit</button>
                    <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => handleDelete(p._id || '')}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : rawOutput ? (
          <div className="console" style={{ whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>{rawOutput}</div>
        ) : (
          <div className="console">No NF Profile configuration found</div>
        )}
      </div>

      {/* Update Form */}
      <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 600 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Update NF Profile</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn ${editMode === 'form' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditMode('form')}>Form</button>
            <button className={`btn ${editMode === 'json' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { setEditMode('json'); setJsonPayload(JSON.stringify(buildPayload(), null, 2)); }}>JSON</button>
          </div>
        </div>

        <div className="form-group">
          <label>App Group *</label>
          <input value={appGroup} onChange={e => setAppGroup(e.target.value)} placeholder="global" />
        </div>

        {editMode === 'form' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>NF Type</label>
                <select value={nfType} onChange={e => setNfType(e.target.value)}>
                  <option>CHF</option><option>PCF</option><option>SMF</option><option>AMF</option><option>UDM</option><option>UDR</option><option>AUSF</option><option>NRF</option><option>BSF</option><option>NSSF</option><option>OTHER</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>NF Status</label>
                <select value={nfStatus} onChange={e => setNfStatus(e.target.value)}>
                  <option>REGISTERED</option><option>SUSPENDED</option><option>UNDISCOVERABLE</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>FQDN</label>
              <input value={fqdn} onChange={e => setFqdn(e.target.value)} placeholder="chf.example.com" />
            </div>
            <div className="form-group">
              <label>IPv4 Addresses (comma-separated)</label>
              <input value={ipv4} onChange={e => setIpv4(e.target.value)} placeholder="10.0.0.1, 10.0.0.2" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Capacity</label>
                <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Priority</label>
                <input type="number" value={priority} onChange={e => setPriority(e.target.value)} />
              </div>
            </div>
          </>
        )}

        {editMode === 'json' && (
          <div className="form-group">
            <label>JSON Payload</label>
            <textarea value={jsonPayload} onChange={e => setJsonPayload(e.target.value)} rows={10} style={{ fontFamily: 'monospace', fontSize: 11 }} />
          </div>
        )}

        <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
          {loading ? 'Updating...' : 'Update NF Profile'}
        </button>
      </div>
    </div>
  );
}
