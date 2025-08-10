import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper to check for admin role
const ensureAdmin = async (ctx: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
        throw new Error("Not authenticated");
    }
    const user = await ctx.db.get(userId);
    // This is a simple check. A real app would have a more robust role system.
    if (user?.email !== "michael.ruderman@cyansociety.org") {
        const userData = await ctx.db.query("userData").withIndex("by_userId", (q: any) => q.eq("userId", userId)).unique();
        if (!userData?.roles?.includes("editor")) {
             throw new Error("You must be an admin to perform this action.");
        }
    }
    return userId;
};

export const getAdminStats = query({
    handler: async (ctx) => {
        await ensureAdmin(ctx);
        
        const manuscripts = await ctx.db.query("manuscripts").collect();
        const reviews = await ctx.db.query("reviews").collect();
        const userDataList = await ctx.db.query("userData").collect();
        const users = await ctx.db.query("users").collect();

        const manuscriptStats = {
            total: manuscripts.length,
            byStatus: manuscripts.reduce((acc, m) => {
                acc[m.status] = (acc[m.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
        };

        const reviewStats = {
            total: reviews.length,
            byStatus: reviews.reduce((acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
        };

        const userStats = {
            total: users.length,
            byRole: userDataList.reduce((acc, u) => {
                u.roles?.forEach(role => {
                    acc[role] = (acc[role] || 0) + 1;
                });
                return acc;
            }, {} as Record<string, number>),
        };

        return {
            manuscripts: manuscriptStats,
            reviews: reviewStats,
            users: userStats,
        };
    },
});

export const getAllUsers = query({
    handler: async (ctx) => {
        await ensureAdmin(ctx);
        const users = await ctx.db.query("users").collect();
        return Promise.all(
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
    },
});

export const updateUserRoles = mutation({
    args: {
        targetUserId: v.id("users"),
        roles: v.array(v.union(v.literal("author"), v.literal("editor"), v.literal("reviewer"))),
    },
    handler: async (ctx, args) => {
        await ensureAdmin(ctx);
        const userData = await ctx.db
            .query("userData")
            .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
            .unique();
        if (userData) {
            await ctx.db.patch(userData._id, { roles: args.roles });
        } else {
            const user = await ctx.db.get(args.targetUserId);
            await ctx.db.insert("userData", {
                userId: args.targetUserId,
                name: user?.name ?? "New User",
                roles: args.roles,
            });
        }
    },
});

export const deleteUser = mutation({
    args: { targetUserId: v.id("users") },
    handler: async (ctx, args) => {
        await ensureAdmin(ctx);
        await ctx.db.delete(args.targetUserId);
        const userData = await ctx.db
            .query("userData")
            .withIndex("by_userId", (q) => q.eq("userId", args.targetUserId))
            .unique();
        if (userData) {
            await ctx.db.delete(userData._id);
        }
    },
});

export const createUser = mutation({
    args: { 
        email: v.string(), 
        name: v.string(),
        roles: v.array(v.union(v.literal("author"), v.literal("editor"), v.literal("reviewer"))),
        orcid: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ensureAdmin(ctx);
        
        const existingUser = await ctx.db
            .query("users")
            .withIndex("email", (q) => q.eq("email", args.email))
            .unique();

        if (!existingUser) {
            throw new Error("User with this email does not exist. Please ask them to sign up first.");
        }

        const existingUserData = await ctx.db
            .query("userData")
            .withIndex("by_userId", (q) => q.eq("userId", existingUser._id))
            .unique();

        if (existingUserData) {
            throw new Error("User data already exists for this user.");
        }

        await ctx.db.insert("userData", {
            userId: existingUser._id,
            name: args.name,
            roles: args.roles,
            orcid: args.orcid,
        });
    }
});

export const initializeSuperAdmin = mutation({
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated for super admin initialization.");
        }
        const user = await ctx.db.get(userId);
        if (!user) {
            throw new Error("User not found.");
        }

        const userData = await ctx.db.query("userData").withIndex("by_userId", q => q.eq("userId", userId)).unique();
        if (userData) {
            console.log("Super admin already initialized.");
            return;
        }

        await ctx.db.insert("userData", {
            userId: userId,
            name: user.name ?? "Super Admin",
            roles: ["author", "reviewer", "editor"],
        });
    }
});

export const createSuperAdminDirectly = mutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db.query("users").withIndex("email", q => q.eq("email", args.email)).unique();
        if (!existingUser) {
            throw new Error("User with this email does not exist in auth 'users' table.");
        }

        const userData = await ctx.db.query("userData").withIndex("by_userId", q => q.eq("userId", existingUser._id)).unique();
        if (userData) {
            throw new Error("User data already exists, super admin might be configured.");
        }

        await ctx.db.insert("userData", {
            userId: existingUser._id,
            name: existingUser.name ?? "Super Admin",
            roles: ["author", "reviewer", "editor"],
        });
    }
});

export const migrateToManuscriptAuthors = mutation({
  handler: async (ctx) => {
    await ensureAdmin(ctx);
    const manuscripts = await ctx.db.query("manuscripts").collect();
    for (const manuscript of manuscripts) {
      if (manuscript.authorIds) {
        for (const authorId of manuscript.authorIds) {
          const existing = await ctx.db
            .query("manuscriptAuthors")
            .withIndex("by_manuscript_and_author", (q) =>
              q.eq("manuscriptId", manuscript._id).eq("authorId", authorId)
            )
            .unique();
          if (!existing) {
            await ctx.db.insert("manuscriptAuthors", {
              manuscriptId: manuscript._id,
              authorId,
            });
          }
        }
      }
    }
  },
});
