import { useState, useEffect } from 'react';
import { getSetupStatus, initializeSetup, login, logout, redownloadAllClis } from '../api/client';

export function SetupPage() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Cluster setup
  const [oamDomain, setOamDomain] = useState('');
  const [beamCliFqdn, setBeamCliFqdn] = useState('');
  const [bamCliFqdn, setBamCliFqdn] = useState('');
  const [iamFqdn, setIamFqdn] = useState('');
  const [certmFqdn, setCertmFqdn] = useState('');
  const [namespace, setNamespace] = useState('caf');
  const [kubeconfigContent, setKubeconfigContent] = useState('');
  const [showSetup, setShowSetup] = useState(false);

  // Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try { const s = await getSetupStatus(); setStatus(s); } catch (e: any) { setError(e.message); }
  }

  async function handleClusterSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await initializeSetup({
        oam_site_domain_name: oamDomain,
        beam_cli_fqdn: beamCliFqdn || undefined,
        bam_cli_fqdn: bamCliFqdn || undefined,
        iam_fqdn: iamFqdn || undefined,
        certm_fqdn: certmFqdn || undefined,
        namespace: namespace || undefined,
        kubeconfig_content: kubeconfigContent || undefined,
      });
      setSuccess('Cluster setup complete. CLIs downloaded to bin/.');
      setShowSetup(false);
      loadStatus();
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const result = await login({ username, password });
      if (result.status === 'success') {
        setSuccess(`Logged in as ${username}. Session active.`);
        setPassword('');  // Clear password from memory
        loadStatus();
      } else {
        setError('Login failed: ' + (result.error || result.job?.stderr || 'Unknown'));
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleLogout() {
    try { await logout(); setSuccess('Logged out.'); loadStatus(); } catch (e: any) { setError(e.message); }
  }

  async function handleRedownload() {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const r = await redownloadAllClis();
      if (r.status === 'success') setSuccess('CLIs re-downloaded.');
      else setError('Download failed');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  const setupDone = status?.setup_complete;
  const loggedIn = status?.logged_in;

  return (
    <div>
      <div className="page-header">
        <h1>System Setup</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge ${setupDone ? 'badge-success' : 'badge-pending'}`}>Cluster: {setupDone ? '✓' : '✗'}</span>
          <span className={`badge ${loggedIn ? 'badge-success' : 'badge-pending'}`}>Session: {loggedIn ? status.username : 'Not logged in'}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Login Section - Always visible when setup is done */}
      {setupDone && !loggedIn && (
        <div className="form-panel" style={{ maxWidth: 400, marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4, color: '#4fc3f7' }}>Login</h3>
          <p style={{ color: '#90a4ae', fontSize: 11, marginBottom: 12 }}>
            Authenticate to beamctl &amp; bamctl. Credentials are NOT stored — used only for this session.
          </p>
          <form onSubmit={handleLogin}>
            <div className="form-group"><label>Username *</label><input value={username} onChange={e => setUsername(e.target.value)} required /></div>
            <div className="form-group"><label>Password *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <button className="btn btn-primary" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
          </form>
        </div>
      )}

      {/* Logged in state */}
      {setupDone && loggedIn && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#8bc34a', marginBottom: 8 }}>✓ Ready</h3>
          <p style={{ color: '#e0e0e0', marginBottom: 12 }}>Logged in as <strong>{status.username}</strong>. Your session is isolated — other users have their own sessions.</p>
          <button className="btn btn-secondary" onClick={handleLogout}>Logout</button>
        </div>
      )}

      {/* Cluster Setup Section */}
      {setupDone && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: '#4fc3f7', marginBottom: 8 }}>Cluster Configuration</h3>
          <table className="data-table">
            <tbody>
              <tr><td>OAM Domain</td><td>{status?.oam_site_domain_name}</td></tr>
              <tr><td>BEAM CLI</td><td>{status?.beam_cli_fqdn}</td></tr>
              <tr><td>BAM CLI</td><td>{status?.bam_cli_fqdn}</td></tr>
              <tr><td>IAM FQDN</td><td>{status?.iam_fqdn}</td></tr>
              <tr><td>Namespace</td><td>{status?.namespace}</td></tr>
              <tr><td>beamctl</td><td>{status?.beamctl_exists ? '✓ Downloaded' : '✗ Missing'}</td></tr>
              <tr><td>bamctl</td><td>{status?.bamctl_exists ? '✓ Downloaded' : '✗ Missing'}</td></tr>
              <tr><td>kubeconfig</td><td>{status?.kubeconfig_exists ? '✓ Present' : '✗ Missing'}</td></tr>
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={handleRedownload} disabled={loading}>↓ Re-download CLIs</button>
            <button className="btn btn-secondary" onClick={() => setShowSetup(true)}>⚙ Reconfigure</button>
          </div>
        </div>
      )}

      {/* Initial Setup / Reconfigure Form */}
      {(!setupDone || showSetup) && (
        <div className="form-panel" style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: 4, color: '#4fc3f7' }}>Cluster Setup {setupDone ? '(Reconfigure)' : ''}</h3>
          <p style={{ color: '#90a4ae', fontSize: 11, marginBottom: 16 }}>
            One-time setup: download CLI binaries and configure cluster FQDNs.
          </p>
          <form onSubmit={handleClusterSetup}>
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Cluster</label>
              <div className="form-group" style={{ marginTop: 8 }}><label>OAM Site Domain Name *</label><input value={oamDomain} onChange={e => setOamDomain(e.target.value)} placeholder="bam-cluster01.operator.com" required /></div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>CLI FQDNs (leave empty for defaults)</label>
              <div className="form-group" style={{ marginTop: 8 }}><label>BEAM CLI FQDN</label><input value={beamCliFqdn} onChange={e => setBeamCliFqdn(e.target.value)} placeholder={oamDomain ? `eric-bss-beam-cli.${oamDomain}` : ''} /></div>
              <div className="form-group"><label>BAM CLI FQDN</label><input value={bamCliFqdn} onChange={e => setBamCliFqdn(e.target.value)} placeholder={oamDomain ? `eric-bss-bam-cli.${oamDomain}` : ''} /></div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Kubernetes</label>
              <div className="form-group" style={{ marginTop: 8 }}><label>Namespace</label><input value={namespace} onChange={e => setNamespace(e.target.value)} /></div>
              <div className="form-group"><label>Kubeconfig (paste content)</label><textarea value={kubeconfigContent} onChange={e => setKubeconfigContent(e.target.value)} rows={6} style={{ fontFamily: 'monospace', fontSize: 11 }} placeholder="apiVersion: v1..." /></div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Service FQDNs (optional)</label>
              <div className="form-group" style={{ marginTop: 8 }}><label>IAM FQDN</label><input value={iamFqdn} onChange={e => setIamFqdn(e.target.value)} placeholder={oamDomain ? `eric-sec-access-mgmt.${oamDomain}` : ''} /></div>
              <div className="form-group"><label>CertM FQDN</label><input value={certmFqdn} onChange={e => setCertmFqdn(e.target.value)} placeholder={oamDomain ? `eric-sec-certm.${oamDomain}` : ''} /></div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" disabled={loading}>{loading ? 'Setting up...' : 'Download CLIs & Configure'}</button>
              {showSetup && <button type="button" className="btn btn-secondary" onClick={() => setShowSetup(false)}>Cancel</button>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
