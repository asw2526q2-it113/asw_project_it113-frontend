import { authClient } from "./client";

export const usersApi = (apiKey) => {
  const http = authClient(apiKey);

  return {
    // GET /api/users/
    list: () =>
      http.get("users/"),

    // GET /api/users/:username/
    profile: (username) =>
      http.get(`users/${username}/`),

    // GET /api/users/:username/issues/
    assignedIssues: (username, params = {}) =>
      http.get(`users/${username}/issues/`, { params }),

    // GET /api/users/me/watched-issues/
    watchedIssues: (params = {}) =>
      http.get("users/me/watched-issues/", { params }),

    // GET /api/users/:username/comments/
    comments: (username) =>
      http.get(`users/${username}/comments/`),

    //DELETE /api/issues/:pk/comments/:comment_pk/
    deleteComment: (pk, commentPk) =>
      http.delete(`issues/${pk}/comments/${commentPk}/`),

    // PATCH /api/users/me/bio/
    updateBio: (bio) =>
      http.patch("users/me/bio/", { bio }),

    // PUT /api/users/me/avatar/
    updateAvatar: (file) => {
      const formData = new FormData();
      formData.append("avatar", file);

      return http.put("users/me/avatar/", formData);
    },

    // POST /api/users/me/reset-avatar/
    resetAvatar: () =>
      http.post("users/me/reset-avatar/"),
  };
};