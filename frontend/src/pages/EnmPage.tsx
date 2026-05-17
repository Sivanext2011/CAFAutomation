import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { enmGenerateSnmpConfig, enmPushToGit } from '../api/client';

export function EnmPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // SNMP Config
  const [version, setVersion] = useState('v2c');
  const [oamIp, setOamIp] = useState('');
  const [enmVip, setEnmVip] = useState('');
  const [enmPort, setEnmPort] = useState('162');
  const [community, setCommunity] = useState('public');
  const [userName, setUserName] = useState('');
  const [secLevel, setSecLevel] = useState('authPriv');
  const [authProto, setAuthProto] = useState('SHA');
  const [authPass, setAuthPass] = useState('');
  const [privProto, setPrivProto] = useState('AES');
  const [privPass, setPrivPass] = useState('');

  // Generated YAML
  const [yamlContent, setYamlContent] = useState('');
  const [filename, setFilename] = useState('');

  // Git push
  const [showGit, setShowGit] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [filePath, setFilePath] = useState('config/env/prod/values/z_eric-fh-snmp-alarm-provider.yaml');
  const [gitUser, setGitUser] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [commitMsg, setCommitMsg] = useState('feat: add SNMP alarm provider config for ENM integration');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  async function handleGenerate() {
    if (!oamIp || !enmVip) { err('OAM Ingress IP and ENM FM VIP are required'); return; }
    setLoading(true);
    try {
      const data: any = { version, oamIngressIp: oamIp, enmFmVip: enmVip, enmPort };
      if (version === 'v2c') data.community = community;
      if (version === 'v3') {
        data.userName = userName; data.securityLevel = secLevel;
        data.authProtocol = authProto; data.authPassword = authPass;
        data.privProtocol = privProto; data.privPassword = privPass;
      }
      const r = await enmGenerateSnmpConfig(data);
      setYamlContent(r.yaml);
      setFilename(r.filename);
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  function handleDownload() {
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename || 'z_eric-fh-snmp-alarm-provider.yaml';
    a.click(); URL.revokeObjectURL(url);
  }

  async function handleGitPush() {
    if (!repoUrl) { err('Repository URL required'); return; }
    setLoading(true);
    try {
      const r = await enmPushToGit({ repoUrl, branch, filePath, yamlContent, commitMessage: commitMsg, username: gitUser, token: gitToken });
      if (r.status === 'failed') setPopup({ type: 'error', message: 'Git push failed', jobId: r.job?.id });
      else setPopup({ type: 'success', message: 'Pushed to Git successfully', jobId: r.job?.id });
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header"><h1>ENM Integration</h1><span style={{ color: '#90a4ae', fontSize: 12 }}>SNMP Alarm Provider Config</span></div>

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
        <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>SNMP Trap Configuration</label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
          <div className="form-group" style={{ margin: 0 }}><label>OAM Ingress IP *</label><input value={oamIp} onChange={e => setOamIp(e.target.value)} placeholder="10.0.0.1" /></div>
          <div className="form-group" style={{ margin: 0 }}><label>ENM FM VIP *</label><input value={enmVip} onChange={e => setEnmVip(e.target.value)} placeholder="10.0.0.100" /></div>
          <div className="form-group" style={{ margin: 0 }}><label>Trap Port</label><input value={enmPort} onChange={e => setEnmPort(e.target.value)} /></div>
        </div>

        <div className="form-group" style={{ marginTop: 8 }}>
          <label>SNMP Version</label>
          <select value={version} onChange={e => setVersion(e.target.value)}>
            <option value="v2c">SNMPv2c (community-based)</option>
            <option value="v3">SNMPv3 (user-based, secure)</option>
          </select>
        </div>

        {version === 'v2c' && (
          <div className="form-group"><label>Community String</label><input value={community} onChange={e => setCommunity(e.target.value)} /></div>
        )}

        {version === 'v3' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group" style={{ margin: 0 }}><label>Username *</label><input value={userName} onChange={e => setUserName(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label>Security Level</label>
                <select value={secLevel} onChange={e => setSecLevel(e.target.value)}>
                  <option value="noAuthNoPriv">noAuthNoPriv</option>
                  <option value="authNoPriv">authNoPriv</option>
                  <option value="authPriv">authPriv</option>
                </select>
              </div>
            </div>
            {(secLevel === 'authNoPriv' || secLevel === 'authPriv') && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}><label>Auth Protocol</label><select value={authProto} onChange={e => setAuthProto(e.target.value)}><option>SHA</option><option>MD5</option></select></div>
                <div className="form-group" style={{ margin: 0 }}><label>Auth Password</label><input type="password" value={authPass} onChange={e => setAuthPass(e.target.value)} /></div>
              </div>
            )}
            {secLevel === 'authPriv' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <div className="form-group" style={{ margin: 0 }}><label>Priv Protocol</label><select value={privProto} onChange={e => setPrivProto(e.target.value)}><option>AES</option><option>DES</option></select></div>
                <div className="form-group" style={{ margin: 0 }}><label>Priv Password</label><input type="password" value={privPass} onChange={e => setPrivPass(e.target.value)} /></div>
              </div>
            )}
          </>
        )}

        <button className="btn btn-primary" onClick={handleGenerate} disabled={loading} style={{ marginTop: 12 }}>
          {loading ? 'Generating...' : 'Generate YAML'}
        </button>
      </div>

      {/* Generated YAML */}
      {yamlContent && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Generated YAML ({filename}):</label>
          <textarea value={yamlContent} onChange={e => setYamlContent(e.target.value)} rows={12} style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }} />
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
          <div className="form-group" style={{ marginTop: 8 }}><label>File Path in Repo</label><input value={filePath} onChange={e => setFilePath(e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ margin: 0 }}><label>Git Username</label><input value={gitUser} onChange={e => setGitUser(e.target.value)} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Git Token/Password</label><input type="password" value={gitToken} onChange={e => setGitToken(e.target.value)} /></div>
          </div>
          <div className="form-group" style={{ marginTop: 8 }}><label>Commit Message</label><input value={commitMsg} onChange={e => setCommitMsg(e.target.value)} /></div>
          <button className="btn btn-primary" onClick={handleGitPush} disabled={loading}>{loading ? 'Pushing...' : 'Push to Git'}</button>
        </div>
      )}
    </div>
  );
}
