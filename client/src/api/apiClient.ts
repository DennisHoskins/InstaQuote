const API_BASE_URL = '/wp-json/instaquote/v1/proxy';

class ApiClient {
  async request(url: string, options: RequestInit = {}): Promise<Response> {
    // Get nonce from root element's data attribute
    const rootEl = document.getElementById('root');
    const nonce = rootEl?.getAttribute('data-wp-nonce');
    
    console.log('ApiClient - nonce:', nonce);
    console.log('ApiClient - rootEl:', rootEl);
    
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