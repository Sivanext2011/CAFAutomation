import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { SetupPage } from './pages/SetupPage';
import { NrfPage } from './pages/NrfPage';
import { SdpPage } from './pages/SdpPage';
import { DiameterPage } from './pages/DiameterPage';
import { ScpPage } from './pages/ScpPage';
import { SubAcctLocPage } from './pages/SubAcctLocPage';
import { MediationPage } from './pages/MediationPage';
import { AccessMgmtPage } from './pages/AccessMgmtPage';
import { AlarmsPage } from './pages/AlarmsPage';
import { BackupPage } from './pages/BackupPage';
import { CertMgmtPage } from './pages/CertMgmtPage';
import { DataCollectorPage } from './pages/DataCollectorPage';
import { XdcPage } from './pages/XdcPage';
import { TracePage } from './pages/TracePage';
import { EnmPage } from './pages/EnmPage';
import { SyslogPage } from './pages/SyslogPage';
import { JobsPage } from './pages/JobsPage';
import { ExcelUploadPage } from './pages/ExcelUploadPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <nav className="sidebar">
          <div className="sidebar-header">
            <h2>CAF Portal</h2>
          </div>
          <ul className="nav-list">
            <li><NavLink to="/setup">Setup</NavLink></li>
            <li><NavLink to="/excel">Excel Deploy</NavLink></li>
            <li><NavLink to="/nrf-servers">NRF Servers</NavLink></li>
            <li><NavLink to="/sdp">SDP Integration</NavLink></li>
            <li><NavLink to="/diameter">Diameter</NavLink></li>
            <li><NavLink to="/scp">SCP</NavLink></li>
            <li><NavLink to="/sub-acct-loc">Account Location</NavLink></li>
            <li><NavLink to="/mediation">Mediation</NavLink></li>
            <li><NavLink to="/access-mgmt">Access Mgmt</NavLink></li>
            <li><NavLink to="/alarms">Alarms</NavLink></li>
            <li><NavLink to="/backup">Backup</NavLink></li>
            <li><NavLink to="/certs">Certificates</NavLink></li>
            <li><NavLink to="/data-collect">Data Collection</NavLink></li>
            <li><NavLink to="/xdc">Extended DC</NavLink></li>
            <li><NavLink to="/trace">Trace</NavLink></li>
            <li><NavLink to="/enm">ENM</NavLink></li>
            <li><NavLink to="/syslog">Syslog</NavLink></li>
            <li><NavLink to="/jobs">Jobs</NavLink></li>
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<SetupPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/excel" element={<ExcelUploadPage />} />
            <Route path="/nrf-servers" element={<NrfPage />} />
            <Route path="/sdp" element={<SdpPage />} />
            <Route path="/diameter" element={<DiameterPage />} />
            <Route path="/scp" element={<ScpPage />} />
            <Route path="/sub-acct-loc" element={<SubAcctLocPage />} />
            <Route path="/mediation" element={<MediationPage />} />
            <Route path="/access-mgmt" element={<AccessMgmtPage />} />
            <Route path="/alarms" element={<AlarmsPage />} />
            <Route path="/backup" element={<BackupPage />} />
            <Route path="/certs" element={<CertMgmtPage />} />
            <Route path="/data-collect" element={<DataCollectorPage />} />
            <Route path="/xdc" element={<XdcPage />} />
            <Route path="/trace" element={<TracePage />} />
            <Route path="/enm" element={<EnmPage />} />
            <Route path="/syslog" element={<SyslogPage />} />
            <Route path="/jobs" element={<JobsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
