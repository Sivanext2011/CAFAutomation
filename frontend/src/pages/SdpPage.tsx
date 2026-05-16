import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listSdpRealms, updateSdpRealms, listSdpPeers, updateSdpPeers } from '../api/client';

export function SdpPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'realms' | 'peers'>('realms');
  const [realmsOutput, setRealmsOutput] = useState('');
  const [peersOutput, setPeersOutput] = useState('');
  const [realmsJson, setRealmsJson] = useState('');
  const [peersJson, setPeersJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ type: 'success' | 'error'; message: string; jobId?: string } | null>(null);

  async function handleListRealms() {
    setLoading(true);
    try {
      const result = await listSdpRealms();
      setRealmsOutput(result.job?.stdout || 'No output');
      if (result.job?.stdout) {
        try { setRealmsJson(JSON.stringify(JSON.parse(result.job.stdout), null, 2)); } catch {}
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleUpdateRealms() {
    if (!realmsJson.trim()) { setPopup({ type: 'error', message: 'Realms JSON is empty' }); return; }
    setLoading(true);
    try {
      const payload = JSON.parse(realmsJson);
      const result = await updateSdpRealms(payload);
      const job = result.job;
      if (job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to update realms', jobId: job.id });
      } else {
        setPopup({ type: 'success', message: 'Realms updated successfully', jobId: job?.id });
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleDeleteAllRealms() {
    if (!confirm('Delete ALL SDP realms? This will remove all external rating routing.')) return;
    setLoading(true);
    try {
      const result = await updateSdpRealms([]);
      const job = result.job;
      if (job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to delete realms', jobId: job.id });
      } else {
        setPopup({ type: 'success', message: 'All SDP realms deleted', jobId: job?.id });
        setRealmsJson('[]');
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleListPeers() {
    setLoading(true);
    try {
      const result = await listSdpPeers();
      setPeersOutput(result.job?.stdout || 'No output');
      if (result.job?.stdout) {
        try { setPeersJson(JSON.stringify(JSON.parse(result.job.stdout), null, 2)); } catch {}
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleUpdatePeers() {
    if (!peersJson.trim()) { setPopup({ type: 'error', message: 'Peers JSON is empty' }); return; }
    setLoading(true);
    try {
      const payload = JSON.parse(peersJson);
      const result = await updateSdpPeers(payload);
      const job = result.job;
      if (job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to update peers', jobId: job.id });
      } else {
        setPopup({ type: 'success', message: 'Peers updated successfully', jobId: job?.id });
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  async function handleDeleteAllPeers() {
    if (!confirm('Delete ALL SDP peers? This will remove all external rating peer connections.')) return;
    setLoading(true);
    try {
      const result = await updateSdpPeers([]);
      const job = result.job;
      if (job?.status === 'failed') {
        setPopup({ type: 'error', message: 'Failed to delete peers', jobId: job.id });
      } else {
        setPopup({ type: 'success', message: 'All SDP peers deleted', jobId: job?.id });
        setPeersJson('[]');
      }
    } catch (e: any) { setPopup({ type: 'error', message: e.message }); }
    setLoading(false);
  }

  function loadTemplate() {
    if (tab === 'realms') {
      setRealmsJson(JSON.stringify([{
        realm: "sdp01.sdp.example.com",
        appGrp: "cha1",
        sdp_id: ["sdp01.cs.", "10.216.230.37"],
        applications: ["16777232", "16777302", "16777304"],
        strategy: "round-robin",
        addresses: [{
          index: 1,
          peerAddresses: ["aaa://sdp-peer1.example.com:3868;transport=sctp"]
        }]
      }], null, 2));
    } else {
      setPeersJson(JSON.stringify([{
        peer: "aaa://sdp-peer1.example.com:3868;transport=sctp",
        appGrp: "cha1",
        initiateConnection: true,
        raiseAlarm: true,
        connectAddresses: ["10.61.44.127"]
      }], null, 2));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>SDP Integration</h1>
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

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <button className={`btn ${tab === 'realms' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('realms')}>
          Realms
        </button>
        <button className={`btn ${tab === 'peers' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('peers')}>
          Peers
        </button>
      </div>

      {/* Realms Tab */}
      {tab === 'realms' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={handleListRealms} disabled={loading}>
              {loading ? 'Loading...' : 'List Realms'}
            </button>
            <button className="btn btn-secondary" onClick={loadTemplate}>Load Template</button>
            <button className="btn btn-danger" onClick={handleDeleteAllRealms} disabled={loading}>
              Delete All Realms
            </button>
          </div>

          {realmsOutput && (
            <>
              <label style={{ color: '#90a4ae', fontSize: 12 }}>Current Realms:</label>
              <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 12, maxHeight: 200, overflow: 'auto' }}>
                {realmsOutput}
              </div>
            </>
          )}

          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Realms JSON (replaces entire configuration):</label>
          <textarea
            value={realmsJson}
            onChange={e => setRealmsJson(e.target.value)}
            style={{ width: '100%', minHeight: 250, background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}
            placeholder='[{"realm": "sdp01.sdp.example.com", "appGrp": "cha1", ...}]'
          />
          <button className="btn btn-primary" onClick={handleUpdateRealms} disabled={loading}>
            {loading ? 'Updating...' : 'Deploy Realms'}
          </button>
        </div>
      )}

      {/* Peers Tab */}
      {tab === 'peers' && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-secondary" onClick={handleListPeers} disabled={loading}>
              {loading ? 'Loading...' : 'List Peers'}
            </button>
            <button className="btn btn-secondary" onClick={loadTemplate}>Load Template</button>
            <button className="btn btn-danger" onClick={handleDeleteAllPeers} disabled={loading}>
              Delete All Peers
            </button>
          </div>

          {peersOutput && (
            <>
              <label style={{ color: '#90a4ae', fontSize: 12 }}>Current Peers:</label>
              <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 12, maxHeight: 200, overflow: 'auto' }}>
                {peersOutput}
              </div>
            </>
          )}

          <label style={{ color: '#4fc3f7', fontSize: 12 }}>Peers JSON (replaces entire configuration):</label>
          <textarea
            value={peersJson}
            onChange={e => setPeersJson(e.target.value)}
            style={{ width: '100%', minHeight: 250, background: '#0d1b2a', color: '#e0e0e0', border: '1px solid #0f3460', borderRadius: 4, padding: 10, fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}
            placeholder='[{"peer": "aaa://sdp-peer1:3868;transport=sctp", "appGrp": "cha1", ...}]'
          />
          <button className="btn btn-primary" onClick={handleUpdatePeers} disabled={loading}>
            {loading ? 'Updating...' : 'Deploy Peers'}
          </button>
        </div>
      )}
    </div>
  );
}
