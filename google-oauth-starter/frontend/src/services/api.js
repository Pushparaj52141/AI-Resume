import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL;

if (!baseURL) {
  throw new Error("Missing VITE_API_BASE_URL in frontend .env");
}

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json"
  }
});

export const setAuthHeader = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};
