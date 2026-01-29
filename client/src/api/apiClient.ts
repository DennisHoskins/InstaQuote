const API_BASE_URL = 'http://localhost:3001/api';

class ApiClient {
  private nonce: string | null = null;

  setNonce(nonce: string) {
    this.nonce = nonce;
  }

  async refreshNonce(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/user`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to refresh authentication');
    }

    const data = await response.json();
    if (!data.isAuthenticated || !data.nonce) {
      throw new Error('Not authenticated');
    }

    this.nonce = data.nonce;
    return data.nonce;
  }

  async request(url: string, options: RequestInit = {}, isRetry = false): Promise<Response> {
    // Add nonce header if we have one
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
      ...(this.nonce && { 'X-WP-Nonce': this.nonce }),
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // If 401, try refreshing nonce and retry once
    if (response.status === 401 && !isRetry) {
      try {
        await this.refreshNonce();
        
        // Retry with new nonce
        return this.request(url, options, true);
      } catch (error) {
        throw new Error('Authentication failed');
      }
    }

    return response;
  }

  async get(path: string): Promise<any> {
    const response = await this.request(`${API_BASE_URL}${path}`);
    if (!response.ok) throw new Error(`GET ${path} failed`);
    return response.json();
  }

  async post(path: string, body?: any): Promise<any> {
    const response = await this.request(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`POST ${path} failed`);
    return response.json();
  }

  async patch(path: string, body?: any): Promise<any> {
    const response = await this.request(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(`PUT ${path} failed`);
    return response.json();
  }

  async delete(path: string): Promise<any> {
    const response = await this.request(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`DELETE ${path} failed`);
    return response.json();
  }
}

export const apiClient = new ApiClient();