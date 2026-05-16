import { useState, useEffect } from 'react';
import { listRegistrationProperties, updateRegistrationProperties } from '../api/client';

export function RegistrationPropertiesPage() {
  const [current, setCurrent] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [nfRegistrationScope, setNfRegistrationScope] = useState('nnrf-nfm');
  const [retries, setRetries] = useState(3);
  const [retryInterval, setRetryInterval] = useState(30);
  const [targetNfType, setTargetNfType] = useState('NRF');
  const [responseTimeout, setResponseTimeout] = useState(1000);
  const [connectionTimeout, setConnectionTimeout] = useState(10);

  useEffect(() => { loadProperties(); }, []);

  async function loadProperties() {
    try {
      const result = await listRegistrationProperties();
      setCurrent(result);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      await updateRegistrationProperties({
        nf_registration_scope: nfRegistrationScope,
        retries_for_nrf_connection: retries,
        retry_interval_for_nrf_connection: retryInterval,
        target_nf_type: targetNfType,
        response_timeout: responseTimeout,
        connection_timeout: connectionTimeout,
      });
      setSuccess('Registration properties updated');
      loadProperties();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Registration Properties</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="console" style={{ marginBottom: 20 }}>
        {current?.job?.stdout || 'Loading current properties...'}
      </div>

      <div className="form-panel">
        <h3 style={{ marginBottom: 16, color: '#4fc3f7' }}>Update Properties</h3>
        <form onSubmit={handleUpdate}>
          <div className="form-group">
            <label>NF Registration Scope</label>
            <input value={nfRegistrationScope} onChange={e => setNfRegistrationScope(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Retries for NRF Connection</label>
            <input type="number" value={retries} onChange={e => setRetries(Number(e.target.value))} min={0} />
          </div>
          <div className="form-group">
            <label>Retry Interval (seconds)</label>
            <input type="number" value={retryInterval} onChange={e => setRetryInterval(Number(e.target.value))} min={0} />
          </div>
          <div className="form-group">
            <label>Target NF Type</label>
            <input value={targetNfType} onChange={e => setTargetNfType(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Response Timeout (ms, 0-1000000)</label>
            <input type="number" value={responseTimeout} onChange={e => setResponseTimeout(Number(e.target.value))} min={0} max={1000000} />
          </div>
          <div className="form-group">
            <label>Connection Timeout (seconds, 0-1000)</label>
            <input type="number" value={connectionTimeout} onChange={e => setConnectionTimeout(Number(e.target.value))} min={0} max={1000} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Properties'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={loadProperties}>Refresh</button>
          </div>
        </form>
      </div>
    </div>
  );
}
