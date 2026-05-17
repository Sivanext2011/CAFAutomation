import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { traceListJobs, traceGetJob, traceCreateJob, traceDeleteJob, traceStartJob, traceStopJob, traceGetLogs, traceGetConfig, traceUpdateConfig } from '../api/client';

type Tab = 'jobs' | 'create' | 'config';

export function TracePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('jobs');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // List/manage
  const [traceId, setTraceId] = useState('');
  const [filterInterface, setFilterInterface] = useState('');
  const [filterCriteria, setFilterCriteria] = useState('');

  // Create
  const [iface, setIface] = useState('CHA-PER-ACT-INT');
  const [criteriaType, setCriteriaType] = useState('ContractId');
  const [criteriaValue, setCriteriaValue] = useState('');
  const [description, setDescription] = useState('');
  const [traceLevel, setTraceLevel] = useState('0');
  const [coverageType, setCoverageType] = useState('LOCAL');
  const [startTime, setStartTime] = useState('');
  const [stopTime, setStopTime] = useState('');

  // Config
  const [threshold, setThreshold] = useState('10');
  const [retention, setRetention] = useState('2880');
  const [logsSize, setLogsSize] = useState('100');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }
  async function run(fn: () => Promise<any>) {
    setLoading(true); setOutput('');
    try {
      const r = await fn();
      if (r.job?.status === 'failed') { setPopup({ type: 'error', message: 'Failed', jobId: r.job.id }); setOutput(r.job?.stderr || ''); }
      else { setOutput(r.job?.stdout || 'Done'); setPopup({ type: 'success', message: 'Success', jobId: r.job?.id }); }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function handleCreate() {
    if (!criteriaValue) { err('Criteria Value is required'); return; }
    const now = new Date().toISOString();
    const payload: any = {
      interface: iface,
      criteriaType,
      criteriaValue,
      traceLevel: parseInt(traceLevel),
      coverageType,
      traceJobDescription: description || `${criteriaType} trace job`,
      startTime: startTime || now,
      stopTime: stopTime || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await run(() => traceCreateJob(payload));
  }

  return (
    <div>
      <div className="page-header"><h1>Trace Management</h1></div>

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
        <button className={`btn ${tab === 'jobs' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('jobs'); setOutput(''); }}>Trace Jobs</button>
        <button className={`btn ${tab === 'create' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('create'); setOutput(''); }}>Create Job</button>
        <button className={`btn ${tab === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('config'); setOutput(''); }}>Config</button>
      </div>

      {/* Trace Jobs Tab */}
      {tab === 'jobs' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}><label>Interface</label><input value={filterInterface} onChange={e => setFilterInterface(e.target.value)} placeholder="CHA-PER-ACT-INT" style={{ width: 150 }} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Criteria Type</label><input value={filterCriteria} onChange={e => setFilterCriteria(e.target.value)} placeholder="ContractId" style={{ width: 120 }} /></div>
            <button className="btn btn-secondary" onClick={() => run(() => traceListJobs(filterInterface || undefined, filterCriteria || undefined))} disabled={loading}>List Jobs</button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 550 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Manage Trace Job</label>
            <div className="form-group" style={{ marginTop: 8 }}><label>Trace ID *</label><input value={traceId} onChange={e => setTraceId(e.target.value)} placeholder="c54fb2d4-2078-4a36-923d-a6295cf18da7" /></div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => { if (traceId) run(() => traceGetJob(traceId)); }} disabled={loading || !traceId}>Get</button>
              <button className="btn btn-primary" onClick={() => { if (traceId) run(() => traceStartJob(traceId)); }} disabled={loading || !traceId}>Start</button>
              <button className="btn btn-secondary" onClick={() => { if (traceId) run(() => traceStopJob(traceId)); }} disabled={loading || !traceId}>Stop</button>
              <button className="btn btn-secondary" onClick={() => { if (traceId) run(() => traceGetLogs(traceId)); }} disabled={loading || !traceId}>Logs</button>
              <button className="btn btn-danger" onClick={() => { if (traceId && confirm(`Delete trace ${traceId}?`)) run(() => traceDeleteJob(traceId)); }} disabled={loading || !traceId}>Delete</button>
            </div>
          </div>

          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}

      {/* Create Job Tab */}
      {tab === 'create' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 550 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Create Trace Job</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Interface</label><input value={iface} onChange={e => setIface(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Criteria Type</label>
                <select value={criteriaType} onChange={e => setCriteriaType(e.target.value)}>
                  <option>ContractId</option><option>MSISDN</option><option>IMSI</option><option>CustomerId</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}><label>Criteria Value *</label><input value={criteriaValue} onChange={e => setCriteriaValue(e.target.value)} placeholder="490A1CFB762F..." /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Coverage</label>
                <select value={coverageType} onChange={e => setCoverageType(e.target.value)}><option>LOCAL</option><option>GLOBAL</option></select>
              </div>
              <div className="form-group" style={{ margin: 0 }}><label>Trace Level</label><input value={traceLevel} onChange={e => setTraceLevel(e.target.value)} type="number" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Description</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="trace job for..." /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Start Time (optional)</label><input value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="now" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Stop Time (optional)</label><input value={stopTime} onChange={e => setStopTime(e.target.value)} placeholder="+30 days" /></div>
            </div>
            <button className="btn btn-primary" onClick={handleCreate} disabled={loading} style={{ marginTop: 12 }}>{loading ? 'Creating...' : 'Create Trace Job'}</button>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div>
          <button className="btn btn-secondary" onClick={() => run(traceGetConfig)} disabled={loading} style={{ marginBottom: 12 }}>Get Config</button>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 400 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Update Config</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Active Threshold</label><input value={threshold} onChange={e => setThreshold(e.target.value)} type="number" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Retention (min)</label><input value={retention} onChange={e => setRetention(e.target.value)} type="number" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Logs Size</label><input value={logsSize} onChange={e => setLogsSize(e.target.value)} type="number" /></div>
            </div>
            <button className="btn btn-primary" onClick={() => run(() => traceUpdateConfig({ activeTraceJobsThreshold: threshold, inactiveJobsRetentionPeriod: retention, traceLogsSize: logsSize }))} disabled={loading} style={{ marginTop: 8 }}>Update</button>
          </div>

          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}
    </div>
  );
}
