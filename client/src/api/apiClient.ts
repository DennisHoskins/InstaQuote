const API_BASE_URL = '/wp-json/instaquote/v1/proxy';

let cachedNonce: string | null = null;

export async function fetchNonce(): Promise<string | null> {
  if ((window as any).instaquoteNonce) {
    cachedNonce = (window as any).instaquoteNonce;
    return cachedNonce;
  }
  try {
    const response = await fetch('/wp-json/instaquote/v1/nonce', {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      cachedNonce = data.nonce;
      return cachedNonce;
    }
  } catch (error) {
    console.error('Failed to fetch nonce:', error);
  }
  return null;
}

export function getNonce(): string | null {
  return cachedNonce;
}

class ApiClient {
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    const nonce = getNonce();
    
    console.log('ApiClient - nonce:', nonce);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    
    if (nonce) {
      headers['X-WP-Nonce'] = nonce;
    }
    
    console.log('ApiClient - headers:', headers);

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

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
    if (!response.ok) throw new Error(`PATCH ${path} failed`);
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