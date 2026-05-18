import { useState, useEffect } from "react";
import { useUser } from "../App";
import { issuesApi } from "../api/issues";
import { settingsApi} from "../api/settings.js";
import { usersApi} from "../api/users.js";
import "../style/issues_table_list.css";
import { Link, useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";

export default function IssueList() {
  const navigate = useNavigate();
  const currentUser = useUser();
  const apiIssues = issuesApi(currentUser.apiKey);
  const apiUsers = usersApi(currentUser.apiKey);
  const apiSettings = settingsApi(currentUser.apiKey);
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.message || "");


  const [data, setData] = useState({
    issues: [], all_users: [], filters: {
      type: [], severity: [], priority: [], status: [], tag: [], assigned_to: [], order_by: "", q: ""
    },
    types: [], severities: [], priorities: [], statuses: [], tags: [], users: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const [tagsVisible, setTagsVisible] = useState(true);
  const [pendingFilters, setPendingFilters] = useState(data.filters);

  const refreshIssues = async (filtersToUse) => {
    try {
      const resIssues = await apiIssues.list(filtersToUse);
      setData(prev => ({
        ...prev,
        issues: resIssues.data.issues || []
      }));
    } catch (err) {
      console.error("Error filtrant issues:", err);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [resIssues, resUsers, resSettings] = await Promise.all([
        apiIssues.list(data.filters),
        apiUsers.list(),
        apiSettings.getAll()
      ]);
      setData({
        issues: resIssues.data.issues || [],
        all_users: resUsers.data || [],
        types: resSettings.data.types || [],
        severities: resSettings.data.severities || [],
        priorities: resSettings.data.priorities || [],
        statuses: resSettings.data.statuses || [],
        tags: resSettings.data.tags || [],
        users: resUsers.data || [],
        filters: data.filters,
      });
    } catch {
      setError("Error carregant la pàgina principal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, [currentUser]);
  useEffect(() => {
    document.body.classList.toggle("tags-hidden", !tagsVisible);
  }, [tagsVisible]);
  useEffect(() => {
    setPendingFilters(data.filters);
  }, [data.filters]);


  if (loading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading issues…</div>;
  if (error) return <div style={{ padding: 40, color: "#dc2626" }}>{error}</div>;

  const isChecked = (filterType, id) =>
    (pendingFilters[filterType] || []).map(String).includes(String(id));

  const handleSearchChange = e => {
    setPendingFilters({ ...pendingFilters, q: e.target.value });
  };

  const handleFiltersSubmit = async (e) => {
    e.preventDefault();
    setData(prev => ({
      ...prev,
      filters: pendingFilters
    }));
    await refreshIssues(pendingFilters);
  };

  const handleTagsToggle = e => setTagsVisible(e.target.checked);

  const handleCheckboxChange = (filterType, id) => {
    setPendingFilters(prev => {
      const currentValues = prev[filterType] || [];
      const stringId = String(id);
      const newValues = currentValues.includes(stringId)
        ? currentValues.filter(val => val !== stringId)
        : [...currentValues, stringId];

      return { ...prev, [filterType]: newValues };
    });
  };

  return (
    <div>
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button className="alert-close" onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}
      <div className="page-header">
        <div className="page-title">Issues</div>
      </div>

      <div className="team-profiles-bar">
        <span style={{
          fontSize: "11px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "1px"
        }}>Team:</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: '4px' }}>
          {data.all_users.map(user_member => (
            <a href={`/users/${user_member.username}`}
              key={user_member.id || user_member.username}
              title={user_member.username}
              className={`avatar-link avatar-hover`}>
              <div
                style={{
                  width: "36px", height: "36px", borderRadius: "50%",
                  overflow: "hidden", border: "2px solid white",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                  background: user_member.username === currentUser.username ? "#41bfb5" : "#cbd5e0",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                {user_member.profile?.avatar
                  ? <img src={user_member.profile.avatar.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : user_member.social_auth?.[0]?.extra_data?.picture
                    ? <img src={user_member.social_auth[0].extra_data.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <span style={{ color: "white", fontWeight: "bold", fontSize: "14px", textTransform: "uppercase" }}>
                      {user_member.username.slice(0, 1)}
                    </span>
                }
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="top-toolbar">
        <div className="toolbar-left">
          <form method="get" id="search-form" className="search-form" onSubmit={handleFiltersSubmit}>
            {["type", "severity", "priority", "status", "tag", "assigned_to"].map(name =>
              (data.filters[name] || []).map((value, idx) =>
                <input key={name + value + idx} type="hidden" name={name} value={value} />
              ))}
            {data.filters.order_by &&
              <input type="hidden" name="order_by" value={data.filters.order_by} />}

            <div className="search-box">
              <input
                type="text"
                name="q"
                placeholder="subject or reference"
                value={pendingFilters.q || ""}
                onChange={handleSearchChange}
              />
              <button type="submit" className="search-btn" aria-label="Search">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="7"></circle>
                  <line x1="16.65" y1="16.65" x2="21" y2="21"></line>
                </svg>
              </button>
            </div>
          </form>
          <label className="tags-switch" htmlFor="tags-visibility-toggle">
            <input
              type="checkbox"
              id="tags-visibility-toggle"
              checked={tagsVisible}
              onChange={handleTagsToggle} />
            <span className="switch-slider"></span>
            <span className="switch-label">Tags</span>
          </label>
        </div>
        <div className="toolbar-right">
          <Link to="/issues/new" className="btn btn-teal">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            NEW ISSUE
          </Link>
          <Link to="/issues/bulk"
            className="btn"
            style={{
              backgroundColor: "#f1f1f1", color: "#666", border: "1px solid #ccc",
              fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "center",
              height: "34px", boxSizing: "border-box", padding: "0 12px"
            }}>
            <span className="icon" style={{ marginRight: "6px", display: "flex", alignItems: "center" }}>☰</span>
            Bulk Insert
          </Link>
        </div>
      </div>

      <div className="issues-layout">

        <aside className="filters-sidebar">
          <form method="get" id="filters-form" onSubmit={handleFiltersSubmit}>
            <input type="hidden" name="q" value={data.filters.q || ""} />
            <input type="hidden" name="order_by" value={data.filters.order_by || ""} />
            <div className="filters-card">
              {[
                { label: "Type", key: "types", filter: "type", items: data.types },
                { label: "Severity", key: "severities", filter: "severity", items: data.severities },
                { label: "Priority", key: "priorities", filter: "priority", items: data.priorities },
                { label: "Status", key: "statuses", filter: "status", items: data.statuses },
                { label: "Tags", key: "tags", filter: "tag", items: data.tags },
                { label: "Assigned to", key: "users", filter: "assigned_to", items: data.users }
              ].map(group => (
                <details className="filter-group" key={group.key}>
                  <summary className="filter-group-toggle">{group.label}</summary>
                  <div className="filter-group-body">
                    {(group.items || []).map(opt =>
                      <label className="filter-option" key={opt.id}>
                        <input type="checkbox"
                          name={group.filter}
                          value={opt.id}
                          checked={isChecked(group.filter, opt.id)}
                          onChange={() => handleCheckboxChange(group.filter, opt.id)}
                        />
                        <span>{opt.name || opt.username}</span>
                      </label>
                    )}
                  </div>
                </details>
              ))}
              <div className="filters-actions">
                <button type="submit" className="btn btn-teal">Apply filters</button>
                <a href="/" className="btn btn-outline">Clear</a>
              </div>
            </div>
          </form>
        </aside>


        <section className="issues-content">
          {data.issues && data.issues.length > 0 ? (
            <table className="issues-table">
              <thead>
                <tr>
                  <th style={{ width: "36px" }}>TYPE</th>
                  <th style={{ width: "36px" }}>SEVERITY</th>
                  <th style={{ width: "36px" }}>PRIORITY</th>
                  <th>ISSUE</th>
                  <th style={{ width: "150px" }}>STATUS</th>
                  <th style={{ width: "110px" }}>MODIFIED</th>
                  <th style={{ width: "70px" }}>ASSIGN</th>
                </tr>
              </thead>
              <tbody>
                {data.issues.map((issue) => (
                  <tr key={issue.id} onClick={() => window.location = `/issues/${issue.id}`} style={{ cursor: 'pointer' }}>
                    <td>
                      <span
                        className="attr-dot"
                        style={{ background: issue.type?.color || "#ccc" }}
                        title={issue.type?.name}
                      ></span>
                    </td>

                    <td>
                      <span
                        className="attr-dot"
                        style={{ background: issue.severity?.color || "#ccc" }}
                        title={issue.severity?.name}
                      ></span>
                    </td>

                    <td>
                      <span
                        className="attr-dot"
                        style={{ background: issue.priority?.color || "#ccc" }}
                        title={issue.priority?.name}
                      ></span>
                    </td>

                    <td>
                      <div style={{ marginBottom: '4px' }}>
                        <span className="issue-ref">#{issue.id}</span>
                        <span className="issue-title-link" style={{ marginLeft: '8px' }}>
                          {issue.title}
                        </span>
                      </div>

                      {issue.tags && issue.tags.length > 0 && (
                        <div className="tags-row">
                          {issue.tags.map(tag => (
                            <span
                              key={tag.id}
                              className="tag"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td>
                      {issue.status ? (
                        <span className="status-pill" style={{
                          background: `${issue.status.color}20`,
                          color: issue.status.color
                        }}>
                          <span className="status-dot" style={{ background: issue.status.color }}></span>
                          {issue.status.name}
                        </span>
                      ) : (
                        <span style={{ color: "#888" }}>—</span>
                      )}
                    </td>

                    <td className="date-cell">
                      {new Date(issue.updated_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>

                    <td>
                      {issue.assigned_to ? (
                        <div className="avatar-assigned" style={{
                          width: "30px", height: "30px", borderRadius: "50%",
                          overflow: "hidden", display: "flex", alignItems: "center",
                          justifyContent: "center", background: "#41bfb5", color: "white"
                        }}>
                          {issue.assigned_to.profile?.avatar ? (
                            <img src={issue.assigned_to.profile.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                          ) : (
                            <span style={{ fontWeight: "bold", fontSize: '12px' }}>
                              {issue.assigned_to.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="avatar-empty-sm">—</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No issues found.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}