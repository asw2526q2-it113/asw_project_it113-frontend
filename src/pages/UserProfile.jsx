import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useUser } from "../App";
import { usersApi } from "../api/users";

import "../style/user_porfile.css";
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

function CommentsList({ comments }) {
  if (!comments || comments.length === 0) {
    return (
      <div className="empty-profile-state">
        This user has not made any comments yet.
      </div>
    );
  }

  return (
    <div className="comments-list">
      {comments.map((comment) => (
        <div key={comment.id} className="comment-card">
          <Link to={`/issues/${comment.issue}`}>
            Issue #{comment.issue}
          </Link>

          <div className="comment-meta">
            {formatDate(comment.created_at)}
            {comment.is_edited && " · edited"}
          </div>

          <p>{comment.content}</p>
        </div>
      ))}
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
  const [error, setError] = useState("");

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

        const profilePromise = api.profile(username);
        const assignedPromise = api.assignedIssues(username);
        const commentsPromise = api.comments(username);

        const requests = [
          profilePromise,
          assignedPromise,
          commentsPromise,
        ];

        if (isOwnProfile) {
          requests.push(api.watchedIssues(username));
        }

        const responses = await Promise.all(requests);

        const profileRes = responses[0];
        const assignedRes = responses[1];
        const commentsRes = responses[2];
        const watchedRes = responses[3];

        setProfile(profileRes.data);
        setBioDraft(profileRes.data.bio || "");

        setAssignedIssues(assignedRes.data.issues || []);
        setComments(commentsRes.data.comments || []);

        if (watchedRes) {
          setWatchedIssues(watchedRes.data.issues || []);
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
      } finally {
        setLoading(false);
      }
    }

    loadUserProfile();
  }, [username, currentUser?.apiKey, isOwnProfile]);

  async function handleSaveBio(event) {
    event.preventDefault();

    try {
      setSavingBio(true);
      setError("");

      const api = usersApi(currentUser.apiKey);
      const response = await api.updateBio(username, bioDraft);

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

      setError(message);
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
      const response = await api.updateAvatar(username, file);

      setProfile((prev) => ({
        ...prev,
        avatar: response.data.avatar,
      }));
    } catch (err) {
      console.error(err);

      const message =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Could not update avatar.";

      setError(message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleResetAvatar() {
    try {
      setUploadingAvatar(true);
      setError("");

      const api = usersApi(currentUser.apiKey);
      await api.resetAvatar(username);

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

      setError(message);
    } finally {
      setUploadingAvatar(false);
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
    <div className="profile-layout">
      <aside className="profile-sidebar">
        <div className="avatar-edit-container">
          {profile.avatar ? (
            <img
              src={profile.avatar}
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
                  className="btn btn-outline"
                  onClick={() => setEditingBio(true)}
                >
                  Edit biography
                </button>
              )}
            </>
          )}
        </div>
      </aside>

      <main className="profile-content">
        {error && <div className="alert alert-error">{error}</div>}

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
            <CommentsList comments={comments} />
          )}
        </section>
      </main>
    </div>
  );
}