const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin + '/api';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/f85e8ae0-d382-466b-9574-875e68788737',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/api.ts:3',message:'API URL determined',data:{nextPublicApiUrl:process.env.NEXT_PUBLIC_API_URL,windowOrigin:window.location.origin,finalApiUrl:apiUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return apiUrl;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
};

export async function apiRequest<T = any>(
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

