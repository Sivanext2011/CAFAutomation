import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNfProfileConfig, updateNfProfileConfig, deleteNfProfileConfig } from '../api/client';

export function NfProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  const [rawOutput, setRawOutput] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);

  // Form fields (all configurable attributes)
  const [appGroup, setAppGroup] = useState('global');
  const [nfType, setNfType] = useState('CHF');
  const [nfStatus, setNfStatus] = useState('REGISTERED');
  const [heartBeatTimer, setHeartBeatTimer] = useState('');
  const [plmnList, setPlmnList] = useState('');
  const [snpnList, setSnpnList] = useState('');
  const [sNssais, setSNssais] = useState('');
  const [perPlmnSnssaiList, setPerPlmnSnssaiList] = useState('');
  const [nsiList, setNsiList] = useState('');
  const [fqdn, setFqdn] = useState('');
  const [ipv4, setIpv4] = useState('');
  const [ipv6, setIpv6] = useState('');
  const [allowedPlmns, setAllowedPlmns] = useState('');
  const [allowedSnpns, setAllowedSnpns] = useState('');
  const [allowedNfTypes, setAllowedNfTypes] = useState('SMF, SMSF, PCF');
  const [allowedNfDomains, setAllowedNfDomains] = useState('');
  const [allowedNssais, setAllowedNssais] = useState('');
  const [priority, setPriority] = useState('');
  const [capacity, setCapacity] = useState('');
  const [locality, setLocality] = useState('');
  const [chfInfo, setChfInfo] = useState('');
  const [customInfo, setCustomInfo] = useState('');
  const [nfSetIdList, setNfSetIdList] = useState('');
  const [servingScope, setServingScope] = useState('');
  const [scpDomains, setScpDomains] = useState('');

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
        } else { setProfiles([]); }
      } catch { setProfiles([]); }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  function parseCommaSep(val: string): string[] {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }

  function parseJsonOrNull(val: string): any {
    if (!val.trim()) return undefined;
    try { return JSON.parse(val); } catch { return undefined; }
  }

  function buildPayload(): any {
    const p: any = { nfType, nfStatus };
    if (heartBeatTimer) p.heartBeatTimer = parseInt(heartBeatTimer);
    if (plmnList) p.plmnList = parseJsonOrNull(plmnList);
    if (snpnList) p.snpnList = parseJsonOrNull(snpnList);
    if (sNssais) p.sNssais = parseJsonOrNull(sNssais);
    if (perPlmnSnssaiList) p.perPlmnSnssaiList = parseJsonOrNull(perPlmnSnssaiList);
    if (nsiList) p.nsiList = parseCommaSep(nsiList);
    if (fqdn) p.fqdn = fqdn;
    if (ipv4) p.ipv4Addresses = parseCommaSep(ipv4);
    if (ipv6) p.ipv6Addresses = parseCommaSep(ipv6);
    if (allowedPlmns) p.allowedPlmns = parseJsonOrNull(allowedPlmns);
    if (allowedSnpns) p.allowedSnpns = parseJsonOrNull(allowedSnpns);
    if (allowedNfTypes) p.allowedNfTypes = parseCommaSep(allowedNfTypes);
    if (allowedNfDomains) p.allowedNfDomains = parseCommaSep(allowedNfDomains);
    if (allowedNssais) p.allowedNssais = parseJsonOrNull(allowedNssais);
    if (priority) p.priority = parseInt(priority);
    if (capacity) p.capacity = parseInt(capacity);
    if (locality) p.locality = locality;
    if (chfInfo) p.chfInfo = parseJsonOrNull(chfInfo);
    if (customInfo) p.customInfo = parseJsonOrNull(customInfo);
    if (nfSetIdList) p.nfSetIdList = parseCommaSep(nfSetIdList);
    if (servingScope) p.servingScope = parseCommaSep(servingScope);
    if (scpDomains) p.scpDomains = parseCommaSep(scpDomains);
    return p;
  }

  async function handleUpdate() {
    setError('');
    let payload: any;
    if (editMode === 'json') {
      try { payload = JSON.parse(jsonPayload); } catch { setError('Invalid JSON'); return; }
    } else {
      payload = buildPayload();
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

  function loadIntoForm(p: any) {
    setAppGroup(p._id || 'global');
    setNfType(p.nfType || 'CHF');
    setNfStatus(p.nfStatus || 'REGISTERED');
    setHeartBeatTimer(p.heartBeatTimer != null ? String(p.heartBeatTimer) : '');
    setPlmnList(p.plmnList ? JSON.stringify(p.plmnList) : '');
    setSnpnList(p.snpnList ? JSON.stringify(p.snpnList) : '');
    setSNssais(p.sNssais ? JSON.stringify(p.sNssais) : '');
    setPerPlmnSnssaiList(p.perPlmnSnssaiList ? JSON.stringify(p.perPlmnSnssaiList) : '');
    setNsiList((p.nsiList || []).join(', '));
    setFqdn(p.fqdn || '');
    setIpv4((p.ipv4Addresses || []).join(', '));
    setIpv6((p.ipv6Addresses || []).join(', '));
    setAllowedPlmns(p.allowedPlmns ? JSON.stringify(p.allowedPlmns) : '');
    setAllowedSnpns(p.allowedSnpns ? JSON.stringify(p.allowedSnpns) : '');
    setAllowedNfTypes((p.allowedNfTypes || []).join(', '));
    setAllowedNfDomains((p.allowedNfDomains || []).join(', '));
    setAllowedNssais(p.allowedNssais ? JSON.stringify(p.allowedNssais) : '');
    setPriority(p.priority != null ? String(p.priority) : '');
    setCapacity(p.capacity != null ? String(p.capacity) : '');
    setLocality(p.locality || '');
    setChfInfo(p.chfInfo ? JSON.stringify(p.chfInfo, null, 2) : '');
    setCustomInfo(p.customInfo ? JSON.stringify(p.customInfo, null, 2) : '');
    setNfSetIdList((p.nfSetIdList || []).join(', '));
    setServingScope((p.servingScope || []).join(', '));
    setScpDomains((p.scpDomains || []).join(', '));
    setJsonPayload(JSON.stringify(p, null, 2));
  }

  return (
    <div>
      <div className="page-header"><h1>NF Profile Configuration</h1></div>

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
        <button className="btn btn-secondary" onClick={loadProfiles} disabled={loading} style={{ marginBottom: 8 }}>Refresh</button>
        {profiles.length > 0 ? (
          <table className="data-table">
            <thead><tr><th>App Group</th><th>NF Type</th><th>Status</th><th>FQDN</th><th>Priority</th><th>Capacity</th><th></th></tr></thead>
            <tbody>
              {profiles.map((p, i) => (
                <tr key={i}>
                  <td>{p._id || '-'}</td>
                  <td>{p.nfType || '-'}</td>
                  <td>{p.nfStatus || '-'}</td>
                  <td style={{ fontSize: 11 }}>{p.fqdn || '-'}</td>
                  <td>{p.priority ?? '-'}</td>
                  <td>{p.capacity ?? '-'}</td>
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
      <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Update NF Profile</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn ${editMode === 'form' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => setEditMode('form')}>Form</button>
            <button className={`btn ${editMode === 'json' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => { setEditMode('json'); setJsonPayload(JSON.stringify(buildPayload(), null, 2)); }}>JSON</button>
          </div>
        </div>

        <div className="form-group">
          <label>App Group *</label>
          <input value={appGroup} onChange={e => setAppGroup(e.target.value)} />
        </div>

        {editMode === 'form' && (
          <>
            {/* Mandatory */}
            <div style={{ padding: 10, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>Mandatory</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>NF Type *</label>
                  <select value={nfType} onChange={e => setNfType(e.target.value)}>
                    <option>CHF</option><option>PCF</option><option>SMF</option><option>AMF</option><option>UDM</option><option>UDR</option><option>AUSF</option><option>NRF</option><option>BSF</option><option>NSSF</option><option>NEF</option><option>OTHER</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>NF Status *</label>
                  <select value={nfStatus} onChange={e => setNfStatus(e.target.value)}>
                    <option>REGISTERED</option><option>SUSPENDED</option><option>UNDISCOVERABLE</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>HeartBeat Timer (sec)</label>
                  <input type="number" value={heartBeatTimer} onChange={e => setHeartBeatTimer(e.target.value)} placeholder="60" />
                </div>
              </div>
            </div>

            {/* Network Identity */}
            <div style={{ padding: 10, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>Network Identity &amp; Addressing</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>FQDN</label>
                <input value={fqdn} onChange={e => setFqdn(e.target.value)} placeholder="chf.example.com" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>IPv4 Addresses (comma-sep)</label>
                  <input value={ipv4} onChange={e => setIpv4(e.target.value)} placeholder="10.0.0.1, 10.0.0.2" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>IPv6 Addresses (comma-sep)</label>
                  <input value={ipv6} onChange={e => setIpv6(e.target.value)} placeholder="2001:db8::1" />
                </div>
              </div>
              <div className="form-group">
                <label>Locality</label>
                <input value={locality} onChange={e => setLocality(e.target.value)} placeholder="datacenter-1" />
              </div>
            </div>

            {/* PLMN & Slicing */}
            <div style={{ padding: 10, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>PLMN &amp; Slicing</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>PLMN List (JSON array: [{`{"mcc":"xxx","mnc":"xx"}`}])</label>
                <input value={plmnList} onChange={e => setPlmnList(e.target.value)} placeholder='[{"mcc":"240","mnc":"01"}]' />
              </div>
              <div className="form-group">
                <label>SNPN List (JSON array)</label>
                <input value={snpnList} onChange={e => setSnpnList(e.target.value)} placeholder='[{"mcc":"240","mnc":"01","nid":"..."}]' />
              </div>
              <div className="form-group">
                <label>S-NSSAIs (JSON array: [{`{"sst":1,"sd":"..."}`}])</label>
                <input value={sNssais} onChange={e => setSNssais(e.target.value)} placeholder='[{"sst":1,"sd":"000001"}]' />
              </div>
              <div className="form-group">
                <label>Per-PLMN SNSSAI List (JSON array)</label>
                <input value={perPlmnSnssaiList} onChange={e => setPerPlmnSnssaiList(e.target.value)} />
              </div>
              <div className="form-group">
                <label>NSI List (comma-sep)</label>
                <input value={nsiList} onChange={e => setNsiList(e.target.value)} placeholder="nsi-1, nsi-2" />
              </div>
            </div>

            {/* Access Control */}
            <div style={{ padding: 10, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>Access Control</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>Allowed NF Types (comma-sep)</label>
                <input value={allowedNfTypes} onChange={e => setAllowedNfTypes(e.target.value)} placeholder="SMF, SMSF, PCF" />
              </div>
              <div className="form-group">
                <label>Allowed NF Domains (comma-sep regex patterns)</label>
                <input value={allowedNfDomains} onChange={e => setAllowedNfDomains(e.target.value)} placeholder=".*\\.example\\.com" />
              </div>
              <div className="form-group">
                <label>Allowed PLMNs (JSON array)</label>
                <input value={allowedPlmns} onChange={e => setAllowedPlmns(e.target.value)} placeholder='[{"mcc":"240","mnc":"01"}]' />
              </div>
              <div className="form-group">
                <label>Allowed SNPNs (JSON array)</label>
                <input value={allowedSnpns} onChange={e => setAllowedSnpns(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Allowed NSSAIs (JSON array)</label>
                <input value={allowedNssais} onChange={e => setAllowedNssais(e.target.value)} placeholder='[{"sst":1}]' />
              </div>
            </div>

            {/* Priority & Capacity */}
            <div style={{ padding: 10, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>Priority &amp; Capacity</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Priority (0-65535, lower=higher)</label>
                  <input type="number" value={priority} onChange={e => setPriority(e.target.value)} placeholder="0" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Capacity (0-65535)</label>
                  <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder="100" />
                </div>
              </div>
            </div>

            {/* CHF Specific & Custom */}
            <div style={{ padding: 10, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>CHF Info &amp; Custom</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>CHF Info (JSON object)</label>
                <textarea value={chfInfo} onChange={e => setChfInfo(e.target.value)} rows={3} style={{ fontFamily: 'monospace', fontSize: 11 }} placeholder='{"supiRangeList":[...]}' />
              </div>
              <div className="form-group">
                <label>Custom Info (JSON object)</label>
                <textarea value={customInfo} onChange={e => setCustomInfo(e.target.value)} rows={3} style={{ fontFamily: 'monospace', fontSize: 11 }} placeholder='{"key":"value"}' />
              </div>
            </div>

            {/* NF Sets & SCP */}
            <div style={{ padding: 10, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>NF Sets &amp; SCP</label>
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>NF Set ID List (comma-sep)</label>
                <input value={nfSetIdList} onChange={e => setNfSetIdList(e.target.value)} placeholder="set1, set2" />
              </div>
              <div className="form-group">
                <label>Serving Scope (comma-sep)</label>
                <input value={servingScope} onChange={e => setServingScope(e.target.value)} placeholder="area1, area2" />
              </div>
              <div className="form-group">
                <label>SCP Domains (comma-sep)</label>
                <input value={scpDomains} onChange={e => setScpDomains(e.target.value)} placeholder="scp-domain-1" />
              </div>
            </div>
          </>
        )}

        {editMode === 'json' && (
          <div className="form-group">
            <label>JSON Payload (full NF Profile)</label>
            <textarea value={jsonPayload} onChange={e => setJsonPayload(e.target.value)} rows={16} style={{ fontFamily: 'monospace', fontSize: 11 }} />
          </div>
        )}

        <button className="btn btn-primary" onClick={handleUpdate} disabled={loading}>
          {loading ? 'Updating...' : 'Update NF Profile'}
        </button>
      </div>
    </div>
  );
}
