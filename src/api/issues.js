import { authClient } from "./client";

export const issuesApi = (apiKey) => {
  const http = authClient(apiKey);

  return {
    // GET /api/issues/?q=...&status=...
    list: (params = {}) =>
      http.get("issues/", { params }),

    // GET /api/issues/:pk/
    detail: (pk) =>
      http.get(`issues/${pk}/`),

    // POST /api/issues/
    create: (data) =>
      http.post("issues/", data),

    // PUT /api/issues/:pk/
    update: (pk, data) =>
      http.put(`issues/${pk}/`, data),

    // DELETE /api/issues/:pk/
    remove: (pk) =>
      http.delete(`issues/${pk}/`),

    // POST /api/issues/:pk/assign/
    assign: (pk, userId) =>
      http.post(`issues/${pk}/assign/`, { assigned_to: userId }),

    // DELETE /api/issues/:pk/assign/
    unassign: (pk) =>
      http.delete(`issues/${pk}/assign/`),

    // DELETE /api/issues/:pk/deadline/
    removeDeadline: (pk) =>
      http.delete(`issues/${pk}/deadline/`),

    // POST /api/issues/bulk/
    bulkInsert: (titles) =>
      http.post("issues/bulk/", { titles }),

    // ── Watchers ────────────────────────────────────────────────────────────
    toggleWatcher: (pk) =>
      http.post(`issues/${pk}/watchers/toggle/`),

    updateWatchers: (pk, watcherIds) =>
      http.post(`issues/${pk}/watchers/`, { watchers: watcherIds }),

    removeWatcher: (pk, userId) =>
      http.delete(`issues/${pk}/watchers/${userId}/`),

    // ── Comments ────────────────────────────────────────────────────────────
    addComment: (pk, content) =>
      http.post(`issues/${pk}/comments/`, { content, issue: pk }),

    editComment: (pk, commentPk, content) =>
      http.put(`issues/${pk}/comments/${commentPk}/`, { content }),

    deleteComment: (pk, commentPk) =>
      http.delete(`issues/${pk}/comments/${commentPk}/`),

    // ── Attachments ─────────────────────────────────────────────────────────
    addAttachment: (pk, file) => {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("issue", pk);

      return http.post(
        `issues/${pk}/attachments/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
    },

    deleteAttachment: (attachmentPk) =>
      http.delete(`attachments/${attachmentPk}/`),
  };
};
