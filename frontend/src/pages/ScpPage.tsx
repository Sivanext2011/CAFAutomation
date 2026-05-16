import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listScpServers, addScpServer, deleteScpServer, listScpAppConfig, addScpAppConfig, deleteScpAppConfig, installScpSbiCert, trustScpCa } from '../api/client';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ScpPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'servers' | 'appconfig' | 'tls'>('servers');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Server config
  const [serversOutput, setServersOutput] = useState('');
  const [scpAddress, setScpAddress] = useState('');
  const [scpPriority, setScpPriority] = useState('1');
  const [scpAppGroup, setScpAppGroup] = useState('CHA1');
  const [scpBackoff, setScpBackoff] = useState('60');

  // App config
  const [appConfigOutput, setAppConfigOutput] = useState('');
  const [appGroup, setAppGroup] = useState('CHA1');
  const [scpTimeout, setScpTimeout] = useState('1000');
  const [httpFailureCodes, setHttpFailureCodes] = useState('401,402,404,500');

  // TLS
  const [sbiP12, setSbiP12] = useState('');
  const [sbiP12Password, setSbiP12Password] = useState('');
  const [sbiKeyName, setSbiKeyName] = useState('cha-sbi-key');
  const [sbiCertName, setSbiCertName] = useState('cha-sbi-cert');
  const [scpCaCert, setScpCaCert] = useState('');
  const [scpCaName, setScpCaName] = useState('scp-sbi-ca');

  async function handleListServers() {
    setLoading(true);
    try {
      const result = await listScpServers(scpAppGroup || undefined);
      setServersOutput(result.job?.stdout || 'No servers configured');
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleAddServer() {
    if (!scpAddress) { showError('Address is required'); return; }
    setLoading(true);
    try {
      const payload: any = { address: scpAddress, appGroup: scpAppGroup };
      if (scpPriority) payload.priority = parseInt(scpPriority);
      if (scpBackoff) payload.backoffWhenDownInSeconds = parseInt(scpBackoff);
      const result = await addScpServer(payload);
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to add SCP server', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: 'SCP server added', jobId: result.job?.id });
        handleListServers();
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleDeleteServer(id: string) {
    if (!confirm(`Delete SCP server ${id}?`)) return;
    setLoading(true);
    try {
      const result = await deleteScpServer(id);
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: `Delete failed`, jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `SCP server ${id} deleted`, jobId: result.job?.id });
        handleListServers();
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleListAppConfig() {
    setLoading(true);
    try {
      const result = await listScpAppConfig();
      setAppConfigOutput(result.job?.stdout || 'No app config');
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleAddAppConfig() {
    if (!appGroup) { showError('App Group is required'); return; }
    setLoading(true);
    try {
      const payload: any = { appGroup };
      if (scpTimeout) payload.scpTimeout = parseInt(scpTimeout);
      if (httpFailureCodes) payload.httpFailureCodes = httpFailureCodes.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      const result = await addScpAppConfig(payload);
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to add app config', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: 'SCP app config added', jobId: result.job?.id });
        handleListAppConfig();
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleDeleteAppConfig() {
    if (!confirm(`Delete SCP app config for ${appGroup}?`)) return;
    setLoading(true);
    try {
      const result = await deleteScpAppConfig(appGroup);
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Delete failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `App config for ${appGroup} deleted`, jobId: result.job?.id });
        handleListAppConfig();
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleInstallSbiCert() {
    if (!sbiP12) { showError('Upload PKCS#12 file'); return; }
    setLoading(true);
    try {
      const result = await installScpSbiCert({
        name: sbiKeyName,
        certificateName: sbiCertName,
        p12: sbiP12,
        p12Password: sbiP12Password,
      });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to install SBI cert', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: 'CHA SBI cert installed', jobId: result.job?.id });
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleTrustScpCa() {
    if (!scpCaCert) { showError('Upload SCP CA certificate'); return; }
    setLoading(true);
    try {
      const result = await trustScpCa({
        certificates: [{ name: scpCaName, certificate: scpCaCert }],
      });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to trust SCP CA', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: 'SCP CA added to trusted list', jobId: result.job?.id });
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  function showError(e: any) {
    const msg = typeof e === 'string' ? e : (typeof e?.message === 'string' ? e.message : String(e));
    setPopup({ type: 'error', message: msg });
  }

  return (
    <div>
      <div className="page-header">
        <h1>SCP Integration</h1>
      </div>

      {popup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', border: `1px solid ${popup.type === 'success' ? '#66bb6a' : '#ef5350'}`, borderRadius: 8, padding: 24, minWidth: 320, maxWidth: 480 }}>
            <h3 style={{ color: popup.type === 'success' ? '#66bb6a' : '#ef5350', marginBottom: 12 }}>
              {popup.type === 'success' ? '✓ Success' : '✗ Failed'}
            </h3>
            <p style={{ color: '#e0e0e0', marginBottom: 16 }}>{popup.message}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {popup.jobId && (
                <button className="btn btn-primary" onClick={() => { setPopup(null); navigate(`/jobs?view=${popup.jobId}`); }}>
                  View Execution Log
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setPopup(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button className={`btn ${tab === 'servers' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('servers')}>SCP Servers</button>
        <button className={`btn ${tab === 'appconfig' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('appconfig')}>App Config</button>
        <button className={`btn ${tab === 'tls' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('tls')}>TLS / mTLS</button>
      </div>

      {/* SCP Servers Tab */}
      {tab === 'servers' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={handleListServers} disabled={loading}>
              {loading ? 'Loading...' : 'List Servers'}
            </button>
          </div>

          {serversOutput && (
            <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 16, maxHeight: 200, overflow: 'auto' }}>
              {serversOutput}
            </div>
          )}

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Add SCP Server</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>SCP Address *</label>
              <input value={scpAddress} onChange={e => setScpAddress(e.target.value)} placeholder="https://scp.example.com:8080" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>App Group</label>
                <input value={scpAppGroup} onChange={e => setScpAppGroup(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Priority</label>
                <input value={scpPriority} onChange={e => setScpPriority(e.target.value)} type="number" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Backoff (sec)</label>
                <input value={scpBackoff} onChange={e => setScpBackoff(e.target.value)} type="number" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleAddServer} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Adding...' : 'Add Server'}
            </button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#ef5350', fontSize: 12, fontWeight: 600 }}>Delete SCP Server</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <label>Server ID</label>
                <input id="del-server-id" placeholder="1" />
              </div>
              <button className="btn btn-danger" onClick={() => {
                const id = (document.getElementById('del-server-id') as HTMLInputElement)?.value;
                if (id) handleDeleteServer(id);
              }} disabled={loading}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* App Config Tab */}
      {tab === 'appconfig' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={handleListAppConfig} disabled={loading}>
              {loading ? 'Loading...' : 'List App Config'}
            </button>
          </div>

          {appConfigOutput && (
            <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 16, maxHeight: 200, overflow: 'auto' }}>
              {appConfigOutput}
            </div>
          )}

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Add SCP App Config</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>App Group *</label>
              <input value={appGroup} onChange={e => setAppGroup(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>SCP Timeout (ms)</label>
                <input value={scpTimeout} onChange={e => setScpTimeout(e.target.value)} type="number" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>HTTP Failure Codes</label>
                <input value={httpFailureCodes} onChange={e => setHttpFailureCodes(e.target.value)} placeholder="401,402,404,500" />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleAddAppConfig} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Adding...' : 'Add App Config'}
            </button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#ef5350', fontSize: 12, fontWeight: 600 }}>Delete App Config</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}>
                <label>App Group</label>
                <input value={appGroup} onChange={e => setAppGroup(e.target.value)} />
              </div>
              <button className="btn btn-danger" onClick={handleDeleteAppConfig} disabled={loading}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* TLS / mTLS Tab */}
      {tab === 'tls' && (
        <div>
          <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 16 }}>
            Same certificate infrastructure as NRF integration. Install CHA SBI cert and trust SCP's CA for mTLS.
          </p>

          {/* Install SBI Cert */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 16, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>1. Install CHA SBI Certificate (PKCS#12)</label>
            <p style={{ color: '#90a4ae', fontSize: 11, margin: '4px 0 8px' }}>
              SCP will see this cert when connecting to CAF Nchf endpoint.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Key Name</label>
                <input value={sbiKeyName} onChange={e => setSbiKeyName(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Certificate Name</label>
                <input value={sbiCertName} onChange={e => setSbiCertName(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>PKCS#12 File (.p12)</label>
              <input type="file" accept=".p12,.pfx" onChange={async e => { const f = e.target.files?.[0]; if (f) setSbiP12(await fileToBase64(f)); }} />
              {sbiP12 && <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Loaded</span>}
            </div>
            <div className="form-group">
              <label>P12 Password</label>
              <input type="password" value={sbiP12Password} onChange={e => setSbiP12Password(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleInstallSbiCert} disabled={loading || !sbiP12}>
              {loading ? 'Installing...' : 'Install SBI Cert'}
            </button>
          </div>

          {/* Trust SCP CA */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>2. Trust SCP CA Certificate</label>
            <p style={{ color: '#90a4ae', fontSize: 11, margin: '4px 0 8px' }}>
              Add SCP's CA to <code>external-trusted-ca-list</code> so CAF accepts SCP's client cert (mTLS).
            </p>
            <div className="form-group">
              <label>CA Name</label>
              <input value={scpCaName} onChange={e => setScpCaName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>SCP CA Certificate (PEM file)</label>
              <input type="file" accept=".pem,.crt,.cer" onChange={async e => { const f = e.target.files?.[0]; if (f) setScpCaCert(await fileToBase64(f)); }} />
              {scpCaCert && <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Loaded</span>}
            </div>
            <button className="btn btn-primary" onClick={handleTrustScpCa} disabled={loading || !scpCaCert}>
              {loading ? 'Installing...' : 'Trust SCP CA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
