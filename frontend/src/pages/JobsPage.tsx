import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listJobs, getJob } from '../api/client';

export function JobsPage() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
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
    try {
      const result = await getJob(jobId);
      setSelectedJob(result.job);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function statusBadge(status: string) {
    const cls = `badge badge-${status}`;
    return <span className={cls}>{status.toUpperCase()}</span>;
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
            <tr key={job.id}>
              <td>{new Date(job.created_at).toLocaleString()}</td>
              <td>{job.operation}</td>
              <td>{statusBadge(job.status)}</td>
              <td>
                <button className="btn btn-secondary" onClick={() => selectJob(job.id)}>
                  View
                </button>
              </td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr><td colSpan={4} style={{ textAlign: 'center', color: '#90a4ae' }}>No jobs yet</td></tr>
          )}
        </tbody>
      </table>

      {selectedJob && (
        <div style={{ marginTop: 20 }}>
          <div className="card">
            <h3 style={{ color: '#4fc3f7', marginBottom: 8 }}>
              {selectedJob.operation} — {statusBadge(selectedJob.status)}
            </h3>
            <p style={{ color: '#90a4ae', fontSize: 12, marginBottom: 8 }}>
              Command: {selectedJob.command}
            </p>
            {selectedJob.input_payload && (
              <>
                <label style={{ color: '#90a4ae', fontSize: 12 }}>Input:</label>
                <div className="console" style={{ whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                  {JSON.stringify(selectedJob.input_payload, null, 2)}
                </div>
              </>
            )}
            <label style={{ color: '#90a4ae', fontSize: 12 }}>Execution Log:</label>
            <div className="console" style={{ whiteSpace: 'pre-wrap' }}>
              {[selectedJob.stdout, selectedJob.stderr].filter(Boolean).join('\n') || 'No output'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
