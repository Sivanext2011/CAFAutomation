import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { syslogGenerateConfig, syslogPushToGit } from '../api/client';

export function SyslogPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Config
  const [host, setHost] = useState('');
  const [port, setPort] = useState('514');
  const [protocol, setProtocol] = useState('udp');
  const [tlsEnabled, setTlsEnabled] = useState(false);
  const [trustList, setTrustList] = useState('syslog-ca-list');
  const [filterAudit, setFilterAudit] = useState(true);
  const [filterSecurity, setFilterSecurity] = useState(true);
  const [filterAll, setFilterAll] = useState(false);

  // Generated
  const [yamlContent, setYamlContent] = useState('');
  const [filename, setFilename] = useState('');

  // Git
  const [showGit, setShowGit] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('config/env/prod/values/z_eric-log-transformer-syslog.yaml');
  const [gitUser, setGitUser] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [commitMsg, setCommitMsg] = useState('feat: add syslog egress config for external SIEM');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  async function handleGenerate() {
    if (!host) { err('Syslog Host is required'); return; }
    setLoading(true);
    try {
      const inclusions: any[] = [];
      if (!filterAll) {
        if (filterAudit) inclusions.push({ field: 'log_type', value: 'audit' });
        if (filterSecurity) inclusions.push({ field: 'log_type', value: 'security' });
      }
      const r = await syslogGenerateConfig({ host, port, protocol, tlsEnabled, trustListName: trustList, inclusions });
      setYamlContent(r.yaml);
      setFilename(r.filename);
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  function handleDownload() {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleGitPush() {
    if (!repoUrl) { err('Repository URL required'); return; }
    setLoading(true);
    try {
      const r = await syslogPushToGit({ repoUrl, branch, filePath, yamlContent, commitMessage: commitMsg, username: gitUser, token: gitToken });
      if (r.status === 'failed') setPopup({ type: 'error', message: 'Git push failed', jobId: r.job?.id });
      else setPopup({ type: 'success', message: 'Pushed to Git', jobId: r.job?.id });
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header"><h1>Syslog Integration</h1><span style={{ color: '#90a4ae', fontSize: 12 }}>Log Transformer Egress Config</span></div>

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

      {/* Config Form */}
      <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 16, maxWidth: 550 }}>
        <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Syslog Destination</label>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginTop: 8 }}>
          <div className="form-group" style={{ margin: 0 }}><label>Host / IP *</label><input value={host} onChange={e => setHost(e.target.value)} placeholder="syslog.example.com" /></div>
          <div className="form-group" style={{ margin: 0 }}><label>Port</label><input value={port} onChange={e => setPort(e.target.value)} /></div>
          <div className="form-group" style={{ margin: 0 }}><label>Protocol</label>
            <select value={protocol} onChange={e => setProtocol(e.target.value)}><option value="udp">UDP</option><option value="tcp">TCP</option></select>
          </div>
        </div>

        {/* TLS */}
        <div style={{ marginTop: 12, padding: 8, border: '1px dashed #0f3460', borderRadius: 4 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>TLS Encryption</label>
            <select value={String(tlsEnabled)} onChange={e => { setTlsEnabled(e.target.value === 'true'); if (e.target.value === 'true') { setProtocol('tcp'); setPort('6514'); } else { setPort('514'); } }}>
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
          </div>
          {tlsEnabled && (
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Trusted CA List Name</label>
              <input value={trustList} onChange={e => setTrustList(e.target.value)} />
              <p style={{ color: '#90a4ae', fontSize: 10, marginTop: 2 }}>Import CA via Certificates tab → Trust CA before deploying</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ marginTop: 12 }}>
          <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Log Filters</label>
          <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
            <label style={{ color: '#e0e0e0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={filterAll} onChange={e => { setFilterAll(e.target.checked); if (e.target.checked) { setFilterAudit(false); setFilterSecurity(false); } }} /> All logs
            </label>
            <label style={{ color: '#e0e0e0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={filterAudit} disabled={filterAll} onChange={e => setFilterAudit(e.target.checked)} /> Audit
            </label>
            <label style={{ color: '#e0e0e0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="checkbox" checked={filterSecurity} disabled={filterAll} onChange={e => setFilterSecurity(e.target.checked)} /> Security
            </label>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Generating...' : 'Generate YAML'}
        </button>
      </div>

      {/* Generated YAML */}
      {yamlContent && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Generated YAML ({filename}):</label>
          <textarea value={yamlContent} onChange={e => setYamlContent(e.target.value)} rows={14} style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleDownload}>⬇ Download YAML</button>
            <button className="btn btn-secondary" onClick={() => setShowGit(!showGit)}>{showGit ? 'Hide Git Push' : 'Push to Git (Optional)'}</button>
          </div>
        </div>
      )}

      {/* Git Push */}
      {showGit && yamlContent && (
        <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 550 }}>
          <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Push to Git Repository</label>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginTop: 8 }}>
            <div className="form-group" style={{ margin: 0 }}><label>Repository URL *</label><input value={repoUrl} onChange={e => setRepoUrl(e.target.value)} placeholder="https://github.com/org/repo.git" /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Branch</label><input value={branch} onChange={e => setBranch(e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}><label>File Path</label><input value={filePath} onChange={e => setFilePath(e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ margin: 0 }}><label>Username</label><input value={gitUser} onChange={e => setGitUser(e.target.value)} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Token</label><input type="password" value={gitToken} onChange={e => setGitToken(e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}><label>Commit Message</label><input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleGitPush} disabled={loading}>{loading ? 'Pushing...' : 'Push to Git'}</button>
        </div>
      )}
    </div>
  );
}
