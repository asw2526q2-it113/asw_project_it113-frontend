import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useUser } from "../App";
import { usersApi } from "../api/users";
import { issuesApi } from "../api/issues";

import "../style/user_profile.css";
import "../style/issues_table_list.css";

function getInitials(username) {
  if (!username) return "?";

  return username
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getAvatarUrl(avatar) {
  if (!avatar) return null;

  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  return `https://asw-project-it113.onrender.com${avatar}`;
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function IssueTable({ issues, emptyText }) {
  if (!issues || issues.length === 0) {
    return <div className="empty-profile-state">{emptyText}</div>;
  }

  return (
    <table className="issues-table">
      <thead>
        <tr>
          <th>Issue</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Type</th>
          <th>Severity</th>
          <th>Updated</th>
        </tr>
      </thead>

      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id}>
            <td>
              <Link to={`/issues/${issue.id}`} className="issue-title-link">
                <span className="issue-ref">#{issue.id}</span>
                {issue.title}
              </Link>

              {issue.tags?.length > 0 && (
                <div className="issue-tags-row">
                  {issue.tags.map((tag) => (
                    <span key={tag.id} className="tag">
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </td>

            <td>
              {issue.status ? (
                <span className="status-pill">
                  <span
                    className="status-dot"
                    style={{ backgroundColor: issue.status.color }}
                  />
                  {issue.status.name}
                </span>
              ) : (
                "—"
              )}
            </td>

            <td>
              {issue.priority ? (
                <span className="meta-value">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: issue.priority.color }}
                  />
                  {issue.priority.name}
                </span>
              ) : (
                "—"
              )}
            </td>

            <td>
              {issue.type ? (
                <span className="meta-value">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: issue.type.color }}
                  />
                  {issue.type.name}
                </span>
              ) : (
                "—"
              )}
            </td>

            <td>
              {issue.severity ? (
                <span className="meta-value">
                  <span
                    className="color-dot"
                    style={{ backgroundColor: issue.severity.color }}
                  />
                  {issue.severity.name}
                </span>
              ) : (
                "—"
              )}
            </td>

            <td className="date-cell">{formatDate(issue.updated_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CommentsList({
  comments,
  canManageComments,
  onEditComment,
  onDeleteComment,
}) {
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  if (!comments || comments.length === 0) {
    return (
      <div className="empty-profile-state">
        This user has not made any comments yet.
      </div>
    );
  }

  function startEditing(comment) {
    setEditingCommentId(comment.id);
    setEditDraft(comment.content || "");
  }

  function cancelEditing() {
    setEditingCommentId(null);
    setEditDraft("");
  }

  async function submitEdit(comment) {
    await onEditComment(comment, editDraft);
    setEditingCommentId(null);
    setEditDraft("");
  }

  return (
    <div className="comments-list">
      {comments.map((comment) => {
        const isEditing = editingCommentId === comment.id;

        return (
          <div key={comment.id} className="comment-card">
            <Link to={`/issues/${comment.issue}`}>
              Issue #{comment.issue}
            </Link>

            <div className="comment-meta">
              {formatDate(comment.created_at)}
              {comment.is_edited && " · edited"}
            </div>

            {isEditing ? (
              <div className="profile-comment-edit">
                <textarea
                  value={editDraft}
                  onChange={(event) => setEditDraft(event.target.value)}
                  className="profile-comment-textarea"
                />

                <div className="profile-comment-actions">
                  <button
                    type="button"
                    className="profile-comment-cancel"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="profile-comment-save"
                    onClick={() => submitEdit(comment)}
                    disabled={!editDraft.trim()}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>{comment.content}</p>

                {canManageComments && (
                  <div className="profile-comment-actions">
                    <button
                      type="button"
                      className="profile-comment-edit-btn"
                      onClick={() => startEditing(comment)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="profile-comment-delete-btn"
                      onClick={() => onDeleteComment(comment)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function UserProfile() {
  const { username } = useParams();
  const currentUser = useUser();

  const isOwnProfile = currentUser?.username === username;

  const [profile, setProfile] = useState(null);
  const [assignedIssues, setAssignedIssues] = useState([]);
  const [watchedIssues, setWatchedIssues] = useState([]);
  const [comments, setComments] = useState([]);

  const [activeTab, setActiveTab] = useState("assigned");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // errores graves
  const [toastError, setToastError] = useState(""); // errores pequeños

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
  async function loadUserProfile() {
    if (!currentUser?.apiKey) {
      setError("No API key found.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const api = usersApi(currentUser.apiKey);

      const profileRes = await api.profile(username);

      setProfile(profileRes.data);
      setBioDraft(profileRes.data.bio || "");

      try {
        const assignedRes = await api.assignedIssues(username);
        setAssignedIssues(assignedRes.data.issues || []);
      } catch (err) {
        console.error("Could not load assigned issues:", err);
        setAssignedIssues([]);
      }

      try {
        const commentsRes = await api.comments(username);
        setComments(commentsRes.data.comments || []);
      } catch (err) {
        console.error("Could not load comments:", err);
        setComments([]);
      }

      if (isOwnProfile) {
        try {
          const watchedRes = await api.watchedIssues();
          setWatchedIssues(watchedRes.data.issues || []);
        } catch (err) {
          console.error("Could not load watched issues:", err);
          setWatchedIssues([]);
        }
      } else {
        setWatchedIssues([]);
      }
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Could not load user profile.";

      setError(message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  loadUserProfile();

  function showToastError(message) {
  setToastError(message);

  setTimeout(() => {
    setToastError("");
  }, 4000);
}
}, [username, currentUser?.apiKey, isOwnProfile]);


  async function handleSaveBio(event) {
    event.preventDefault();

    try {
      setSavingBio(true);
      setError("");

      const api = usersApi(currentUser.apiKey);
      const response = await api.updateBio(bioDraft);

      setProfile((prev) => ({
        ...prev,
        bio: response.data.bio,
      }));

      setEditingBio(false);
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Could not update biography.";

      showToastError(message);
    } finally {
      setSavingBio(false);
    }
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploadingAvatar(true);
      setError("");

      const api = usersApi(currentUser.apiKey);
      const response = await api.updateAvatar(file);

      setProfile((prev) => ({
        ...prev,
        avatar: response.data.avatar,
      }));
    } catch (err) {
      console.error("Avatar upload error:", err.response?.data || err);

      const isHtmlError =
        typeof err.response?.data === "string" &&
        err.response.data.includes("<!DOCTYPE html>");

      const message =
        err.response?.data?.avatar?.[0] ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        (isHtmlError
          ? "Could not update avatar. Backend returned an internal error."
          : "Could not update avatar.");

      showToastError(message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleResetAvatar() {
    try {
      setUploadingAvatar(true);
      setError("");

      const api = usersApi(currentUser.apiKey);
      await api.resetAvatar();

      setProfile((prev) => ({
        ...prev,
        avatar: null,
      }));
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Could not reset avatar.";

      showToastError(message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleEditComment(comment, newContent) {
  if (!newContent.trim()) return;

  try {
    const api = issuesApi(currentUser.apiKey);

    const response = await api.editComment(
      comment.issue,
      comment.id,
      newContent
    );

    setComments((prevComments) =>
      prevComments.map((item) =>
        item.id === comment.id
          ? {
              ...item,
              content: response.data.content || newContent,
              updated_at: response.data.updated_at || item.updated_at,
              is_edited: true,
            }
          : item
      )
    );
  } catch (err) {
    console.error("Could not edit comment:", err.response?.data || err);

    const message =
      err.response?.data?.content?.[0] ||
      err.response?.data?.error ||
      err.response?.data?.detail ||
      "Could not edit comment.";

    showToastError(message);
  }
}

async function handleDeleteComment(comment) {
  try {
    const api = issuesApi(currentUser.apiKey);

    await api.deleteComment(comment.issue, comment.id);

    setComments((prevComments) =>
      prevComments.filter((item) => item.id !== comment.id)
    );

    setProfile((prev) => ({
      ...prev,
      count_comments: Math.max((prev?.count_comments || 1) - 1, 0),
    }));
  } catch (err) {
    console.error("Could not delete comment:", err.response?.data || err);

    const message =
      err.response?.data?.error ||
      err.response?.data?.detail ||
      "Could not delete comment.";

    showToastError(message);
  }
}
  if (loading) {
    return <div className="empty-profile-state">Loading profile...</div>;
  }

  if (error && !profile) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!profile) {
    return <div className="empty-profile-state">User not found.</div>;
  }

 return (
  <>
    {toastError && (
      <div className="profile-toast-error">
        {toastError}
      </div>
    )}

    <div className="profile-layout">
      <aside className="profile-sidebar">
        <div className="avatar-edit-container">
          {getAvatarUrl(profile.avatar) ? (
            <img
              src={getAvatarUrl(profile.avatar)}
              alt={profile.username}
              className="avatar-big"
            />
          ) : (
            <div className="avatar-big">
              {getInitials(profile.username)}
            </div>
          )}

          {isOwnProfile && (
            <div className="avatar-buttons">
              <label className="btn-avatar-action btn-avatar-change">
                {uploadingAvatar ? "Uploading..." : "Change"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  hidden
                  disabled={uploadingAvatar}
                />
              </label>

              <button
                type="button"
                className="btn-avatar-action btn-avatar-reset"
                onClick={handleResetAvatar}
                disabled={uploadingAvatar}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <h2>{profile.username}</h2>
        <p>@{profile.username}</p>

        <div className="profile-bio">
          <h3>Biography</h3>

          {isOwnProfile && editingBio ? (
            <form className="bio-form" onSubmit={handleSaveBio}>
              <textarea
                value={bioDraft}
                onChange={(event) => setBioDraft(event.target.value)}
                placeholder="Write your biography..."
              />

              <div className="bio-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setBioDraft(profile.bio || "");
                    setEditingBio(false);
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="bio-save-btn"
                  disabled={savingBio}
                >
                  {savingBio ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {profile.bio ? (
                <p className="bio-text">{profile.bio}</p>
              ) : (
                <p className="bio-empty">No biography yet.</p>
              )}

              {isOwnProfile && (
                <button
                  type="button"
                  className="bio-edit-link"
                  onClick={() => setEditingBio(true)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  Edit biography
                </button>
              )}
            </>
          )}
        </div>

        <div className="profile-stats">
          <div>
            <strong>{profile.count_assigned ?? assignedIssues.length}</strong>
            <span>Open assigned issues</span>
          </div>

          {isOwnProfile && (
            <div>
              <strong>{profile.count_watched ?? watchedIssues.length}</strong>
              <span>Watched issues</span>
            </div>
          )}

          <div>
            <strong>{profile.count_comments ?? comments.length}</strong>
            <span>Comments</span>
          </div>
        </div>
      </aside>

      <main className="profile-content">

        <nav className="tabs">
          <button
            type="button"
            className={activeTab === "assigned" ? "active" : ""}
            onClick={() => setActiveTab("assigned")}
          >
            Open assigned issues
          </button>

          {isOwnProfile && (
            <button
              type="button"
              className={activeTab === "watched" ? "active" : ""}
              onClick={() => setActiveTab("watched")}
            >
              Watched issues
            </button>
          )}

          <button
            type="button"
            className={activeTab === "comments" ? "active" : ""}
            onClick={() => setActiveTab("comments")}
          >
            Comments
          </button>
        </nav>

        <section className="tab-content">
          {activeTab === "assigned" && (
            <IssueTable
              issues={assignedIssues}
              emptyText="This user has no open assigned issues."
            />
          )}

          {activeTab === "watched" && isOwnProfile && (
            <IssueTable
              issues={watchedIssues}
              emptyText="You are not watching any issues."
            />
          )}

          {activeTab === "comments" && (
            <CommentsList
              comments={comments}
              canManageComments={isOwnProfile}
              onEditComment={handleEditComment}
              onDeleteComment={handleDeleteComment}
            />
          )}
        </section>
      </main>
    </div>
    </>
  );
}