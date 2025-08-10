import { httpRouter } from "convex/server";
import { auth } from "./auth";
import {
  healthCheckHandler,
  createManuscriptHandler,
  getAllManuscriptsHandler,
  updateManuscriptStatusHandler
} from "./router";

const http = httpRouter();

// Add authentication routes
auth.addHttpRoutes(http);

// Add custom routes
http.route({ path: "/health", method: "GET", handler: healthCheckHandler });
http.route({ path: "/api/mcp/manuscripts", method: "POST", handler: createManuscriptHandler });
http.route({ path: "/api/mcp/manuscripts", method: "GET", handler: getAllManuscriptsHandler });
http.route({ path: "/api/mcp/manuscripts/:id/status", method: "PATCH", handler: updateManuscriptStatusHandler });

export default http;
