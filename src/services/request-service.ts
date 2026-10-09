import { isAxiosError } from 'axios';

import api from '@/services/api';

export type RequestMode = 'online' | 'in_person';
export type RequestPeriod = 'morning' | 'afternoon' | 'evening';
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed' | 'expired';

export type ServiceRequest = {
  id: number;
  client_id: number;
  professional_id: number;
  mode: RequestMode;
  message: string;
  preferred_days: string[];
  preferred_period?: RequestPeriod;
  hourly_rate_cents: number;
  first_class_free: boolean;
  status: RequestStatus;
  decline_reason?: string;
  expires_at: string;
  responded_at?: string;
  created_at: string;
  client_name?: string;
  professional_name?: string;
  professional_photo_url?: string;
  professional_category?: string;
};

export type NewServiceRequest = {
  professional_id: number;
  mode: RequestMode;
  message: string;
  preferred_days: string[];
  preferred_period?: RequestPeriod;
};

export async function createServiceRequest(body: NewServiceRequest): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>('/service-requests', body);
  return data;
}

export async function listMyRequests(): Promise<ServiceRequest[]> {
  const { data } = await api.get<ServiceRequest[]>('/me/service-requests');
  return data;
}

export async function listReceivedRequests(status?: RequestStatus): Promise<ServiceRequest[]> {
  const { data } = await api.get<ServiceRequest[]>('/me/professional/service-requests', { params: { status } });
  return data;
}

// Mensagem de erro do backend (ex.: pedido pendente repetido), se houver.
export function requestErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error;
    if (error.response?.status === 409 && typeof message === 'string') {
      return 'Você já tem um pedido pendente para este profissional.';
    }
    if (typeof message === 'string') return message;
  }
  return 'Não foi possível enviar o pedido. Tente novamente.';
}

export async function acceptRequest(id: number): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>(`/service-requests/${id}/accept`);
  return data;
}

export async function declineRequest(id: number, reason?: string): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>(`/service-requests/${id}/decline`, { reason });
  return data;
}

export async function completeRequest(id: number): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>(`/service-requests/${id}/complete`);
  return data;
}

export async function fetchRequest(id: number): Promise<ServiceRequest> {
  const { data } = await api.get<ServiceRequest>(`/service-requests/${id}`);
  return data;
}

export async function cancelRequest(id: number): Promise<ServiceRequest> {
  const { data } = await api.post<ServiceRequest>(`/service-requests/${id}/cancel`);
  return data;
}

export type ChatMessage = {
  id: number;
  request_id: number;
  sender_id: number;
  body: string;
  read_at?: string;
  created_at: string;
};

// `after` é o id da última mensagem já conhecida; o backend devolve só as mais novas.
export async function fetchMessages(requestId: number, after = 0): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/service-requests/${requestId}/messages`, { params: { after } });
  return data;
}

export async function sendMessage(requestId: number, body: string): Promise<ChatMessage> {
  const { data } = await api.post<ChatMessage>(`/service-requests/${requestId}/messages`, { body });
  return data;
}

// Esconde (false) ou mostra (true) um pedido encerrado na lista do cliente.
export async function setRequestActive(id: number, active: boolean): Promise<ServiceRequest> {
  const { data } = await api.patch<ServiceRequest>(`/service-requests/${id}/active`, { active });
  return data;
}
