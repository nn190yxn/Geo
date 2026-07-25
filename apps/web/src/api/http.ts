import type { ApiResponse } from '@geo-platform/shared-types';
import { useBrandContextStore } from '../stores/brandContextStore';

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function apiPostForm<T>(path: string, body: FormData): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: 'POST',
    body
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}

async function apiRequest<T>(path: string, init: RequestInit): Promise<ApiResponse<T>> {
  const activeBrandId = useBrandContextStore.getState().activeBrandId;
  const headers: HeadersInit = init.body instanceof FormData
    ? { 'x-brand-id': activeBrandId }
    : { 'content-type': 'application/json', 'x-brand-id': activeBrandId };
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers
  });

  return response.json() as Promise<ApiResponse<T>>;
}
