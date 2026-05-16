import { useState, useEffect } from 'react';
import { listNrfOauthServers, addNrfOauthServer, deleteNrfOauthServer } from '../api/client';

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

  async function handleDelete(serverId: string) {
    if (!confirm(`Delete NRF OAuth Server ${serverId}?`)) return;
    setError('');
    try {
      await deleteNrfOauthServer(serverId);
      setSuccess(`OAuth Server ${serverId} deleted`);
      loadServers();
    } catch (e: any) {
      setError(e.message);
    }
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

      <div className="console" style={{ marginBottom: 16 }}>
        {servers?.job?.stdout || 'Run "List OAuth Servers" to see current configuration'}
      </div>

      <button className="btn btn-secondary" onClick={loadServers}>Refresh List</button>
    </div>
  );
}
