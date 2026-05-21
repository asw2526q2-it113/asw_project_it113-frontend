import { useState, useEffect } from "react";
import { useUser } from "../App";
import { issuesApi } from "../api/issues";
import { settingsApi } from "../api/settings.js";
import { usersApi } from "../api/users.js";
import "../style/issues_table_list.css";
import { Link, useLocation } from "react-router-dom";

const BACKEND_URL = "https://asw-project-it113.onrender.com";

const INITIAL_FILTERS = {
  type: [],
  severity: [],
  priority: [],
  status: [],
  tag: [],
  assigned_to: [],
  order_by: "",
  q: "",
};

function getAvatarUrl(avatar) {
  if (!avatar) return null;

  if (typeof avatar === "object") {
    return getAvatarUrl(avatar.url || avatar.avatar || avatar.path);
  }

  if (typeof avatar !== "string") return null;

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  if (avatar.startsWith("/")) {
    return `${BACKEND_URL}${avatar}`;
  }

  return `${BACKEND_URL}/${avatar}`;
}

function getUserAvatar(user) {
  return (
    getAvatarUrl(user?.avatar) ||
    getAvatarUrl(user?.profile?.avatar) ||
    getAvatarUrl(user?.profile_avatar) ||
    getAvatarUrl(user?.avatar_url) ||
    getAvatarUrl(user?.profile?.avatar_url) ||
    user?.social_auth?.[0]?.extra_data?.picture ||
    null
  );
}

function getDeadlineDueStatus(deadline) {
  if (!deadline) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  if (deadlineDate < today) {
    return {
      name: "Overdue",
      color: "#dc2626",
    };
  }

  if (deadlineDate.getTime() === today.getTime()) {
    return {
      name: "Due today",
      color: "#d97706",
    };
  }

  return {
    name: "Due soon",
    color: "#41bfb5",
  };
}

