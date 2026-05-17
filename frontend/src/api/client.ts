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
export const setSendReplyUnknown = (data: any) =>
  request<any>('/diameter/send-reply-unknown', { method: 'POST', body: JSON.stringify(data) });
export const getDiameterAllConfig = () => request<any>('/diameter/all-config');
export const getDiameterGlobalConfig = () => request<any>('/diameter/global-config');
export const getDiameterAppgroups = () => request<any>('/diameter/appgroups');
export const getDiameterAppgroup = (appGrp: string) => request<any>(`/diameter/appgroup/${appGrp}`);
export const deleteDiameterAppgroup = (appGrp: string) =>
  request<any>(`/diameter/appgroup/${appGrp}`, { method: 'DELETE' });
export const addOwnDiameterIdentity = (data: any) =>
  request<any>('/diameter/own-identity', { method: 'POST', body: JSON.stringify(data) });
export const getOwnDiameterIdentities = (appGrp: string) => request<any>(`/diameter/own-identities/${appGrp}`);

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

// Subscriber Account Location Management
export const listPartitions = () => request<any>('/sub-acct-loc/partitions');
export const listAllSubAcctLoc = () => request<any>('/sub-acct-loc/configs');
export const listSubAcctLoc = (sdpName: string) => request<any>(`/sub-acct-loc/configs/${sdpName}`);
export const createSubAcctLoc = (data: any) =>
  request<any>('/sub-acct-loc/configs', { method: 'POST', body: JSON.stringify(data) });
