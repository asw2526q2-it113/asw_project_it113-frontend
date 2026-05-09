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

    // PUT /api/users/bio/
    updateBio: (bio) =>
      http.put("users/bio/", { bio }),

    // POST /api/users/:username/reset-avatar/
    resetAvatar: (username) =>
      http.post(`users/${username}/reset-avatar/`),
  };
};
