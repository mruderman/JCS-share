import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUserData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    
    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    
    return userData;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    orcid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingUserData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!existingUserData) {
      throw new Error("User data not found");
    }

    await ctx.db.patch(existingUserData._id, {
      name: args.name,
      orcid: args.orcid,
    });

    return { success: true };
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
    
    return userData;
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const user = await ctx.db.get(userId);
    if (!user || user.email !== "michael.ruderman@cyansociety.org") {
      throw new Error("Not authorized");
    }

    const allUserData = await ctx.db.query("userData").collect();
    return allUserData;
  },
});

export const getReviewers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get all users with reviewer role
    const allUsers = await ctx.db.query("userData").collect();
    return allUsers.filter(user => user.roles?.includes("reviewer"));
  },
});
