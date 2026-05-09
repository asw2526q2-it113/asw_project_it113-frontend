import axios from "axios";

const API_BASE_URL =  "https://asw-project-it113.onrender.com/api/";

const client = axios.create({
  baseURL: `${API_BASE_URL}/`,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authClient = (apiKey) => {
  return axios.create({
    baseURL: `${API_BASE_URL}/`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${apiKey}`,
    },
  });
};

export default client;