export const editSubAcctLoc = (sdpName: string, data: any) =>
  request<any>(`/sub-acct-loc/configs/${sdpName}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteSubAcctLoc = (sdpName: string) =>
  request<any>(`/sub-acct-loc/configs/${sdpName}`, { method: 'DELETE' });
export const bulkCreateSubAcctLoc = (data: any[]) =>
  request<any>('/sub-acct-loc/bulk', { method: 'POST', body: JSON.stringify(data) });

// Mediation (EDM)
export const edmTransformList = (schemaName?: string) =>
  request<any>(`/mediation/transform/list${schemaName ? `?schema_name=${schemaName}` : ''}`);
export const edmTransformActive = () => request<any>('/mediation/transform/active');
export const edmTransformActivate = (data: any) =>
  request<any>('/mediation/transform/activate', { method: 'POST', body: JSON.stringify(data) });
export const edmTransformDelete = (data: any) =>
  request<any>('/mediation/transform/delete', { method: 'POST', body: JSON.stringify(data) });
export const edmDestList = (partition?: string) =>
  request<any>(`/mediation/destination/list${partition ? `?customer_partition=${partition}` : ''}`);
export const edmDestGet = (partition?: string) =>
  request<any>(`/mediation/destination/get${partition ? `?customer_partition=${partition}` : ''}`);
export const edmDestAdd = (data: any) =>
  request<any>('/mediation/destination/add', { method: 'POST', body: JSON.stringify(data) });
export const edmDestDelete = (partition: string, fileType?: string) =>
  request<any>(`/mediation/destination/${partition}${fileType ? `?file_type=${fileType}` : ''}`, { method: 'DELETE' });
export const edmDestRetransmitKey = (partition: string, destType: string) =>
  request<any>('/mediation/destination/retransmit-key', { method: 'POST', body: JSON.stringify({ customerPartition: partition, sftpDestinationType: destType }) });
export const edmDestRetransmitKeys = (partition: string) =>
  request<any>('/mediation/destination/retransmit-keys', { method: 'POST', body: JSON.stringify({ customerPartition: partition }) });
export const edmSnapshotDestList = (partition?: string) =>
  request<any>(`/mediation/snapshot-dest/list${partition ? `?customer_partition=${partition}` : ''}`);
export const edmSnapshotDestGet = (partition?: string) =>
  request<any>(`/mediation/snapshot-dest/get${partition ? `?customer_partition=${partition}` : ''}`);
export const edmSnapshotDestAdd = (data: any) =>
  request<any>('/mediation/snapshot-dest/add', { method: 'POST', body: JSON.stringify(data) });
export const edmSnapshotDestDelete = (partition: string, fileType?: string) =>
  request<any>(`/mediation/snapshot-dest/${partition}${fileType ? `?file_type=${fileType}` : ''}`, { method: 'DELETE' });
export const edmAsnList = () => request<any>('/mediation/asn/list');
export const edmAsnDelete = (data: any) =>
  request<any>('/mediation/asn/delete', { method: 'POST', body: JSON.stringify(data) });
export const edmAsnGetAll = () => request<any>('/mediation/asn/get-all');
export const edmAppConfigGet = (key?: string) =>
  request<any>(`/mediation/appconfig/get${key ? `?key=${key}` : ''}`);
export const edmAppConfigUpdate = (data: any) =>
  request<any>('/mediation/appconfig/update', { method: 'POST', body: JSON.stringify(data) });
export const edmSnapshotAppConfigGet = (key?: string) =>
  request<any>(`/mediation/snapshot-appconfig/get${key ? `?key=${key}` : ''}`);
export const edmSnapshotAppConfigUpdate = (data: any) =>
  request<any>('/mediation/snapshot-appconfig/update', { method: 'POST', body: JSON.stringify(data) });
export const edmDataFormatGet = () => request<any>('/mediation/dataformat/get');
export const edmDataFormatUpdate = (data: any) =>
  request<any>('/mediation/dataformat/update', { method: 'POST', body: JSON.stringify(data) });
export const edmStaleStatus = () => request<any>('/mediation/stale/status');
export const edmStaleRemove = (data: any) =>
  request<any>('/mediation/stale/remove', { method: 'POST', body: JSON.stringify(data) });
export const edmStalePublish = (data: any) =>
  request<any>('/mediation/stale/publish', { method: 'POST', body: JSON.stringify(data) });

// Access Management
export const resetPassword = (data: any) =>
  request<any>('/access-mgmt/reset-password', { method: 'POST', body: JSON.stringify(data) });
export const getLegalWarning = () => request<any>('/access-mgmt/legal-warning');
export const updateLegalWarning = (data: any) =>
  request<any>('/access-mgmt/legal-warning', { method: 'POST', body: JSON.stringify(data) });
export const getPrivacyNotice = () => request<any>('/access-mgmt/privacy-notice');
export const updatePrivacyNotice = (data: any) =>
  request<any>('/access-mgmt/privacy-notice', { method: 'POST', body: JSON.stringify(data) });
export const exportRealm = (data: any) =>
  request<any>('/access-mgmt/export-realm', { method: 'POST', body: JSON.stringify(data) });
export const importRealm = (data: any) =>
  request<any>('/access-mgmt/import-realm', { method: 'POST', body: JSON.stringify(data) });

// Alarms
export const listAllAlarms = (outputformat?: string) =>
  request<any>(`/alarms/list${outputformat ? `?outputformat=${outputformat}` : ''}`);
export const getAlarm = (data: any) =>
  request<any>('/alarms/get', { method: 'POST', body: JSON.stringify(data) });
export const clearAlarm = (data: any) =>
  request<any>('/alarms/clear', { method: 'POST', body: JSON.stringify(data) });

// Backup & Restore
export const backupHealth = () => request<any>('/backup/health');
export const backupListManagers = () => request<any>('/backup/managers');
export const backupListBackups = (brmId: string) => request<any>(`/backup/managers/${brmId}/backups`);
export const backupCreate = (brmId: string, name: string) =>
  request<any>(`/backup/managers/${brmId}/backups`, { method: 'POST', body: JSON.stringify({ name }) });
export const backupGet = (brmId: string, name: string) => request<any>(`/backup/managers/${brmId}/backups/${name}`);
export const backupDelete = (brmId: string, name: string) =>
  request<any>(`/backup/managers/${brmId}/backups/${name}`, { method: 'DELETE' });
export const backupRestore = (brmId: string, name: string) =>
  request<any>(`/backup/managers/${brmId}/backups/${name}/restore`, { method: 'POST' });
export const backupExport = (brmId: string, name: string, data: any) =>
  request<any>(`/backup/managers/${brmId}/backups/${name}/export`, { method: 'POST', body: JSON.stringify(data) });
export const backupImport = (brmId: string, data: any) =>
  request<any>(`/backup/managers/${brmId}/import`, { method: 'POST', body: JSON.stringify(data) });
export const backupListTasks = (brmId: string) => request<any>(`/backup/managers/${brmId}/tasks`);
export const backupLastTask = (brmId: string) => request<any>(`/backup/managers/${brmId}/last-task`);
export const backupListSftp = (brmId: string) => request<any>(`/backup/managers/${brmId}/sftp-servers`);
export const backupCreateSftp = (brmId: string, data: any) =>
  request<any>(`/backup/managers/${brmId}/sftp-servers`, { method: 'POST', body: JSON.stringify(data) });
export const backupDeleteSftp = (brmId: string, name: string) =>
  request<any>(`/backup/managers/${brmId}/sftp-servers/${name}`, { method: 'DELETE' });
export const backupGetHousekeeping = (brmId: string) => request<any>(`/backup/managers/${brmId}/housekeeping`);
export const backupPatchHousekeeping = (brmId: string, data: any) =>
  request<any>(`/backup/managers/${brmId}/housekeeping`, { method: 'POST', body: JSON.stringify(data) });
export const backupCreatePeriodic = (brmId: string, data: any) =>
  request<any>(`/backup/managers/${brmId}/periodic-schedule`, { method: 'POST', body: JSON.stringify(data) });
export const backupCreateCalendar = (brmId: string, data: any) =>
  request<any>(`/backup/managers/${brmId}/calendar-schedule`, { method: 'POST', body: JSON.stringify(data) });

// Certificate Management
export const getCertMappings = () => request<any>('/cert-mgmt/mappings');
export const saveCertMappings = (data: any) =>
  request<any>('/cert-mgmt/mappings', { method: 'POST', body: JSON.stringify(data) });
export const installCertKey = (data: any) =>
  request<any>('/cert-mgmt/install-key', { method: 'POST', body: JSON.stringify(data) });
export const trustCertCa = (data: any) =>
  request<any>('/cert-mgmt/trust-ca', { method: 'POST', body: JSON.stringify(data) });
export const listCertKeys = () => request<any>('/cert-mgmt/keys');
export const getCertKey = (name: string) => request<any>(`/cert-mgmt/keys/${name}`);
export const deleteCertKey = (name: string) => request<any>(`/cert-mgmt/keys/${name}`, { method: 'DELETE' });
export const listCertTrusted = () => request<any>('/cert-mgmt/trusted');
export const getCertTrusted = (name: string) => request<any>(`/cert-mgmt/trusted/${name}`);
export const deleteCertTrusted = (name: string) => request<any>(`/cert-mgmt/trusted/${name}`, { method: 'DELETE' });
export const listCertCmp = () => request<any>('/cert-mgmt/cmp-groups');
export const listCertCrls = () => request<any>('/cert-mgmt/crls');
export const renewCertKey = (name: string, data: any) =>
  request<any>(`/cert-mgmt/renew/${name}`, { method: 'POST', body: JSON.stringify(data) });

// Data Collector
export const dataCollectorCollect = (profile: string) =>
  request<any>('/data-collector/collect', { method: 'POST', body: JSON.stringify({ profile }) });

// Extended Data Collection (XDC)
export const xdcGetTargets = () => request<any>('/xdc/targets');
export const xdcListCollections = () => request<any>('/xdc/collections');
export const xdcGetCollection = (id: string) => request<any>(`/xdc/collections/${id}`);
export const xdcDeleteCollection = (id: string) => request<any>(`/xdc/collections/${id}`, { method: 'DELETE' });
export const xdcCollectImmediate = (target: string, extra?: string) =>
  request<any>('/xdc/collect-immediate', { method: 'POST', body: JSON.stringify({ target, extra }) });
export const xdcNewCollection = (target: string, extra?: string) =>
  request<any>('/xdc/new-collection', { method: 'POST', body: JSON.stringify({ target, extra }) });
export const xdcGetFile = (id: string) =>
  request<any>(`/xdc/get-file/${id}`, { method: 'POST' });
export const xdcConfigView = () => request<any>('/xdc/config');

// Trace Management
export const traceListJobs = (iface?: string, criteriaType?: string) => {
  const params = new URLSearchParams();
  if (iface) params.set('interface', iface);
  if (criteriaType) params.set('criteria_type', criteriaType);
  const q = params.toString();
  return request<any>(`/trace/jobs${q ? `?${q}` : ''}`);
};
export const traceGetJob = (id: string) => request<any>(`/trace/jobs/${id}`);
export const traceCreateJob = (data: any) =>
  request<any>('/trace/jobs', { method: 'POST', body: JSON.stringify(data) });
export const traceDeleteJob = (id: string) => request<any>(`/trace/jobs/${id}`, { method: 'DELETE' });
export const traceStartJob = (id: string) => request<any>(`/trace/jobs/${id}/start`, { method: 'POST' });
export const traceStopJob = (id: string) => request<any>(`/trace/jobs/${id}/stop`, { method: 'POST' });
export const traceGetLogs = (id: string) => request<any>(`/trace/jobs/${id}/logs`);
export const traceDeleteByInterface = (data: any) =>
  request<any>('/trace/delete-by-interface', { method: 'POST', body: JSON.stringify(data) });
export const traceGetConfig = () => request<any>('/trace/config');
export const traceUpdateConfig = (data: any) =>
  request<any>('/trace/config', { method: 'POST', body: JSON.stringify(data) });

// WebSocket
export function connectJobWebSocket(jobId: string, onMessage: (msg: string) => void): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws/jobs/${jobId}`);
  ws.onmessage = (event) => onMessage(event.data);
  return ws;
}
