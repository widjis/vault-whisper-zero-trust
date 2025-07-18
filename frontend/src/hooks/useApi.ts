import { useState, useCallback } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, handleApiError } from '../utils/api';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
  initialLoading?: boolean;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  get: (url: string) => Promise<T | null>;
  post: (url: string, body: any) => Promise<T | null>;
  put: (url: string, body: any) => Promise<T | null>;
  del: (url: string) => Promise<T | null>;
  reset: () => void;
}

const useApi = <T = any>(options: UseApiOptions = {}): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(options.initialLoading || false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  const handleRequest = useCallback(
    async <R>(requestFn: () => Promise<R>): Promise<R | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await requestFn();
        setData(result as unknown as T);
        setLoading(false);
        if (options.onSuccess) {
          options.onSuccess(result);
        }
        return result;
      } catch (err) {
        const errorMessage = handleApiError(err);
        setError(errorMessage);
        setLoading(false);
        if (options.onError) {
          options.onError(errorMessage);
        }
        return null;
      }
    },
    [options]
  );

  const get = useCallback(
    (url: string) => handleRequest(() => apiGet<T>(url)),
    [handleRequest]
  );

  const post = useCallback(
    (url: string, body: any) => handleRequest(() => apiPost<T>(url, body)),
    [handleRequest]
  );

  const put = useCallback(
    (url: string, body: any) => handleRequest(() => apiPut<T>(url, body)),
    [handleRequest]
  );

  const del = useCallback(
    (url: string) => handleRequest(() => apiDelete<T>(url)),
    [handleRequest]
  );

  return {
    data,
    loading,
    error,
    get,
    post,
    put,
    del,
    reset,
  };
};

export default useApi;