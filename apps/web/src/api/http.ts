import type { ApiResponse } from '@geo-platform/shared-types';
import { useBrandContextStore } from '../stores/brandContextStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') || '/api/v1';

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
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers
    });
    const payload: unknown = await response.json();
    if (isApiResponse<T>(payload)) return sanitizeApiResponse(payload);
    return failedResponse('INVALID_API_RESPONSE', '服务返回了无法识别的数据，请重新加载后再试。');
  } catch {
    return failedResponse('API_UNAVAILABLE', '当前服务暂时无法连接，已保留页面中的现有内容，请重新加载后再试。');
  }
}

export function getPublicApiErrorMessage(message?: string, fallback = '请求失败，请稍后重试。'): string {
  const normalized = message?.trim();
  if (!normalized || /(?:provider|fallback|prisma|sql|http\s*\d{3}|stack|exception|internal server error)/i.test(normalized)) {
    return fallback;
  }

  return normalized;
}

function sanitizeApiResponse<T>(response: ApiResponse<T>): ApiResponse<T> {
  if (response.success) return response;

  return {
    ...response,
    error: {
      ...response.error,
      message: getPublicApiErrorMessage(response.error.message)
    }
  };
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object' || !('success' in value)) return false;
  const response = value as { success?: unknown; data?: unknown; error?: unknown };
  if (response.success === true) return 'data' in response;
  if (response.success !== false || !response.error || typeof response.error !== 'object') return false;
  const error = response.error as { code?: unknown; message?: unknown };
  return typeof error.code === 'string' && typeof error.message === 'string';
}

function failedResponse<T>(code: string, message: string): ApiResponse<T> {
  return { success: false, data: null, error: { code, message } };
}
