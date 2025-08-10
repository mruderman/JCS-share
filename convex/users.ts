import { getAuthUserId } from "@convex-dev/auth/server";
import { internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

export const getUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getCurrentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    return {
      ...user,
      userData,
    };
  },
});

export const getUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const usersWithData = await Promise.all(
      users.map(async (user) => {
        const userData = await ctx.db
          .query("userData")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique();
        return {
          ...user,
          userData,
        };
      })
    );
    return usersWithData;
  },
});
