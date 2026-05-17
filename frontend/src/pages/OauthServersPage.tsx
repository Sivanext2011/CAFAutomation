import { useState, useEffect } from 'react';
import { listNrfOauthServers, addNrfOauthServer } from '../api/client';

export function OauthServersPage() {
  const [servers, setServers] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState('');
  const [failureCodes, setFailureCodes] = useState('404,500');
  const [secured, setSecured] = useState(true);
  const [appGrp, setAppGrp] = useState('global');

  useEffect(() => { loadServers(); }, []);

  async function loadServers() {
    try {
      const result = await listNrfOauthServers();
      setServers(result);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const codes = failureCodes.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c));
      await addNrfOauthServer({
        address,
        failure_codes: codes.length > 0 ? codes : undefined,
        secured,
        app_grp: appGrp,
      });
      setSuccess('NRF OAuth Server added successfully');
      setShowAdd(false);
      setAddress('');
      loadServers();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }


  return (
    <div>
      <div className="page-header">
        <h1>NRF OAuth Servers</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add OAuth Server'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showAdd && (
        <div className="form-panel" style={{ marginBottom: 20 }}>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Address * (https://&lt;fqdn/ipv4/[ipv6]&gt;:&lt;port&gt;)</label>
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="https://nrf.ericsson.com:3002" required />
            </div>
            <div className="form-group">
              <label>Application Group</label>
              <input value={appGrp} onChange={e => setAppGrp(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Failure Codes (comma-separated)</label>
              <input value={failureCodes} onChange={e => setFailureCodes(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Secured (TLS)</label>
              <select value={String(secured)} onChange={e => setSecured(e.target.value === 'true')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add OAuth Server'}
              </button>
            </div>
          </form>
        </div>
      )}

      {servers?.job?.stdout ? (
        <div style={{ marginBottom: 16 }}>
          {(() => {
            try {
              const raw = servers.job.stdout;
              const parsed = JSON.parse(raw);
              // Format: { "1": { address, ... }, "2": { ... } }
              let serverList: any[] = [];
              if (Array.isArray(parsed)) serverList = parsed;
              else if (parsed?.resources) serverList = parsed.resources;
              else if (typeof parsed === 'object') {
                serverList = Object.entries(parsed).map(([key, val]: [string, any]) => ({ _id: key, ...val }));
              }

              if (serverList.length === 0) return <div className="console">No OAuth servers configured</div>;

              return (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Address</th>
                      <th>Secured</th>
                      <th>App Group</th>
                      <th>Failure Codes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serverList.map((srv: any, i: number) => (
                      <tr key={i}>
                        <td>{srv._id || i + 1}</td>
                        <td>{srv.address || '-'}</td>
                        <td>{String(srv.secured ?? '-')}</td>
                        <td>{srv.appGrp || '-'}</td>
                        <td style={{ fontSize: 11 }}>{(srv.failureCodes || []).join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            } catch {
              return (
                <div className="console" style={{ whiteSpace: 'pre-wrap' }}>
                  {servers.job.stdout}
                </div>
              );
            }
          })()}
        </div>
      ) : (
        <div className="console" style={{ marginBottom: 16 }}>Click "Refresh" to list current OAuth servers</div>
      )}

      <button className="btn btn-secondary" onClick={loadServers}>Refresh List</button>
    </div>
  );
}
