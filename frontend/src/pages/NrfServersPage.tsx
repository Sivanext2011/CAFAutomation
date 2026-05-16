import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNrfServers, deleteNrfServer, deployNrfConfiguration, generateSelfSignedCert, generateCsr } from '../api/client';

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

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/x-pem-file' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function NrfServersPage() {
  const navigate = useNavigate();
  const [servers, setServers] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // NRF config
  const [nrfAddress, setNrfAddress] = useState('');
  const [nrfSecured, setNrfSecured] = useState(true);
  const [appGrp, setAppGrp] = useState('global');
  const [compression, setCompression] = useState(true);
  const [nfProfileValidation, setNfProfileValidation] = useState(true);
  const [nfServiceType, setNfServiceType] = useState('nfservices');

  // OAuth config
  const [oauthAddress, setOauthAddress] = useState('');
  const [oauthSecured, setOauthSecured] = useState(true);

  // TLS/PKI
  const [mtls, setMtls] = useState(false);
  const [customerPki, setCustomerPki] = useState(false);

  // Customer PKI - upload certs
  const [nrfCaCert, setNrfCaCert] = useState('');
  const [oauthCaCert, setOauthCaCert] = useState('');
  const [sbiP12, setSbiP12] = useState('');
  const [sbiP12Password, setSbiP12Password] = useState('');

  // Customer PKI - CSR generation
  const [needCsr, setNeedCsr] = useState(false);
  const [csrCn, setCsrCn] = useState('');
  const [csrOrg, setCsrOrg] = useState('');
  const [csrCountry, setCsrCountry] = useState('');
  const [csrSanDns, setCsrSanDns] = useState('');
  const [csrPem, setCsrPem] = useState('');

  // No PKI - self-signed cert generation
  const [certCn, setCertCn] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certCountry, setCertCountry] = useState('');
  const [certValidity, setCertValidity] = useState(365);
  const [generatedCert, setGeneratedCert] = useState<any>(null);

  useEffect(() => { loadServers(); }, []);

  async function loadServers() {
    try {
      const result = await listNrfServers();
      setServers(result);
    } catch (e: any) { setError(e.message); }
  }

  async function handleDeploy(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const oauthEnabled = oauthAddress.trim().length > 0;
      const result = await deployNrfConfiguration({
        nrf_address: nrfAddress,
        nrf_secured: nrfSecured,
        nrf_failure_codes: [404, 500],
        compression,
        nf_profile_validation: nfProfileValidation,
        nf_service_type: nfServiceType,
        app_grp: appGrp,
        oauth_enabled: oauthEnabled,
        oauth_address: oauthEnabled ? oauthAddress : undefined,
        oauth_secured: oauthSecured,
        oauth_failure_codes: oauthEnabled ? [404, 500] : undefined,
        mtls,
        customer_pki: customerPki,
      });
      const steps = result.result?.steps || [];
      const lastStep = steps[steps.length - 1];
      const jobId = lastStep?.job?.id;
      if (result.status === 'failed') {
        const failedSteps = steps.filter((s: any) => s.job?.status === 'failed');
        const failedNames = failedSteps.map((s: any) => s.operation).join(', ');
        setPopup({ type: 'error', message: `Deployment failed at: ${failedNames}`, jobId });
      } else {
        setPopup({ type: 'success', message: `Deployment complete (Scenario ${result.result.scenario})`, jobId });
        setShowForm(false);
        loadServers();
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleGenerateCert() {
    if (!certCn) { setError('Common Name is required'); return; }
    setError(''); setLoading(true);
    try {
      const result = await generateSelfSignedCert({
        common_name: certCn,
        organization: certOrg,
        country: certCountry,
        validity_days: certValidity,
      });
      setGeneratedCert(result);
      setNrfCaCert(result.cert_base64);
      setSbiP12(result.p12_base64);
      setSbiP12Password('');
      setSuccess('Certificate generated successfully');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleGenerateCsr() {
    if (!csrCn) { setError('Common Name is required for CSR'); return; }
    setError(''); setLoading(true);
    try {
      const sans = csrSanDns.split(',').map(s => s.trim()).filter(Boolean);
      const result = await generateCsr({
        common_name: csrCn,
        organization: csrOrg,
        country: csrCountry,
        san_dns: sans,
      });
      setCsrPem(result.csr_pem);
      setSuccess('CSR generated — download it and submit to your CA');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDelete(serverId: string) {
    if (!confirm(`Delete NRF Server ${serverId}?`)) return;
    setError(''); setSuccess('');
    try {
      const result = await deleteNrfServer(serverId);
      const job = result.job;
      if (job?.status === 'failed') {
        setPopup({ type: 'error', message: `Failed to delete ${serverId}`, jobId: job.id });
      } else {
        setPopup({ type: 'success', message: `NRF Server ${serverId} deleted`, jobId: job?.id });
        loadServers();
      }
    } catch (e: any) { setError(e.message); }
  }

  const needsTls = nrfSecured || oauthSecured;

  return (
    <div>
      <div className="page-header">
        <h1>NRF Servers</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add NRF Server'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

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

      {showForm && (
        <div className="form-panel" style={{ marginBottom: 20, maxWidth: 620 }}>
          <h3 style={{ marginBottom: 16, color: '#4fc3f7' }}>Add NRF Server</h3>
          <form onSubmit={handleDeploy}>
            {/* NRF Section */}
            <div style={{ marginBottom: 12, padding: 12, border: '1px solid #0f3460', borderRadius: 4 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>NRF Server</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>NRF Address *</label>
                <input
                  value={nrfAddress}
                  onChange={e => setNrfAddress(e.target.value)}
                  placeholder={nrfSecured ? 'https://nrf.example.com:3002' : 'http://nrf.example.com:8080'}
                  required
                />
              </div>
              <div className="form-group">
                <label>Transport</label>
                <select value={String(nrfSecured)} onChange={e => setNrfSecured(e.target.value === 'true')}>
                  <option value="true">Secure (HTTPS)</option>
                  <option value="false">Insecure (HTTP)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Application Group</label>
                <input value={appGrp} onChange={e => setAppGrp(e.target.value)} />
              </div>
            </div>

            {/* OAuth Section */}
            <div style={{ marginBottom: 12, padding: 12, border: '1px solid #0f3460', borderRadius: 4 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>OAuth Server (optional)</label>
              <p style={{ color: '#90a4ae', fontSize: 11, marginBottom: 8 }}>
                Leave empty if OAuth is not used.
              </p>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>OAuth Address</label>
                <input
                  value={oauthAddress}
                  onChange={e => setOauthAddress(e.target.value)}
                  placeholder={oauthSecured ? 'https://oauth.example.com:3002' : 'http://oauth.example.com:8080'}
                />
              </div>
              {oauthAddress && (
                <div className="form-group">
                  <label>OAuth Transport</label>
                  <select value={String(oauthSecured)} onChange={e => setOauthSecured(e.target.value === 'true')}>
                    <option value="true">Secure (HTTPS)</option>
                    <option value="false">Insecure (HTTP)</option>
                  </select>
                </div>
              )}
            </div>

            {/* TLS/PKI Section */}
            {needsTls && (
              <div style={{ marginBottom: 12, padding: 12, border: '1px solid #0f3460', borderRadius: 4 }}>
                <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>TLS / Certificate Configuration</label>
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label>Mutual TLS (mTLS)</label>
                  <select value={String(mtls)} onChange={e => setMtls(e.target.value === 'true')}>
                    <option value="false">Disabled</option>
                    <option value="true">Enabled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Customer has PKI?</label>
                  <select value={String(customerPki)} onChange={e => { setCustomerPki(e.target.value === 'true'); setGeneratedCert(null); setCsrPem(''); }}>
                    <option value="false">No — Generate certificates</option>
                    <option value="true">Yes — I have my own CA</option>
                  </select>
                </div>

                {/* NO PKI — Generate self-signed */}
                {!customerPki && (
                  <div style={{ marginTop: 12, padding: 10, border: '1px dashed #1a4080', borderRadius: 4 }}>
                    <label style={{ color: '#66bb6a', fontSize: 11, fontWeight: 600 }}>Generate Self-Signed Certificate</label>
                    <div className="form-group" style={{ marginTop: 8 }}>
                      <label>Common Name (CN) *</label>
                      <input value={certCn} onChange={e => setCertCn(e.target.value)} placeholder="caf-sbi.example.com" />
                    </div>
                    <div className="form-group">
                      <label>Organization</label>
                      <input value={certOrg} onChange={e => setCertOrg(e.target.value)} placeholder="My Company" />
                    </div>
                    <div className="form-group">
                      <label>Country (2-letter code)</label>
                      <input value={certCountry} onChange={e => setCertCountry(e.target.value)} placeholder="SE" maxLength={2} />
                    </div>
                    <div className="form-group">
                      <label>Validity (days)</label>
                      <input type="number" value={certValidity} onChange={e => setCertValidity(Number(e.target.value))} min={1} max={3650} />
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={handleGenerateCert} disabled={loading}>
                      {loading ? 'Generating...' : 'Generate Certificate'}
                    </button>
                    {generatedCert && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Certificate generated and will be used for deployment</span>
                        <div style={{ marginTop: 4 }}>
                          <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => downloadFile(generatedCert.cert_pem, 'ca-cert.pem')}>
                            ⬇ Download CA Cert
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* HAS PKI — Upload or generate CSR */}
                {customerPki && (
                  <div style={{ marginTop: 12, padding: 10, border: '1px dashed #1a4080', borderRadius: 4 }}>
                    <label style={{ color: '#66bb6a', fontSize: 11, fontWeight: 600 }}>Customer PKI</label>

                    <div className="form-group" style={{ marginTop: 8 }}>
                      <label>Need CSR generated?</label>
                      <select value={String(needCsr)} onChange={e => setNeedCsr(e.target.value === 'true')}>
                        <option value="false">No — I will upload signed certificates</option>
                        <option value="true">Yes — Generate CSR for me to sign with my CA</option>
                      </select>
                    </div>

                    {/* CSR Generation */}
                    {needCsr && (
                      <div style={{ marginTop: 8, padding: 8, border: '1px solid #0f3460', borderRadius: 4 }}>
                        <label style={{ color: '#90a4ae', fontSize: 11 }}>CSR Details</label>
                        <div className="form-group" style={{ marginTop: 6 }}>
                          <label>Common Name (CN) *</label>
                          <input value={csrCn} onChange={e => setCsrCn(e.target.value)} placeholder="caf-sbi.example.com" />
                        </div>
                        <div className="form-group">
                          <label>Organization</label>
                          <input value={csrOrg} onChange={e => setCsrOrg(e.target.value)} placeholder="My Company" />
                        </div>
                        <div className="form-group">
                          <label>Country (2-letter code)</label>
                          <input value={csrCountry} onChange={e => setCsrCountry(e.target.value)} placeholder="SE" maxLength={2} />
                        </div>
                        <div className="form-group">
                          <label>SAN DNS Names (comma-separated)</label>
                          <input value={csrSanDns} onChange={e => setCsrSanDns(e.target.value)} placeholder="caf.example.com, sbi.example.com" />
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={handleGenerateCsr} disabled={loading}>
                          {loading ? 'Generating...' : 'Generate CSR'}
                        </button>
                        {csrPem && (
                          <div style={{ marginTop: 8 }}>
                            <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ CSR ready for download</span>
                            <div style={{ marginTop: 4 }}>
                              <button type="button" className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}
                                onClick={() => downloadFile(csrPem, 'caf-sbi.csr')}>
                                ⬇ Download CSR
                              </button>
                            </div>
                            <p style={{ color: '#90a4ae', fontSize: 11, marginTop: 6 }}>
                              Sign this CSR with your CA, then upload the signed cert and CA cert below.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Upload certs */}
                    <div style={{ marginTop: 12 }}>
                      {nrfSecured && (
                        <div className="form-group">
                          <label>NRF CA Certificate (PEM file)</label>
                          <input type="file" accept=".pem,.crt,.cer"
                            onChange={async e => { const f = e.target.files?.[0]; if (f) setNrfCaCert(await fileToBase64(f)); }} />
                          {nrfCaCert && <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Loaded</span>}
                        </div>
                      )}
                      {oauthAddress && oauthSecured && (
                        <div className="form-group">
                          <label>OAuth CA Certificate (PEM file) — leave empty if same as NRF CA</label>
                          <input type="file" accept=".pem,.crt,.cer"
                            onChange={async e => { const f = e.target.files?.[0]; if (f) setOauthCaCert(await fileToBase64(f)); }} />
                          {oauthCaCert && <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Loaded</span>}
                        </div>
                      )}
                      <div className="form-group">
                        <label>SBI Client Certificate (PKCS#12 file)</label>
                        <input type="file" accept=".p12,.pfx"
                          onChange={async e => { const f = e.target.files?.[0]; if (f) setSbiP12(await fileToBase64(f)); }} />
                        {sbiP12 && <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Loaded</span>}
                      </div>
                      {sbiP12 && (
                        <div className="form-group">
                          <label>PKCS#12 Password</label>
                          <input type="password" value={sbiP12Password} onChange={e => setSbiP12Password(e.target.value)} placeholder="Password" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced settings */}
            <div className="collapsible-header" onClick={() => setShowAdvanced(!showAdvanced)}>
              {showAdvanced ? '▼' : '▶'} Additional Settings
            </div>
            {showAdvanced && (
              <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
                <div className="form-group">
                  <label>Compression</label>
                  <select value={String(compression)} onChange={e => setCompression(e.target.value === 'true')}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>NF Profile Validation</label>
                  <select value={String(nfProfileValidation)} onChange={e => setNfProfileValidation(e.target.value === 'true')}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>NF Service Type</label>
                  <select value={nfServiceType} onChange={e => setNfServiceType(e.target.value)}>
                    <option value="nfservices">nfservices</option>
                    <option value="nfservicelist">nfservicelist</option>
                    <option value="both">both</option>
                  </select>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Deploying...' : 'Deploy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Server List */}
      {servers?.job?.stdout ? (
        <div style={{ marginBottom: 16 }}>
          {(() => {
            try {
              const parsed = JSON.parse(servers.job.stdout);
              const serverList = Array.isArray(parsed) ? parsed : parsed?.servers || parsed?.nrfServers || [parsed];
              if (!Array.isArray(serverList) || serverList.length === 0) throw new Error('empty');
              return (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Server ID</th>
                      <th>Address</th>
                      <th>Secured</th>
                      <th>App Group</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverList.map((srv: any, i: number) => {
                      const id = srv.serverId || srv.id || srv.name || `server-${i}`;
                      return (
                        <tr key={id}>
                          <td>{id}</td>
                          <td>{srv.address || '-'}</td>
                          <td>{String(srv.secured ?? '-')}</td>
                          <td>{srv.appGrp || srv.appGroup || '-'}</td>
                          <td>
                            <button className="btn btn-danger" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => handleDelete(id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              );
            } catch {
              return (
                <div className="console" style={{ whiteSpace: 'pre-wrap' }}>
                  {servers.job.stdout}
                </div>
              );
            }
          })()}
        </div>
      ) : (
        <div className="console" style={{ marginBottom: 16 }}>Click "Refresh" to list current NRF servers</div>
      )}

      <button className="btn btn-secondary" onClick={loadServers}>Refresh List</button>
    </div>
  );
}
