import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Create a new manuscript (alias for submitManuscript for backward compatibility)
export const createManuscript = mutation({
  args: {
    title: v.string(),
    abstract: v.string(),
    keywords: v.array(v.string()),
    language: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    // Just duplicate the logic from submitManuscript
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to create manuscript");
    }

    const slug = args.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let uniqueSlug = slug;
    let counter = 1;
    while (await ctx.db.query("manuscripts").withIndex("by_slug", (q) => q.eq("slug", uniqueSlug)).unique()) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const manuscriptId = await ctx.db.insert("manuscripts", {
      title: args.title,
      abstract: args.abstract,
      keywords: args.keywords,
      language: args.language,
      fileId: args.fileId,
      status: "submitted",
      slug: uniqueSlug,
    });

    await ctx.db.insert("manuscriptAuthors", {
      manuscriptId,
      authorId: userId,
    });

    return manuscriptId;
  },
});

// Submit a new manuscript
export const submitManuscript = mutation({
  args: {
    title: v.string(),
    abstract: v.string(),
    keywords: v.array(v.string()),
    language: v.string(),
    fileId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to submit manuscript");
    }

    // Generate slug from title
    const slug = args.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure slug is unique
    let uniqueSlug = slug;
    let counter = 1;
    while (await ctx.db
      .query("manuscripts")
      .withIndex("by_slug", (q) => q.eq("slug", uniqueSlug))
      .unique()) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const manuscriptId = await ctx.db.insert("manuscripts", {
      title: args.title,
      abstract: args.abstract,
      keywords: args.keywords,
      language: args.language,
      fileId: args.fileId,
      status: "submitted",
      slug: uniqueSlug,
    });

    await ctx.db.insert("manuscriptAuthors", {
      manuscriptId,
      authorId: userId,
    });

    return manuscriptId;
  },
});

// Get manuscripts for author dashboard
export const getManuscriptsForAuthor = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const manuscriptAuthorLinks = await ctx.db
      .query("manuscriptAuthors")
      .withIndex("by_authorId", (q) => q.eq("authorId", userId))
      .collect();

    const manuscripts = await Promise.all(
      manuscriptAuthorLinks.map(async (link) => {
        const manuscript = await ctx.db.get(link.manuscriptId);
        if (!manuscript) return null;

        const fileUrl = await ctx.storage.getUrl(manuscript.fileId);
        
        const authorLinks = await ctx.db
          .query("manuscriptAuthors")
          .withIndex("by_manuscriptId", (q) => q.eq("manuscriptId", manuscript._id))
          .collect();
        const authorIds = authorLinks.map(link => link.authorId);

        const authors = await Promise.all(
          authorIds.map(async (authorId) => {
            const user = await ctx.db.get(authorId);
            const userData = await ctx.db
              .query("userData")
              .withIndex("by_userId", (q) => q.eq("userId", authorId))
              .unique();
            return userData?.name || user?.name || "Unknown Author";
          })
        );

        return {
          ...manuscript,
          authors,
          fileUrl,
        };
      })
    );
    return manuscripts.filter((m): m is NonNullable<typeof m> => m !== null);
  },
});

// Get manuscripts for editor dashboard
export const getManuscriptsForEditor = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if user is an editor
    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!userData?.roles?.includes("editor")) {
      throw new Error("Only editors can view manuscripts");
    }

    const manuscripts = await ctx.db
      .query("manuscripts")
      .withIndex("by_status", (q) => q.eq("status", "submitted"))
      .collect();

    const inReviewManuscripts = await ctx.db
      .query("manuscripts")
      .withIndex("by_status", (q) => q.eq("status", "inReview"))
      .collect();

    const allManuscripts = [...manuscripts, ...inReviewManuscripts].sort(
      (a, b) => b._creationTime - a._creationTime
    );

    return await Promise.all(
      allManuscripts.map(async (manuscript) => {
        const fileUrl = await ctx.storage.getUrl(manuscript.fileId);
        
        const authorLinks = await ctx.db
          .query("manuscriptAuthors")
          .withIndex("by_manuscriptId", (q) => q.eq("manuscriptId", manuscript._id))
          .collect();
        const authorIds = authorLinks.map(link => link.authorId);

        const authors = await Promise.all(
          authorIds.map(async (authorId) => {
            const user = await ctx.db.get(authorId);
            const userData = await ctx.db
              .query("userData")
              .withIndex("by_userId", (q) => q.eq("userId", authorId))
              .unique();
            return userData?.name || user?.name || "Unknown Author";
          })
        );

        return {
          ...manuscript,
          authors,
          fileUrl,
        };
      })
    );
  },
});

