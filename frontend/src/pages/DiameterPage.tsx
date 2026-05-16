import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDiameterProxies, getDiameterPeers, diameterBulkAdd, removeDiameterProxy, removeDiameterPeer, setRestrictPeerList } from '../api/client';

interface DiameterEntry {
  interface: string;
  host: string;
  realm: string;
}

const INTERFACES = ['Gy', 'Ro', 'SCAPv2', 'Sy', 'ESy', 'Other'];

export function DiameterPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'integrate' | 'current' | 'settings'>('integrate');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Common settings
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

  // Current
  const [proxiesOutput, setProxiesOutput] = useState('');
  const [peersOutput, setPeersOutput] = useState('');

  // Settings
  const [restrict, setRestrict] = useState(true);

  function addEntry() {
    setEntries([...entries, { interface: 'Gy', host: '', realm: '' }]);
  }

  function removeEntry(i: number) {
    setEntries(entries.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof DiameterEntry, value: string) {
    const updated = [...entries];
    updated[i] = { ...updated[i], [field]: value };
    setEntries(updated);
  }

  function parseBulkText(): DiameterEntry[] {
    // Format: interface | host | realm
    return bulkText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      return { interface: parts[0] || 'Gy', host: parts[1] || '', realm: parts[2] || '' };
    }).filter(e => e.host);
  }

  function getEntries(): DiameterEntry[] {
    return inputMode === 'form' ? entries.filter(e => e.host) : parseBulkText();
  }

  async function handleDeploy() {
    const valid = getEntries();
    if (valid.length === 0) {
      setPopup({ type: 'error', message: 'No valid entries. Each needs at least a host.' });
      return;
    }

    setLoading(true);
    try {
      const proxies = valid.filter(e => e.realm).map(e => ({
        appGrp, host: e.host, realm: e.realm, port, scheme, transport,
      }));

      const peers = addPeers ? valid.map(e => ({
        appGrp, host: e.host, port, scheme, transport,
        initiateConnection: initiate, raiseAlarm,
      })) : [];

      // Deduplicate peers by host
      const uniquePeers = peers.filter((p, i, arr) => arr.findIndex(x => x.host === p.host) === i);

      const result = await diameterBulkAdd({ proxies, peers: uniquePeers });

      const failedCount = (result.results?.proxies || []).filter((r: any) => r.status === 'failed').length
        + (result.results?.peers || []).filter((r: any) => r.status === 'failed').length;
      const totalCount = proxies.length + uniquePeers.length;

      if (failedCount > 0) {
        setPopup({ type: 'error', message: `${failedCount}/${totalCount} operations failed. Check Jobs for details.` });
      } else {
        setPopup({ type: 'success', message: `Deployed ${proxies.length} proxy(s) and ${uniquePeers.length} peer(s)` });
      }
    } catch (e: any) {
      setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) });
    }
    setLoading(false);
  }

  async function handleListCurrent() {
    setLoading(true);
    try {
      const pxResult = await getDiameterProxies(appGrp);
      setProxiesOutput(pxResult.job?.stdout || 'No proxies');
      const prResult = await getDiameterPeers(appGrp);
      setPeersOutput(prResult.job?.stdout || 'No peers');
    } catch (e: any) {
      setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) });
    }
    setLoading(false);
  }

  async function handleRemoveProxy(host: string, realm: string) {
    if (!confirm(`Remove proxy ${host} (${realm})?`)) return;
    setLoading(true);
    try {
      const result = await removeDiameterProxy({ appGrp, host, realm });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Remove failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `Proxy ${host} removed`, jobId: result.job?.id });
        handleListCurrent();
      }
    } catch (e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }
    setLoading(false);
  }

  async function handleRemovePeer(host: string) {
    if (!confirm(`Remove peer ${host}?`)) return;
    setLoading(true);
    try {
      const result = await removeDiameterPeer({ appGrp, host });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Remove failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `Peer ${host} removed`, jobId: result.job?.id });
        handleListCurrent();
      }
    } catch (e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }
    setLoading(false);
  }

  async function handleSetRestrict() {
    setLoading(true);
    try {
      const result = await setRestrictPeerList({ restrict });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to set restriction', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `Restrict to peer list: ${restrict}`, jobId: result.job?.id });
      }
    } catch (e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Diameter Integration</h1>
        <span style={{ color: '#90a4ae', fontSize: 12 }}>Gy · Ro · SCAPv2 · Sy · ESy</span>
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
        <button className={`btn ${tab === 'integrate' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('integrate')}>Add Peers</button>
        <button className={`btn ${tab === 'current' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('current')}>Current Config</button>
        <button className={`btn ${tab === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('settings')}>Settings</button>
      </div>

      {/* Add Peers Tab */}
      {tab === 'integrate' && (
        <div>
          {/* Common Settings */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Common Settings</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>App Group</label>
                <input value={appGrp} onChange={e => setAppGrp(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Transport</label>
                <select value={transport} onChange={e => setTransport(e.target.value)}>
                  <option value="tcp">TCP</option>
                  <option value="sctp">SCTP</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Port</label>
                <input value={port} onChange={e => setPort(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Scheme</label>
                <select value={scheme} onChange={e => setScheme(e.target.value)}>
                  <option value="aaa">aaa (unsecure)</option>
                  <option value="aaas">aaas (secure)</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Also add as Peer</label>
                <select value={String(addPeers)} onChange={e => setAddPeers(e.target.value === 'true')}>
                  <option value="true">Yes</option>
                  <option value="false">No (proxy only)</option>
                </select>
              </div>
            </div>
            {addPeers && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Initiate Connection</label>
                  <select value={String(initiate)} onChange={e => setInitiate(e.target.value === 'true')}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Raise Alarm</label>
                  <select value={String(raiseAlarm)} onChange={e => setRaiseAlarm(e.target.value === 'true')}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Input Mode */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn ${inputMode === 'form' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('form')}>Row-by-Row</button>
            <button className={`btn ${inputMode === 'bulk' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('bulk')}>Bulk Paste</button>
          </div>

          {/* Row-by-Row */}
          {inputMode === 'form' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Diameter Entries ({entries.length})</label>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={addEntry}>+ Add Row</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#90a4ae', fontSize: 11 }}>
                    <th style={{ textAlign: 'left', padding: '4px', width: '15%' }}>Interface</th>
                    <th style={{ textAlign: 'left', padding: '4px', width: '35%' }}>Host / IP *</th>
                    <th style={{ textAlign: 'left', padding: '4px', width: '40%' }}>Realm</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={i}>
                      <td style={{ padding: '2px 4px' }}>
                        <select value={entry.interface} onChange={e => updateEntry(i, 'interface', e.target.value)} style={{ width: '100%', fontSize: 12 }}>
                          {INTERFACES.map(iface => <option key={iface} value={iface}>{iface}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.host} onChange={e => updateEntry(i, 'host', e.target.value)} placeholder="pgw01.example.com" style={{ width: '100%', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.realm} onChange={e => updateEntry(i, 'realm', e.target.value)} placeholder="epc.mnc001.mcc240.3gppnetwork.org" style={{ width: '100%', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                        {entries.length > 1 && (
                          <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => removeEntry(i)}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bulk Paste */}
          {inputMode === 'bulk' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Bulk Paste (one per line)</label>
              <p style={{ color: '#90a4ae', fontSize: 11, margin: '4px 0 8px' }}>
                Format: <code style={{ color: '#4fc3f7' }}>interface | host | realm</code>
              </p>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={8}
                style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12 }}
                placeholder={`Gy | pgw01.example.com | epc.mnc001.mcc240.3gppnetwork.org\nGy | pgw02.example.com | epc.mnc001.mcc240.3gppnetwork.org\nRo | mtas01.example.com | ims.example.com\nSy | pcrf01.example.com | pcrf.example.com\nESy | sapc01.example.com | sapc.example.com`}
              />
              <p style={{ color: '#90a4ae', fontSize: 11, marginTop: 4 }}>
                {parseBulkText().length} entry(s) detected
              </p>
            </div>
          )}

          {/* Deploy */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={loading}>
              {loading ? 'Deploying...' : 'Deploy All'}
            </button>
            <span style={{ color: '#90a4ae', fontSize: 11, alignSelf: 'center' }}>
              {getEntries().length} entry(s) · {getEntries().filter(e => e.realm).length} proxy(s) · {addPeers ? new Set(getEntries().map(e => e.host)).size : 0} peer(s)
            </span>
          </div>
        </div>
      )}

      {/* Current Config Tab */}
      {tab === 'current' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>App Group</label>
              <input value={appGrp} onChange={e => setAppGrp(e.target.value)} style={{ width: 100 }} />
            </div>
            <button className="btn btn-secondary" onClick={handleListCurrent} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Proxies:</label>
          <div className="console" style={{ whiteSpace: 'pre-wrap', minHeight: 60, marginBottom: 12 }}>
            {proxiesOutput || 'Click Refresh'}
          </div>

          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Peers:</label>
          <div className="console" style={{ whiteSpace: 'pre-wrap', minHeight: 60 }}>
            {peersOutput || 'Click Refresh'}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 400 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Security Settings</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Restrict to Known Peer List</label>
              <select value={String(restrict)} onChange={e => setRestrict(e.target.value === 'true')}>
                <option value="true">Yes — only accept configured peers</option>
                <option value="false">No — accept any peer</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleSetRestrict} disabled={loading}>
              {loading ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
