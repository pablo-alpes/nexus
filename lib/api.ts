const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Note: Removed automatic test login to avoid issues with user context
  // Users should login normally with their credentials
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    // Check if the response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.error || 'An error occurred');
    } else {
      // If not JSON, it might be an HTML error page or plain text
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}...`);
    }
  }
  
  return response.json();
}

export async function uploadFile(
  endpoint: string,
  formData: FormData
): Promise<any> {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    // Check if the response is JSON before parsing
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json();
      throw new Error(error.error || 'An error occurred');
    } else {
      // If not JSON, it might be an HTML error page or plain text
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} ${response.statusText} - ${errorText.substring(0, 100)}...`);
    }
  }
  
  return response.json();
}

