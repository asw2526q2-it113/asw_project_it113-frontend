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

    // GET /api/users/:username/watched-issues/
    // Solo se puede consultar para el propio usuario autenticado
    watchedIssues: (username, params = {}) =>
      http.get(`users/${username}/watched-issues/`, { params }),

    // GET /api/users/:username/comments/
    comments: (username) =>
      http.get(`users/${username}/comments/`),

    // PATCH /api/users/:username/bio/
    updateBio: (username, bio) =>
      http.patch(`users/${username}/bio/`, { bio }),

    // PUT /api/users/:username/avatar/
    updateAvatar: (username, file) => {
      const formData = new FormData();
      formData.append("avatar", file);

      return http.put(`users/${username}/avatar/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    },

    // POST /api/users/:username/reset-avatar/
    resetAvatar: (username) =>
      http.post(`users/${username}/reset-avatar/`),
  };
};