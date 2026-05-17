import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAllAlarms, getAlarm, clearAlarm } from '../api/client';

const SEVERITY_COLORS: Record<string, string> = {
  Critical: '#d32f2f',
  Major: '#ef5350',
  Minor: '#ff9800',
  Warning: '#ffc107',
  Indeterminate: '#90a4ae',
};

function getSeverityColor(severity: string): string {
  return SEVERITY_COLORS[severity] || '#90a4ae';
}

export function AlarmsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [alarms, setAlarms] = useState<any[]>([]);
  const [rawOutput, setRawOutput] = useState('');
  const [selectedAlarm, setSelectedAlarm] = useState<any>(null);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);
  const [outputFormat, setOutputFormat] = useState('');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  async function handleListAlarms() {
    setLoading(true); setAlarms([]); setRawOutput(''); setSelectedAlarm(null);
    try {
      const result = await listAllAlarms(outputFormat || undefined);
      const stdout = result.job?.stdout || '';
      setRawOutput(stdout);
      try {
        const parsed = JSON.parse(stdout);
        setAlarms(Array.isArray(parsed) ? parsed : []);
      } catch {
        setAlarms([]);
      }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function handleGetAlarm(alarm: any) {
    setLoading(true);
    try {
      const result = await getAlarm({
        alarmName: alarm.alarmName,
        serviceName: alarm.serviceName,
        faultyResource: alarm.faultyResource || undefined,
        outputformat: 'FullAlarm',
      });
      const stdout = result.job?.stdout || '';
      try { setSelectedAlarm(JSON.parse(stdout)); } catch { setSelectedAlarm({ raw: stdout }); }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function handleClearAlarm(alarm: any) {
    if (!confirm(`Clear alarm "${alarm.alarmName}" from ${alarm.serviceName}?`)) return;
    setLoading(true);
    try {
      const result = await clearAlarm({
        alarmName: alarm.alarmName,
        serviceName: alarm.serviceName,
        faultyResource: alarm.faultyResource || undefined,
      });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Clear failed: ' + (result.job?.stderr || ''), jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `Alarm "${alarm.alarmName}" cleared`, jobId: result.job?.id });
        handleListAlarms();
      }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  const summary = alarms.reduce((acc: Record<string, number>, a) => {
    const s = a.severity || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header"><h1>Alarms</h1></div>

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

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Format</label>
          <select value={outputFormat} onChange={e => setOutputFormat(e.target.value)} style={{ width: 140 }}>
            <option value="">Default</option>
            <option value="FullAlarmList">Full</option>
            <option value="ShortAlarmList">Short</option>
            <option value="SeveritySummary">Summary</option>
          </select>
        </div>
        <button className="btn btn-primary" onClick={handleListAlarms} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Alarms'}
        </button>
      </div>

      {/* Severity Summary */}
      {alarms.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {Object.entries(summary).map(([sev, count]) => (
            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: getSeverityColor(sev), display: 'inline-block' }}></span>
              <span style={{ color: '#e0e0e0', fontSize: 12 }}>{sev}: <strong>{count as number}</strong></span>
            </div>
          ))}
          <span style={{ color: '#90a4ae', fontSize: 12, marginLeft: 'auto' }}>Total: {alarms.length}</span>
        </div>
      )}

      {/* Alarm List */}
      {alarms.length > 0 ? (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>Severity</th>
              <th style={{ width: '22%' }}>Alarm Name</th>
              <th style={{ width: '30%' }}>Description</th>
              <th style={{ width: '18%' }}>Service</th>
              <th style={{ width: '12%' }}>Time</th>
              <th style={{ width: '10%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {alarms.map((alarm, i) => (
              <tr key={i} style={{ borderLeft: `4px solid ${getSeverityColor(alarm.severity)}` }}>
                <td>
                  <span style={{ color: getSeverityColor(alarm.severity), fontWeight: 600, fontSize: 11 }}>
                    {alarm.severity || 'Unknown'}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{alarm.alarmName}</td>
                <td style={{ fontSize: 11, color: '#b0bec5' }}>{alarm.description}</td>
                <td style={{ fontSize: 11 }}>{alarm.serviceName}</td>
                <td style={{ fontSize: 10, color: '#90a4ae' }}>{alarm.eventTime}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => handleGetAlarm(alarm)}>Details</button>
                    <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => handleClearAlarm(alarm)}>Clear</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : rawOutput ? (
        <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{rawOutput}</div>
      ) : (
        <p style={{ color: '#90a4ae', fontSize: 12 }}>Click "Refresh Alarms" to load active alarms.</p>
      )}

      {/* Alarm Detail Panel */}
      {selectedAlarm && (
        <div style={{ marginTop: 16, padding: 16, border: '1px solid #0f3460', borderRadius: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: '#4fc3f7', margin: 0 }}>Alarm Details</h3>
            <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => setSelectedAlarm(null)}>Close</button>
          </div>
          {selectedAlarm.raw ? (
            <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{selectedAlarm.raw}</div>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(selectedAlarm).filter(([k]) => k !== 'history').map(([key, val]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #0f3460' }}>
                      <td style={{ padding: '6px 8px', color: '#90a4ae', fontSize: 12, width: '30%' }}>{key}</td>
                      <td style={{ padding: '6px 8px', color: '#e0e0e0', fontSize: 12 }}>
                        {key === 'severity' ? (
                          <span style={{ color: getSeverityColor(val as string), fontWeight: 600 }}>{val as string}</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedAlarm.history && selectedAlarm.history.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ color: '#90a4ae', fontSize: 12 }}>History:</label>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                    <thead>
                      <tr style={{ color: '#90a4ae', fontSize: 11 }}>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Time</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Severity</th>
                        <th style={{ textAlign: 'left', padding: '4px 8px' }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAlarm.history.map((h: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #0f3460' }}>
                          <td style={{ padding: '4px 8px', fontSize: 11, color: '#90a4ae' }}>{h.eventTime}</td>
                          <td style={{ padding: '4px 8px', fontSize: 11, color: getSeverityColor(h.severity) }}>{h.severity}</td>
                          <td style={{ padding: '4px 8px', fontSize: 11, color: '#e0e0e0' }}>{h.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
