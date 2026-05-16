import { useState, useEffect } from 'react';
import { getSetupStatus, initializeSetup, login, redownloadBeamctl } from '../api/client';

export function SetupPage() {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Step 1: FQDN Configuration
  const [oamDomain, setOamDomain] = useState('');
  const [beamCliFqdn, setBeamCliFqdn] = useState('');
  const [bamCliFqdn, setBamCliFqdn] = useState('');
  const [iamFqdn, setIamFqdn] = useState('');
  const [certmFqdn, setCertmFqdn] = useState('');

  // Step 2: Login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [iamUrl, setIamUrl] = useState('');

  useEffect(() => { loadStatus(); }, []);

  async function loadStatus() {
    try {
      const s = await getSetupStatus();
      setStatus(s);
      if (s.setup_complete) setStep(3);
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
      });
      setSuccess('Setup completed. beamctl downloaded and FQDN configured.');
      setStep(2);
      loadStatus();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const result = await login({
        username,
        password,
        iam_url: iamUrl || undefined,
      });
      if (result.status === 'success') {
        setSuccess('Login successful. You can now use NRF operations.');
        setStep(3);
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
      const result = await redownloadBeamctl();
      if (result.status === 'success') {
        setSuccess('beamctl binary re-downloaded successfully');
      } else {
        setError('Download failed: ' + (result.job?.stderr || ''));
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
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={`badge ${step >= 1 ? 'badge-success' : 'badge-pending'}`}>1. Configure</span>
          <span className={`badge ${step >= 2 ? 'badge-success' : 'badge-pending'}`}>2. Login</span>
          <span className={`badge ${step >= 3 ? 'badge-success' : 'badge-pending'}`}>3. Ready</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Step 1: FQDN + Download */}
      {step === 1 && (
        <div className="form-panel" style={{ maxWidth: 600 }}>
          <h3 style={{ marginBottom: 4, color: '#4fc3f7' }}>Step 1: Initial Configuration</h3>
          <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 16 }}>
            Configure cluster FQDNs and download CLI binaries.
          </p>
          <form onSubmit={handleSetup}>
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Cluster Configuration</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>OAM Site Domain Name *</label>
                <input
                  value={oamDomain}
                  onChange={e => setOamDomain(e.target.value)}
                  placeholder="bam-cluster01.operator.com"
                  required
                />
              </div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>CLI Binary Download</label>
              <p style={{ color: '#90a4ae', fontSize: 11, marginBottom: 8 }}>
                beamctl and bamctl will be downloaded from the cluster. Leave FQDNs empty to use defaults.
              </p>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>BEAM CLI FQDN (default: eric-bss-beam-cli.&lt;oamDomain&gt;)</label>
                <input
                  value={beamCliFqdn}
                  onChange={e => setBeamCliFqdn(e.target.value)}
                  placeholder={oamDomain ? `eric-bss-beam-cli.${oamDomain}` : 'eric-bss-beam-cli.<oamDomain>'}
                />
              </div>
              <div className="form-group">
                <label>BAM CLI FQDN (default: eric-bss-bam-cli.&lt;oamDomain&gt;)</label>
                <input
                  value={bamCliFqdn}
                  onChange={e => setBamCliFqdn(e.target.value)}
                  placeholder={oamDomain ? `eric-bss-bam-cli.${oamDomain}` : 'eric-bss-bam-cli.<oamDomain>'}
                />
              </div>
            </div>

            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Service FQDNs (optional overrides)</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>IAM FQDN (default: eric-sec-access-mgmt.&lt;oamDomain&gt;)</label>
                <input
                  value={iamFqdn}
                  onChange={e => setIamFqdn(e.target.value)}
                  placeholder={oamDomain ? `eric-sec-access-mgmt.${oamDomain}` : ''}
                />
              </div>
              <div className="form-group">
                <label>CertM FQDN (default: eric-sec-certm.&lt;oamDomain&gt;)</label>
                <input
                  value={certmFqdn}
                  onChange={e => setCertmFqdn(e.target.value)}
                  placeholder={oamDomain ? `eric-sec-certm.${oamDomain}` : ''}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Downloading & Configuring...' : 'Download CLIs & Configure'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Login */}
      {step === 2 && (
        <div className="form-panel" style={{ maxWidth: 500 }}>
          <h3 style={{ marginBottom: 4, color: '#4fc3f7' }}>Step 2: Login to beamctl</h3>
          <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 16 }}>
            Authenticate with IAM (KeyCloak) to get JWT token for CLI operations.
          </p>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username *</label>
              <input value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>IAM Token URL (optional override)</label>
              <input
                value={iamUrl}
                onChange={e => setIamUrl(e.target.value)}
                placeholder={status?.iam_fqdn ? `https://${status.iam_fqdn}/auth/realms/master/protocol/openid-connect/token` : ''}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Authenticating...' : 'Login'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Ready / Management */}
      {step === 3 && (
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
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12, color: '#4fc3f7' }}>Maintenance</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={handleRedownload} disabled={loading}>
                ↓ Re-download beamctl (upgrade)
              </button>
              <button className="btn btn-secondary" onClick={() => setStep(2)} disabled={loading}>
                🔑 Re-login
              </button>
              <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={loading}>
                ⚙ Reconfigure
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
