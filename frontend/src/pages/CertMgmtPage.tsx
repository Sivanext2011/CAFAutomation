import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCertMappings, saveCertMappings, installCertKey, trustCertCa, listCertKeys, listCertTrusted, listCertCmp, listCertCrls, generateSelfSignedCert, generateCsr } from '../api/client';

interface ServiceMapping {
  serviceName: string;
  keyName: string;
  certName: string;
  trustListName: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { const r = reader.result as string; resolve(r.includes(',') ? r.split(',')[1] : r); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Tab = 'install' | 'trust' | 'mappings' | 'view';

export function CertMgmtPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('install');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Mappings
  const [mappings, setMappings] = useState<ServiceMapping[]>([]);
  const [newService, setNewService] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [newCertName, setNewCertName] = useState('');
  const [newTrustList, setNewTrustList] = useState('');

  // Install Key
  const [selectedService, setSelectedService] = useState('');
  const [p12File, setP12File] = useState('');
  const [p12Password, setP12Password] = useState('');
  const [pkiMode, setPkiMode] = useState<'upload' | 'generate' | 'csr'>('upload');

  // Generate cert
  const [certCn, setCertCn] = useState('');
  const [certOrg, setCertOrg] = useState('');
  const [certCountry, setCertCountry] = useState('');
  const [certValidity, setCertValidity] = useState(365);

  // CSR
  const [csrCn, setCsrCn] = useState('');
  const [csrOrg, setCsrOrg] = useState('');
  const [csrCountry, setCsrCountry] = useState('');
  const [csrSanDns, setCsrSanDns] = useState('');

  // Trust CA
  const [trustService, setTrustService] = useState('');
  const [caCert, setCaCert] = useState('');
  const [caName, setCaName] = useState('');
  const [caDesc, setCaDesc] = useState('');

  useEffect(() => { loadMappings(); }, []);

  async function loadMappings() {
    try { const r = await getCertMappings(); setMappings(r.mappings || []); } catch {}
  }

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  function getMapping(serviceName: string) { return mappings.find(m => m.serviceName === serviceName); }

  async function handleAddMapping() {
    if (!newService || !newKeyName || !newCertName || !newTrustList) { err('All fields required'); return; }
    const updated = [...mappings, { serviceName: newService, keyName: newKeyName, certName: newCertName, trustListName: newTrustList }];
    setMappings(updated);
    await saveCertMappings({ services: updated });
    setNewService(''); setNewKeyName(''); setNewCertName(''); setNewTrustList('');
  }

  async function handleRemoveMapping(i: number) {
    const updated = mappings.filter((_, idx) => idx !== i);
    setMappings(updated);
    await saveCertMappings({ services: updated });
  }

  async function handleInstallKey() {
    const m = getMapping(selectedService);
    if (!m) { err('Select a service'); return; }
    if (!p12File) { err('Upload P12 file'); return; }
    setLoading(true);
    try {
      const r = await installCertKey({ name: m.keyName, certificateName: m.certName, p12: p12File, p12Password });
      if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Install failed', jobId: r.job.id });
      else setPopup({ type: 'success', message: `Key "${m.keyName}" / Cert "${m.certName}" installed for ${m.serviceName}`, jobId: r.job?.id });
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function handleGenerateCert() {
    if (!certCn) { err('Common Name required'); return; }
    const m = getMapping(selectedService);
    if (!m) { err('Select a service'); return; }
    setLoading(true);
    try {
      const result = await generateSelfSignedCert({ common_name: certCn, organization: certOrg, country: certCountry, validity_days: certValidity });
      setP12File(result.p12_base64);
      setP12Password('');
      setPopup({ type: 'success', message: 'Certificate generated. Click "Install Key" to deploy.' });
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function handleGenerateCsr() {
    if (!csrCn) { err('Common Name required'); return; }
    setLoading(true);
    try {
      const sans = csrSanDns.split(',').map(s => s.trim()).filter(Boolean);
      const result = await generateCsr({ common_name: csrCn, organization: csrOrg, country: csrCountry, san_dns: sans });
      setOutput(result.csr_pem);
      setPopup({ type: 'success', message: 'CSR generated. Download and submit to your CA.' });
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function handleTrustCa() {
    const m = getMapping(trustService);
    if (!m) { err('Select a service'); return; }
    if (!caCert) { err('Upload CA certificate'); return; }
    setLoading(true);
    try {
      const r = await trustCertCa({
        trustListName: m.trustListName,
        description: caDesc || `Trusted CA for ${m.serviceName}`,
        certificates: [{ name: caName || `${m.serviceName}-ca`, certificate: caCert }],
      });
      if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Trust failed', jobId: r.job.id });
      else setPopup({ type: 'success', message: `CA added to "${m.trustListName}" for ${m.serviceName}`, jobId: r.job?.id });
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function run(fn: () => Promise<any>) {
    setLoading(true); setOutput('');
    try { const r = await fn(); setOutput(r.job?.stdout || 'Done'); } catch (e: any) { err(e); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header"><h1>Certificate Management</h1></div>

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

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`btn ${tab === 'install' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('install')}>Install Key/Cert</button>
        <button className={`btn ${tab === 'trust' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('trust')}>Trust CA</button>
        <button className={`btn ${tab === 'mappings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('mappings')}>Service Mappings</button>
        <button className={`btn ${tab === 'view' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('view')}>View Certs</button>
      </div>

      {/* Install Key/Cert Tab */}
      {tab === 'install' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 550 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Install Asymmetric Key + Certificate</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Service *</label>
              <select value={selectedService} onChange={e => setSelectedService(e.target.value)}>
                <option value="">-- Select Service --</option>
                {mappings.map(m => <option key={m.serviceName} value={m.serviceName}>{m.serviceName} ({m.keyName}/{m.certName})</option>)}
              </select>
            </div>
            {selectedService && <p style={{ color: '#90a4ae', fontSize: 11 }}>Key: <strong>{getMapping(selectedService)?.keyName}</strong> | Cert: <strong>{getMapping(selectedService)?.certName}</strong></p>}

            {/* PKI Mode */}
            <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
              <button className={`btn ${pkiMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setPkiMode('upload')}>Upload P12</button>
              <button className={`btn ${pkiMode === 'generate' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setPkiMode('generate')}>Generate Self-Signed</button>
              <button className={`btn ${pkiMode === 'csr' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setPkiMode('csr')}>Generate CSR</button>
            </div>

            {pkiMode === 'upload' && (
              <>
                <div className="form-group"><label>PKCS#12 File (.p12)</label><input type="file" accept=".p12,.pfx" onChange={async e => { const f = e.target.files?.[0]; if (f) setP12File(await fileToBase64(f)); }} />{p12File && <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Loaded</span>}</div>
                <div className="form-group"><label>P12 Password</label><input type="password" value={p12Password} onChange={e => setP12Password(e.target.value)} /></div>
                <button className="btn btn-primary" onClick={handleInstallKey} disabled={loading || !selectedService || !p12File}>{loading ? 'Installing...' : 'Install Key'}</button>
              </>
            )}

            {pkiMode === 'generate' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group" style={{ margin: 0 }}><label>Common Name *</label><input value={certCn} onChange={e => setCertCn(e.target.value)} placeholder="caf-sbi.example.com" /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Organization</label><input value={certOrg} onChange={e => setCertOrg(e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Country</label><input value={certCountry} onChange={e => setCertCountry(e.target.value)} maxLength={2} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Validity (days)</label><input type="number" value={certValidity} onChange={e => setCertValidity(Number(e.target.value))} /></div>
                </div>
                <button className="btn btn-secondary" onClick={handleGenerateCert} disabled={loading} style={{ marginTop: 8 }}>{loading ? 'Generating...' : 'Generate Certificate'}</button>
                {p12File && <><p style={{ color: '#66bb6a', fontSize: 11, marginTop: 8 }}>✓ Certificate generated</p><button className="btn btn-primary" onClick={handleInstallKey} disabled={loading || !selectedService} style={{ marginTop: 4 }}>Install Key</button></>}
              </>
            )}

            {pkiMode === 'csr' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div className="form-group" style={{ margin: 0 }}><label>Common Name *</label><input value={csrCn} onChange={e => setCsrCn(e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Organization</label><input value={csrOrg} onChange={e => setCsrOrg(e.target.value)} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Country</label><input value={csrCountry} onChange={e => setCsrCountry(e.target.value)} maxLength={2} /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>SAN DNS (comma-sep)</label><input value={csrSanDns} onChange={e => setCsrSanDns(e.target.value)} /></div>
                </div>
                <button className="btn btn-secondary" onClick={handleGenerateCsr} disabled={loading} style={{ marginTop: 8 }}>{loading ? 'Generating...' : 'Generate CSR'}</button>
                {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 8, maxHeight: 150, overflow: 'auto' }}>{output}</div>}
                <p style={{ color: '#90a4ae', fontSize: 11, marginTop: 4 }}>Sign this CSR with your CA, then upload the signed P12 using "Upload P12" mode.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Trust CA Tab */}
      {tab === 'trust' && (
        <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
          <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Add Trusted CA Certificate</label>
          <div className="form-group" style={{ marginTop: 8 }}>
            <label>Service *</label>
            <select value={trustService} onChange={e => setTrustService(e.target.value)}>
              <option value="">-- Select Service --</option>
              {mappings.map(m => <option key={m.serviceName} value={m.serviceName}>{m.serviceName} ({m.trustListName})</option>)}
            </select>
          </div>
          {trustService && <p style={{ color: '#90a4ae', fontSize: 11 }}>Trust List: <strong>{getMapping(trustService)?.trustListName}</strong></p>}
          <div className="form-group"><label>CA Certificate Name</label><input value={caName} onChange={e => setCaName(e.target.value)} placeholder="peer-ca" /></div>
          <div className="form-group"><label>Description</label><input value={caDesc} onChange={e => setCaDesc(e.target.value)} placeholder="Trusted CA for..." /></div>
          <div className="form-group"><label>CA Certificate (PEM file)</label><input type="file" accept=".pem,.crt,.cer" onChange={async e => { const f = e.target.files?.[0]; if (f) setCaCert(await fileToBase64(f)); }} />{caCert && <span style={{ color: '#66bb6a', fontSize: 11 }}>✓ Loaded</span>}</div>
          <button className="btn btn-primary" onClick={handleTrustCa} disabled={loading || !trustService || !caCert}>{loading ? 'Installing...' : 'Trust CA'}</button>
        </div>
      )}

      {/* Service Mappings Tab */}
      {tab === 'mappings' && (
        <div>
          <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 12 }}>Define service → certificate name mappings. These are used when installing keys or trusting CAs.</p>
          {mappings.length > 0 && (
            <table className="data-table" style={{ marginBottom: 16 }}>
              <thead><tr><th>Service</th><th>Key Name</th><th>Cert Name</th><th>Trust List</th><th></th></tr></thead>
              <tbody>
                {mappings.map((m, i) => (
                  <tr key={i}>
                    <td>{m.serviceName}</td><td>{m.keyName}</td><td>{m.certName}</td><td>{m.trustListName}</td>
                    <td><button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => handleRemoveMapping(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 600 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Add Mapping</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Service Name *</label><input value={newService} onChange={e => setNewService(e.target.value)} placeholder="CHA SBI" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Key Name *</label><input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="cha-sbi-key" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Cert Name *</label><input value={newCertName} onChange={e => setNewCertName(e.target.value)} placeholder="cha-sbi-cert" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Trust List *</label><input value={newTrustList} onChange={e => setNewTrustList(e.target.value)} placeholder="external-trusted-ca-list" /></div>
            </div>
            <button className="btn btn-primary" onClick={handleAddMapping} style={{ marginTop: 8 }}>Add</button>
          </div>
        </div>
      )}

      {/* View Certs Tab */}
      {tab === 'view' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={() => run(listCertKeys)} disabled={loading}>List Keys</button>
            <button className="btn btn-secondary" onClick={() => run(listCertTrusted)} disabled={loading}>List Trusted</button>
            <button className="btn btn-secondary" onClick={() => run(listCertCmp)} disabled={loading}>CMP Groups</button>
            <button className="btn btn-secondary" onClick={() => run(listCertCrls)} disabled={loading}>CRLs</button>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}
    </div>
  );
}
