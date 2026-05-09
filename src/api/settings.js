import { authClient } from "./client";

export const settingsApi = (apiKey) => {
  const http = authClient(apiKey);

  return {
    // GET /api/settings/
    getAll: () =>
      http.get("settings/"),

    // POST /api/settings/:attr/
    add: (attr, data) =>
      http.post(`settings/${attr}/`, data),

    // PATCH /api/settings/:attr/:pk/
    edit: (attr, pk, data) =>
      http.patch(`settings/${attr}/${pk}/`, data),

    // DELETE /api/settings/:attr/:pk/
    // Si hi ha issues afectades → primer retorna 409 amb alternatives
    // Segona crida amb replaceWith → confirma l'eliminació
    remove: (attr, pk, replaceWith = null) => {
      const params = replaceWith ? { replace_with: replaceWith } : {};
      return http.delete(`settings/${attr}/${pk}/`, { params });
    },
  };
};
