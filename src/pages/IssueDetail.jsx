// pages/IssueDetail.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { data, Link, useNavigate, useParams } from "react-router-dom";
import { useUser } from "../App";
import { issuesApi } from "../api/issues";
import { settingsApi } from "../api/settings";
import "../style/issue_detail.css";
import ConfirmDelete from "../pages/ConfirmDelete";
import { useLocation } from "react-router-dom";

export default function IssueDetail() {
  const { pk } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.message || "");


  // Ajusta esto a cómo guardas tu apiKey
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

  const issueStatusName =
    issue?.status_detail?.name ||
    issue?.status_detail;

  const currentStatus =
    statuses.find(
      s => s.name===issueStatusName
    );
  const fileInputRef = useRef(null);

  const settings = useMemo(
    () => settingsApi(apiKey),
    [apiKey]
  );

  useEffect(() => {
    loadIssue();
  }, [pk]);

  async function loadIssue() {
    try {
      setLoading(true);

      const [
        issueResponse,
        activitiesResponse,
        settingsResponse
      ] = await Promise.all([
        api.detail(pk),
        api.activities(pk),
        settings.getAll()
      ]);
      

      setIssue(issueResponse.data);

      setActivities(activitiesResponse.data);

      setStatuses(
        settingsResponse.data.statuses
      );

    } catch (err) {
      console.error("ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteIssue() {
    setConfirmData({
      title:"Delete issue",
      message:"Are you sure you want to delete this issue?",

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

  async function handleDeleteAttachment(
    attachmentId
  ) {

    setConfirmData({

      title:"Delete attachment",

      message:
        "Are you sure you want to delete this attachment?",

      action: async ()=>{

        await api.deleteAttachment(
          pk,
          attachmentId
        );

        await loadIssue();

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

  async function handleEditComment(commentId) {
    if (!editingContent.trim()) return;

    try {
      await api.editComment(
        pk,
        commentId,
        editingContent
      );

      setEditingCommentId(null);

      setEditingContent("");

      loadIssue();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleChangeStatus(status) {
    try {
      // 1. Tanquem el menú desplegable
      setStatusOpen(false);

      // 2. Construim el payload per tal d'actualitzar la issue
      const payload = {
        title: issue.title,
        description: issue.description,
        status: status.id, // El nou status

        type: issue.type_detail?.id,
        severity: issue.severity_detail?.id,
        priority: issue.priority_detail?.id,
        
        assigned_to: issue.assigned_to?.id !== undefined ? issue.assigned_to.id : issue.assigned_to,
        deadline: issue.deadline,
        due_date: issue.due_date || issue.deadline,
        tags_input: issue.tags_detail || []
      };

      console.log("Enviando petición al servidor con el payload real:", payload);

      // 3. Enviem la petició al servidor
      await api.update(pk, payload);

      // 4. Si el servidor respon OK, es refresca la pantalla
      console.log("El servidor aceptó el cambio. Refrescando datos...");
      await loadIssue();

    } catch (err) {
      // Si el servidor falla, es queda igual
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

  async function handleDeleteComment(
    commentId
  ) {

    setConfirmData({

      title:"Delete comment",

      message:
        "Delete this comment?",

      action: async ()=>{

        await api.deleteComment(
          pk,
          commentId
        );

        loadIssue();

      }

    });

  }

  async function handleRemoveDeadline() {
    try {
      await api.removeDeadline(pk);

      loadIssue();
    } catch (err) {
      console.error(err);
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
    return <div>Cargando issue...</div>;
  }

  if (!issue) {
    return (
      <div>
        <h2>Issue no encontrado</h2>

        <pre>
          {JSON.stringify(issue, null, 2)}
        </pre>
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

                  <span className="issue-title-big">
                    {issue.title}
                  </span>
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
                      style={{
                        color: "#dc2626",
                        borderColor: "#fecaca",
                      }}
                      onClick={handleDeleteIssue}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="issue-meta">
                Created by{" "}
                <strong>
                  {issue.created_by?.username || "Unknown"}
                </strong>{" "}
                ·{" "}
                {issue.created_at
                  ? new Date(issue.created_at).toLocaleString()
                  : "-"}
              </div>

              <div className="description-divider" /> 

              <div
                className={`description ${
                  !issue.description?.trim() ? "empty" : ""
                }`}
              >
                {issue.description?.trim() || "No description yet."}
              </div>
            </div>
          </div>

          {/* ATTACHMENTS */}
          <div className="card">
            <div className="attach-header">
              <div>
                Attachments
                <span className="attach-count">
                  ({issue.attachments?.length || 0})
                </span>
              </div>

              <button
                className="add-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                +
              </button>
            </div>

            <div className="card-body">
              {!issue.attachments?.length ? (
                <div className="description empty">
                  No attachments yet!
                </div>
              ) : (
                <ul className="attach-list">
                  {issue.attachments.map((attachment) => (
                    <li
                      className="attach-item"
                      key={attachment.id}
                    >
                      <a
                        href={attachment.file}
                        target="_blank"
                        rel="noreferrer"
                        className="attach-link"
                      >
                        {attachment.filename ||
                          attachment.file.split("/").pop()}
                      </a>

                      <button
                        className="watch-btn"
                        onClick={() =>
                          handleDeleteAttachment(attachment.id)
                        }
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
                className={`tab-btn ${
                  activeTab === "comments" ? "active" : ""
                }`}
                onClick={() => setActiveTab("comments")}
              >
                {issue.comments?.length || 0} Comments
              </button>

              <button
                className={`tab-btn ${
                  activeTab === "activities" ? "active" : ""
                }`}
                onClick={() => setActiveTab("activities")}
              >
                {activities.length} Activities
              </button>
            </div>

            {/* COMMENTS */}
            <div
              className={`tab-pane ${
                activeTab === "comments" ? "active" : ""
              }`}
            >
              {!issue.comments?.length ? (
                <div className="comments empty">
                  No comments yet.
                </div>
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

                        <span>
                          {new Date(
                            c.created_at
                          ).toLocaleString()}
                        </span>
                      </div>

                      {editingCommentId === c.id ? (
                        <div>
                          <textarea
                            className="comment-textarea"
                            value={editingContent}
                            onChange={(e) =>
                              setEditingContent(e.target.value)
                            }
                          />

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              marginTop: "8px",
                            }}
                          >
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
                          <div className="comment-content">
                            {c.content}
                          </div>

                          {c.author?.username === currentUser.username && (
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                marginTop: "8px",
                              }}
                            >
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
                                onClick={() =>
                                  handleDeleteComment(c.id)
                                }
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
                <button
                  className="watchers-action-btn"
                  onClick={handleAddComment}
                >
                  Comment
                </button>
              </div>
            </div>

            {/* ACTIVITIES */}
            <div
              className={`tab-pane ${
                activeTab === "activities" ? "active" : ""
              }`}
            >
              {!activities.length ? (
                <div className="description empty">
                  No activities yet.
                </div>
              ) : (
                activities.map((activity) => (
                  <div
                    className="activity-item"
                    key={activity.id}
                  >
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
                        <strong>
                          {activity.user?.username}
                        </strong>{" "}
                        {activity.text}
                      </div>

                      <div className="activity-time">
                        {new Date(
                          activity.created_at
                        ).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="card">
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
                          marginBottom: '4px'                
                        }}
                        onClick={() => handleChangeStatus(status)}
                      >
                        <span className="status-dot" style={{ background: status.color }} />
                        
                        <span className="status-text">{status.name}</span>
                      
                        <span style={{ width: '10px' }} /> 
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
                {/* Si viene un color del detalle, lo usa. Si no, usa un color neutro o el rojo de tu captura */}
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
              <div className="meta-label">deadline</div>

              {issue.deadline ? (
                <div className="meta-value">
                  <div
                    className={`deadline-badge ${getDeadlineClass(
                      issue.deadline
                    )}`}
                  >
                    {new Date(
                      issue.deadline
                    ).toLocaleDateString()}
                  </div>

                  <button
                    className="deadline-delete-btn"
                    onClick={handleRemoveDeadline}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <a
                  href="#"
                  className="deadline-add-link"
                >
                  Add deadline
                </a>
              )}
            </div>

            {/* ASSIGNED */}
            <div className="section-title">
              Assigned
            </div>

            <div className="assign-links">
              {issue.assigned_to ? (
                <div>
                  {issue.assigned_to.username}
                </div>
              ) : (
                <div>No assigned user</div>
              )}
            </div>

            {/* WATCHERS */}
            <div className="section-title">
              Watchers
            </div>

            <button
              className="watchers-action-btn"
              onClick={handleToggleWatch}
            >
              Watch
            </button>

            <div style={{ marginTop: "10px" }}>
              {!issue.watchers?.length ? (
                <div className="description empty">
                  No watchers yet.
                </div>
              ) : (
                issue.watchers.map((watcher) => (
                  <div
                    className="watcher-row"
                    key={watcher.id}
                  >
                    {watcher.username}
                  </div>
                ))
              )}
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
          onConfirm={async()=>{

            try{

              await confirmData?.action?.();

            }catch(err){

              console.error(err);

            }

            setConfirmData(null);

          }}
        />

    </div>
  );
}