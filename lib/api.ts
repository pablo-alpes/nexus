const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || window.location.origin + '/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
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
  
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'An error occurred');
  }
  
  return response.json();
}

export async function uploadFile(
  endpoint: string,
  formData: FormData
): Promise<any> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${getApiUrl()}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'An error occurred');
  }
  
  return response.json();
}

