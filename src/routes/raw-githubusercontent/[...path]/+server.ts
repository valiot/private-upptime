import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const GITHUB_API_BASE = 'https://api.github.com';

export const GET: RequestHandler = async ({ params, request, fetch }) => {
  console.log('GET request received for raw content path:', params.path);

  const [owner, repo, branch, ...filePath] = params.path.split('/');

  const apiUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath.join('/')}?ref=${branch}`;
  console.log('Proxying to GitHub API URL:', apiUrl);

  const headers = new Headers();

  // Add Authorization header using Cloudflare secret
  const githubToken = import.meta.env.VITE_GITHUB_TOKEN;
  if (!githubToken) {
    throw error(500, 'GitHub token is not set');
  }
  headers.set('Authorization', `Bearer ${githubToken}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw error(response.status, 'Failed to fetch from GitHub API');
    }

    const data: any = await response.json();

    if (!data.content) {
      throw error(404, 'Content not found');
    }

    // Determine the content type based on file extension
    const fileName = filePath[filePath.length - 1];
    let contentType = 'application/octet-stream'; // Default content type

    if (fileName.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (fileName.endsWith('.png')) {
      contentType = 'image/png';
    } else if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (fileName.endsWith('.json')) {
      contentType = 'application/json';
    } else if (fileName.endsWith('.html')) {
      contentType = 'text/html';
    }

    // Decode the base64 content
    const decodedContent = atob(data.content.replace(/\s/g, ''));

    // Create a new headers object
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);

    return new Response(decodedContent, {
      status: 200,
      headers: responseHeaders
    });

  } catch (err) {
    console.error('Error proxying to GitHub API for raw content:', err);
    throw error(500, 'Error fetching raw content from GitHub API');
  }
};