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

    // PUT /api/users/me/bio/
    updateBio: (bio) =>
      http.put("users/me/bio/", { bio }),

    // POST /api/users/me/reset-avatar/
    resetAvatar: () =>
      http.post(`users/me/reset-avatar/`),

  };
};
