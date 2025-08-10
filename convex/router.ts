import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

// Health check endpoint
export const healthCheckHandler = httpAction(async (ctx, req) => {
  return new Response(JSON.stringify({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "cyan-science-journal"
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});

// MCP endpoint for manuscript submission
export const createManuscriptHandler = httpAction(async (ctx, req) => {
  try {
    const body = await req.json();
    const { title, authorIds, abstract, keywords, language, fileId } = body;
    
    const manuscriptId = await ctx.runMutation(api.manuscripts.createManuscript, {
      title,
      abstract,
      keywords,
      language,
      fileId,
    });
    
    return new Response(JSON.stringify({
      success: true,
      manuscriptId,
      message: "Manuscript submitted successfully"
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// MCP endpoint for getting manuscripts
export const getAllManuscriptsHandler = httpAction(async (ctx, req) => {
  try {
    const manuscripts = await ctx.runQuery(api.manuscripts.getAllManuscripts);
    
    return new Response(JSON.stringify({
      success: true,
      manuscripts
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// MCP endpoint for updating manuscript status
export const updateManuscriptStatusHandler = httpAction(async (ctx, req) => {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const manuscriptId = pathParts[4] as Id<"manuscripts">;
    const body = await req.json();
    const { status, slug } = body;
    
    await ctx.runMutation(api.manuscripts.updateManuscriptStatus, {
      manuscriptId,
      status,
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: "Manuscript status updated successfully"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});

http.route({ path: "/health", method: "GET", handler: healthCheckHandler });
http.route({ path: "/api/mcp/manuscripts", method: "POST", handler: createManuscriptHandler });
http.route({ path: "/api/mcp/manuscripts", method: "GET", handler: getAllManuscriptsHandler });
http.route({ path: "/api/mcp/manuscripts/:id/status", method: "PATCH", handler: updateManuscriptStatusHandler });

export default http;
