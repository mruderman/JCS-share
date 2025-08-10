import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const createSuperAdmin = internalMutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .unique();

    let userId;
    if (existingUser) {
      userId = existingUser._id;
      console.log(`User ${args.email} already exists with ID: ${userId}`);
    } else {
      // Create the user account
      userId = await ctx.db.insert("users", {
        email: args.email,
        name: args.name,
        emailVerificationTime: Date.now(),
        isAnonymous: false,
      });
      console.log(`Created new user ${args.email} with ID: ${userId}`);
    }

    // Check if userData already exists
    const existingUserData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .unique();

    if (existingUserData) {
      // Update existing userData to ensure admin roles
      await ctx.db.patch(existingUserData._id, {
        roles: ["author", "editor", "reviewer"],
        name: args.name,
      });
      console.log(`Updated existing userData for ${args.email} to all roles`);
    } else {
      // Create userData with all roles (super admin)
      await ctx.db.insert("userData", {
        userId,
        roles: ["author", "editor", "reviewer"],
        name: args.name,
        orcid: undefined,
      });
      console.log(`Created userData for ${args.email} with all roles`);
    }

    return {
      userId,
      email: args.email,
      roles: ["author", "editor", "reviewer"],
      message: "Super admin account created/updated successfully",
    };
  },
});

export const checkUserExists = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q: any) => q.eq("email", args.email))
      .unique();

    if (!user) {
      return { exists: false };
    }

    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
      .unique();

    return {
      exists: true,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        roles: userData?.roles || ["author"],
      },
    };
  },
});
