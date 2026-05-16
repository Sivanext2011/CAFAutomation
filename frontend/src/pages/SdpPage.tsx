import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSdpRealms, updateSdpRealms, listSdpPeers, updateSdpPeers, checkSdpPeerStatus } from '../api/client';

interface SdpEntry {
  realm: string;
  sdpIds: string;
  peerHosts: string;
}

const DEFAULT_APPS = '16777232,16777302,16777304';

export function SdpPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'integrate' | 'current' | 'status'>('integrate');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Bulk integration
  const [entries, setEntries] = useState<SdpEntry[]>([{ realm: '', sdpIds: '', peerHosts: '' }]);
  const [appGrp, setAppGrp] = useState('cha1');
  const [transport, setTransport] = useState('sctp');
  const [port, setPort] = useState('3868');
  const [strategy, setStrategy] = useState('round-robin');
  const [apps, setApps] = useState(DEFAULT_APPS);
  const [initiate, setInitiate] = useState(true);
  const [raiseAlarm, setRaiseAlarm] = useState(true);
  const [generatedJson, setGeneratedJson] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [inputMode, setInputMode] = useState<'form' | 'bulk'>('form');

  // Current config
  const [realmsOutput, setRealmsOutput] = useState('');

  // Status
  const [statusOutput, setStatusOutput] = useState('');
  const [statusPort, setStatusPort] = useState('3868');
  const [statusTransport, setStatusTransport] = useState('sctp');

  function addEntry() {
    setEntries([...entries, { realm: '', sdpIds: '', peerHosts: '' }]);
  }

  function removeEntry(i: number) {
    setEntries(entries.filter((_, idx) => idx !== i));
  }

  function updateEntry(i: number, field: keyof SdpEntry, value: string) {
    const updated = [...entries];
    updated[i] = { ...updated[i], [field]: value };
    setEntries(updated);
  }

  function parseBulkText(): SdpEntry[] {
    // Format: realm | sdp_ids | peer_hosts (one SDP per line)
    return bulkText.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      return {
        realm: parts[0] || '',
        sdpIds: parts[1] || '',
        peerHosts: parts[2] || '',
      };
    }).filter(e => e.realm);
  }

  function generateJson() {
    const source = inputMode === 'form' ? entries : parseBulkText();
    const valid = source.filter(e => e.realm && e.peerHosts);
    if (valid.length === 0) {
      setPopup({ type: 'error', message: 'No valid entries. Each needs at least a realm and peer hosts.' });
      return;
    }

    const appList = apps.split(',').map(s => s.trim()).filter(Boolean);
    const realms = valid.map(e => {
      const hosts = e.peerHosts.split(',').map(h => h.trim()).filter(Boolean);
      const peerAddresses = hosts.map(h => `aaa://${h}:${port};transport=${transport}`);
      return {
        realm: e.realm.trim(),
        appGrp,
        sdp_id: e.sdpIds ? e.sdpIds.split(',').map(s => s.trim()).filter(Boolean) : [e.realm.trim()],
        applications: appList,
        strategy,
        addresses: [{ index: 1, peerAddresses }],
      };
    });

    setGeneratedJson(JSON.stringify(realms, null, 2));
  }

  async function handleDeploy() {
    if (!generatedJson.trim()) { setPopup({ type: 'error', message: 'Generate JSON first' }); return; }
    setLoading(true);
    try {
      const payload = JSON.parse(generatedJson);
      const result = await updateSdpRealms(payload);
      const job = result.job;
      if (job?.status === 'failed') {
        setPopup({ type: 'error', message: `Deployment failed (${payload.length} realms)`, jobId: job.id });
      } else {
        setPopup({ type: 'success', message: `${payload.length} realm(s) deployed successfully`, jobId: job?.id });
      }

      // Also deploy peers if initiate is set
      if (initiate) {
        const allHosts: string[] = [];
        const source = inputMode === 'form' ? entries : parseBulkText();
        source.filter(e => e.peerHosts).forEach(e => {
          e.peerHosts.split(',').map(h => h.trim()).filter(Boolean).forEach(h => {
            if (!allHosts.includes(h)) allHosts.push(h);
          });
        });
        if (allHosts.length > 0) {
          const peers = allHosts.map(h => ({
            peer: `aaa://${h}:${port};transport=${transport}`,
            appGrp,
            initiateConnection: initiate,
            raiseAlarm,
          }));
          await updateSdpPeers(peers);
        }
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleDeleteAll() {
    if (!confirm('Delete ALL SDP realms and peers? This removes all external rating routing.')) return;
    setLoading(true);
    try {
      await updateSdpRealms([]);
      await updateSdpPeers([]);
      setPopup({ type: 'success', message: 'All SDP realms and peers deleted' });
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleListCurrent() {
    setLoading(true);
    try {
      const result = await listSdpRealms();
      setRealmsOutput(result.job?.stdout || 'No realms configured');
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleCheckStatus() {
    setLoading(true);
    setStatusOutput('');
    try {
      const result = await checkSdpPeerStatus({ port: statusPort, transport: statusTransport });
      const job = result.job;
      if (job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to check peer status', jobId: job.id });
        setStatusOutput(job.stderr || 'Check failed');
      } else {
        setStatusOutput(job?.stdout || 'No active sessions found');
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1>SDP Integration</h1>
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
        <button className={`btn ${tab === 'integrate' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('integrate')}>Integrate</button>
        <button className={`btn ${tab === 'current' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('current')}>Current Config</button>
        <button className={`btn ${tab === 'status' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('status')}>Link Status</button>
      </div>

      {/* Integrate Tab */}
      {tab === 'integrate' && (
        <div>
          {/* Common Settings */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Common Settings (applies to all SDPs)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>App Group</label>
                <input value={appGrp} onChange={e => setAppGrp(e.target.value)} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Transport</label>
                <select value={transport} onChange={e => setTransport(e.target.value)}>
                  <option value="sctp">SCTP</option>
                  <option value="tcp">TCP</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Port</label>
                <input value={port} onChange={e => setPort(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Strategy</label>
                <select value={strategy} onChange={e => setStrategy(e.target.value)}>
                  <option value="round-robin">round-robin</option>
                  <option value="failover">failover</option>
                  <option value="failover-failback">failover-failback</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Applications</label>
                <input value={apps} onChange={e => setApps(e.target.value)} placeholder="16777232,16777302,16777304" />
              </div>
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
          </div>

          {/* Input Mode Toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn ${inputMode === 'form' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('form')}>
              Row-by-Row
            </button>
            <button className={`btn ${inputMode === 'bulk' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('bulk')}>
              Bulk Paste
            </button>
          </div>

          {/* Row-by-Row Input */}
          {inputMode === 'form' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>SDP Entries ({entries.length})</label>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={addEntry}>+ Add Row</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#90a4ae', fontSize: 11 }}>
                    <th style={{ textAlign: 'left', padding: '4px 4px', width: '25%' }}>SDP Realm</th>
                    <th style={{ textAlign: 'left', padding: '4px 4px', width: '25%' }}>SDP IDs (comma-sep)</th>
                    <th style={{ textAlign: 'left', padding: '4px 4px', width: '40%' }}>Peer Hosts (comma-sep)</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={i}>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.realm} onChange={e => updateEntry(i, 'realm', e.target.value)} placeholder="sdp01.realm.com" style={{ width: '100%', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.sdpIds} onChange={e => updateEntry(i, 'sdpIds', e.target.value)} placeholder="sdp01.cs., 10.x.x.x" style={{ width: '100%', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.peerHosts} onChange={e => updateEntry(i, 'peerHosts', e.target.value)} placeholder="host1, host2, 10.x.x.x" style={{ width: '100%', fontSize: 12 }} />
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

          {/* Bulk Paste Input */}
          {inputMode === 'bulk' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Bulk Paste (one SDP per line)</label>
              <p style={{ color: '#90a4ae', fontSize: 11, margin: '4px 0 8px' }}>
                Format: <code style={{ color: '#4fc3f7' }}>realm | sdp_ids | peer_hosts</code> — separate multiple values with commas
              </p>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={10}
                style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12 }}
                placeholder={`sdp01.realm.com | sdp01.cs., 10.216.230.37 | peer1.example.com, peer2.example.com\nsdp02.realm.com | sdp02.cs. | peer3.example.com, peer4.example.com\nsdp03.realm.com | sdp03.cs., 10.216.230.40 | 10.1.1.1, 10.1.1.2`}
              />
              <p style={{ color: '#90a4ae', fontSize: 11, marginTop: 4 }}>
                {parseBulkText().length} SDP(s) detected
              </p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={generateJson} disabled={loading}>
              Generate JSON
            </button>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={loading || !generatedJson.trim()}>
              {loading ? 'Deploying...' : 'Deploy All'}
            </button>
            <button className="btn btn-danger" onClick={handleDeleteAll} disabled={loading}>
              Delete All SDPs
            </button>
          </div>

          {/* Generated JSON Preview */}
          {generatedJson && (
            <>
              <label style={{ color: '#90a4ae', fontSize: 12 }}>Generated JSON (editable before deploy):</label>
              <textarea
                value={generatedJson}
                onChange={e => setGeneratedJson(e.target.value)}
                style={{ width: '100%', minHeight: 150, maxHeight: 300, background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11 }}
              />
            </>
          )}
        </div>
      )}

      {/* Current Config Tab */}
      {tab === 'current' && (
        <div>
          <button className="btn btn-secondary" onClick={handleListCurrent} disabled={loading} style={{ marginBottom: 12 }}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <div className="console" style={{ whiteSpace: 'pre-wrap', minHeight: 100 }}>
            {realmsOutput || 'Click Refresh to load current SDP realms'}
          </div>
        </div>
      )}

      {/* Link Status Tab */}
      {tab === 'status' && (
        <div>
          <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 12 }}>
            Check Diameter sessions on the CHA DLB pod to verify SDP connectivity.
          </p>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Transport</label>
              <select value={statusTransport} onChange={e => setStatusTransport(e.target.value)}>
                <option value="sctp">SCTP</option>
                <option value="tcp">TCP</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Port</label>
              <input value={statusPort} onChange={e => setStatusPort(e.target.value)} style={{ width: 80 }} />
            </div>
            <button className="btn btn-primary" onClick={handleCheckStatus} disabled={loading}>
              {loading ? 'Checking...' : 'Check Status'}
            </button>
          </div>
          {statusOutput && (
            <>
              <label style={{ color: '#90a4ae', fontSize: 12 }}>Diameter Sessions:</label>
              <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{statusOutput}</div>
              <p style={{ color: '#90a4ae', fontSize: 11, marginTop: 8 }}>
                ESTAB = healthy connection. If empty, check routing/firewall between CAF and SDP.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
