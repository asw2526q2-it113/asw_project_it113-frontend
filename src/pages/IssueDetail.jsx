// pages/IssueDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useUser } from "../App";
import { issuesApi } from "../api/issues";
import { settingsApi } from "../api/settings";
import { usersApi } from "../api/users";
import "../style/issue_detail.css";
import ConfirmDelete from "../pages/ConfirmDelete";

export default function IssueDetail() {
  const { pk } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [successMessage, setSuccessMessage] = useState(
    location.state?.message || ""
  );
  const [errorMessage, setErrorMessage] = useState("");

  const currentUser = useUser();
  const apiKey = currentUser.apiKey;

  const api = useMemo(() => issuesApi(apiKey), [apiKey]);

  const [issue, setIssue] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("comments");

  const [comment, setComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingContent, setEditingContent] = useState("");

  const [statuses, setStatuses] = useState([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [confirmData, setConfirmData] = useState(null);
  const [users, setUsers] = useState([]);
  const [assignedOpen, setAssignedOpen] = useState(false);
  const [watchersOpen, setWatchersOpen] = useState(false);
  const [deadlineInput, setDeadlineInput] = useState("");

  const usersService = useMemo(
    () => usersApi(apiKey),
    [apiKey]
  );

  const issueStatusName =
    issue?.status_detail?.name ||
    issue?.status_detail;

  const currentStatus =
    statuses.find(
      s => s.name === issueStatusName
    );

  const fileInputRef = useRef(null);

  const settings = useMemo(
    () => settingsApi(apiKey),
    [apiKey]
  );

  useEffect(() => {
    loadIssue();
  }, [pk]);

  function showErrorMessage(message) {
    setErrorMessage(message);

    setTimeout(() => {
      setErrorMessage("");
    }, 4000);
  }

  async function loadIssue() {
    try {
      setLoading(true);

      const [
        issueResponse,
        activitiesResponse,
        settingsResponse,
        usersResponse
      ] = await Promise.all([
        api.detail(pk),
        api.activities(pk),
        settings.getAll(),
        usersService.list()
      ]);

      setUsers(usersResponse.data);
      setIssue(issueResponse.data);
      setActivities(activitiesResponse.data);
      setStatuses(settingsResponse.data.statuses);

      if (issueResponse.data.deadline) {
        setDeadlineInput(issueResponse.data.deadline.split("T")[0]);
      } else {
        setDeadlineInput("");
      }

    } catch (err) {
      console.error("ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteIssue() {
    setConfirmData({
      title: "Delete issue",
      message: "Are you sure you want to delete this issue?",
      action: async () => {
        await api.remove(pk);
        navigate("/");
      }
    });
  }

  async function handleAddComment() {
    if (!comment.trim()) return;

    try {
      await api.addComment(pk, comment);
      setComment("");
      loadIssue();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleUploadAttachment(file) {
    if (!file) return;

    try {
      console.log("Uploading file:", file);
      await api.addAttachment(pk, file);
      loadIssue();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteAttachment(attachmentId) {
    setConfirmData({
      title: "Delete attachment",
      message: "Are you sure you want to delete this attachment?",
      action: async () => {
        try {
          await api.deleteAttachment(pk, attachmentId);
          await loadIssue();
        } catch (err) {
          console.error("Error deleting attachment:", err.response?.data || err);

          const status = err.response?.status;

          const backendMessage =
            err.response?.data?.error ||
            err.response?.data?.detail ||
            err.response?.data?.message;

          if (status === 401 || status === 403) {
            showErrorMessage(
              "You cannot delete this attachment because it was uploaded by another user."
            );
          } else {
            showErrorMessage(
              backendMessage || "The attachment could not be deleted."
            );
          }

          throw err;
        }
      }
    });
  }

  async function handleToggleWatch() {
    try {
      await api.toggleWatcher(pk);
      loadIssue();
    } catch (err) {
      console.error(err);
    }
  }

 async function handleAssignMe() {
  try {
    const usersResponse = await usersService.list();
    const backendUsers = usersResponse.data || [];

    const authenticatedUser = backendUsers.find(
      user => user.username === currentUser.username
    );

    if (!authenticatedUser?.id) {
      showErrorMessage(
        "Could not assign the issue because the authenticated user was not found."
      );
      return;
    }

    await api.assign(
      pk,
      authenticatedUser.id
    );

    await loadIssue();
  } catch (err) {
    console.error(
      "Error assigning issue to authenticated user:",
      err.response?.data || err
    );

    const backendMessage =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      err.response?.data?.message;

    showErrorMessage(
      backendMessage || "The issue could not be assigned to you."
    );
  }
}

  async function handleAssignUser(userId) {
    try {
      await api.assign(
        pk,
        userId
      );

      setAssignedOpen(false);

      loadIssue();

    } catch (err) {
      console.error(err);
    }
  }

  async function handleUnassign() {
    try {
      await api.unassign(pk);

      loadIssue();

    } catch (err) {
      console.error(err);
    }
  }

  async function handleAddWatcher(userId) {
    try {
      const currentWatchersIds =
        issue.watchers?.map(
          watcher => watcher.id
        ) || [];

      await api.updateWatchers(
        pk,
        [
          ...currentWatchersIds,
          userId
        ]
      );

      setWatchersOpen(false);

      loadIssue();

    } catch (err) {
      console.error(err);
    }
  }

  async function handleRemoveWatcher(watcherId) {
    try {
      await api.removeWatcher(
        pk,
        watcherId
      );

      loadIssue();

    } catch (err) {
      console.error(err);
    }
  }

  async function handleEditComment(commentId) {
    if (!editingContent.trim()) return;

    try {
      await api.editComment(pk, commentId, editingContent);
      setEditingCommentId(null);
      setEditingContent("");
      loadIssue();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleChangeStatus(status) {
    try {
      setStatusOpen(false);

      const payload = {
        title: issue.title,
        description: issue.description,
        status: status.id,
        type: issue.type_detail?.id,
        severity: issue.severity_detail?.id,
        priority: issue.priority_detail?.id,
        assigned_to: issue.assigned_to?.id !== undefined ? issue.assigned_to.id : issue.assigned_to,
        deadline: issue.deadline,
        due_date: issue.due_date || issue.deadline,
        tags_input: issue.tags_detail || []
      };

      console.log("Enviando petición al servidor con el payload real:", payload);
      await api.update(pk, payload);
      console.log("El servidor aceptó el cambio. Refrescando datos...");
      await loadIssue();

    } catch (err) {
      console.error("Error al cambiar el estado en el servidor:");
      if (err.response?.data) {
        console.error("Detalle del error del Swagger/Backend:", err.response.data);
        alert(`No se pudo cambiar el estado. Error del servidor: ${JSON.stringify(err.response.data)}`);
      } else {
        console.error(err);
        alert("Ocurrió un error de red al intentar conectar con el servidor.");
      }
    }
  }

  async function handleDeleteComment(commentId) {
    setConfirmData({
      title: "Delete comment",
      message: "Delete this comment?",
      action: async () => {
        await api.deleteComment(pk, commentId);
        loadIssue();
      }
    });
  }

  async function handleRemoveDeadline() {
    try {
      const payload = {
        title: issue.title,
        description: issue.description,
        status: issue.status_detail?.id,
        type: issue.type_detail?.id,
        severity: issue.severity_detail?.id,
        priority: issue.priority_detail?.id,
        assigned_to: issue.assigned_to?.id || null,
        deadline: null,
        due_date: null,
        tags_input: issue.tags_detail?.map(t => t.name || t) || []
      };

      await api.update(pk, payload);
      setDeadlineInput("");
      await loadIssue();
    } catch (err) {
      console.error("Error al eliminar deadline:", err);
      alert("No se pudo eliminar la fecha límite.");
    }
  }

  async function handleUpdateDeadline() {
    if (!deadlineInput.trim()) return;

    try {
      const payload = {
        title: issue.title,
        description: issue.description,
        status: issue.status_detail?.id,
        type: issue.type_detail?.id,
        severity: issue.severity_detail?.id,
        priority: issue.priority_detail?.id,
        assigned_to: issue.assigned_to?.id || null,
        deadline: deadlineInput,
        due_date: deadlineInput,
        tags_input: issue.tags_detail?.map(t => t.name || t) || []
      };

      console.log("Actualizando deadline:", payload);
      await api.update(pk, payload);
      await loadIssue();
    } catch (err) {
      console.error("Error al actualizar deadline:", err);
      alert("No se pudo guardar la fecha límite.");
    }
  }

  function getDeadlineClass(deadline) {
    if (!deadline) return "";

    const today = new Date();
    const dueDate = new Date(deadline);
    const diffMs = dueDate - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "deadline-overdue";
    if (diffDays <= 2) return "deadline-soon";
    return "deadline-ok";
  }

  if (loading) {
    return <div>Loading issue...</div>;
  }

  if (!issue) {
    return (
      <div>
        <h2>Issue no encontrado</h2>
        <pre>{JSON.stringify(issue, null, 2)}</pre>
      </div>
    );
  }

  return (
    <div>
      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
          <button className="alert-close" onClick={() => setSuccessMessage("")}>×</button>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          {errorMessage}
          <button className="alert-close" onClick={() => setErrorMessage("")}>
            ×
          </button>
        </div>
      )}

      {/* BACK */}
      <Link to="/" className="back-link">
        ← Back to issues
      </Link>

      <div className="detail-layout">
        {/* MAIN */}
        <div>
          {/* HEADER */}
          <div className="card">
            <div className="card-body">
              <div className="issue-header">
                <div>
                  <span className="issue-ref-big">#{issue.id}</span>
                  <span className="issue-title-big">{issue.title}</span>
                </div>

                {issue.created_by?.username === currentUser.username && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      className="watchers-action-btn"
                      onClick={() => navigate(`/issues/${pk}/edit`)}
                    >
                      Edit
                    </button>

                    <button
                      className="watchers-action-btn"
                      style={{ color: "#dc2626", borderColor: "#fecaca" }}
                      onClick={handleDeleteIssue}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="issue-meta">
                Created by <strong>{issue.created_by?.username || "Unknown"}</strong> · {issue.created_at ? new Date(issue.created_at).toLocaleString() : "-"}
              </div>

              <div className="description-divider" />

              <div className={`description ${!issue.description?.trim() ? "empty" : ""}`}>
                {issue.description?.trim() || "No description yet."}
              </div>

              {issue.tags_detail && issue.tags_detail.length > 0 && (
                <>
                  <div className="description-divider" />

                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "20px", marginBottom: "12px" }}>
                    {issue.tags_detail.map((tag) => (
                      <span
                        key={tag.id || tag}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "8px 16px",
                          borderRadius: "20px",
                          backgroundColor: tag.color ? `${tag.color}20` : "#e5e7eb",
                          color: tag.color || "#374151",
                          fontSize: "14px",
                          fontWeight: "500",
                          border: `1px solid ${tag.color ? `${tag.color}40` : "#d1d5db"}`
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: tag.color || "#374151"
                          }}
                        />
                        {tag.name || tag}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ATTACHMENTS */}
          <div className="card">
            <div className="attach-header">
              <div>
                Attachments
                <span className="attach-count">({issue.attachments?.length || 0})</span>
              </div>

              <button className="add-btn" onClick={() => fileInputRef.current?.click()}>
                +
              </button>
            </div>

            <div className="card-body">
              {!issue.attachments?.length ? (
                <div className="description empty">No attachments yet!</div>
              ) : (
                <ul className="attach-list">
                  {issue.attachments.map((attachment) => (
                    <li className="attach-item" key={attachment.id}>
                      <a
                        href={attachment.file}
                        target="_blank"
                        rel="noreferrer"
                        className="attach-link"
                      >
                        {attachment.filename || attachment.file.split("/").pop()}
                      </a>

                      <button
                        className="watch-btn"
                        onClick={() => handleDeleteAttachment(attachment.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const file = e.target.files[0];
                  console.log("SELECTED FILE:", file);
                  if (file) {
                    handleUploadAttachment(file);
                  }
                }}
              />
            </div>
          </div>

          {/* COMMENTS / ACTIVITIES */}
          <div className="card">
            <div className="tabs-header">
              <button
                className={`tab-btn ${activeTab === "comments" ? "active" : ""}`}
                onClick={() => setActiveTab("comments")}
              >
                {issue.comments?.length || 0} Comments
              </button>

              <button
                className={`tab-btn ${activeTab === "activities" ? "active" : ""}`}
                onClick={() => setActiveTab("activities")}
              >
                {activities.length} Activities
              </button>
            </div>

            {/* COMMENTS */}
            <div className={`tab-pane ${activeTab === "comments" ? "active" : ""}`}>
              {!issue.comments?.length ? (
                <div className="comments empty">No comments yet.</div>
              ) : (
                issue.comments.map((c) => (
                  <div className="comment-item" key={c.id}>
                    <div className="comment-avatar">
                      {c.author?.avatar ? (
                        <img
                          src={c.author.avatar}
                          alt={c.author.username}
                          className="comment-avatar-img"
                        />
                      ) : (
                        (c.author?.username || "?")[0].toUpperCase()
                      )}
                    </div>

                    <div className="comment-body">
                      <div className="comment-author">
                        {c.author?.username || "Unknown"}
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>

                      {editingCommentId === c.id ? (
                        <div>
                          <textarea
                            className="comment-textarea"
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                          />

                          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <button
                              className="watchers-action-btn"
                              onClick={() => handleEditComment(c.id)}
                            >
                              Save
                            </button>

                            <button
                              className="watchers-action-btn"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingContent("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="comment-content">{c.content}</div>

                          {c.author?.username === currentUser.username && (
                            <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                              <button
                                className="watch-btn"
                                onClick={() => {
                                  setEditingCommentId(c.id);
                                  setEditingContent(c.content);
                                }}
                              >
                                Edit
                              </button>

                              <button
                                className="watch-btn"
                                onClick={() => handleDeleteComment(c.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}

              <textarea
                className="comment-textarea"
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div style={{ marginTop: "12px" }}>
                <button className="watchers-action-btn" onClick={handleAddComment}>
                  Comment
                </button>
              </div>
            </div>

            {/* ACTIVITIES */}
            <div className={`tab-pane ${activeTab === "activities" ? "active" : ""}`}>
              {!activities.length ? (
                <div className="description empty">No activities yet.</div>
              ) : (
                activities.map((activity) => (
                  <div className="activity-item" key={activity.id}>
                    <div className="comment-avatar">
                      {activity.user?.avatar ? (
                        <img
                          src={activity.user.avatar}
                          alt={activity.user.username}
                          className="comment-avatar-img"
                        />
                      ) : (
                        (activity.user?.username || "?")[0].toUpperCase()
                      )}
                    </div>

                    <div className="activity-body">
                      <div className="activity-content">
                        <strong>{activity.user?.username}</strong> {activity.text}
                      </div>
                      <div className="activity-time">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="card sidebar-card">
          <div className="card-body">
            {/* STATUS */}
            {issue.created_by?.username === currentUser.username ? (
              <div className="status-dropdown">
                <button
                  className="status-selector"
                  style={{
                    backgroundColor: `${currentStatus?.color}15`,
                    borderColor: `${currentStatus?.color}30`,
                    color: currentStatus?.color || "#4a5568"
                  }}
                  onClick={() => setStatusOpen(!statusOpen)}
                >
                  <span
                    className="status-dot"
                    style={{ background: currentStatus?.color || "#4a5568" }}
                  />

                  <span className="status-text">
                    {issue?.status_detail?.name || "No status"}
                  </span>

                  <span className="status-arrow" style={{ color: currentStatus?.color }}>
                    {statusOpen ? "▴" : "▾"}
                  </span>
                </button>

                {statusOpen && (
                  <div className="status-menu">
                    {statuses.map((status) => (
                      <button
                        key={status.id}
                        className="status-option"
                        style={{
                          backgroundColor: `${status.color}15`,
                          color: status.color,
                          marginBottom: "4px"
                        }}
                        onClick={() => handleChangeStatus(status)}
                      >
                        <span className="status-dot" style={{ background: status.color }} />
                        <span className="status-text">{status.name}</span>
                        <span style={{ width: "10px" }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="status-selector readonly"
                style={{
                  backgroundColor: `${currentStatus?.color}15`,
                  borderColor: `${currentStatus?.color}30`,
                  color: currentStatus?.color || "#4a5568"
                }}
              >
                <span
                  className="status-dot"
                  style={{ background: currentStatus?.color || "#4a5568" }}
                />
                <span className="status-text">
                  {issue?.status_detail?.name || "No status"}
                </span>
              </div>
            )}

            {/* META */}
            <div className="meta-row">
              <div className="meta-label">type</div>
              <div className="meta-value">
                <span
                  className="meta-dot"
                  style={{ background: issue.type_detail?.color || "#e11d48" }}
                />
                <span>{issue.type_detail?.name || issue.type_detail || "Not set"}</span>
              </div>
            </div>

            <div className="meta-row">
              <div className="meta-label">severity</div>
              <div className="meta-value">
                <span
                  className="meta-dot"
                  style={{ background: issue.severity_detail?.color || "#ca8a04" }}
                />
                <span>{issue.severity_detail?.name || issue.severity_detail || "Not set"}</span>
              </div>
            </div>

            <div className="meta-row">
              <div className="meta-label">priority</div>
              <div className="meta-value">
                <span
                  className="meta-dot"
                  style={{ background: issue.priority_detail?.color || "#ea580c" }}
                />
                <span>{issue.priority_detail?.name || issue.priority_detail || "Not set"}</span>
              </div>
            </div>

            {/* DEADLINE */}
            <div className="deadline-row">
              <div className="meta-label">
                deadline
              </div>

              <div
                className="meta-value"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >

                {issue.created_by?.username === currentUser.username ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <input
                        type="date"
                        value={deadlineInput}
                        onChange={(e) => setDeadlineInput(e.target.value)}
                        onBlur={() => {
                          if (deadlineInput && deadlineInput !== (issue.deadline?.split("T")[0] || "")) {
                            handleUpdateDeadline();
                          }
                        }}
                        className="deadline-input"
                      />

                      {deadlineInput && (
                        <button
                          className="deadline-delete-btn"
                          onClick={handleRemoveDeadline}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {issue.deadline_due_status && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          backgroundColor: `${issue.deadline_due_status.color}20`,
                          color: issue.deadline_due_status.color,
                          fontSize: "12px",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          width: "fit-content"
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: issue.deadline_due_status.color
                          }}
                        />
                        {issue.deadline_due_status.name}
                      </span>
                    )}
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px"
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#f3f4f6",
                        borderRadius: "4px",
                        fontSize: "14px",
                        color: "#4b5563"
                      }}
                    >
                      {deadlineInput || "-"}
                    </div>

                    {issue.deadline_due_status && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          backgroundColor: `${issue.deadline_due_status.color}20`,
                          color: issue.deadline_due_status.color,
                          fontSize: "12px",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                          width: "fit-content"
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: issue.deadline_due_status.color
                          }}
                        />
                        {issue.deadline_due_status.name}
                      </span>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* ASSIGNED */}
            <div className="section-title">
              Assigned
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >

              {issue.assigned_to_detail ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px"
                    }}
                  >
                    {issue.assigned_to_detail.avatar ? (
                      <img
                        src={issue.assigned_to_detail.avatar}
                        alt=""
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%"
                        }}
                      />
                    ) : (
                      <div className="comment-avatar">
                        {issue.assigned_to_detail.username}
                      </div>
                    )}

                    <span>
                      {issue.assigned_to_detail.username}
                    </span>
                  </div>

                  <button
                    className="deadline-delete-btn"
                    onClick={handleUnassign}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="description empty">
                  No assigned user
                </div>
              )}

              {currentUser.username !== issue.assigned_to_detail?.username && (
                <button
                  className="watchers-action-btn"
                  onClick={handleAssignMe}
                >
                  Assign to me
                </button>
              )}

              <div className="status-dropdown">
                <button
                  className="watchers-action-btn"
                  onClick={() =>
                    setAssignedOpen(
                      !assignedOpen
                    )
                  }
                >
                  + Add assigned
                </button>

                {assignedOpen && (
                  <div className="status-menu">
                    {users
                      .filter(
                        user =>
                          user.username !==
                          currentUser.username
                      )
                      .map(user => (
                        <button
                          key={user.id}
                          className="assign-user-option"
                          onClick={() =>
                            handleAssignUser(user.id)
                          }
                        >
                          {user.username}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* WATCHERS */}
            <div className="section-title">
              Watchers
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {!issue.watchers?.length ? (
                <div className="description empty">
                  No watchers yet
                </div>
              ) : (
                issue.watchers.map(watcher => (
                  <div
                    key={watcher.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 0"
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                    >
                      {watcher.avatar ? (
                        <img
                          src={watcher.avatar}
                          alt=""
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%"
                          }}
                        />
                      ) : (
                        <div className="comment-avatar">
                          {watcher.username[0]}
                        </div>
                      )}

                      <span>
                        {watcher.username}
                      </span>
                    </div>

                    <button
                      className="deadline-delete-btn"
                      onClick={() =>
                        handleRemoveWatcher(
                          watcher.id
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}

              {!issue.watchers?.some(
                watcher =>
                  watcher.username ===
                  currentUser.username
              ) && (
                <button
                  className="watchers-action-btn"
                  onClick={handleToggleWatch}
                >
                  Watch
                </button>
              )}

              <div className="status-dropdown">
                <button
                  className="watchers-action-btn"
                  onClick={() =>
                    setWatchersOpen(
                      !watchersOpen
                    )
                  }
                >
                  + Add watcher
                </button>

                {watchersOpen && (
                  <div className="status-menu">
                    {users
                      .filter(user =>
                        !issue.watchers?.some(
                          w => w.id === user.id
                        )
                      )
                      .map(user => (
                        <button
                          key={user.id}
                          className="assign-user-option"
                          onClick={() =>
                            handleAddWatcher(
                              user.id
                            )
                          }
                        >
                          {user.username}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDelete
        open={!!confirmData}
        title={confirmData?.title}
        message={confirmData?.message}
        confirmText="Delete"
        variant="danger"
        onCancel={() =>
          setConfirmData(null)
        }
        onConfirm={async () => {
          try {
            await confirmData?.action?.();
          } catch (err) {
            console.error(err);
          } finally {
            setConfirmData(null);
          }
        }}
      />
    </div>
  );
}