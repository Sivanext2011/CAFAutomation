import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  edmTransformList, edmTransformActive, edmTransformActivate, edmTransformDelete,
  edmDestList, edmDestGet, edmDestAdd, edmDestDelete,
  edmSnapshotDestList, edmSnapshotDestGet, edmSnapshotDestAdd, edmSnapshotDestDelete,
  edmAsnList, edmAsnDelete, edmAsnGetAll,
  edmAppConfigGet, edmAppConfigUpdate, edmSnapshotAppConfigGet, edmSnapshotAppConfigUpdate,
  edmDataFormatGet, edmDataFormatUpdate,
  edmStaleStatus, edmStaleRemove, edmStalePublish,
} from '../api/client';

type Tab = 'transform' | 'destination' | 'snapshot' | 'asn' | 'appconfig' | 'dataformat' | 'stale';

export function MediationPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('destination');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Common
  const [partition, setPartition] = useState('1');
  const [jsonInput, setJsonInput] = useState('');
  const [key, setKey] = useState('');

  // Transform
  const [srcName, setSrcName] = useState('');
  const [srcVer, setSrcVer] = useState('');
  const [tgtName, setTgtName] = useState('');
  const [tgtVer, setTgtVer] = useState('');
  const [srcApi, setSrcApi] = useState('v2');
  const [trackVer, setTrackVer] = useState('');

  // Stale
  const [customerId, setCustomerId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [opNum, setOpNum] = useState('');
  const [count, setCount] = useState('2000');
  const [force, setForce] = useState(false);

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  async function run(fn: () => Promise<any>) {
    setLoading(true); setOutput('');
    try {
      const r = await fn();
      if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Operation failed', jobId: r.job.id });
      else { setOutput(r.job?.stdout || 'Done'); if (r.job?.id) setPopup({ type: 'success', message: 'Success', jobId: r.job.id }); }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'destination', label: 'Pub Destination' },
    { key: 'snapshot', label: 'Snapshot Dest' },
    { key: 'transform', label: 'Transform' },
    { key: 'asn', label: 'ASN Schema' },
    { key: 'appconfig', label: 'App Config' },
    { key: 'dataformat', label: 'Data Format' },
    { key: 'stale', label: 'Stale Removal' },
  ];

  return (
    <div>
      <div className="page-header"><h1>Mediation (EDM)</h1></div>

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
        {tabs.map(t => <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => { setTab(t.key); setOutput(''); }}>{t.label}</button>)}
      </div>

      {/* Publishing Destination */}
      {tab === 'destination' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>Partition</label><input value={partition} onChange={e => setPartition(e.target.value)} style={{ width: 60 }} /></div>
            <button className="btn btn-secondary" onClick={() => run(() => edmDestList(partition))} disabled={loading}>List</button>
            <button className="btn btn-secondary" onClick={() => run(() => edmDestGet(partition))} disabled={loading}>Get Config</button>
            <button className="btn btn-danger" onClick={() => { if (confirm(`Delete config for partition ${partition}?`)) run(() => edmDestDelete(partition)); }} disabled={loading}>Delete</button>
          </div>
          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Config JSON (for add-config):</label>
          <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={8} style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11, marginBottom: 8 }} placeholder="Paste destination config JSON here..." />
          <button className="btn btn-primary" onClick={() => { try { run(() => edmDestAdd({ customerPartition: partition, payload: JSON.parse(jsonInput) })); } catch (e) { err(e); } }} disabled={loading || !jsonInput.trim()}>Upload Config</button>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Snapshot Destination */}
      {tab === 'snapshot' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>Partition</label><input value={partition} onChange={e => setPartition(e.target.value)} style={{ width: 60 }} /></div>
            <button className="btn btn-secondary" onClick={() => run(() => edmSnapshotDestList(partition))} disabled={loading}>List</button>
            <button className="btn btn-secondary" onClick={() => run(() => edmSnapshotDestGet(partition))} disabled={loading}>Get Config</button>
            <button className="btn btn-danger" onClick={() => { if (confirm(`Delete snapshot config for partition ${partition}?`)) run(() => edmSnapshotDestDelete(partition)); }} disabled={loading}>Delete</button>
          </div>
          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Config JSON (for add-config):</label>
          <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={8} style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11, marginBottom: 8 }} placeholder="Paste snapshot destination config JSON here..." />
          <button className="btn btn-primary" onClick={() => { try { run(() => edmSnapshotDestAdd({ customerPartition: partition, payload: JSON.parse(jsonInput) })); } catch (e) { err(e); } }} disabled={loading || !jsonInput.trim()}>Upload Config</button>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Transform Config */}
      {tab === 'transform' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={() => run(edmTransformList)} disabled={loading}>List All</button>
            <button className="btn btn-secondary" onClick={() => run(edmTransformActive)} disabled={loading}>Active Metadatas</button>
          </div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Activate / Delete Metadata</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Source Name</label><input value={srcName} onChange={e => setSrcName(e.target.value)} placeholder="ChargingNetworkFunctionEvent" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Source Version</label><input value={srcVer} onChange={e => setSrcVer(e.target.value)} placeholder="1" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Source API Version</label><input value={srcApi} onChange={e => setSrcApi(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Target Name</label><input value={tgtName} onChange={e => setTgtName(e.target.value)} placeholder="BssfChfCdrAsn1" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Target Version</label><input value={tgtVer} onChange={e => setTgtVer(e.target.value)} placeholder="3" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Tracking Version</label><input value={trackVer} onChange={e => setTrackVer(e.target.value)} placeholder="t1" /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => run(() => edmTransformActivate({ sourceName: srcName, sourceVersion: srcVer, targetName: tgtName, targetVersion: tgtVer, sourceApiVersion: srcApi, trackingVersion: trackVer }))} disabled={loading}>Activate</button>
              <button className="btn btn-danger" onClick={() => run(() => edmTransformDelete({ sourceName: srcName, sourceVersion: srcVer, targetName: tgtName, targetVersion: tgtVer, sourceApiVersion: srcApi }))} disabled={loading}>Delete</button>
            </div>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}

      {/* ASN Schema */}
      {tab === 'asn' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={() => run(edmAsnList)} disabled={loading}>List Schemas</button>
            <button className="btn btn-secondary" onClick={() => run(edmAsnGetAll)} disabled={loading}>Get All</button>
          </div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 500 }}>
            <label style={{ color: '#ef5350', fontSize: 12, fontWeight: 600 }}>Delete Schema</label>
            <div className="form-group" style={{ marginTop: 8 }}><label>Schema Name</label><input value={key} onChange={e => setKey(e.target.value)} placeholder="com.ericsson.bss.sys.event.schema.BssfChfCdrAsn1_1.0.0" /></div>
            <button className="btn btn-danger" onClick={() => { if (key && confirm(`Delete schema ${key}?`)) run(() => edmAsnDelete({ schemaName: key })); }} disabled={loading || !key}>Delete</button>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}

      {/* App Config */}
      {tab === 'appconfig' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ margin: 0 }}><label>Key (optional)</label><input value={key} onChange={e => setKey(e.target.value)} placeholder="eventPublishingEndPoint" style={{ width: 200 }} /></div>
            <button className="btn btn-secondary" onClick={() => run(() => edmAppConfigGet(key || undefined))} disabled={loading}>Get Pub Config</button>
            <button className="btn btn-secondary" onClick={() => run(() => edmSnapshotAppConfigGet(key || undefined))} disabled={loading}>Get Snapshot Config</button>
          </div>
          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Update JSON:</label>
          <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={4} style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11, marginBottom: 8 }} placeholder='{"key": "eventPublishingEndPoint", "value": "SFTP"}' />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => { try { run(() => edmAppConfigUpdate(JSON.parse(jsonInput))); } catch (e) { err(e); } }} disabled={loading || !jsonInput.trim()}>Update Pub Config</button>
            <button className="btn btn-primary" onClick={() => { try { run(() => edmSnapshotAppConfigUpdate(JSON.parse(jsonInput))); } catch (e) { err(e); } }} disabled={loading || !jsonInput.trim()}>Update Snapshot Config</button>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Data Format */}
      {tab === 'dataformat' && (
        <div>
          <button className="btn btn-secondary" onClick={() => run(edmDataFormatGet)} disabled={loading} style={{ marginBottom: 12 }}>Get Current Config</button>
          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Update JSON:</label>
          <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={8} style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 11, marginBottom: 8 }} placeholder="Paste data format config JSON..." />
          <button className="btn btn-primary" onClick={() => { try { run(() => edmDataFormatUpdate(JSON.parse(jsonInput))); } catch (e) { err(e); } }} disabled={loading || !jsonInput.trim()}>Update</button>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Stale Removal */}
      {tab === 'stale' && (
        <div>
          <button className="btn btn-secondary" onClick={() => run(edmStaleStatus)} disabled={loading} style={{ marginBottom: 12 }}>Check Status</button>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Publish / Remove Stale Entries</label>
            <p style={{ color: '#ff9800', fontSize: 11, margin: '4px 0 8px' }}>⚠ Run only during maintenance window</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Partition *</label><input value={partition} onChange={e => setPartition(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Customer ID</label><input value={customerId} onChange={e => setCustomerId(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Session ID</label><input value={sessionId} onChange={e => setSessionId(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Operation Number</label><input value={opNum} onChange={e => setOpNum(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Count</label><input value={count} onChange={e => setCount(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Force</label><select value={String(force)} onChange={e => setForce(e.target.value === 'true')}><option value="false">No</option><option value="true">Yes</option></select></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => run(() => edmStalePublish({ customerPartition: partition, customerId: customerId || undefined, sessionId: sessionId || undefined, operationNumber: opNum || undefined, count: count || undefined, force }))} disabled={loading}>Publish & Remove</button>
              <button className="btn btn-danger" onClick={() => run(() => edmStaleRemove({ customerPartition: partition, customerId: customerId || undefined, sessionId: sessionId || undefined, operationNumber: opNum || undefined, count: count || undefined, force }))} disabled={loading}>Remove Only</button>
            </div>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}
    </div>
  );
}
