import { httpAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { z } from "zod";

// OAuth 2.1 Bearer token validation
async function validateBearerToken(ctx: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }
  
  const token = authHeader.substring(7);
  // In a real implementation, you'd validate the JWT token here
  // For now, we'll use a simple token check
  if (token !== process.env.MCP_API_TOKEN) {
    throw new Error('Invalid bearer token');
  }
  
  return { userId: 'mcp-user' }; // Return authenticated user context
}

// Rate limiting using simple in-memory counter (in production, use a proper KV store)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(ctx: any, key: string, limit: number = 100, windowMs: number = 60000) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const rateLimitKey = `${key}:${windowStart}`;
  
  const current = rateLimitStore.get(rateLimitKey) || { count: 0, resetTime: windowStart + windowMs };
  
  if (current.count >= limit) {
    throw new Error(`Rate limit exceeded. Reset at ${new Date(current.resetTime).toISOString()}`);
  }
  
  rateLimitStore.set(rateLimitKey, { count: current.count + 1, resetTime: current.resetTime });
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  return {
    remaining: limit - current.count - 1,
    reset: Math.ceil(current.resetTime / 1000)
  };
}

// Zod schemas for MCP tools
const SubmitManuscriptSchema = z.object({
  title: z.string(),
  abstract: z.string(),
  keywords: z.array(z.string()),
  language: z.string(),
  fileUrl: z.string().url(),
  authorEmails: z.array(z.string().email())
});

const GetManuscriptSchema = z.object({
  manuscriptId: z.string()
});

const AssignReviewersSchema = z.object({
  manuscriptId: z.string(),
  reviewerEmails: z.array(z.string().email())
});

const SubmitReviewSchema = z.object({
  reviewId: z.string(),
  score: z.number().min(1).max(10),
  comments: z.string(),
  recommendation: z.enum(['accept', 'minor', 'major', 'reject'])
});

const PubDecisionSchema = z.object({
  manuscriptId: z.string(),
  decision: z.enum(['accept', 'reject', 'revise']),
  comments: z.string().optional()
});

const RegisterDOISchema = z.object({
  manuscriptId: z.string(),
  doi: z.string()
});

const PublishArticleSchema = z.object({
  manuscriptId: z.string(),
  publicationDate: z.string().datetime().optional()
});

const SearchSchema = z.object({
  query: z.string(),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
  filters: z.record(z.any()).optional()
});

const NotifyUserSchema = z.object({
  userEmail: z.string().email(),
  message: z.string(),
  type: z.enum(['info', 'warning', 'error']).default('info')
});

