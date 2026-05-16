import { useState, useEffect } from 'react';
import { listNfProfileConfig, deleteNfProfileConfig } from '../api/client';

export function NfProfilePage() {
  const [profiles, setProfiles] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadProfiles(); }, []);

  async function loadProfiles() {
    try {
      const result = await listNfProfileConfig();
      setProfiles(result);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function handleDelete(appGroup: string) {
    if (!confirm(`Delete NF Profile Config for ${appGroup}?`)) return;
    setError(''); setSuccess('');
    try {
      await deleteNfProfileConfig(appGroup);
      setSuccess(`NF Profile Config for ${appGroup} deleted`);
      loadProfiles();
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
      {success && <div className="alert alert-success">{success}</div>}

      <div className="console" style={{ marginBottom: 16 }}>
        {profiles?.job?.stdout || 'Loading NF Profile configuration...'}
      </div>

      <button className="btn btn-secondary" onClick={loadProfiles}>Refresh</button>
    </div>
  );
}
