import axios from "axios";
import { BACKEND_URL } from "../config";

export const api = axios.create({
  baseURL: BACKEND_URL,
});

export const authHeader = (token?: string) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});