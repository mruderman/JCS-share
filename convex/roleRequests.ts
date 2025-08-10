import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to check if user is admin
async function isAdmin(ctx: any, userId: string) {
  const user = await ctx.db.get(userId);
  if (!user) return false;
  
  // Check if this is the super admin email
  if (user.email === "michael.ruderman@cyansociety.org") {
    return true;
  }
  
  // Check if user has editor role
  const userData = await ctx.db
    .query("userData")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  
  // Handle both old and new role systems
  if (userData?.roles) {
    return userData.roles.includes("editor");
  }
  return userData?.role === "editor" || false;
}

export const requestRole = mutation({
  args: {
    requestedRole: v.union(v.literal("editor"), v.literal("reviewer")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get current user data, create if doesn't exist
    let userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();

    if (!userData) {
      // Initialize user data with default author role
      const user = await ctx.db.get(userId);
      if (!user) {
        throw new Error("User not found");
      }
      
      const userDataId = await ctx.db.insert("userData", {
        userId,
        roles: ["author"],
        name: user.name || user.email || "Unknown User",
      });
      
      userData = await ctx.db.get(userDataId);
      if (!userData) {
        throw new Error("Failed to create user data");
      }
    }

    // Handle both old and new role systems
    const currentRoles = userData.roles || (userData.role ? [userData.role] : ["author"]);
    
    // Check if user already has the requested role
    if (currentRoles.includes(args.requestedRole)) {
      throw new Error(`You already have the ${args.requestedRole} role`);
    }

    // Check if there's already a pending request for this role
    const existingRequest = await ctx.db
      .query("roleRequests")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => 
        q.and(
          q.eq(q.field("requestedRole"), args.requestedRole),
          q.eq(q.field("status"), "pending")
        )
      )
      .unique();

    if (existingRequest) {
      throw new Error(`You already have a pending request for the ${args.requestedRole} role`);
    }

    // Create the role request
    await ctx.db.insert("roleRequests", {
      userId,
      requestedRole: args.requestedRole,
      currentRoles: currentRoles,
      reason: args.reason,
      status: "pending",
      requestedAt: Date.now(),
    });

    return {
      success: true,
      message: `Role request for ${args.requestedRole} submitted successfully. An admin will review your request.`,
    };
  },
});

export const getUserRoleRequests = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const requests = await ctx.db
      .query("roleRequests")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();

    return requests.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

export const getAllRoleRequests = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Check if current user is admin
    if (!(await isAdmin(ctx, userId))) {
      throw new Error("Only admins can view all role requests");
    }

    const requests = await ctx.db.query("roleRequests").collect();
    const requestsWithUserInfo = [];

    for (const request of requests) {
      const user = await ctx.db.get(request.userId);
      const userData = await ctx.db
        .query("userData")
        .withIndex("by_userId", (q: any) => q.eq("userId", request.userId))
        .unique();

      if (user && userData) {
        requestsWithUserInfo.push({
          ...request,
          userEmail: user.email,
          userName: userData.name,
        });
      }
    }

    return requestsWithUserInfo.sort((a, b) => b.requestedAt - a.requestedAt);
  },
});

export const reviewRoleRequest = mutation({
  args: {
    requestId: v.id("roleRequests"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if current user is admin
    if (!(await isAdmin(ctx, userId))) {
      throw new Error("Only admins can review role requests");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Role request not found");
    }

    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    const newStatus = args.action === "approve" ? "approved" : "rejected";

    // Update the role request
    await ctx.db.patch(args.requestId, {
      status: newStatus,
      reviewedAt: Date.now(),
      reviewedBy: userId,
      adminNotes: args.adminNotes,
    });

    // If approved, update the user's roles
    if (args.action === "approve") {
      const userData = await ctx.db
        .query("userData")
        .withIndex("by_userId", (q: any) => q.eq("userId", request.userId))
        .unique();

      if (userData) {
        // Handle both old and new role systems
        const currentRoles = userData.roles || (userData.role ? [userData.role] : ["author"]);
        const newRoles = [...currentRoles];
        if (!newRoles.includes(request.requestedRole)) {
          newRoles.push(request.requestedRole);
        }
        
        await ctx.db.patch(userData._id, {
          roles: newRoles,
          role: undefined, // Clear old role field
        });
      }
    }

    return {
      success: true,
      message: `Role request ${newStatus} successfully`,
    };
  },
});

export const getPendingRequestsCount = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return 0;
    }

    // Check if current user is admin
    if (!(await isAdmin(ctx, userId))) {
      return 0;
    }

    const pendingRequests = await ctx.db
      .query("roleRequests")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .collect();

    return pendingRequests.length;
  },
});
