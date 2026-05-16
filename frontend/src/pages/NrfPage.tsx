import { useState } from 'react';
import { NrfServersPage } from './NrfServersPage';
import { OauthServersPage } from './OauthServersPage';
import { RegistrationPropertiesPage } from './RegistrationPropertiesPage';
import { NfProfilePage } from './NfProfilePage';

const tabs = [
  { id: 'servers', label: 'NRF Servers' },
  { id: 'oauth', label: 'OAuth Servers' },
  { id: 'registration', label: 'Registration Props' },
  { id: 'nfprofile', label: 'NF Profile' },
] as const;

type TabId = typeof tabs[number]['id'];

export function NrfPage() {
  const [activeTab, setActiveTab] = useState<TabId>('servers');

  return (
    <div>
      <div className="subtabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`subtab ${activeTab === tab.id ? 'subtab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        {activeTab === 'servers' && <NrfServersPage />}
        {activeTab === 'oauth' && <OauthServersPage />}
        {activeTab === 'registration' && <RegistrationPropertiesPage />}
        {activeTab === 'nfprofile' && <NfProfilePage />}
      </div>
    </div>
  );
}
