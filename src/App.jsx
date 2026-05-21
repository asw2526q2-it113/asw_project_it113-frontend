import { useState, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./style/App.css";

export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

const USERS = [
  { id: 1, username: "janobe05",    apiKey: "7926960220e90508d851ada1e272695cf2f7eb8c" },
  { id: 2, username: "laiacladjor", apiKey: "4c6723bca35ff43bb65204135e906a6ec2a6bb6a" },
  { id: 3, username: "terceruser",  apiKey: "POSA_AQUI_API_KEY_3" },
  { id: 4, username: "laiagesse3",  apiKey: "4fc722f8efc46f36771fbf746e92ff8798bbfe88" },
  { id: 5, username: "alex.gomez.rodriguez", apiKey: "8366834c4f4738635eb81d6445c18de117b146a3"},
];

import IssueList   from "./pages/IssueList";
import IssueDetail from "./pages/IssueDetail";
import IssueForm   from "./pages/IssueForm";
import Settings    from "./pages/Settings";
import UserProfile from "./pages/UserProfile";
import BulkInsert  from "./pages/BulkInsert";

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sb-logo">
        <img src="/src/assets/taiga-logo.png" alt="Taiga" />
      </div>

      <NavLink to="/" end className={({ isActive }) => `sb-icon${isActive ? " active" : ""}`} title="Issues">
        <svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>
      </NavLink>

      <div className="sb-spacer" />

      <NavLink to="/settings" className={({ isActive }) => `sb-icon${isActive ? " active" : ""}`} title="Settings">
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      </NavLink>
    </nav>
  );
}

function Topbar({ currentUser, onUserChange }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <svg viewBox="0 0 24 24">
          <path d="M3 6h5l2 2h11v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/>
        </svg>
        <strong>Projects</strong>
      </div>

      <div className="topbar-right">
        <div className="user-selector-wrap">
          <label className="user-selector-label">Usuari:</label>
          <select
            className="user-selector-select"
            value={currentUser.id}
            onChange={e => {
              const selected = USERS.find(u => u.id === parseInt(e.target.value));
              onUserChange(selected);
            }}
          >
            {USERS.map(u => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
        </div>

        <NavLink to={`/users/${currentUser.username}`} className="user-avatar" title={currentUser.username}>
          {currentUser.username[0].toUpperCase()}
        </NavLink>
      </div>
    </header>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(USERS[0]);

  return (
    <UserContext.Provider value={currentUser}>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <div className="main-wrapper">
            <Topbar currentUser={currentUser} onUserChange={setCurrentUser} />
            <main className="page-content">
              <Routes>
                <Route path="/"                element={<IssueList />} />
                <Route path="/issues/new"      element={<IssueForm />} />
                <Route path="/issues/bulk"     element={<BulkInsert />} />
                <Route path="/issues/:pk"      element={<IssueDetail />} />
                <Route path="/issues/:pk/edit" element={<IssueForm />} />
                <Route path="/settings"        element={<Settings />} />
                <Route path="/users/:username" element={<UserProfile />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </UserContext.Provider>
  );
}