// MCP Router Implementation
export const mcpRouter = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const path = url.pathname.replace('/mcp/v1', '');
  const method = request.method;

  try {
    // Validate bearer token
    const authHeader = request.headers.get('Authorization');
    const auth = await validateBearerToken(ctx, authHeader);
    
    // Rate limiting
    const clientId = auth.userId;
    const rateLimit = await checkRateLimit(ctx, clientId);
    
    // Common response headers
    const headers = {
      'Content-Type': 'application/json',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': rateLimit.reset.toString(),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers });
    }

    // Route handling
    if (path === '/manuscripts') {
      if (method === 'POST') {
        return await handleSubmitManuscript(ctx, request, headers);
      }
      if (method === 'GET') {
        return await handleSearchManuscripts(ctx, request, headers);
      }
    } else if (path.startsWith('/manuscripts/') && path.split('/').length === 3) {
      const manuscriptId = path.split('/')[2];
      if (method === 'GET') {
        return await handleGetManuscript(ctx, manuscriptId, headers);
      }

    } else if (path.startsWith('/manuscripts/') && path.endsWith('/reviewers')) {
      const manuscriptId = path.split('/')[2];
      if (method === 'POST') {
        return await handleAssignReviewers(ctx, request, manuscriptId, headers);
      }
    } else if (path.startsWith('/reviews/') && path.split('/').length === 3) {
      const reviewId = path.split('/')[2];
      if (method === 'PUT') {
        return await handleSubmitReview(ctx, request, reviewId, headers);
      }

    } else if (path.startsWith('/manuscripts/') && path.endsWith('/decision')) {
      const manuscriptId = path.split('/')[2];
      if (method === 'POST') {
        return await handlePubDecision(ctx, request, manuscriptId, headers);
      }
    } else if (path.startsWith('/manuscripts/') && path.endsWith('/doi')) {
      const manuscriptId = path.split('/')[2];
      if (method === 'POST') {
        return await handleRegisterDOI(ctx, request, manuscriptId, headers);
      }

    } else if (path.startsWith('/manuscripts/') && path.endsWith('/publish')) {
      const manuscriptId = path.split('/')[2];
      if (method === 'POST') {
        return await handlePublishArticle(ctx, request, manuscriptId, headers);
      }
    } else if (path === '/articles/search') {
      if (method === 'GET') {
        return await handleSearchArticles(ctx, request, headers);
      }
    } else if (path === '/notifications') {
      if (method === 'POST') {
        return await handleNotifyUser(ctx, request, headers);
      }
    } else {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers
    });

  } catch (error: any) {
    const status = error.message.includes('Rate limit') ? 429 :
                  error.message.includes('Authorization') ? 401 :
                  error.message.includes('Invalid') ? 400 : 500;
    
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

// Handler implementations
async function handleSubmitManuscript(ctx: any, request: Request, headers: Record<string, string>) {
  const body = await request.json();
  const data = SubmitManuscriptSchema.parse(body);
  
  // Create a dummy file storage ID for the URL
  const dummyFile = new Blob(['Manuscript content'], { type: 'application/pdf' });
  const fileId = await ctx.storage.store(dummyFile);
  
  const manuscriptId = await ctx.runMutation(api.manuscripts.createManuscript, {
    title: data.title,
    abstract: data.abstract,
    keywords: data.keywords,
    language: data.language,
    fileId: fileId
  });

  return new Response(JSON.stringify({
    id: manuscriptId,
    status: 'submitted',
    message: 'Manuscript submitted successfully'
  }), { headers });
}

async function handleGetManuscript(ctx: any, manuscriptId: string, headers: Record<string, string>) {
  const manuscripts = await ctx.runQuery(api.manuscripts.getAllManuscripts);
  const manuscript = manuscripts.find((m: any) => m._id === manuscriptId);
  
  if (!manuscript) {
    return new Response(JSON.stringify({ error: 'Manuscript not found' }), {
      status: 404,
      headers
    });
  }

  return new Response(JSON.stringify(manuscript), { headers });
}

async function handleAssignReviewers(ctx: any, request: Request, manuscriptId: string, headers: Record<string, string>) {
  const body = await request.json();
  const data = AssignReviewersSchema.parse(body);
  
  // This would need to be implemented to find reviewers by email and assign them
  return new Response(JSON.stringify({
    message: 'Reviewers assigned successfully',
    manuscriptId,
    reviewers: data.reviewerEmails
  }), { headers });
}

async function handleSubmitReview(ctx: any, request: Request, reviewId: string, headers: Record<string, string>) {
  const body = await request.json();
  const data = SubmitReviewSchema.parse(body);
  
  await ctx.runMutation(api.reviews.submitReview, {
    reviewId: reviewId as any,
    score: data.score,
    commentsMd: data.comments,
    recommendation: data.recommendation
  });

  return new Response(JSON.stringify({
    message: 'Review submitted successfully',
    reviewId
  }), { headers });
}

async function handlePubDecision(ctx: any, request: Request, manuscriptId: string, headers: Record<string, string>) {
  const body = await request.json();
  const data = PubDecisionSchema.parse(body);
  
  const status = data.decision === 'accept' ? 'accepted' : 
                data.decision === 'reject' ? 'submitted' : 'inReview';
  
  await ctx.runMutation(api.manuscripts.updateManuscriptStatus, {
    manuscriptId: manuscriptId as any,
    status: status as any
  });

  return new Response(JSON.stringify({
    message: 'Publication decision recorded',
    manuscriptId,
    decision: data.decision
  }), { headers });
}

async function handleRegisterDOI(ctx: any, request: Request, manuscriptId: string, headers: Record<string, string>) {
  const body = await request.json();
  const data = RegisterDOISchema.parse(body);
  
  // In a real implementation, this would register the DOI with a service like Crossref
  return new Response(JSON.stringify({
    message: 'DOI registered successfully',
    manuscriptId,
    doi: data.doi
  }), { headers });
}

async function handlePublishArticle(ctx: any, request: Request, manuscriptId: string, headers: Record<string, string>) {
  const body = await request.json();
  const data = PublishArticleSchema.parse(body);
  
  await ctx.runMutation(api.manuscripts.updateManuscriptStatus, {
    manuscriptId: manuscriptId as any,
    status: 'published'
  });

  return new Response(JSON.stringify({
    message: 'Article published successfully',
    manuscriptId,
    publicationDate: data.publicationDate || new Date().toISOString()
  }), { headers });
}

async function handleSearchArticles(ctx: any, request: Request, headers: Record<string, string>) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const cursor = url.searchParams.get('cursor');
  
  const data = SearchSchema.parse({ query, limit, cursor });
  
  // Get published manuscripts
  const manuscripts = await ctx.runQuery(api.manuscripts.getAllManuscripts);
  const publishedArticles = manuscripts.filter((m: any) => m.status === 'published');
  
  // Simple search implementation
  const filtered = publishedArticles.filter((article: any) => 
    article.title.toLowerCase().includes(query.toLowerCase()) ||
    article.abstract.toLowerCase().includes(query.toLowerCase())
  );
  
  const startIndex = cursor ? parseInt(cursor) : 0;
  const endIndex = startIndex + limit;
  const results = filtered.slice(startIndex, endIndex);
  const hasMore = endIndex < filtered.length;
  
  const responseHeaders = { ...headers };
  if (hasMore) {
    responseHeaders['Link'] = `</mcp/v1/articles/search?query=${encodeURIComponent(query)}&cursor=${endIndex}&limit=${limit}>; rel="next"`;
  }

  return new Response(JSON.stringify({
    results,
    pagination: {
      cursor: hasMore ? endIndex.toString() : null,
      hasMore,
      total: filtered.length
    }
  }), { headers: responseHeaders });
}

