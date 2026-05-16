import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getDiameterProxies, getDiameterPeers, diameterBulkAdd, removeDiameterProxy, removeDiameterPeer,
  setRestrictPeerList, setSendReplyUnknown, getDiameterAllConfig, getDiameterGlobalConfig,
  getDiameterAppgroups, getDiameterAppgroup, deleteDiameterAppgroup,
  addOwnDiameterIdentity, getOwnDiameterIdentities,
  listSdpRealms, updateSdpRealms, listSdpPeers, updateSdpPeers, checkSdpPeerStatus,
} from '../api/client';

interface DiameterEntry { interface: string; host: string; realm: string; }
const INTERFACES = ['Gy', 'Ro', 'SCAPv2', 'Sy', 'ESy', 'Other'];

export function DiameterPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'integrate' | 'sdp' | 'config' | 'identity' | 'settings'>('integrate');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Common
  const [appGrp, setAppGrp] = useState('cha1');
  const [transport, setTransport] = useState('tcp');
  const [port, setPort] = useState('3868');
  const [scheme, setScheme] = useState('aaa');
  const [initiate, setInitiate] = useState(true);
  const [raiseAlarm, setRaiseAlarm] = useState(true);
  const [addPeers, setAddPeers] = useState(true);

  // Entries
  const [entries, setEntries] = useState<DiameterEntry[]>([{ interface: 'Gy', host: '', realm: '' }]);
  const [bulkText, setBulkText] = useState('');
  const [inputMode, setInputMode] = useState<'form' | 'bulk'>('form');
  const [proxiesJson, setProxiesJson] = useState('');
  const [peersJson, setPeersJson] = useState('');

  // Config view
  const [configOutput, setConfigOutput] = useState('');

  // Identity
  const [dlbId, setDlbId] = useState('0');
  const [identityFqdn, setIdentityFqdn] = useState('');
  const [identityOutput, setIdentityOutput] = useState('');

  // Settings
  const [restrict, setRestrict] = useState(true);
  const [sendReply, setSendReply] = useState(true);
  const [globalOutput, setGlobalOutput] = useState('');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  function addEntry() { setEntries([...entries, { interface: 'Gy', host: '', realm: '' }]); }
  function removeEntry(i: number) { setEntries(entries.filter((_, idx) => idx !== i)); }
  function updateEntry(i: number, field: keyof DiameterEntry, value: string) {
    const u = [...entries]; u[i] = { ...u[i], [field]: value }; setEntries(u);
  }
  function parseBulk(): DiameterEntry[] {
    return bulkText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const p = line.split('|').map(s => s.trim());
      return { interface: p[0] || 'Gy', host: p[1] || '', realm: p[2] || '' };
    }).filter(e => e.host);
  }
  function getEntries() { return inputMode === 'form' ? entries.filter(e => e.host) : parseBulk(); }

  async function generateJson() {
    const valid = getEntries();
    if (!valid.length) { setPopup({ type: 'error', message: 'No valid entries' }); return; }
    setLoading(true);
    let existingProxies: any[] = [], existingPeers: any[] = [];
    try { const r = await getDiameterProxies(appGrp); if (r.job?.stdout) try { existingProxies = JSON.parse(r.job.stdout); } catch {} } catch {}
    try { const r = await getDiameterPeers(appGrp); if (r.job?.stdout) try { existingPeers = JSON.parse(r.job.stdout); } catch {} } catch {}
    if (!Array.isArray(existingProxies)) existingProxies = [];
    if (!Array.isArray(existingPeers)) existingPeers = [];

    const newProxies: any[] = [];
    valid.filter(e => e.realm).forEach(e => {
      if (!newProxies.find(p => p.realm === e.realm)) {
        newProxies.push({ appGrp, host: e.host, realm: e.realm, port, scheme, transport, interface: e.interface });
      }
    });
    const seen = new Set<string>();
    const newPeers: any[] = [];
    if (addPeers) valid.forEach(e => { if (!seen.has(e.host)) { seen.add(e.host); newPeers.push({ appGrp, host: e.host, port, scheme, transport, initiateConnection: initiate, raiseAlarm }); } });

    const mp = [...existingProxies]; newProxies.forEach(np => { if (!mp.find(p => p.realm === np.realm)) mp.push(np); });
    const mpr = [...existingPeers]; newPeers.forEach(np => { if (!mpr.find(p => p.host === np.host)) mpr.push(np); });

    setProxiesJson(JSON.stringify(mp, null, 2));
    setPeersJson(JSON.stringify(mpr, null, 2));
    setLoading(false);
  }

  async function handleDeploy() {
    if (!proxiesJson.trim() && !peersJson.trim()) { setPopup({ type: 'error', message: 'Generate JSON first' }); return; }
    setLoading(true);
    try {
      const proxies = proxiesJson.trim() ? JSON.parse(proxiesJson) : [];
      const peers = peersJson.trim() ? JSON.parse(peersJson) : [];
      const result = await diameterBulkAdd({ proxies, peers });
      const failed = (result.results?.proxies || []).concat(result.results?.peers || []).filter((r: any) => r.status === 'failed').length;
      if (failed) setPopup({ type: 'error', message: `${failed} operation(s) failed. Check Jobs.` });
      else setPopup({ type: 'success', message: `Deployed ${proxies.length} proxy(s) and ${peers.length} peer(s)` });
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  // Config tab
  async function handleGetAllConfig() { setLoading(true); try { const r = await getDiameterAllConfig(); setConfigOutput(r.job?.stdout || 'No config'); } catch (e: any) { err(e); } setLoading(false); }
  async function handleGetAppgroup() { setLoading(true); try { const r = await getDiameterAppgroup(appGrp); setConfigOutput(r.job?.stdout || 'Not found'); } catch (e: any) { err(e); } setLoading(false); }
  async function handleGetAppgroups() { setLoading(true); try { const r = await getDiameterAppgroups(); setConfigOutput(r.job?.stdout || 'None'); } catch (e: any) { err(e); } setLoading(false); }
  async function handleDeleteAppgroup() { if (!confirm(`Delete appgroup ${appGrp}?`)) return; setLoading(true); try { const r = await deleteDiameterAppgroup(appGrp); if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Delete failed', jobId: r.job.id }); else setPopup({ type: 'success', message: `${appGrp} deleted`, jobId: r.job?.id }); } catch (e: any) { err(e); } setLoading(false); }

  // Identity
  async function handleGetIdentities() { setLoading(true); try { const r = await getOwnDiameterIdentities(appGrp); setIdentityOutput(r.job?.stdout || 'None'); } catch (e: any) { err(e); } setLoading(false); }
  async function handleAddIdentity() {
    if (!identityFqdn) { setPopup({ type: 'error', message: 'FQDN required' }); return; }
    setLoading(true);
    try {
      const r = await addOwnDiameterIdentity({ appGrp, dlbInstanceId: dlbId, identity: identityFqdn });
      if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Failed', jobId: r.job.id });
      else { setPopup({ type: 'success', message: 'Identity set', jobId: r.job?.id }); handleGetIdentities(); }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  // Settings
  async function handleGetGlobal() { setLoading(true); try { const r = await getDiameterGlobalConfig(); setGlobalOutput(r.job?.stdout || 'No config'); } catch (e: any) { err(e); } setLoading(false); }
  async function handleSetRestrict() { setLoading(true); try { const r = await setRestrictPeerList({ restrict }); if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Failed', jobId: r.job.id }); else setPopup({ type: 'success', message: `Restrict: ${restrict}`, jobId: r.job?.id }); } catch (e: any) { err(e); } setLoading(false); }
  async function handleSetSendReply() { setLoading(true); try { const r = await setSendReplyUnknown({ sendReply }); if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Failed', jobId: r.job.id }); else setPopup({ type: 'success', message: `Send reply: ${sendReply}`, jobId: r.job?.id }); } catch (e: any) { err(e); } setLoading(false); }

  return (
    <div>
      <div className="page-header">
        <h1>Diameter Integration</h1>
        <span style={{ color: '#90a4ae', fontSize: 12 }}>Gy · Ro · SCAPv2 · Sy · ESy</span>
      </div>

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
        <button className={`btn ${tab === 'integrate' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('integrate')}>Add Diameter Peers/Proxies</button>
        <button className={`btn ${tab === 'sdp' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('sdp')}>SDP Integration</button>
        <button className={`btn ${tab === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('config')}>View Config</button>
        <button className={`btn ${tab === 'identity' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('identity')}>Own Identity</button>
        <button className={`btn ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('settings')}>Global Settings</button>
      </div>

      {/* Add Peers/Proxies Tab */}
      {tab === 'integrate' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Common Settings</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>App Group</label><input value={appGrp} onChange={e => setAppGrp(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Transport</label><select value={transport} onChange={e => setTransport(e.target.value)}><option value="tcp">TCP</option><option value="sctp">SCTP</option></select></div>
              <div className="form-group" style={{ margin: 0 }}><label>Port</label><input value={port} onChange={e => setPort(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Scheme</label><select value={scheme} onChange={e => setScheme(e.target.value)}><option value="aaa">aaa</option><option value="aaas">aaas</option></select></div>
              <div className="form-group" style={{ margin: 0 }}><label>Add as Peer</label><select value={String(addPeers)} onChange={e => setAddPeers(e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
            </div>
            {addPeers && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}><label>Initiate Connection</label><select value={String(initiate)} onChange={e => setInitiate(e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
                <div className="form-group" style={{ margin: 0 }}><label>Raise Alarm</label><select value={String(raiseAlarm)} onChange={e => setRaiseAlarm(e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn ${inputMode === 'form' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('form')}>Row-by-Row</button>
            <button className={`btn ${inputMode === 'bulk' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('bulk')}>Bulk Paste</button>
          </div>

          {inputMode === 'form' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Entries ({entries.length})</label>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={addEntry}>+ Add</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr style={{ color: '#90a4ae', fontSize: 11 }}><th style={{ textAlign: 'left', padding: '4px' }}>Interface</th><th style={{ textAlign: 'left', padding: '4px' }}>Host *</th><th style={{ textAlign: 'left', padding: '4px' }}>Realm</th><th></th></tr></thead>
                <tbody>{entries.map((e, i) => (
                  <tr key={i}>
                    <td style={{ padding: '2px 4px' }}><select value={e.interface} onChange={ev => updateEntry(i, 'interface', ev.target.value)} style={{ width: '100%', fontSize: 12 }}>{INTERFACES.map(f => <option key={f}>{f}</option>)}</select></td>
                    <td style={{ padding: '2px 4px' }}><input value={e.host} onChange={ev => updateEntry(i, 'host', ev.target.value)} placeholder="peer1.com" style={{ width: '100%', fontSize: 12 }} /></td>
                    <td style={{ padding: '2px 4px' }}><input value={e.realm} onChange={ev => updateEntry(i, 'realm', ev.target.value)} placeholder="realm1" style={{ width: '100%', fontSize: 12 }} /></td>
                    <td style={{ padding: '2px 4px' }}>{entries.length > 1 && <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => removeEntry(i)}>✕</button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}

          {inputMode === 'bulk' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Bulk Paste</label>
              <p style={{ color: '#90a4ae', fontSize: 11, margin: '4px 0 8px' }}>Format: <code style={{ color: '#4fc3f7' }}>interface | host | realm</code></p>
              <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} rows={6} style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12 }} placeholder={`Gy | pgw01.com | epc.realm.org\nRo | mtas01.com | ims.realm.org`} />
              <p style={{ color: '#90a4ae', fontSize: 11, marginTop: 4 }}>{parseBulk().length} entry(s)</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={generateJson} disabled={loading}>{loading ? 'Fetching...' : 'Generate JSON (merge existing)'}</button>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={loading || (!proxiesJson && !peersJson)}>{loading ? 'Deploying...' : 'Deploy All'}</button>
          </div>

          {proxiesJson && (<div style={{ marginBottom: 12 }}><label style={{ color: '#4fc3f7', fontSize: 12 }}>Proxies — <code>add-diameter-proxy</code> per entry:</label><textarea value={proxiesJson} onChange={e => setProxiesJson(e.target.value)} style={{ width: '100%', minHeight: 120, maxHeight: 220, background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11 }} /></div>)}
          {peersJson && (<div><label style={{ color: '#4fc3f7', fontSize: 12 }}>Peers — <code>add-diameter-peer</code> per entry:</label><textarea value={peersJson} onChange={e => setPeersJson(e.target.value)} style={{ width: '100%', minHeight: 120, maxHeight: 220, background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11 }} /></div>)}
        </div>
      )}

      {/* View Config Tab */}
      {tab === 'config' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>App Group</label><input value={appGrp} onChange={e => setAppGrp(e.target.value)} style={{ width: 100 }} /></div>
            <button className="btn btn-secondary" onClick={handleGetAllConfig} disabled={loading}>All Config</button>
            <button className="btn btn-secondary" onClick={handleGetAppgroups} disabled={loading}>All AppGroups</button>
            <button className="btn btn-secondary" onClick={handleGetAppgroup} disabled={loading}>Get AppGroup</button>
            <button className="btn btn-danger" onClick={handleDeleteAppgroup} disabled={loading}>Delete AppGroup</button>
          </div>
          <div className="console" style={{ whiteSpace: 'pre-wrap', minHeight: 100 }}>{configOutput || 'Click a button above'}</div>
        </div>
      )}

      {/* Own Identity Tab */}
      {tab === 'identity' && (
        <div>
          <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 12 }}>Set the FQDN used as the Diameter Load Balancer's own identity per DLB instance.</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>App Group</label><input value={appGrp} onChange={e => setAppGrp(e.target.value)} style={{ width: 100 }} /></div>
            <button className="btn btn-secondary" onClick={handleGetIdentities} disabled={loading}>List Identities</button>
          </div>
          {identityOutput && <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 12 }}>{identityOutput}</div>}

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Add / Update Own Identity</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>App Group</label><input value={appGrp} onChange={e => setAppGrp(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>DLB Instance ID</label><input value={dlbId} onChange={e => setDlbId(e.target.value)} placeholder="0" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>FQDN *</label><input value={identityFqdn} onChange={e => setIdentityFqdn(e.target.value)} placeholder="dlb0.appgroup1.com" /></div>
            </div>
            <button className="btn btn-primary" onClick={handleAddIdentity} disabled={loading} style={{ marginTop: 8 }}>{loading ? 'Setting...' : 'Set Identity'}</button>
            <p style={{ color: '#ff9800', fontSize: 11, marginTop: 8 }}>⚠ Changing identity restarts Diameter Stack — all peer connections will drop and reconnect.</p>
          </div>
        </div>
      )}

      {/* Global Settings Tab */}
      {tab === 'settings' && (
        <div>
          <button className="btn btn-secondary" onClick={handleGetGlobal} disabled={loading} style={{ marginBottom: 12 }}>{loading ? 'Loading...' : 'Get Global Config'}</button>
          {globalOutput && <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>{globalOutput}</div>}

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 400, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Restrict to Known Peer List</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <select value={String(restrict)} onChange={e => setRestrict(e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select>
            </div>
            <button className="btn btn-primary" onClick={handleSetRestrict} disabled={loading}>Apply</button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 400 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Send Reply to Unknown Peers</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <select value={String(sendReply)} onChange={e => setSendReply(e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select>
            </div>
            <button className="btn btn-primary" onClick={handleSetSendReply} disabled={loading}>Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}
