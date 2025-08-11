// Client HTTP de base avec authentification

import type { ApiResponse, AuthHeaders } from '@adlign/types';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export class HttpClient {
  private config: HttpClientConfig;
  private authToken?: string;

  constructor(config: HttpClientConfig) {
    this.config = {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      ...config,
    };
  }

  /**
   * Définit le token d'authentification
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Efface le token d'authentification
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Effectue une requête HTTP
   */
  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    const headers = this.buildHeaders(options.headers);
    const requestOptions = this.buildRequestOptions(options);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.config.timeout);

      const response = await fetch(url, {
        ...requestOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as ApiResponse<T>;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Méthode GET
   */
  async get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Méthode POST
   */
  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  /**
   * Méthode PUT
   */
  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  /**
   * Méthode DELETE
   */
  async delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Méthode PATCH
   */
  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  /**
   * Construit les en-têtes de la requête
   */
  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers = { ...this.config.headers };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    if (customHeaders) {
      Object.assign(headers, customHeaders);
    }

    return headers;
  }

  /**
   * Construit les options de la requête
   */
  private buildRequestOptions(options: RequestOptions): RequestInit {
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
    };

    if (options.body) {
      if (typeof options.body === 'string') {
        requestOptions.body = options.body;
      } else {
        requestOptions.body = JSON.stringify(options.body);
      }
    }

    return requestOptions;
  }
}
