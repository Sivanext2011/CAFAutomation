import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resetPassword, getLegalWarning, updateLegalWarning, getPrivacyNotice, updatePrivacyNotice, exportRealm, importRealm } from '../api/client';

type Tab = 'password' | 'notices' | 'realm';

export function AccessMgmtPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('password');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Password
  const [realm, setRealm] = useState('master');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');

  // Notices
  const [legalText, setLegalText] = useState('');
  const [privacyText, setPrivacyText] = useState('');

  // Realm
  const [realmName, setRealmName] = useState('');
  const [configMapName, setConfigMapName] = useState('');
  const [realmJson, setRealmJson] = useState('');

  function err(e: any) { setPopup({ type: 'error', message: typeof e?.message === 'string' ? e.message : String(e) }); }

  async function run(fn: () => Promise<any>) {
    setLoading(true); setOutput('');
    try {
      const r = await fn();
      if (r.job?.status === 'failed') setPopup({ type: 'error', message: 'Operation failed', jobId: r.job.id });
      else { setOutput(r.job?.stdout || 'Done'); setPopup({ type: 'success', message: 'Success', jobId: r.job?.id }); }
    } catch (e: any) { err(e); }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!oldPass || !newPass) { err('Both old and new passwords are required'); return; }
    await run(() => resetPassword({ realm, oldPassword: oldPass, newPassword: newPass }));
    setOldPass(''); setNewPass('');
  }

  async function handleGetLegal() {
    await run(getLegalWarning);
  }

  async function handleUpdateLegal() {
    await run(() => updateLegalWarning({ text: legalText }));
  }

  async function handleGetPrivacy() {
    await run(getPrivacyNotice);
  }

  async function handleUpdatePrivacy() {
    await run(() => updatePrivacyNotice({ text: privacyText }));
  }

  async function handleExportRealm() {
    if (!realmName) { err('Realm name is required'); return; }
    await run(() => exportRealm({ realm: realmName }));
  }

  async function handleImportRealm() {
    if (!realmName) { err('Realm name is required'); return; }
    if (!realmJson.trim()) { err('Paste the exported realm JSON'); return; }
    try {
      const config = JSON.parse(realmJson);
      await run(() => importRealm({ realm: realmName, configMapName: configMapName || undefined, realmConfig: config }));
    } catch (e) { err('Invalid JSON'); }
  }

  return (
    <div>
      <div className="page-header"><h1>Access Management</h1></div>

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
        <button className={`btn ${tab === 'password' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('password'); setOutput(''); }}>Reset Password</button>
        <button className={`btn ${tab === 'notices' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('notices'); setOutput(''); }}>Notices</button>
        <button className={`btn ${tab === 'realm' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setTab('realm'); setOutput(''); }}>Realm Config</button>
      </div>

      {/* Reset Password */}
      {tab === 'password' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 400 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Reset Password</label>
            <p style={{ color: '#ff9800', fontSize: 11, margin: '4px 0 8px' }}>⚠ After reset, logout and login again.</p>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Realm</label>
              <input value={realm} onChange={e => setRealm(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Old Password *</label>
              <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} />
            </div>
            <div className="form-group">
              <label>New Password *</label>
              <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleResetPassword} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Notices */}
      {tab === 'notices' && (
        <div>
          {/* Legal Warning */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 16, maxWidth: 600 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Legal Warning (displayed before login)</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
              <button className="btn btn-secondary" onClick={handleGetLegal} disabled={loading}>Get Current</button>
            </div>
            <textarea
              value={legalText}
              onChange={e => setLegalText(e.target.value)}
              rows={3}
              style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 8, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
              placeholder="IF YOU ARE NOT AN AUTHORIZED USER, PLEASE EXIT IMMEDIATELY"
            />
            <button className="btn btn-primary" onClick={handleUpdateLegal} disabled={loading}>
              {legalText ? 'Update Legal Warning' : 'Disable Legal Warning'}
            </button>
          </div>

          {/* Privacy Notice */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 600 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Privacy Notice (displayed after login)</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8 }}>
              <button className="btn btn-secondary" onClick={handleGetPrivacy} disabled={loading}>Get Current</button>
            </div>
            <textarea
              value={privacyText}
              onChange={e => setPrivacyText(e.target.value)}
              rows={3}
              style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 8, fontFamily: 'monospace', fontSize: 12, marginBottom: 8 }}
              placeholder="All activities may be monitored and recorded."
            />
            <button className="btn btn-primary" onClick={handleUpdatePrivacy} disabled={loading}>
              {privacyText ? 'Update Privacy Notice' : 'Disable Privacy Notice'}
            </button>
          </div>

          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}

      {/* Realm Config */}
      {tab === 'realm' && (
        <div>
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 16, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Export Realm Configuration</label>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Realm Name *</label>
              <input value={realmName} onChange={e => setRealmName(e.target.value)} placeholder="master" />
            </div>
            <button className="btn btn-primary" onClick={handleExportRealm} disabled={loading}>
              {loading ? 'Exporting...' : 'Export Realm'}
            </button>
          </div>

          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 600 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Import Realm Configuration</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Realm Name *</label>
                <input value={realmName} onChange={e => setRealmName(e.target.value)} placeholder="test-realm" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>ConfigMap Name (optional)</label>
                <input value={configMapName} onChange={e => setConfigMapName(e.target.value)} placeholder="keycloak-security-config" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 8 }}>
              <label>Realm JSON (paste exported file content)</label>
              <textarea
                value={realmJson}
                onChange={e => setRealmJson(e.target.value)}
                rows={6}
                style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 8, fontFamily: 'monospace', fontSize: 11 }}
                placeholder="Paste the exported realm JSON here..."
              />
            </div>
            <button className="btn btn-primary" onClick={handleImportRealm} disabled={loading || !realmJson.trim()}>
              {loading ? 'Importing...' : 'Import Realm'}
            </button>
          </div>

          {output && <div className="console" style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{output}</div>}
        </div>
      )}
    </div>
  );
}