function formatDeadline(deadline) {
  if (!deadline) return "";

  return new Date(deadline).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


export default function IssueList() {
  const currentUser = useUser();
  const location = useLocation();

  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ""
  );

  const [data, setData] = useState({
    issues: [],
    all_users: [],
    filters: INITIAL_FILTERS,
    types: [],
    severities: [],
    priorities: [],
    statuses: [],
    tags: [],
    users: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tagsVisible, setTagsVisible] = useState(true);
  const [pendingFilters, setPendingFilters] = useState(INITIAL_FILTERS);

  const refreshIssues = async (filtersToUse) => {
    if (!currentUser?.apiKey) return;

    try {
      const apiIssuesLocal = issuesApi(currentUser.apiKey);
      const resIssues = await apiIssuesLocal.list(filtersToUse);

      setData((prev) => ({
        ...prev,
        issues: resIssues.data.issues || [],
      }));
    } catch (err) {
      console.error("Error filtrant issues:", err);
    }
  };

  const SortableHeader = ({ column, label }) => {
    const isAsc = pendingFilters.order_by === column;
    const isDesc = pendingFilters.order_by === `-${column}`;

    return (
      <th style={{ width: column === "issue" ? undefined : "36px" }}>
        {label}

        <span
          className="sort-link"
          style={{ cursor: "pointer", fontWeight: isAsc ? 700 : 400 }}
          onClick={() => handleSortOrder(column)}
          aria-label={`Sort by ${label} ascending`}
        >
          ▲
        </span>

        <span
          className="sort-link"
          style={{
            cursor: "pointer",
            fontWeight: isDesc ? 700 : 400,
            marginLeft: 3,
          }}
          onClick={() => handleSortOrder(column)}
          aria-label={`Sort by ${label} descending`}
        >
          ▼
        </span>
      </th>
    );
  };

  useEffect(() => {
    if (!currentUser?.apiKey) return;

    let cancelled = false;

    async function loadInitialData() {
      const apiIssuesLocal = issuesApi(currentUser.apiKey);
      const apiUsersLocal = usersApi(currentUser.apiKey);
      const apiSettingsLocal = settingsApi(currentUser.apiKey);

      try {
        const [resIssues, resUsers, resSettings] = await Promise.all([
          apiIssuesLocal.list(INITIAL_FILTERS),
          apiUsersLocal.list(),
          apiSettingsLocal.getAll(),
        ]);

        console.log("RAW ISSUES RESPONSE:", resIssues.data);
        console.log("FIRST ISSUE:", resIssues.data.issues?.[0]);


        const basicUsers = resUsers.data || [];

        const usersWithProfiles = await Promise.all(
          basicUsers.map(async (user) => {
            const username = user.username || user;

            try {
              const profileRes = await apiUsersLocal.profile(username);

              return {
                ...user,
                ...profileRes.data,
                username: profileRes.data.username || username,
              };
            } catch (err) {
              console.error(`Error carregant perfil de ${username}:`, err);

              return {
                ...user,
                username,
              };
            }
          })
        );

        if (cancelled) return;

        setData({
          issues: resIssues.data.issues || [],
          all_users: usersWithProfiles,
          types: resSettings.data.types || [],
          severities: resSettings.data.severities || [],
          priorities: resSettings.data.priorities || [],
          statuses: resSettings.data.statuses || [],
          tags: resSettings.data.tags || [],
          users: usersWithProfiles,
          filters: INITIAL_FILTERS,
        });

        setPendingFilters(INITIAL_FILTERS);
      } catch (err) {
        if (cancelled) return;

        console.error("Error carregant la pàgina principal:", err);
        setError("Error carregant la pàgina principal.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.apiKey]);

  useEffect(() => {
    document.body.classList.toggle("tags-hidden", !tagsVisible);
  }, [tagsVisible]);

  if (loading) {
    return (
      <div style={{ padding: 40, color: "var(--text-muted)" }}>
        Loading issues…
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: 40, color: "#dc2626" }}>{error}</div>;
  }

  const isChecked = (filterType, id) =>
    (pendingFilters[filterType] || []).map(String).includes(String(id));

  const handleSearchChange = (e) => {
    setPendingFilters((prev) => ({
      ...prev,
      q: e.target.value,
    }));
  };

  const handleFiltersSubmit = async (e) => {
    e.preventDefault();

    const newFilters = { ...pendingFilters };

    setData((prev) => ({
      ...prev,
      filters: newFilters,
    }));

    await refreshIssues(newFilters);
  };

  const handleTagsToggle = (e) => setTagsVisible(e.target.checked);

  const handleCheckboxChange = (filterType, id) => {
    setPendingFilters((prev) => {
      const currentValues = prev[filterType] || [];
      const stringId = String(id);

      const newValues = currentValues.includes(stringId)
        ? currentValues.filter((val) => val !== stringId)
        : [...currentValues, stringId];

      return {
        ...prev,
        [filterType]: newValues,
      };
    });
  };

  const handleSortOrder = async (column) => {
    const wasAsc = pendingFilters.order_by === column;
    const wasDesc = pendingFilters.order_by === `-${column}`;

    let newOrderBy = column;

    if (wasAsc) newOrderBy = `-${column}`;
    if (wasDesc) newOrderBy = column;

    const newFilters = {
      ...pendingFilters,
      order_by: newOrderBy,
    };

    setPendingFilters(newFilters);

    setData((prev) => ({
      ...prev,
      filters: newFilters,
    }));

    await refreshIssues(newFilters);
  };

  const handleClearFilters = async () => {
    setPendingFilters(INITIAL_FILTERS);

    setData((prev) => ({
      ...prev,
      filters: INITIAL_FILTERS,
    }));

    await refreshIssues(INITIAL_FILTERS);
  };

  return (
    <div>
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button
            className="alert-close"
            onClick={() => setSuccessMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="page-header">
        <div className="page-title">Issues</div>
      </div>

      <div className="team-profiles-bar">
        <span
          style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          Team:
        </span>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {data.all_users.map((user_member) => {
            const finalAvatar = getUserAvatar(user_member);

            return (
              <a
                href={`/users/${user_member.username}`}
                key={user_member.id || user_member.username}
                title={user_member.username}
                className="avatar-link avatar-hover"
              >
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2px solid white",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                    background:
                      user_member.username === currentUser.username
                        ? "#41bfb5"
                        : "#cbd5e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {finalAvatar ? (
                    <img
                      src={finalAvatar}
                      alt={user_member.username}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(event) => {
                        console.error(
                          "Error carregant avatar TEAM:",
                          finalAvatar
                        );
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: "14px",
                        textTransform: "uppercase",
                      }}
                    >
                      {user_member.username.slice(0, 1)}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div className="top-toolbar">
        <div className="toolbar-left">
          <form
            method="get"
            id="search-form"
            className="search-form"
            onSubmit={handleFiltersSubmit}
          >
            {[
              "type",
              "severity",
              "priority",
              "status",
              "tag",
              "assigned_to",
            ].map((name) =>
              (data.filters[name] || []).map((value, idx) => (
                <input
                  key={name + value + idx}
                  type="hidden"
                  name={name}
                  value={value}
                />
              ))
            )}

            {data.filters.order_by && (
              <input
                type="hidden"
                name="order_by"
                value={data.filters.order_by}
              />
            )}

            <div className="search-box">
              <input
                type="text"
                name="q"
                placeholder="subject or reference"
                value={pendingFilters.q || ""}
                onChange={handleSearchChange}
              />

              <button type="submit" className="search-btn" aria-label="Search">
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
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
              onChange={handleTagsToggle}
            />

            <span className="switch-slider"></span>
            <span className="switch-label">Tags</span>
          </label>
        </div>

        <div className="toolbar-right">
          <Link to="/issues/new" className="btn btn-teal">
            <svg
              viewBox="0 0 24 24"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            NEW ISSUE
          </Link>

          <Link
            to="/issues/bulk"
            className="btn"
            style={{
              backgroundColor: "#f1f1f1",
              color: "#666",
              border: "1px solid #ccc",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "34px",
              boxSizing: "border-box",
              padding: "0 12px",
            }}
          >
            <span
              className="icon"
              style={{
                marginRight: "6px",
                display: "flex",
                alignItems: "center",
              }}
            >
              ☰
            </span>
            Bulk Insert
          </Link>
        </div>
      </div>

      <div className="issues-layout">
        <aside className="filters-sidebar">
          <form method="get" id="filters-form" onSubmit={handleFiltersSubmit}>
            <input type="hidden" name="q" value={data.filters.q || ""} />
            <input
              type="hidden"
              name="order_by"
              value={data.filters.order_by || ""}
            />

            <div className="filters-card">
              {[
                {
                  label: "Type",
                  key: "types",
                  filter: "type",
                  items: data.types,
                },
                {
                  label: "Severity",
                  key: "severities",
                  filter: "severity",
                  items: data.severities,
                },
                {
                  label: "Priority",
                  key: "priorities",
                  filter: "priority",
                  items: data.priorities,
                },
                {
                  label: "Status",
                  key: "statuses",
                  filter: "status",
                  items: data.statuses,
                },
                {
                  label: "Tags",
                  key: "tags",
                  filter: "tag",
                  items: data.tags,
                },
                {
                  label: "Assigned to",
                  key: "users",
                  filter: "assigned_to",
                  items: data.users,
                },
              ].map((group) => (
                <details className="filter-group" key={group.key}>
                  <summary className="filter-group-toggle">
                    {group.label}
                  </summary>

                  <div className="filter-group-body">
                    {(group.items || []).map((opt) => (
                      <label className="filter-option" key={opt.id}>
                        <input
                          type="checkbox"
                          name={group.filter}
                          value={opt.id}
                          checked={isChecked(group.filter, opt.id)}
                          onChange={() =>
                            handleCheckboxChange(group.filter, opt.id)
                          }
                        />

                        <span>{opt.name || opt.username}</span>
                      </label>
                    ))}
                  </div>
                </details>
              ))}

              <div className="filters-actions">
                <button type="submit" className="btn btn-teal">
                  Apply filters
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleClearFilters}
                >
                  Clear
                </button>
              </div>
            </div>
          </form>
        </aside>

        <section className="issues-content">
          {data.issues && data.issues.length > 0 ? (
            <table className="issues-table">
              <thead>
                <tr>
                  <SortableHeader column="type" label="TYPE" />
                  <SortableHeader column="severity" label="SEVERITY" />
                  <SortableHeader column="priority" label="PRIORITY" />
                  <SortableHeader column="issue" label="ISSUE" />
                  <SortableHeader column="status" label="STATUS" />
                  <SortableHeader column="modified" label="MODIFIED" />
                  <SortableHeader column="assigned_to" label="ASSIGN" />
                </tr>
              </thead>

              <tbody>
                {data.issues.map((issue) => {
                  const assignedAvatar = getUserAvatar(issue.assigned_to);

                  const deadline = issue.deadline || issue.due_date || null;

                  const apiDeadlineStatus = issue.deadline_due_status;

                  const deadlineStatus =
                    apiDeadlineStatus &&
                    apiDeadlineStatus.color &&
                    apiDeadlineStatus.color !== "string"
                      ? apiDeadlineStatus
                      : getDeadlineDueStatus(deadline);
                  return (
                    <tr
                      key={issue.id}
                      onClick={() => {
                        window.location = `/issues/${issue.id}`;
                      }}
                      style={{ cursor: "pointer" }}
                    >
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
                          style={{
                            background: issue.severity?.color || "#ccc",
                          }}
                          title={issue.severity?.name}
                        ></span>
                      </td>

                      <td>
                        <span
                          className="attr-dot"
                          style={{
                            background: issue.priority?.color || "#ccc",
                          }}
                          title={issue.priority?.name}
                        ></span>
                      </td>

                      <td>
                        <div style={{ marginBottom: "4px" }}>
                          <span className="issue-ref">#{issue.id}</span>

                          <span
                            className="issue-title-link"
                            style={{ marginLeft: "8px" }}
                          >
                            {issue.title}
                          </span>

                          {deadlineStatus && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                verticalAlign: "middle",
                                marginLeft: "4px",
                                color: deadlineStatus.color || "#41bfb5",
                              }}
                              title={`${deadlineStatus.name || "Deadline"} · ${formatDeadline(deadline)}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                              >
                                <circle cx="12" cy="12" r="9" />
                                <polyline points="12 7 12 12 15 15" />
                              </svg>
                            </span>
                          )}
                        </div>

                        {issue.tags && issue.tags.length > 0 && (
                          <div className="tags-row">
                            {issue.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="tag"
                                style={{
                                  borderColor: tag.color,
                                  color: tag.color,
                                }}
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td>
                        {issue.status ? (
                          <span
                            className="status-pill"
                            style={{
                              background: `${issue.status.color}20`,
                              color: issue.status.color,
                            }}
                          >
                            <span
                              className="status-dot"
                              style={{ background: issue.status.color }}
                            ></span>
                            {issue.status.name}
                          </span>
                        ) : (
                          <span style={{ color: "#888" }}>—</span>
                        )}
                      </td>

                      <td className="date-cell">
                        {new Date(issue.updated_at).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </td>

                      <td>
                        {issue.assigned_to ? (
                          <div
                            className="avatar-assigned"
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              overflow: "hidden",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#41bfb5",
                              color: "white",
                            }}
                          >
                            {assignedAvatar ? (
                              <img
                                src={assignedAvatar}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                alt={issue.assigned_to.username}
                                onError={(event) => {
                                  console.error(
                                    "Error carregant avatar ASSIGN:",
                                    assignedAvatar
                                  );
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <span
                                style={{
                                  fontWeight: "bold",
                                  fontSize: "12px",
                                }}
                              >
                                {issue.assigned_to.username
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="avatar-empty-sm">—</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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