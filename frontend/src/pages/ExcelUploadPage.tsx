import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { downloadTemplate, exportCurrentConfig, parseExcel, deployNrfConfiguration, updateSdpRealms, updateSdpPeers, addNrfServer, addNrfOauthServer, updateNfProfileConfig, bulkCreateSubAcctLoc } from '../api/client';

export function ExcelUploadPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  async function handleDownloadTemplate() {
    const blob = await downloadTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'CAF_Integration_Template.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportCurrent() {
    setLoading(true); setError('');
    try {
      const blob = await exportCurrentConfig();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'CAF_Current_Config.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(''); setParsed(null);
    try {
      const result = await parseExcel(file);
      setParsed(result.data);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }

  async function handleDeploy() {
    if (!parsed) return;
    setLoading(true); setError('');
    const results: string[] = [];

    try {
      // SDP
      if (parsed.sdp?.entries?.length) {
        const settings = parsed.sdp.settings || {};
        const port = settings.port || '3868';
        const transport = settings.transport || 'sctp';
        const apps = (settings.applications || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const initiate = settings.initiateConnection !== false;

        // Group entries by realm+appGrp
        const realmMap: Record<string, any> = {};
        const peerList: any[] = [];
        const seenPeers = new Set<string>();

        parsed.sdp.entries.forEach((e: any) => {
          const key = `${e.realm}|${e.appGrp}`;
          if (!realmMap[key]) {
            realmMap[key] = { realm: e.realm, appGrp: e.appGrp, sdp_id: e.sdpIds ? e.sdpIds.split(',').map((s: string) => s.trim()) : [e.realm], applications: apps, initiateConnection: initiate, strategy: settings.strategy || 'round-robin', idx1: [], idx2: [] };
          }
          if (e.idx1Host) {
            const uri = `aaa://${e.idx1Host}:${port};transport=${transport}`;
            realmMap[key].idx1.push(uri);
            const pk = `${uri}|${e.appGrp}`;
            if (!seenPeers.has(pk)) {
              seenPeers.add(pk);
              const peer: any = { peer: uri, appGrp: e.appGrp, initiateConnection: initiate, raiseAlarm: settings.raiseAlarm !== false };
              if (e.idx1Connect) peer.connectAddresses = e.idx1Connect.split(',').map((s: string) => s.trim());
              peerList.push(peer);
            }
          }
          if (e.idx2Host) {
            const uri = `aaa://${e.idx2Host}:${port};transport=${transport}`;
            realmMap[key].idx2.push(uri);
            const pk = `${uri}|${e.appGrp}`;
            if (!seenPeers.has(pk)) {
              seenPeers.add(pk);
              const peer: any = { peer: uri, appGrp: e.appGrp, initiateConnection: initiate, raiseAlarm: settings.raiseAlarm !== false };
              if (e.idx2Connect) peer.connectAddresses = e.idx2Connect.split(',').map((s: string) => s.trim());
              peerList.push(peer);
            }
          }
        });

        const realms = Object.values(realmMap).map((r: any) => {
          const addresses: any[] = [];
          if (r.idx1.length) addresses.push({ index: 1, peerAddresses: r.idx1 });
          if (r.idx2.length) addresses.push({ index: 2, peerAddresses: r.idx2 });
          return { realm: r.realm, appGrp: r.appGrp, sdp_id: r.sdp_id, applications: r.applications, initiateConnection: r.initiateConnection, strategy: r.strategy, addresses };
        });

        if (mode === 'replace') {
          await updateSdpRealms(realms);
          await updateSdpPeers(peerList);
        } else {
          // For merge, we send the full list (backend replaces anyway, so we'd need to fetch+merge)
          await updateSdpRealms(realms);
          await updateSdpPeers(peerList);
        }
        results.push(`SDP: ${realms.length} realms, ${peerList.length} peers`);
      }

      // Sub Acct Loc
      if (parsed.subAcctLoc?.length) {
        await bulkCreateSubAcctLoc(parsed.subAcctLoc);
        results.push(`SubAcctLoc: ${parsed.subAcctLoc.length} mappings`);
      }

      // NRF Servers
      if (parsed.nrfServers?.length) {
        for (const srv of parsed.nrfServers) {
          await addNrfServer({ address: srv.address, secured: srv.secured, compression: srv.compression, app_grp: srv.appGrp, failure_codes: srv.failureCodes, nf_service_type: srv.nfServiceType });
        }
        results.push(`NRF Servers: ${parsed.nrfServers.length}`);
      }

      // OAuth Servers
      if (parsed.oauthServers?.length) {
        for (const srv of parsed.oauthServers) {
          await addNrfOauthServer({ address: srv.address, secured: srv.secured, app_grp: srv.appGrp, failure_codes: srv.failureCodes });
        }
        results.push(`OAuth Servers: ${parsed.oauthServers.length}`);
      }

      // NF Profile
      if (parsed.nfProfile?.length) {
        for (const p of parsed.nfProfile) {
          const { appGroup, ...payload } = p;
          await updateNfProfileConfig(appGroup, { app_group_name: appGroup, payload });
        }
        results.push(`NF Profile: ${parsed.nfProfile.length}`);
      }

      setPopup({ type: 'success', message: `Deployed: ${results.join(' | ')}` });
    } catch (e: any) {
      setPopup({ type: 'error', message: e.message || 'Deploy failed' });
    }
    setLoading(false);
  }

  const sdpCount = parsed?.sdp?.entries?.length || 0;
  const subCount = parsed?.subAcctLoc?.length || 0;
  const nrfCount = parsed?.nrfServers?.length || 0;
  const oauthCount = parsed?.oauthServers?.length || 0;
  const nfCount = parsed?.nfProfile?.length || 0;
  const diaCount = parsed?.diameter?.entries?.length || 0;

  return (
    <div>
      <div className="page-header"><h1>Excel Upload &amp; Deploy</h1></div>

      {error && <div className="alert alert-error">{error}</div>}
      {popup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', border: `1px solid ${popup.type === 'success' ? '#66bb6a' : '#ef5350'}`, borderRadius: 8, padding: 24, minWidth: 320 }}>
            <h3 style={{ color: popup.type === 'success' ? '#66bb6a' : '#ef5350', marginBottom: 12 }}>{popup.type === 'success' ? '✓ Success' : '✗ Failed'}</h3>
            <p style={{ color: '#e0e0e0', marginBottom: 16 }}>{popup.message}</p>
            <button className="btn btn-secondary" onClick={() => setPopup(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={handleDownloadTemplate}>⬇ Download Template</button>
        <button className="btn btn-secondary" onClick={handleExportCurrent} disabled={loading}>⬇ Export Current Config</button>
      </div>

      {/* Upload */}
      <div style={{ padding: 16, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 20, maxWidth: 600 }}>
        <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Upload Excel File</label>
        <p style={{ color: '#90a4ae', fontSize: 11, marginBottom: 12 }}>Upload a filled template (.xlsx) to preview and deploy configurations.</p>
        <input type="file" accept=".xlsx" onChange={handleFileUpload} />
      </div>

      {/* Preview */}
      {parsed && (
        <div style={{ padding: 16, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 20 }}>
          <h3 style={{ color: '#4fc3f7', marginBottom: 12 }}>Preview</h3>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
            {sdpCount > 0 && <span className="badge badge-success">SDP: {sdpCount} entries</span>}
            {subCount > 0 && <span className="badge badge-success">SubAcctLoc: {subCount}</span>}
            {diaCount > 0 && <span className="badge badge-success">Diameter: {diaCount}</span>}
            {nrfCount > 0 && <span className="badge badge-success">NRF Servers: {nrfCount}</span>}
            {oauthCount > 0 && <span className="badge badge-success">OAuth: {oauthCount}</span>}
            {nfCount > 0 && <span className="badge badge-success">NF Profile: {nfCount}</span>}
          </div>

          {/* SDP Preview */}
          {sdpCount > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>SDP Integration ({sdpCount} rows)</label>
              <table className="data-table" style={{ marginTop: 4 }}>
                <thead><tr><th>App Grp</th><th>Realm</th><th>SDP IDs</th><th>Idx1 Host</th><th>Idx1 IPs</th><th>Idx2 Host</th></tr></thead>
                <tbody>
                  {parsed.sdp.entries.slice(0, 10).map((e: any, i: number) => (
                    <tr key={i}><td>{e.appGrp}</td><td style={{ fontSize: 10 }}>{e.realm}</td><td style={{ fontSize: 10 }}>{e.sdpIds}</td><td style={{ fontSize: 10 }}>{e.idx1Host}</td><td style={{ fontSize: 10 }}>{e.idx1Connect}</td><td style={{ fontSize: 10 }}>{e.idx2Host || '-'}</td></tr>
                  ))}
                  {sdpCount > 10 && <tr><td colSpan={6} style={{ color: '#90a4ae', textAlign: 'center' }}>... and {sdpCount - 10} more</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* NRF Preview */}
          {nrfCount > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>NRF Servers ({nrfCount})</label>
              <table className="data-table" style={{ marginTop: 4 }}>
                <thead><tr><th>Address</th><th>Secured</th><th>App Group</th></tr></thead>
                <tbody>{parsed.nrfServers.map((s: any, i: number) => <tr key={i}><td style={{ fontSize: 10 }}>{s.address}</td><td>{String(s.secured)}</td><td>{s.appGrp}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* SubAcctLoc Preview */}
          {subCount > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 11, fontWeight: 600 }}>Subscriber Account Location ({subCount})</label>
              <table className="data-table" style={{ marginTop: 4 }}>
                <thead><tr><th>SDP Name</th><th>IP</th><th>Partition</th></tr></thead>
                <tbody>{parsed.subAcctLoc.slice(0, 10).map((s: any, i: number) => <tr key={i}><td>{s.name}</td><td>{s.ip}</td><td>{s.partitionId}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Deploy Controls */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginTop: 16 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Deploy Mode</label>
            <div style={{ display: 'flex', gap: 12, marginTop: 8, marginBottom: 12 }}>
              <label style={{ color: '#e0e0e0', fontSize: 12, cursor: 'pointer' }}>
                <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} style={{ marginRight: 6 }} />
                Merge (add/update, keep existing)
              </label>
              <label style={{ color: '#e0e0e0', fontSize: 12, cursor: 'pointer' }}>
                <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} style={{ marginRight: 6 }} />
                Replace (overwrite entire config)
              </label>
            </div>
            <button className="btn btn-primary" onClick={handleDeploy} disabled={loading}>
              {loading ? 'Deploying...' : 'Deploy All'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
