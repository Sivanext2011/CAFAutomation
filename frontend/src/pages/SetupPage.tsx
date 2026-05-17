import { useState, useEffect } from 'react';
import { getSetupStatus, initializeSetup, login, redownloadAllClis } from '../api/client';

export function SetupPage() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Setup fields
  const [oamDomain, setOamDomain] = useState('');
  const [beamCliFqdn, setBeamCliFqdn] = useState('');
  const [bamCliFqdn, setBamCliFqdn] = useState('');
  const [iamFqdn, setIamFqdn] = useState('');
  const [certmFqdn, setCertmFqdn] = useState('');
  const [namespace, setNamespace] = useState('caf');
  const [kubeconfigContent, setKubeconfigContent] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Re-login
  const [reloginUser, setReloginUser] = useState('');
  const [reloginPass, setReloginPass] = useState('');
  const [reloginUrl, setReloginUrl] = useState('');

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try {
      const s = await getSetupStatus();
      setStatus(s);
      if (s.setup_complete) setReady(true);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleSetup(e: React.FormEvent) {
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
        username: username || undefined,
        password: password || undefined,
      });
      setSuccess('Setup completed. CLIs downloaded, configured, and logged in (beamctl + bamctl).');
      setReady(true);
      loadStatus();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleRelogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const result = await login({
        username: reloginUser,
        password: reloginPass,
        iam_url: reloginUrl || undefined,
      });
      if (result.status === 'success') {
        setSuccess('Re-login successful (beamctl + bamctl).');
        loadStatus();
      } else {
        setError('Login failed: ' + (result.job?.stderr || 'Unknown error'));
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleRedownload() {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const result = await redownloadAllClis();
      if (result.status === 'success') {
        setSuccess('beamctl + bamctl re-downloaded to bin/');
      } else {
        setError('Download failed');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1>System Setup</h1>
        <span className={`badge ${ready ? 'badge-success' : 'badge-pending'}`}>
          {ready ? '✓ Ready' : 'Not Configured'}
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Setup Form */}
      {!ready && (
        <div className="form-panel" style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: 4, color: '#4fc3f7' }}>Initial Configuration</h3>
          <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 16 }}>
            Configure cluster, download CLIs to ./bin/, and login both beamctl &amp; bamctl.
          </p>
          <form onSubmit={handleSetup}>
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Cluster Configuration</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>OAM Site Domain Name *</label>
                <input value={oamDomain} onChange={e => setOamDomain(e.target.value)} placeholder="bam-cluster01.operator.com" required />
              </div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Login Credentials (beamctl &amp; bamctl) *</label>
              <p style={{ color: '#90a4ae', fontSize: 11, marginBottom: 8 }}>
                Used to authenticate both CLIs. Certificate trust prompts are auto-accepted.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Username *</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Password *</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
              </div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>CLI Binary Download (saved to ./bin/)</label>
              <p style={{ color: '#90a4ae', fontSize: 11, marginBottom: 8 }}>
                Leave FQDNs empty to use defaults.
              </p>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>BEAM CLI FQDN (default: eric-bss-beam-cli.&lt;oamDomain&gt;)</label>
                <input value={beamCliFqdn} onChange={e => setBeamCliFqdn(e.target.value)} placeholder={oamDomain ? `eric-bss-beam-cli.${oamDomain}` : 'eric-bss-beam-cli.<oamDomain>'} />
              </div>
              <div className="form-group">
                <label>BAM CLI FQDN (default: eric-bss-bam-cli.&lt;oamDomain&gt;)</label>
                <input value={bamCliFqdn} onChange={e => setBamCliFqdn(e.target.value)} placeholder={oamDomain ? `eric-bss-bam-cli.${oamDomain}` : 'eric-bss-bam-cli.<oamDomain>'} />
              </div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Kubernetes Configuration</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>CAF Namespace</label>
                <input value={namespace} onChange={e => setNamespace(e.target.value)} placeholder="caf" />
              </div>
              <div className="form-group">
                <label>Kubeconfig Content (paste here, saved to bin/kubeconfig)</label>
                <textarea value={kubeconfigContent} onChange={e => setKubeconfigContent(e.target.value)} placeholder={"apiVersion: v1\nclusters:\n- cluster:\n    server: https://..."} rows={8} style={{ fontFamily: 'monospace', fontSize: 11 }} />
              </div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Service FQDNs (optional overrides)</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>IAM FQDN (default: eric-sec-access-mgmt.&lt;oamDomain&gt;)</label>
                <input value={iamFqdn} onChange={e => setIamFqdn(e.target.value)} placeholder={oamDomain ? `eric-sec-access-mgmt.${oamDomain}` : ''} />
              </div>
              <div className="form-group">
                <label>CertM FQDN (default: eric-sec-certm.&lt;oamDomain&gt;)</label>
                <input value={certmFqdn} onChange={e => setCertmFqdn(e.target.value)} placeholder={oamDomain ? `eric-sec-certm.${oamDomain}` : ''} />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Setting up...' : 'Download CLIs, Configure & Login'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ready State */}
      {ready && (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 12, color: '#8bc34a' }}>✓ System Ready</h3>
            <table className="data-table">
              <tbody>
                <tr><td>OAM Domain</td><td>{status?.oam_site_domain_name}</td></tr>
                <tr><td>BEAM CLI FQDN</td><td>{status?.beam_cli_fqdn}</td></tr>
                <tr><td>BAM CLI FQDN</td><td>{status?.bam_cli_fqdn || 'Default'}</td></tr>
                <tr><td>IAM FQDN</td><td>{status?.iam_fqdn}</td></tr>
                <tr><td>CertM FQDN</td><td>{status?.certm_fqdn}</td></tr>
                <tr><td>Namespace</td><td>{status?.namespace || 'caf'}</td></tr>
                <tr><td>Bin Directory</td><td>./bin/ (beamctl, bamctl, kubeconfig, login.json)</td></tr>
                <tr><td>Logged in as</td><td>{status?.logged_in_user || 'N/A'}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12, color: '#4fc3f7' }}>Maintenance</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button className="btn btn-secondary" onClick={handleRedownload} disabled={loading}>
                ↓ Re-download CLIs
              </button>
              <button className="btn btn-secondary" onClick={() => setReady(false)} disabled={loading}>
                ⚙ Reconfigure
              </button>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 400 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>🔑 Re-login (beamctl + bamctl)</label>
              <form onSubmit={handleRelogin} style={{ marginTop: 8 }}>
                <div className="form-group">
                  <label>Username *</label>
                  <input value={reloginUser} onChange={e => setReloginUser(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input type="password" value={reloginPass} onChange={e => setReloginPass(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>IAM Token URL (optional)</label>
                  <input value={reloginUrl} onChange={e => setReloginUrl(e.target.value)} placeholder={status?.iam_fqdn ? `https://${status.iam_fqdn}/auth/realms/...` : ''} />
                </div>
                <button className="btn btn-primary" disabled={loading}>
                  {loading ? 'Logging in...' : 'Re-login'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
