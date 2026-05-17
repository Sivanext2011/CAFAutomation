import { useState, useEffect } from 'react';
import { listNfProfileConfig } from '../api/client';

export function NfProfilePage() {
  const [profiles, setProfiles] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    try {
      const result = await listNfProfileConfig();
      setProfiles(result);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>NF Profile Configuration</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="console" style={{ marginBottom: 16 }}>
        {profiles?.job?.stdout || 'Loading NF Profile configuration...'}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-secondary" onClick={loadProfiles}>Refresh</button>
      </div>
    </div>
  );
}
