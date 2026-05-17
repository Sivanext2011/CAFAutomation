import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { backupHealth, backupListManagers, backupListBackups, backupCreate, backupGet, backupDelete, backupRestore, backupExport, backupImport, backupListTasks, backupLastTask, backupListSftp, backupCreateSftp, backupDeleteSftp, backupGetHousekeeping, backupPatchHousekeeping, backupCreatePeriodic, backupCreateCalendar } from '../api/client';

type Tab = 'backups' | 'export' | 'sftp' | 'schedule' | 'health';

export function BackupPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('backups');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  const [brmId, setBrmId] = useState('configuration-data');
  const [backupName, setBackupName] = useState('');

  // Export/Import
  const [sftpUri, setSftpUri] = useState('');
  const [sftpPass, setSftpPass] = useState('');

  // SFTP Server
  const [sftpServerName, setSftpServerName] = useState('');
  const [sftpAddress, setSftpAddress] = useState('');
  const [sftpPort, setSftpPort] = useState('22');
  const [sftpPath, setSftpPath] = useState('');
  const [sftpServerPass, setSftpServerPass] = useState('');

  // Schedule
  const [schedStartTime, setSchedStartTime] = useState('');
  const [schedHours, setSchedHours] = useState('24');
  const [calName, setCalName] = useState('');
  const [calBackupName, setCalBackupName] = useState('');
  const [calDay, setCalDay] = useState('MONDAY');
  const [calOccurrence, setCalOccurrence] = useState('ALL');
  const [calTime, setCalTime] = useState('03:00:00');
  const [calStart, setCalStart] = useState('');
  const [calStop, setCalStop] = useState('');

  // Housekeeping
  const [maxBackups, setMaxBackups] = useState('3');
  const [autoDelete, setAutoDelete] = useState('enabled');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }
  async function run(fn: () => Promise<any>) {
    setLoading(true); setOutput('');
    try {
      const r = await fn();
      if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Failed', jobId: r.job.id });
      else { setOutput(r.job?.stdout || 'Done'); setPopup({ type: 'success', message: 'Success', jobId: r.job?.id }); }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header"><h1>Backup & Restore</h1></div>

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

      {/* BRM selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ margin: 0 }}><label>Backup Manager</label><input value={brmId} onChange={e => setBrmId(e.target.value)} style={{ width: 200 }} /></div>
        <button className="btn btn-secondary" style={{ fontSize: 11 }} onClick={() => run(backupListManagers)} disabled={loading}>List Managers</button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['backups', 'export', 'sftp', 'schedule', 'health'] as Tab[]).map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => { setTab(t); setOutput(''); }}>
            {t === 'backups' ? 'Backups' : t === 'export' ? 'Export / Import' : t === 'sftp' ? 'SFTP Servers' : t === 'schedule' ? 'Scheduling' : 'Health'}
          </button>
        ))}
      </div>

      {/* Backups Tab */}
      {tab === 'backups' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={() => run(() => backupListBackups(brmId))} disabled={loading}>List Backups</button>
            <button className="btn btn-secondary" onClick={() => run(() => backupListTasks(brmId))} disabled={loading}>List Tasks</button>
            <button className="btn btn-secondary" onClick={() => run(() => backupLastTask(brmId))} disabled={loading}>Last Task</button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Create / Restore / Delete Backup</label>
            <div className="form-group" style={{ marginTop: 8 }}><label>Backup Name *</label><input value={backupName} onChange={e => setBackupName(e.target.value)} placeholder="myBackup" /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={() => { if (!backupName) { err('Name required'); return; } run(() => backupCreate(brmId, backupName)); }} disabled={loading}>Create</button>
              <button className="btn btn-secondary" onClick={() => { if (!backupName) { err('Name required'); return; } run(() => backupGet(brmId, backupName)); }} disabled={loading}>Get Status</button>
              <button className="btn btn-primary" onClick={() => { if (!backupName) { err('Name required'); return; } if (confirm(`Restore from ${backupName}?`)) run(() => backupRestore(brmId, backupName)); }} disabled={loading}>Restore</button>
              <button className="btn btn-danger" onClick={() => { if (!backupName) { err('Name required'); return; } if (confirm(`Delete ${backupName}?`)) run(() => backupDelete(brmId, backupName)); }} disabled={loading}>Delete</button>
            </div>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}

      {/* Export / Import Tab */}
      {tab === 'export' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Export Backup to SFTP</label>
            <div className="form-group" style={{ marginTop: 8 }}><label>Backup Name *</label><input value={backupName} onChange={e => setBackupName(e.target.value)} placeholder="myBackup" /></div>
            <div className="form-group"><label>SFTP URI *</label><input value={sftpUri} onChange={e => setSftpUri(e.target.value)} placeholder="sftp://user@host:22/path/" /></div>
            <div className="form-group"><label>Password *</label><input type="password" value={sftpPass} onChange={e => setSftpPass(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={() => { if (!backupName || !sftpUri || !sftpPass) { err('All fields required'); return; } run(() => backupExport(brmId, backupName, { uri: sftpUri, password: sftpPass })); }} disabled={loading}>Export</button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Import Backup from SFTP</label>
            <div className="form-group" style={{ marginTop: 8 }}><label>SFTP URI (to .tar.gz) *</label><input value={sftpUri} onChange={e => setSftpUri(e.target.value)} placeholder="sftp://user@host:22/path/backup.tar.gz" /></div>
            <div className="form-group"><label>Password *</label><input type="password" value={sftpPass} onChange={e => setSftpPass(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={() => { if (!sftpUri || !sftpPass) { err('URI and password required'); return; } run(() => backupImport(brmId, { uri: sftpUri, password: sftpPass })); }} disabled={loading}>Import</button>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* SFTP Servers Tab */}
      {tab === 'sftp' && (
        <div>
          <button className="btn btn-secondary" onClick={() => run(() => backupListSftp(brmId))} disabled={loading} style={{ marginBottom: 12 }}>List SFTP Servers</button>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Add SFTP Server</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Server Name *</label><input value={sftpServerName} onChange={e => setSftpServerName(e.target.value)} placeholder="mySFTP" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Address *</label><input value={sftpAddress} onChange={e => setSftpAddress(e.target.value)} placeholder="sftp://user@host" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Port</label><input value={sftpPort} onChange={e => setSftpPort(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Remote Path *</label><input value={sftpPath} onChange={e => setSftpPath(e.target.value)} placeholder="/exports/bam/" /></div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}><label>Password *</label><input type="password" value={sftpServerPass} onChange={e => setSftpServerPass(e.target.value)} /></div>
            <button className="btn btn-primary" onClick={() => {
              if (!sftpServerName || !sftpAddress || !sftpPath || !sftpServerPass) { err('All fields required'); return; }
              run(() => backupCreateSftp(brmId, { sftpServerName, remoteAddress: sftpAddress, remotePort: parseInt(sftpPort), remotePath: sftpPath, password: sftpServerPass }));
            }} disabled={loading}>Add Server</button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#ef5350', fontSize: 12, fontWeight: 600 }}>Delete SFTP Server</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ margin: 0, flex: 1 }}><label>Server Name</label><input value={sftpServerName} onChange={e => setSftpServerName(e.target.value)} /></div>
              <button className="btn btn-danger" onClick={() => { if (sftpServerName && confirm(`Delete ${sftpServerName}?`)) run(() => backupDeleteSftp(brmId, sftpServerName)); }} disabled={loading}>Delete</button>
            </div>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Scheduling Tab */}
      {tab === 'schedule' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={() => run(() => backupGetHousekeeping(brmId))} disabled={loading}>Get Housekeeping</button>
          </div>

          {/* Housekeeping */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 400 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Housekeeping</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Max Stored Backups</label><input value={maxBackups} onChange={e => setMaxBackups(e.target.value)} type="number" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Auto Delete</label><select value={autoDelete} onChange={e => setAutoDelete(e.target.value)}><option value="enabled">Enabled</option><option value="disabled">Disabled</option></select></div>
            </div>
            <button className="btn btn-primary" onClick={() => run(() => backupPatchHousekeeping(brmId, { autoDelete, maxStoredBackups: parseInt(maxBackups) }))} disabled={loading} style={{ marginTop: 8 }}>Update</button>
          </div>

          {/* Periodic Schedule */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12, maxWidth: 400 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Create Periodic Schedule</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Start Time *</label><input value={schedStartTime} onChange={e => setSchedStartTime(e.target.value)} placeholder="2026-12-16T02:10:00" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Every (hours) *</label><input value={schedHours} onChange={e => setSchedHours(e.target.value)} type="number" /></div>
            </div>
            <button className="btn btn-primary" onClick={() => { if (!schedStartTime) { err('Start time required'); return; } run(() => backupCreatePeriodic(brmId, { startTime: schedStartTime, hours: parseInt(schedHours) })); }} disabled={loading} style={{ marginTop: 8 }}>Create</button>
          </div>

          {/* Calendar Schedule */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Create Calendar Schedule</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Schedule Name *</label><input value={calName} onChange={e => setCalName(e.target.value)} placeholder="weekly-backup" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Backup Name *</label><input value={calBackupName} onChange={e => setCalBackupName(e.target.value)} placeholder="cal-backup" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Time *</label><input value={calTime} onChange={e => setCalTime(e.target.value)} placeholder="03:00:00" /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Day of Week</label><select value={calDay} onChange={e => setCalDay(e.target.value)}>{['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'].map(d => <option key={d}>{d}</option>)}</select></div>
              <div className="form-group" style={{ margin: 0 }}><label>Occurrence</label><select value={calOccurrence} onChange={e => setCalOccurrence(e.target.value)}>{['ALL','FIRST','SECOND','THIRD','FOURTH','LAST'].map(o => <option key={o}>{o}</option>)}</select></div>
              <div className="form-group" style={{ margin: 0 }}><label>Start *</label><input value={calStart} onChange={e => setCalStart(e.target.value)} placeholder="2026-12-16T00:00:00" /></div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}><label>Stop *</label><input value={calStop} onChange={e => setCalStop(e.target.value)} placeholder="2027-12-16T00:00:00" style={{ width: 220 }} /></div>
            <button className="btn btn-primary" onClick={() => {
              if (!calName || !calBackupName || !calStart || !calStop) { err('Required fields missing'); return; }
              run(() => backupCreateCalendar(brmId, { scheduleName: calName, backupName: calBackupName, scheduleType: 'calendar', startTime: calStart, stopTime: calStop, dayOfWeek: calDay, dayOfWeekOccurrence: calOccurrence, time: calTime }));
            }} disabled={loading} style={{ marginTop: 8 }}>Create</button>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Health Tab */}
      {tab === 'health' && (
        <div>
          <button className="btn btn-primary" onClick={() => run(backupHealth)} disabled={loading} style={{ marginBottom: 12 }}>Check Health</button>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap' }}>{output}</div>}
        </div>
      )}
    </div>
  );
}
