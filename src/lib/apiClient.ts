/**
 * API Client with automatic token refresh
 * 
 * This utility wraps fetch to automatically handle token refresh
 * when API calls receive 401 responses. It will retry the failed
 * request once after refreshing the token.
 */

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh the access token by calling the refresh endpoint
 */
async function refreshAccessToken(): Promise<boolean> {
    // If already refreshing, wait for that refresh to complete
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const response = await fetch('/api/auth/refresh', {
                method: 'POST',
                credentials: 'include',
            });

            if (response.ok) {
                if (process.env.NODE_ENV === 'development') {
                    console.log('Token refreshed successfully');
                }
                return true;
            }

            if (process.env.NODE_ENV === 'development') {
                console.error('Token refresh failed:', response.status);
            }
            return false;
        } catch (error) {
            if (process.env.NODE_ENV === 'development') {
                console.error('Token refresh error:', error);
            }
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * Enhanced fetch with automatic token refresh
 * 
 * @param input - URL or Request object
 * @param init - Fetch options
 * @param retryOnUnauth - Whether to retry after refreshing token (default: true)
 */
export async function apiClient(
    input: RequestInfo | URL,
    init?: RequestInit,
    retryOnUnauth = true
): Promise<Response> {
    // Ensure credentials are included by default
    const options: RequestInit = {
        ...init,
        credentials: init?.credentials || 'include',
    };

    // Make the initial request
    const response = await fetch(input, options);

    // If we get a 401 and haven't retried yet, try to refresh the token
    if (response.status === 401 && retryOnUnauth) {
        const dev = process.env.NODE_ENV === 'development';
        if (dev) console.log('Received 401, attempting token refresh...');

        const refreshed = await refreshAccessToken();

        if (refreshed) {
            if (dev) console.log('Retrying original request after token refresh...');
            // Retry the original request with the new token
            return fetch(input, {
                ...options,
                // Don't retry again to avoid infinite loops
            }).then(retryResponse => {
                // If still 401 after refresh, redirect to login
                if (retryResponse.status === 401) {
                    if (dev) console.log('Still unauthorized after refresh, redirecting to login...');
                    handleUnauthorized();
                }
                return retryResponse;
            });
        } else {
            // Refresh failed, redirect to login
            if (dev) console.log('Token refresh failed, redirecting to login...');
            handleUnauthorized();
        }
    }

    return response;
}

/**
 * Handle unauthorized access by redirecting to login
 */
function handleUnauthorized(): void {
    if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
        window.location.href = loginUrl;
    }
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
    get: (url: string, options?: RequestInit) =>
        apiClient(url, { ...options, method: 'GET' }),

    post: (url: string, data?: any, options?: RequestInit) =>
        apiClient(url, {
            ...options,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: (url: string, data?: any, options?: RequestInit) =>
        apiClient(url, {
            ...options,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: (url: string, options?: RequestInit) =>
        apiClient(url, { ...options, method: 'DELETE' }),

    patch: (url: string, data?: any, options?: RequestInit) =>
        apiClient(url, {
            ...options,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            body: data ? JSON.stringify(data) : undefined,
        }),
};