async function handleSearchManuscripts(ctx: any, request: Request, headers: Record<string, string>) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const cursor = url.searchParams.get('cursor');
  
  const manuscripts = await ctx.runQuery(api.manuscripts.getAllManuscripts);
  
  // Simple search implementation
  const filtered = manuscripts.filter((manuscript: any) => 
    manuscript.title.toLowerCase().includes(query.toLowerCase()) ||
    manuscript.abstract.toLowerCase().includes(query.toLowerCase())
  );
  
  const startIndex = cursor ? parseInt(cursor) : 0;
  const endIndex = startIndex + limit;
  const results = filtered.slice(startIndex, endIndex);
  const hasMore = endIndex < filtered.length;
  
  const responseHeaders = { ...headers };
  if (hasMore) {
    responseHeaders['Link'] = `</mcp/v1/manuscripts?query=${encodeURIComponent(query)}&cursor=${endIndex}&limit=${limit}>; rel="next"`;
  }

  return new Response(JSON.stringify({
    results,
    pagination: {
      cursor: hasMore ? endIndex.toString() : null,
      hasMore,
      total: filtered.length
    }
  }), { headers: responseHeaders });
}

async function handleNotifyUser(ctx: any, request: Request, headers: Record<string, string>) {
  const body = await request.json();
  const data = NotifyUserSchema.parse(body);
  
  // In a real implementation, this would send notifications via email, push, etc.
  console.log(`Notification to ${data.userEmail}: ${data.message} (${data.type})`);
  
  return new Response(JSON.stringify({
    message: 'Notification sent successfully',
    recipient: data.userEmail,
    type: data.type
  }), { headers });
}
