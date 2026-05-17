import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listAllSubAcctLoc, createSubAcctLoc, editSubAcctLoc, deleteSubAcctLoc, bulkCreateSubAcctLoc, listPartitions } from '../api/client';

interface LocEntry {
  name: string;
  ip: string;
  partitionId: string;
}

export function SubAcctLocPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'manage' | 'bulk'>('manage');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  // Current list
  const [configsOutput, setConfigsOutput] = useState('');
  const [partitionsOutput, setPartitionsOutput] = useState('');
  const [mappings, setMappings] = useState<any[]>([]);
  const [partitions, setPartitions] = useState<string[]>([]);

  // Single entry form
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [partitionId, setPartitionId] = useState('1');

  // Bulk
  const [bulkEntries, setBulkEntries] = useState<LocEntry[]>([{ name: '', ip: '', partitionId: '1' }]);
  const [bulkText, setBulkText] = useState('');
  const [inputMode, setInputMode] = useState<'form' | 'bulk'>('form');

  function showError(e: any) {
    const msg = typeof e === 'string' ? e : (typeof e?.message === 'string' ? e.message : String(e));
    setPopup({ type: 'error', message: msg });
  }

  async function handleListAll() {
    setLoading(true);
    try {
      const result = await listAllSubAcctLoc();
      const stdout = result.job?.stdout || '';
      setConfigsOutput(stdout);
      try {
        const parsed = JSON.parse(stdout);
        setMappings(parsed.resources || []);
      } catch { setMappings([]); }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleListPartitions() {
    setLoading(true);
    try {
      const result = await listPartitions();
      const stdout = result.job?.stdout || '';
      setPartitionsOutput(stdout);
      try {
        const parsed = JSON.parse(stdout);
        const parts = parsed.resources?.[0]?.activePartitions || [];
        setPartitions(parts);
      } catch { setPartitions([]); }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleCreate() {
    if (!name || !ip) { showError('Name and IP are required'); return; }
    setLoading(true);
    try {
      const result = await createSubAcctLoc({ name, ip, partitionId });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Create failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `${name} created`, jobId: result.job?.id });
        handleListAll();
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleEdit() {
    if (!name || !ip) { showError('Name and IP are required'); return; }
    setLoading(true);
    try {
      const result = await editSubAcctLoc(name, { ip, partitionId });
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Edit failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `${name} updated`, jobId: result.job?.id });
        handleListAll();
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  async function handleDelete(sdpName?: string) {
    const target = sdpName || name;
    if (!target) { showError('Name is required'); return; }
    if (!confirm(`Delete mapping for ${target}?`)) return;
    setLoading(true);
    try {
      const result = await deleteSubAcctLoc(target);
      if (result.job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Delete failed', jobId: result.job.id });
      } else {
        setPopup({ type: 'success', message: `${target} deleted`, jobId: result.job?.id });
        handleListAll();
      }
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  // Bulk
  function addBulkEntry() {
    setBulkEntries([...bulkEntries, { name: '', ip: '', partitionId: '1' }]);
  }

  function removeBulkEntry(i: number) {
    setBulkEntries(bulkEntries.filter((_, idx) => idx !== i));
  }

  function updateBulkEntry(i: number, field: keyof LocEntry, value: string) {
    const updated = [...bulkEntries];
    updated[i] = { ...updated[i], [field]: value };
    setBulkEntries(updated);
  }

  function parseBulkText(): LocEntry[] {
    return bulkText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('|').map(p => p.trim());
      return { name: parts[0] || '', ip: parts[1] || '', partitionId: parts[2] || '1' };
    }).filter(e => e.name && e.ip);
  }

  async function handleBulkCreate() {
    const entries = inputMode === 'form'
      ? bulkEntries.filter(e => e.name && e.ip)
      : parseBulkText();
    if (entries.length === 0) { showError('No valid entries'); return; }
    setLoading(true);
    try {
      const result = await bulkCreateSubAcctLoc(entries);
      const failed = (result.results || []).filter((r: any) => r.status === 'failed').length;
      if (failed > 0) {
        setPopup({ type: 'error', message: `${failed}/${entries.length} failed. Check Jobs.` });
      } else {
        setPopup({ type: 'success', message: `${entries.length} mapping(s) created` });
      }
      handleListAll();
    } catch (e: any) { showError(e); }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1>Subscriber Account Location</h1>
        <span style={{ color: '#90a4ae', fontSize: 12 }}>SDP Name ↔ IP ↔ Partition mapping</span>
      </div>

      {popup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', border: `1px solid ${popup.type === 'success' ? '#66bb6a' : '#ef5350'}`, borderRadius: 8, padding: 24, minWidth: 320, maxWidth: 480 }}>
            <h3 style={{ color: popup.type === 'success' ? '#66bb6a' : '#ef5350', marginBottom: 12 }}>
              {popup.type === 'success' ? '✓ Success' : '✗ Failed'}
            </h3>
            <p style={{ color: '#e0e0e0', marginBottom: 16 }}>{popup.message}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {popup.jobId && (
                <button className="btn btn-primary" onClick={() => { setPopup(null); navigate(`/jobs?view=${popup.jobId}`); }}>
                  View Execution Log
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setPopup(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button className={`btn ${tab === 'manage' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('manage')}>Manage</button>
        <button className={`btn ${tab === 'bulk' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('bulk')}>Bulk Add</button>
      </div>

      {/* Manage Tab */}
      {tab === 'manage' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={handleListAll} disabled={loading}>
              {loading ? 'Loading...' : 'List All Mappings'}
            </button>
            <button className="btn btn-secondary" onClick={handleListPartitions} disabled={loading}>
              List Partitions
            </button>
          </div>

          {partitions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Active Partitions</label>
              <table className="data-table" style={{ marginTop: 4 }}>
                <thead><tr><th>Partition ID</th></tr></thead>
                <tbody>
                  {partitions.map((p, i) => <tr key={i}><td>{p}</td></tr>)}
                </tbody>
              </table>
            </div>
          )}
          {!partitions.length && partitionsOutput && (
            <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 8, maxHeight: 80, overflow: 'auto' }}>{partitionsOutput}</div>
          )}

          {mappings.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Mappings ({mappings.length})</label>
              <table className="data-table" style={{ marginTop: 4 }}>
                <thead><tr><th>SDP Name</th><th>IP Address</th><th>Partition ID</th><th>Last Updated</th><th></th></tr></thead>
                <tbody>
                  {mappings.map((m, i) => (
                    <tr key={i}>
                      <td>{m.name}</td>
                      <td>{m.ip}</td>
                      <td>{m.partitionId}</td>
                      <td style={{ fontSize: 11 }}>{m.lastUpdatedDateTime || '-'}</td>
                      <td><button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => handleDelete(m.name)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!mappings.length && configsOutput && (
            <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 16, maxHeight: 200, overflow: 'auto' }}>{configsOutput}</div>
          )}

          {/* Add/Edit/Delete Form */}
          <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, maxWidth: 500 }}>
            <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Create / Edit / Delete Mapping</label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 8, marginTop: 8 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>SDP Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="sdp01.cs." />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>IP Address *</label>
                <input value={ip} onChange={e => setIp(e.target.value)} placeholder="12.23.34.45" />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Partition ID</label>
                <input value={partitionId} onChange={e => setPartitionId(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>Create</button>
              <button className="btn btn-secondary" onClick={handleEdit} disabled={loading}>Update</button>
              <button className="btn btn-danger" onClick={() => handleDelete()} disabled={loading}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Tab */}
      {tab === 'bulk' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className={`btn ${inputMode === 'form' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('form')}>Row-by-Row</button>
            <button className={`btn ${inputMode === 'bulk' ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }} onClick={() => setInputMode('bulk')}>Bulk Paste</button>
          </div>

          {inputMode === 'form' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Entries ({bulkEntries.length})</label>
                <button className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }} onClick={addBulkEntry}>+ Add Row</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#90a4ae', fontSize: 11 }}>
                    <th style={{ textAlign: 'left', padding: '4px', width: '35%' }}>SDP Name *</th>
                    <th style={{ textAlign: 'left', padding: '4px', width: '35%' }}>IP Address *</th>
                    <th style={{ textAlign: 'left', padding: '4px', width: '20%' }}>Partition ID</th>
                    <th style={{ width: '10%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {bulkEntries.map((entry, i) => (
                    <tr key={i}>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.name} onChange={e => updateBulkEntry(i, 'name', e.target.value)} placeholder="sdp01.cs." style={{ width: '100%', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.ip} onChange={e => updateBulkEntry(i, 'ip', e.target.value)} placeholder="12.23.34.45" style={{ width: '100%', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '2px 4px' }}>
                        <input value={entry.partitionId} onChange={e => updateBulkEntry(i, 'partitionId', e.target.value)} style={{ width: '100%', fontSize: 12 }} />
                      </td>
                      <td style={{ padding: '2px 4px', textAlign: 'center' }}>
                        {bulkEntries.length > 1 && (
                          <button className="btn btn-danger" style={{ fontSize: 10, padding: '2px 6px' }} onClick={() => removeBulkEntry(i)}>✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {inputMode === 'bulk' && (
            <div style={{ padding: 12, border: '1px solid #0f3460', borderRadius: 4, marginBottom: 12 }}>
              <label style={{ color: '#4fc3f7', fontSize: 12, fontWeight: 600 }}>Bulk Paste (one per line)</label>
              <p style={{ color: '#90a4ae', fontSize: 11, margin: '4px 0 8px' }}>
                Format: <code style={{ color: '#4fc3f7' }}>sdp_name | ip | partition_id</code>
              </p>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                rows={8}
                style={{ width: '100%', background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12 }}
                placeholder={`sdp01.cs. | 12.23.34.45 | 1\nsdp02.cs. | 12.23.34.46 | 1\nsdp03.cs. | 10.216.230.37 | 2`}
              />
              <p style={{ color: '#90a4ae', fontSize: 11, marginTop: 4 }}>
                {parseBulkText().length} entry(s) detected
              </p>
            </div>
          )}

          <button className="btn btn-primary" onClick={handleBulkCreate} disabled={loading}>
            {loading ? 'Creating...' : `Create All (${inputMode === 'form' ? bulkEntries.filter(e => e.name && e.ip).length : parseBulkText().length})`}
          </button>
        </div>
      )}
    </div>
  );
}
