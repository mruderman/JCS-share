import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query, mutation } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});

export const ensureUserData = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const existingUserData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();

    if (existingUserData) {
      return existingUserData;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    const userDataId = await ctx.db.insert("userData", {
      userId,
      roles: ["author"],
      name: user.name || user.email || "Unknown User",
    });

    return await ctx.db.get(userDataId);
  },
});
