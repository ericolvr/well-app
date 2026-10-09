import api from '@/services/api';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8082';

export type ProfessionalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type Category = { id: number; name: string };

export type ProfessionalProfile = {
  id: number;
  name: string;
  category_id?: number;
  headline?: string;
  bio?: string;
  photo_url?: string;
  online: boolean;
  in_person: boolean;
  city?: string;
  service_radius_km: number;
  hourly_rate_cents: number;
  first_class_free: boolean;
  years_experience: number;
  education?: string;
  status: ProfessionalStatus;
  active: boolean;
  rejection_reason?: string;
  rating_avg?: number;
  rating_count?: number;
  category?: Category;
};

// O backend guarda o caminho da foto ("/photos/<id>") e só a entrega a quem está logado,
// então a imagem é pedida com o token no cabeçalho (como no oaas). Links completos,
// cadastrados pelo admin, são usados como estão.
export function photoSource(
  photoUrl: string | undefined,
  token: string | null,
): { uri: string; headers?: Record<string, string> } | undefined {
  if (!photoUrl) return undefined;
  if (/^https?:\/\//.test(photoUrl)) return { uri: photoUrl };
  return { uri: `${BASE_URL}${photoUrl}`, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) };
}

export async function fetchMyProfessional(): Promise<ProfessionalProfile | null> {
  const { data } = await api.get<{ professional: ProfessionalProfile | null }>('/me');
  return data.professional;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}

// Vitrine do cliente: só perfis aprovados e ativos; q busca em nome, chamada e categoria.
export async function listProfessionals(params: { q?: string; categoryId?: number }): Promise<ProfessionalProfile[]> {
  const { data } = await api.get<ProfessionalProfile[]>('/professionals', {
    params: { q: params.q || undefined, category_id: params.categoryId || undefined },
  });
  return data;
}

export async function fetchProfessional(id: number): Promise<ProfessionalProfile> {
  const { data } = await api.get<ProfessionalProfile>(`/professionals/${id}`);
  return data;
}

export async function saveMyProfessional(profile: Omit<ProfessionalProfile, 'id' | 'status' | 'active' | 'rejection_reason' | 'category'>) {
  const { data } = await api.put<ProfessionalProfile>('/me/professional', profile);
  return data;
}

// Tira o perfil da análise (ou do ar) e o devolve a rascunho, para ser editado.
export async function withdrawMyProfessional() {
  const { data } = await api.post<ProfessionalProfile>('/me/professional/withdraw');
  return data;
}

// Pausa ou reativa a aparição do perfil aprovado para novos clientes.
export async function setMyProfessionalVisible(active: boolean) {
  const { data } = await api.patch<ProfessionalProfile>('/me/professional/active', { active });
  return data;
}

export async function submitMyProfessional() {
  const { data } = await api.post<ProfessionalProfile>('/me/professional/submit');
  return data;
}

// Envia a foto escolhida e devolve o caminho que deve ir em photo_url.
export async function uploadPhoto(uri: string, mimeType?: string | null): Promise<string> {
  const form = new FormData();
  form.append('photo', {
    uri,
    name: 'photo.jpg',
    type: mimeType ?? 'image/jpeg',
  } as unknown as Blob);
  const { data } = await api.post<{ url: string }>('/me/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
