import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GITHUB_API_BASE = 'https://api.github.com';

async function handleRequest(method: string, params: any, request: Request, fetch: any) {
  console.log(`${method} request received for API path:`, params.path);

  const apiUrl = `${GITHUB_API_BASE}/${params.path}`;
  console.log('Proxying to GitHub API URL:', apiUrl);

  const headers = new Headers(request.headers);

  // Add Authorization header using Cloudflare secret
  const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
  if (!githubToken) {
    throw error(500, 'GitHub token is not set');
  }
  headers.set('Authorization', `Bearer ${githubToken}`);

  try {
    const fetchOptions: RequestInit = {
      method: method,
      headers: headers
    };

    // Include body for methods that typically have one
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = await request.arrayBuffer();
    }

    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
      throw error(response.status, `Failed to ${method} to GitHub API`);
    }

    // Get the response data as ArrayBuffer (works for any content type)
    const data = await response.arrayBuffer();

    // Create a new headers object from the original response
    const responseHeaders = new Headers(response.headers);

    return new Response(data, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (err) {
    console.error(`Error proxying ${method} request to GitHub API:`, err);
    throw error(500, `Error proxying ${method} request to GitHub API`);
  }
}

export const GET: RequestHandler = ({ params, request, fetch }) => handleRequest('GET', params, request, fetch);
export const POST: RequestHandler = ({ params, request, fetch }) => handleRequest('POST', params, request, fetch);
export const PUT: RequestHandler = ({ params, request, fetch }) => handleRequest('PUT', params, request, fetch);
export const DELETE: RequestHandler = ({ params, request, fetch }) => handleRequest('DELETE', params, request, fetch);
export const PATCH: RequestHandler = ({ params, request, fetch }) => handleRequest('PATCH', params, request, fetch);

// You can add other methods as needed, e.g., HEAD, OPTIONS