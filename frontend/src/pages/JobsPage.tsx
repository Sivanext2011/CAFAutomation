import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listJobs, getJob } from '../api/client';

export function JobsPage() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => { loadJobs(); }, []);

  useEffect(() => {
    const viewId = searchParams.get('view');
    if (viewId) selectJob(viewId);
  }, [searchParams]);

  async function loadJobs() {
    try {
      const result = await listJobs();
      setJobs(result.jobs || []);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function selectJob(jobId: string) {
    if (expandedId === jobId) {
      setExpandedId(null);
      setExpandedJob(null);
      return;
    }
    try {
      const result = await getJob(jobId);
      setExpandedId(jobId);
      setExpandedJob(result.job);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function statusBadge(status: string) {
    return <span className={`badge badge-${status}`}>{status.toUpperCase()}</span>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Job History</h1>
        <button className="btn btn-secondary" onClick={loadJobs}>Refresh</button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Operation</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(job => (
            <>
              <tr key={job.id}>
                <td>{new Date(job.created_at).toLocaleString()}</td>
                <td>{job.operation}</td>
                <td>{statusBadge(job.status)}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => selectJob(job.id)}>
                    {expandedId === job.id ? 'Hide' : 'View'}
                  </button>
                </td>
              </tr>
              {expandedId === job.id && expandedJob && (
                <tr key={`${job.id}-detail`}>
                  <td colSpan={4} style={{ padding: 0 }}>
                    <div style={{ padding: 12, background: '#0d1b2a', borderTop: '1px solid #0f3460' }}>
                      <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 8 }}>
                        <strong>Command:</strong> {expandedJob.command}
                      </p>
                      {expandedJob.input_payload && (
                        <>
                          <label style={{ color: '#90a4ae', fontSize: 12 }}>Input:</label>
                          <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 8, maxHeight: 120, overflow: 'auto' }}>
                            {JSON.stringify(expandedJob.input_payload, null, 2)}
                          </div>
                        </>
                      )}
                      <label style={{ color: '#90a4ae', fontSize: 12 }}>Execution Log:</label>
                      <div className="console" style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
                        {[expandedJob.stdout, expandedJob.stderr].filter(Boolean).join('\n') || 'No output'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
          {jobs.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#90a4ae' }}>No jobs yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