// Make editorial decision
export const makeEditorialDecision = mutation({
  args: {
    manuscriptId: v.id("manuscripts"),
    decision: v.union(
      v.literal("proofing"),
      v.literal("minorRevisions"),
      v.literal("majorRevisions"),
      v.literal("reject"),
    ),
    comments: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in");
    }

    // Check if user is an editor
    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!userData?.roles?.includes("editor")) {
      throw new Error("Only editors can make editorial decisions");
    }

    // Get the manuscript
    const manuscript = await ctx.db.get(args.manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    // Update manuscript status
    let newStatus: "accepted" | "rejected" | "majorRevisions" | "minorRevisions" | "proofing";
    
    if (args.decision === "proofing") {
      newStatus = "proofing";
    } else if (args.decision === "reject") {
      newStatus = "rejected";
    } else {
      newStatus = args.decision;
    }

    await ctx.db.patch(args.manuscriptId, {
      status: newStatus,
    });

    // Record the editorial decision
    await ctx.db.insert("editorialDecisions", {
      manuscriptId: args.manuscriptId,
      editorId: userId,
      decision: args.decision,
      comments: args.comments,
      decidedAt: Date.now(),
    });

    // If decision is proofing, create a proofing task
    if (args.decision === "proofing") {
      await ctx.runMutation(internal.proofing.createProofingTask, {
        manuscriptId: args.manuscriptId,
      });
    }

    return { success: true };
  },
});

// Generate upload URL for manuscript files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to upload files");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Get manuscript by slug (for public viewing if published)
export const getManuscriptBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const manuscript = await ctx.db
      .query("manuscripts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!manuscript) {
      return null;
    }

    // Only return published manuscripts for public viewing
    if (manuscript.status !== "published") {
      return null;
    }

    const authorLinks = await ctx.db
      .query("manuscriptAuthors")
      .withIndex("by_manuscriptId", (q) => q.eq("manuscriptId", manuscript._id))
      .collect();
    const authorIds = authorLinks.map(link => link.authorId);

    const authors = await Promise.all(
      authorIds.map(async (authorId) => {
        const user = await ctx.db.get(authorId);
        const userData = await ctx.db
          .query("userData")
          .withIndex("by_userId", (q) => q.eq("userId", authorId))
          .unique();
        return {
          id: authorId,
          name: userData?.name || user?.name || "Unknown Author",
          orcid: userData?.orcid,
        };
      })
    );

    const fileUrl = await ctx.storage.getUrl(manuscript.fileId);

    return {
      ...manuscript,
      authors,
      fileUrl,
    };
  },
});

// Get all published manuscripts (for public listing)
export const getPublishedManuscripts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const manuscripts = await ctx.db
      .query("manuscripts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .take(limit);

    return await Promise.all(
      manuscripts.map(async (manuscript) => {
        const authorLinks = await ctx.db
          .query("manuscriptAuthors")
          .withIndex("by_manuscriptId", (q) => q.eq("manuscriptId", manuscript._id))
          .collect();
        const authorIds = authorLinks.map(link => link.authorId);

        const authors = await Promise.all(
          authorIds.map(async (authorId) => {
            const user = await ctx.db.get(authorId);
            const userData = await ctx.db
              .query("userData")
              .withIndex("by_userId", (q) => q.eq("userId", authorId))
              .unique();
            return {
              id: authorId,
              name: userData?.name || user?.name || "Unknown Author",
              orcid: userData?.orcid,
            };
          })
        );

        const fileUrl = await ctx.storage.getUrl(manuscript.fileId);

        return {
          ...manuscript,
          authors,
          fileUrl,
        };
      })
    );
  },
});

// Get all manuscripts (for admin/system use)
export const getAllManuscripts = query({
  args: {},
  handler: async (ctx) => {
    const manuscripts = await ctx.db.query("manuscripts").collect();
    return manuscripts;
  },
});

// Update manuscript status
export const updateManuscriptStatus = mutation({
  args: {
    manuscriptId: v.id("manuscripts"),
    status: v.union(
      v.literal("submitted"),
      v.literal("inReview"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("published"),
      v.literal("majorRevisions"),
      v.literal("minorRevisions"),
      v.literal("proofing"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.manuscriptId, {
      status: args.status,
    });
    return { success: true };
  },
});
