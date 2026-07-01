const getApiCandidates = (): string[] => {
  if (typeof window === 'undefined') {
    return [process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'];
  }

  const configured = process.env.NEXT_PUBLIC_API_URL;
  const sameOrigin = `${window.location.origin}/api`;
  const candidates = [configured, sameOrigin].filter(Boolean) as string[];
  return Array.from(new Set(candidates));
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // In test mode, use test token if no token exists
  if (!token && process.env.NEXT_PUBLIC_TEST_MODE === 'true') {
    // Try to get test token
    try {
      const testResponse = await fetch(`${getApiUrl()}/auth/test-login`, { method: 'POST' });
      if (testResponse.ok) {
        const testData = await testResponse.json();
        if (testData.token) {
          localStorage.setItem('token', testData.token);
          headers['Authorization'] = `Bearer ${testData.token}`;
        }
      }
    } catch (e) {
      // Ignore test login errors
    }
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const apiCandidates = getApiCandidates();
  let lastError: Error | null = null;

  for (const baseUrl of apiCandidates) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An error occurred' }));
        throw new Error(error.error || 'An error occurred');
      }

      return response.json();
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Network error while calling API');
}

export async function uploadFile(
  endpoint: string,
  formData: FormData
): Promise<any> {
  const token = localStorage.getItem('token');
  const apiCandidates = getApiCandidates();
  let lastError: Error | null = null;

  for (const baseUrl of apiCandidates) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'An error occurred' }));
        throw new Error(error.error || 'An error occurred');
      }

      return response.json();
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Network error while uploading file');
}

