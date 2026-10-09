import axios from 'axios';

import { getAuthToken } from '@/utils/storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8082';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token vencido (o backend emite com 24h) ou revogado: o servidor responde 401
// numa requisição autenticada. Quem registra o handler (AuthContext) encerra a
// sessão e volta ao login; sem isso o app ficava preso em telas de erro
//. Só vale para requisições que
// mandaram token -- um 401 de senha errada no login não derruba nada.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const sentToken = !!error?.config?.headers?.Authorization;
    if (error?.response?.status === 401 && sentToken) unauthorizedHandler?.();
    return Promise.reject(error);
  },
);

export default api;
