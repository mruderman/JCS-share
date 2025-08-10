/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as manuscripts from "../manuscripts.js";
import type * as mcp from "../mcp.js";
import type * as proofing from "../proofing.js";
import type * as reviews from "../reviews.js";
import type * as roleRequests from "../roleRequests.js";
import type * as router from "../router.js";
import type * as seed from "../seed.js";
import type * as userData from "../userData.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  articles: typeof articles;
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  manuscripts: typeof manuscripts;
  mcp: typeof mcp;
  proofing: typeof proofing;
  reviews: typeof reviews;
  roleRequests: typeof roleRequests;
  router: typeof router;
  seed: typeof seed;
  userData: typeof userData;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
