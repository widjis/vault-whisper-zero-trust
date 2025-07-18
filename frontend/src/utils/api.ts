/**
 * API utility functions for making authenticated requests
 */

/**
 * Fetch with authentication headers
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise with the fetch response
 */
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  // Ensure credentials are included for cookies
  const fetchOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, fetchOptions);

  // If unauthorized (401), the session might have expired
  if (response.status === 401) {
    // You could trigger a logout or refresh token here
    console.warn('Session expired or unauthorized');
  }

  return response;
};

/**
 * Handle API errors and extract error message
 * @param response - The fetch response
 * @returns Promise with the error message
 */
export const handleApiError = async (response: Response): Promise<string> => {
  try {
    const errorData = await response.json();
    return errorData.message || 'An unexpected error occurred';
  } catch (error) {
    return `${response.status}: ${response.statusText || 'Unknown error'}`;
  }
};

/**
 * Make a GET request with authentication
 * @param url - The URL to fetch
 * @returns Promise with the parsed JSON response
 */
export const apiGet = async <T>(url: string): Promise<T> => {
  const response = await fetchWithAuth(url);
  
  if (!response.ok) {
    const errorMessage = await handleApiError(response);
    throw new Error(errorMessage);
  }
  
  return response.json();
};

/**
 * Make a POST request with authentication
 * @param url - The URL to post to
 * @param data - The data to send
 * @returns Promise with the parsed JSON response
 */
export const apiPost = async <T>(
  url: string,
  data: any
): Promise<T> => {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorMessage = await handleApiError(response);
    throw new Error(errorMessage);
  }
  
  return response.json();
};

/**
 * Make a PUT request with authentication
 * @param url - The URL to put to
 * @param data - The data to send
 * @returns Promise with the parsed JSON response
 */
export const apiPut = async <T>(
  url: string,
  data: any
): Promise<T> => {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorMessage = await handleApiError(response);
    throw new Error(errorMessage);
  }
  
  return response.json();
};

/**
 * Make a DELETE request with authentication
 * @param url - The URL to delete
 * @returns Promise with the parsed JSON response
 */
export const apiDelete = async <T>(url: string): Promise<T> => {
  const response = await fetchWithAuth(url, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorMessage = await handleApiError(response);
    throw new Error(errorMessage);
  }
  
  return response.json();
};