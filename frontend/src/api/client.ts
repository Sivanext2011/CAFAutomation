const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

// Setup
export const getSetupStatus = () => request<any>('/setup/status');
export const initializeSetup = (data: any) =>
  request<any>('/setup/initialize', { method: 'POST', body: JSON.stringify(data) });
export const login = (data: any) =>
  request<any>('/setup/login', { method: 'POST', body: JSON.stringify(data) });
export const redownloadBeamctl = () =>
  request<any>('/setup/redownload-beamctl', { method: 'POST' });

// Combined NRF Deployment
export const deployNrfConfiguration = (data: any) =>
  request<any>('/nrf/deploy', { method: 'POST', body: JSON.stringify(data) });

// NRF Servers
export const listNrfServers = () => request<any>('/nrf/servers');
export const addNrfServer = (data: any) =>
  request<any>('/nrf/servers', { method: 'POST', body: JSON.stringify(data) });
export const getNrfServer = (id: string) => request<any>(`/nrf/servers/${id}`);
export const deleteNrfServer = (id: string) =>
  request<any>(`/nrf/servers/${id}`, { method: 'DELETE' });

// NRF OAuth Servers
export const listNrfOauthServers = () => request<any>('/nrf/oauth-servers');
export const addNrfOauthServer = (data: any) =>
  request<any>('/nrf/oauth-servers', { method: 'POST', body: JSON.stringify(data) });
export const getNrfOauthServer = (id: string) => request<any>(`/nrf/oauth-servers/${id}`);
export const deleteNrfOauthServer = (id: string) =>
  request<any>(`/nrf/oauth-servers/${id}`, { method: 'DELETE' });

// Registration Properties
export const listRegistrationProperties = () => request<any>('/nrf/registration-properties');
export const updateRegistrationProperties = (data: any) =>
  request<any>('/nrf/registration-properties', { method: 'PUT', body: JSON.stringify(data) });

// NF Profile Config
export const listNfProfileConfig = () => request<any>('/nrf/nf-profile');
export const updateNfProfileConfig = (appGroup: string, data: any) =>
  request<any>(`/nrf/nf-profile/${appGroup}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteNfProfileConfig = (appGroup: string) =>
  request<any>(`/nrf/nf-profile/${appGroup}`, { method: 'DELETE' });

// Jobs
export const listJobs = (limit = 50) => request<any>(`/jobs?limit=${limit}`);
export const getJob = (id: string) => request<any>(`/jobs/${id}`);

// Certificate Generation
export const generateSelfSignedCert = (data: any) =>
  request<any>('/certs/generate', { method: 'POST', body: JSON.stringify(data) });
export const generateCsr = (data: any) =>
  request<any>('/certs/csr', { method: 'POST', body: JSON.stringify(data) });

// SDP Integration (External Rating)
export const listSdpRealms = () => request<any>('/sdp/realms');
export const updateSdpRealms = (data: any[]) =>
  request<any>('/sdp/realms', { method: 'POST', body: JSON.stringify(data) });
export const listSdpPeers = () => request<any>('/sdp/peers');
export const updateSdpPeers = (data: any[]) =>
  request<any>('/sdp/peers', { method: 'POST', body: JSON.stringify(data) });
export const checkSdpPeerStatus = (data: any) =>
  request<any>('/sdp/check-peer-status', { method: 'POST', body: JSON.stringify(data) });

// Diameter Integration
export const getDiameterProxies = (appGrp: string) => request<any>(`/diameter/proxies/${appGrp}`);
export const addDiameterProxy = (data: any) =>
  request<any>('/diameter/proxy', { method: 'POST', body: JSON.stringify(data) });
export const removeDiameterProxy = (data: any) =>
  request<any>('/diameter/proxy', { method: 'DELETE', body: JSON.stringify(data) });
export const getDiameterPeers = (appGrp: string) => request<any>(`/diameter/peers/${appGrp}`);
export const addDiameterPeer = (data: any) =>
  request<any>('/diameter/peer', { method: 'POST', body: JSON.stringify(data) });
export const removeDiameterPeer = (data: any) =>
  request<any>('/diameter/peer', { method: 'DELETE', body: JSON.stringify(data) });
export const diameterBulkAdd = (data: any) =>
  request<any>('/diameter/bulk', { method: 'POST', body: JSON.stringify(data) });
export const setRestrictPeerList = (data: any) =>
  request<any>('/diameter/restrict-peer-list', { method: 'POST', body: JSON.stringify(data) });

// SCP Integration
export const listScpServers = (appgroup?: string) =>
  request<any>(`/scp/servers${appgroup ? `?appgroup=${appgroup}` : ''}`);
export const addScpServer = (data: any) =>
  request<any>('/scp/servers', { method: 'POST', body: JSON.stringify(data) });
export const deleteScpServer = (id: string) =>
  request<any>(`/scp/servers/${id}`, { method: 'DELETE' });
export const listScpAppConfig = () => request<any>('/scp/app-config');
export const addScpAppConfig = (data: any) =>
  request<any>('/scp/app-config', { method: 'POST', body: JSON.stringify(data) });
export const deleteScpAppConfig = (appGroup: string) =>
  request<any>(`/scp/app-config/${appGroup}`, { method: 'DELETE' });
export const installScpSbiCert = (data: any) =>
  request<any>('/scp/install-sbi-cert', { method: 'POST', body: JSON.stringify(data) });
export const trustScpCa = (data: any) =>
  request<any>('/scp/trust-scp-ca', { method: 'POST', body: JSON.stringify(data) });

// WebSocket
export function connectJobWebSocket(jobId: string, onMessage: (msg: string) => void): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/jobs/${jobId}`);
  ws.onmessage = (event) => onMessage(event.data);
  return ws;
}
