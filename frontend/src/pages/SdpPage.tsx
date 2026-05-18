import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSdpRealms, updateSdpRealms, listSdpPeers, updateSdpPeers, checkSdpPeerStatus } from '../api/client';

interface PeerEntry { host: string; connectAddresses: string; }
interface IndexEntry { index: number; peers: PeerEntry[]; }
interface SdpEntry { realm: string; sdpIds: string; indexes: IndexEntry[]; }

const DEFAULT_APPS = '16777232,16777359,16777302,16777304,16777361';

export function SdpPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'integrate' | 'current' | 'status'>('integrate');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Integration
  const [entries, setEntries] = useState<SdpEntry[]>([{ realm: '', sdpIds: '', indexes: [{ index: 1, peers: [{ host: '', connectAddresses: '' }] }] }]);
  const [appGrps, setAppGrps] = useState('cha1');
  const [transport, setTransport] = useState('sctp');
  const [port, setPort] = useState('3868');
  const [strategy, setStrategy] = useState('round-robin');
  const [apps, setApps] = useState(DEFAULT_APPS);
  const [initiate, setInitiate] = useState(true);
  const [raiseAlarm, setRaiseAlarm] = useState(true);
  const [realmsJson, setRealmsJson] = useState('');
  const [peersJson, setPeersJson] = useState('');

  // Current config
  const [currentRealms, setCurrentRealms] = useState<any[]>([]);
  const [currentPeers, setCurrentPeers] = useState<any[]>([]);
  const [configModified, setConfigModified] = useState(false);
  const [filterAppGrp, setFilterAppGrp] = useState('');

  // Status
  const [statusOutput, setStatusOutput] = useState('');
  const [statusPort, setStatusPort] = useState('3868');
  const [statusTransport, setStatusTransport] = useState('sctp');

  // Entry management
  function addEntry() { setEntries([...entries, { realm: '', sdpIds: '', indexes: [{ index: 1, peers: [{ host: '', connectAddresses: '' }] }] }]); }
  function removeEntry(i: number) { setEntries(entries.filter((_, idx) => idx !== i)); }
  function updateEntryField(i: number, field: 'realm' | 'sdpIds', val: string) {
    const u = [...entries]; u[i] = { ...u[i], [field]: val }; setEntries(u);
  }
  function addIndex(ei: number) {
    const u = [...entries];
    const nextIdx = u[ei].indexes.length + 1;
    u[ei].indexes.push({ index: nextIdx, peers: [{ host: '', connectAddresses: '' }] });
    setEntries(u);
  }
  function removeIndex(ei: number, ii: number) {
    const u = [...entries]; u[ei].indexes = u[ei].indexes.filter((_, idx) => idx !== ii); setEntries(u);
  }
  function addPeer(ei: number, ii: number) {
    const u = [...entries]; u[ei].indexes[ii].peers.push({ host: '', connectAddresses: '' }); setEntries(u);
  }
  function removePeer(ei: number, ii: number, pi: number) {
    const u = [...entries]; u[ei].indexes[ii].peers = u[ei].indexes[ii].peers.filter((_, idx) => idx !== pi); setEntries(u);
  }
  function updatePeer(ei: number, ii: number, pi: number, field: 'host' | 'connectAddresses', val: string) {
    const u = [...entries]; u[ei].indexes[ii].peers[pi] = { ...u[ei].indexes[ii].peers[pi], [field]: val }; setEntries(u);
  }

  function buildUri(host: string) { return `aaa://${host}:${port};transport=${transport}`; }

  async function generateJson() {
    const valid = entries.filter(e => e.realm && e.indexes.some(idx => idx.peers.some(p => p.host)));
    if (!valid.length) { setPopup({ type: 'error', message: 'No valid entries' }); return; }

    setLoading(true);
    let existingRealms: any[] = [], existingPeers: any[] = [];
    try { const r = await listSdpRealms(); if (r.job?.stdout) try { existingRealms = JSON.parse(r.job.stdout); } catch {} } catch {}
    try { const r = await listSdpPeers(); if (r.job?.stdout) try { existingPeers = JSON.parse(r.job.stdout); } catch {} } catch {}
    if (!Array.isArray(existingRealms)) existingRealms = [];
    if (!Array.isArray(existingPeers)) existingPeers = [];

    const appList = apps.split(',').map(s => s.trim()).filter(Boolean);
    const appGrpList = appGrps.split(',').map(s => s.trim()).filter(Boolean);

    const newRealms: any[] = [];
    const newPeers: any[] = [];
    const seenPeers = new Set<string>();

    valid.forEach(e => {
      appGrpList.forEach(grp => {
        const addresses = e.indexes.map(idx => ({
          index: idx.index,
          peerAddresses: idx.peers.filter(p => p.host).map(p => buildUri(p.host)),
        })).filter(a => a.peerAddresses.length);

        newRealms.push({
          realm: e.realm,
          appGrp: grp,
          sdp_id: e.sdpIds ? e.sdpIds.split(',').map(s => s.trim()).filter(Boolean) : [e.realm],
          applications: appList,
          initiateConnection: initiate,
          strategy,
          addresses,
        });

        // Build peers
        e.indexes.forEach(idx => {
          idx.peers.filter(p => p.host).forEach(p => {
            const uri = buildUri(p.host);
            const key = `${uri}|${grp}`;
            if (!seenPeers.has(key)) {
              seenPeers.add(key);
              const peer: any = { peer: uri, appGrp: grp, initiateConnection: initiate, raiseAlarm };
              if (p.connectAddresses) peer.connectAddresses = p.connectAddresses.split(',').map(s => s.trim()).filter(Boolean);
              newPeers.push(peer);
            }
          });
        });
      });
    });

    // Merge
    const mergedRealms = [...existingRealms];
    newRealms.forEach(nr => {
      const idx = mergedRealms.findIndex(r => r.realm === nr.realm && r.appGrp === nr.appGrp);
      if (idx >= 0) mergedRealms[idx] = nr; else mergedRealms.push(nr);
    });
    const mergedPeers = [...existingPeers];
    newPeers.forEach(np => {
      const idx = mergedPeers.findIndex(p => p.peer.toLowerCase() === np.peer.toLowerCase() && p.appGrp === np.appGrp);
      if (idx >= 0) mergedPeers[idx] = np; else mergedPeers.push(np);
    });

    setRealmsJson(JSON.stringify(mergedRealms, null, 2));
    setPeersJson(JSON.stringify(mergedPeers, null, 2));
    setLoading(false);
  }

  async function handleDeploy() {
    if (!realmsJson.trim() && !peersJson.trim()) { setPopup({ type: 'error', message: 'Generate JSON first' }); return; }
    setLoading(true);
    try {
      let lastJobId: string | undefined;
      if (realmsJson.trim()) { const r = await updateSdpRealms(JSON.parse(realmsJson)); lastJobId = r.job?.id; if (r.job?.status === 'failed') { setPopup({ type: 'error', message: 'Realms failed', jobId: lastJobId }); setLoading(false); return; } }
      if (peersJson.trim()) { const r = await updateSdpPeers(JSON.parse(peersJson)); lastJobId = r.job?.id; if (r.job?.status === 'failed') { setPopup({ type: 'error', message: 'Peers failed', jobId: lastJobId }); setLoading(false); return; } }
      setPopup({ type: 'success', message: 'Deployed successfully', jobId: lastJobId });
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleDeleteAll() {
    if (!confirm('Delete ALL SDP realms and peers?')) return;
    setLoading(true);
    try { await updateSdpRealms([]); await updateSdpPeers([]); setPopup({ type: 'success', message: 'All deleted' }); } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  // Current Config
  async function handleListCurrent() {
    setLoading(true); setConfigModified(false);
    try {
      const rr = await listSdpRealms(); try { setCurrentRealms(JSON.parse(rr.job?.stdout || '[]')); } catch { setCurrentRealms([]); }
      const pr = await listSdpPeers(); try { setCurrentPeers(JSON.parse(pr.job?.stdout || '[]')); } catch { setCurrentPeers([]); }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  function removeCurrentRealm(i: number) { setCurrentRealms(currentRealms.filter((_, idx) => idx !== i)); setConfigModified(true); }
  function removeCurrentPeer(i: number) { setCurrentPeers(currentPeers.filter((_, idx) => idx !== i)); setConfigModified(true); }

  async function handleDeployCurrent() {
    if (!confirm('Deploy modified config?')) return;
    setLoading(true);
    try { await updateSdpRealms(currentRealms); await updateSdpPeers(currentPeers); setConfigModified(false); setPopup({ type: 'success', message: 'Deployed' }); } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  const allAppGroups = [...new Set([...currentRealms.map(r => r.appGrp), ...currentPeers.map(p => p.appGrp)])];
  const filteredRealms = filterAppGrp ? currentRealms.filter(r => r.appGrp === filterAppGrp) : currentRealms;
  const filteredPeers = filterAppGrp ? currentPeers.filter(p => p.appGrp === filterAppGrp) : currentPeers;
  function findPeer(uri: string, grp: string) { return currentPeers.find(p => p.peer.toLowerCase() === uri.toLowerCase() && p.appGrp === grp); }

  async function handleCheckStatus() {
    setLoading(true); setStatusOutput('');
    try {
      const r = await checkSdpPeerStatus({ port: statusPort, transport: statusTransport });
      if (r.job?.status === 'failed') { setPopup({ type: 'error', message: 'Failed', jobId: r.job.id }); setStatusOutput(r.job.stderr || ''); }
      else setStatusOutput(r.job?.stdout || 'No sessions');
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header"><h1>SDP Integration</h1></div>

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
        <button className={`btn ${tab === 'integrate' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('integrate')}>Integrate</button>
        <button className={`btn ${tab === 'current' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('current')}>Current Config</button>
        <button className={`btn ${tab === 'status' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('status')}>Link Status</button>
      </div>

      {/* Integrate Tab */}
      {tab === 'integrate' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Common Settings</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>App Groups (comma-sep for multiple)</label><input value={appGrps} onChange={e => setAppGrps(e.target.value)} placeholder="cha1, cha2" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Transport</label><select value={transport} onChange={e => setTransport(e.target.value)}><option value="sctp">SCTP</option><option value="tcp">TCP</option></select></div>
              <div className="form-group" style={{ margin: 0 }}><label>Port</label><input value={port} onChange={e => setPort(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Strategy</label><select value={strategy} onChange={e => setStrategy(e.target.value)}><option value="round-robin">round-robin</option><option value="failover">failover</option><option value="failover-failback">failover-failback</option></select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Applications</label><input value={apps} onChange={e => setApps(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Initiate Connection</label><select value={String(initiate)} onChange={e => setInitiate(e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
              <div className="form-group" style={{ margin: 0 }}><label>Raise Alarm</label><select value={String(raiseAlarm)} onChange={e => setRaiseAlarm(e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
            </div>
          </div>

          {/* SDP Entries */}
          {entries.map((entry, ei) => (
            <div key={ei} style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>SDP #{ei + 1}</label>
                {entries.length > 1 && <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => removeEntry(ei)}>Remove SDP</button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div className="form-group" style={{ margin: 0 }}><label>Realm *</label><input value={entry.realm} onChange={e => updateEntryField(ei, 'realm', e.target.value)} placeholder="sdp01.realm.com" /></div>
                <div className="form-group" style={{ margin: 0 }}><label>SDP IDs (comma-sep)</label><input value={entry.sdpIds} onChange={e => updateEntryField(ei, 'sdpIds', e.target.value)} placeholder="sdp01.cs." /></div>
              </div>

              {/* Indexes */}
              {entry.indexes.map((idx, ii) => (
                <div key={ii} style={{ padding: 8, border: '1px dashed #1a4080', borderRadius: 4, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ color: '#90a4ae', fontSize: 11, fontWeight: 600 }}>Index {idx.index} {idx.index === 1 ? '(Primary)' : '(Failover)'}</label>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-secondary" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => addPeer(ei, ii)}>+ Peer</button>
                      {entry.indexes.length > 1 && <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => removeIndex(ei, ii)}>Remove Idx</button>}
                    </div>
                  </div>
                  {idx.peers.map((p, pi) => (
                    <div key={pi} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr auto', gap: 6, marginBottom: 4 }}>
                      <input value={p.host} onChange={e => updatePeer(ei, ii, pi, 'host', e.target.value)} placeholder="peer-host.domain.com" style={{ fontSize: 11 }} />
                      <input value={p.connectAddresses} onChange={e => updatePeer(ei, ii, pi, 'connectAddresses', e.target.value)} placeholder="10.x.x.1, 10.x.x.2 (connect IPs)" style={{ fontSize: 11 }} />
                      {idx.peers.length > 1 && <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => removePeer(ei, ii, pi)}>✕</button>}
                    </div>
                  ))}
                </div>
              ))}
              <button className="btn btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => addIndex(ei)}>+ Add Index (Failover)</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={addEntry}>+ Add SDP</button>
            <button className="btn btn-secondary" onClick={generateJson} disabled={loading}>{loading ? 'Fetching...' : 'Generate JSON (merge)'}</button>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={loading || (!realmsJson && !peersJson)}>Deploy All</button>
            <button className="btn btn-danger" onClick={handleDeleteAll} disabled={loading}>Delete All</button>
          </div>

          {realmsJson && (<div style={{ marginBottom: 12 }}><label style={{ color: '#4fc3f7', fontSize: 12 }}>Realms JSON:</label><textarea value={realmsJson} onChange={e => setRealmsJson(e.target.value)} style={{ width: '100%', minHeight: 140, maxHeight: 300, background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11 }} /></div>)}
          {peersJson && (<div><label style={{ color: '#4fc3f7', fontSize: 12 }}>Peers JSON:</label><textarea value={peersJson} onChange={e => setPeersJson(e.target.value)} style={{ width: '100%', minHeight: 140, maxHeight: 300, background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11 }} /></div>)}
        </div>
      )}

      {/* Current Config Tab */}
      {tab === 'current' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={handleListCurrent} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
            {configModified && <button className="btn btn-primary" onClick={handleDeployCurrent} disabled={loading}>Deploy Changes</button>}
            {allAppGroups.length > 1 && (
              <div className="form-group" style={{ margin: 0 }}><label style={{ fontSize: 10 }}>Filter</label>
                <select value={filterAppGrp} onChange={e => setFilterAppGrp(e.target.value)} style={{ fontSize: 11 }}>
                  <option value="">All ({currentRealms.length})</option>
                  {allAppGroups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            )}
          </div>
          {configModified && <div className="alert alert-error" style={{ marginBottom: 12 }}>⚠ Modified. Deploy to apply.</div>}

          {filteredRealms.length > 0 ? (
            <div style={{ overflowX: 'auto', marginBottom: 16 }}>
              <table className="data-table">
                <thead><tr><th>Realm</th><th>App Grp</th><th>SDP IDs</th><th>Strategy</th><th>Idx 1 Peers</th><th>Idx 2 Peers</th><th>Connect IPs</th><th></th></tr></thead>
                <tbody>
                  {filteredRealms.map((r, i) => {
                    const idx1 = (r.addresses || []).find((a: any) => a.index === 1);
                    const idx2 = (r.addresses || []).find((a: any) => a.index === 2);
                    const stripUri = (u: string) => u.replace(/aaa:\/\//, '').replace(/;transport=.*/, '');
                    const idx1Peers = (idx1?.peerAddresses || []).map(stripUri);
                    const idx2Peers = (idx2?.peerAddresses || []).map(stripUri);
                    const connectIps = (idx1?.peerAddresses || []).map((uri: string) => {
                      const p = findPeer(uri, r.appGrp);
                      return p?.connectAddresses?.join(', ') || '';
                    }).filter(Boolean);
                    return (
                      <tr key={i}>
                        <td style={{ fontSize: 11 }}>{r.realm}</td>
                        <td>{r.appGrp}</td>
                        <td style={{ fontSize: 10 }}>{(r.sdp_id || []).join(', ')}</td>
                        <td style={{ fontSize: 10 }}>{r.strategy}</td>
                        <td style={{ fontSize: 10 }}>{idx1Peers.join(', ')}</td>
                        <td style={{ fontSize: 10 }}>{idx2Peers.length ? idx2Peers.join(', ') : '-'}</td>
                        <td style={{ fontSize: 10 }}>{connectIps.length ? connectIps.join(' | ') : '-'}</td>
                        <td><button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => removeCurrentRealm(currentRealms.indexOf(r))}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="console" style={{ marginBottom: 12 }}>Click Refresh</div>
          )}

          {filteredPeers.length > 0 && (
            <>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Peers ({filteredPeers.length})</label>
              <div style={{ overflowX: 'auto', marginTop: 4 }}>
                <table className="data-table">
                  <thead><tr><th>Peer</th><th>App Grp</th><th>Initiate</th><th>Alarm</th><th>Connect Addresses</th><th></th></tr></thead>
                  <tbody>
                    {filteredPeers.map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 10 }}>{p.peer.replace(/aaa:\/\//, '').replace(/;transport=.*/, '')}</td>
                        <td>{p.appGrp}</td>
                        <td>{p.initiateConnection ? 'Y' : 'N'}</td>
                        <td>{p.raiseAlarm ? 'Y' : 'N'}</td>
                        <td style={{ fontSize: 10 }}>{(p.connectAddresses || []).join(', ') || '-'}</td>
                        <td><button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => removeCurrentPeer(currentPeers.indexOf(p))}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Link Status Tab */}
      {tab === 'status' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>Transport</label><select value={statusTransport} onChange={e => setStatusTransport(e.target.value)}><option value="sctp">SCTP</option><option value="tcp">TCP</option></select></div>
            <div className="form-group" style={{ margin: 0 }}><label>Port</label><input value={statusPort} onChange={e => setStatusPort(e.target.value)} style={{ width: 80 }} /></div>
            <button className="btn btn-primary" onClick={handleCheckStatus} disabled={loading}>{loading ? 'Checking...' : 'Check Status'}</button>
          </div>
          {statusOutput && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{statusOutput}</div>}
        </div>
      )}
    </div>
  );
}
