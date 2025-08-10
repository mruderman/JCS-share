import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all published articles for public viewing
export const getPublishedArticles = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_published_at")
      .order("desc")
      .take(limit);

    // Get author information for each article
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const authorLinks = await ctx.db
          .query("manuscriptAuthors")
          .withIndex("by_manuscriptId", (q) => q.eq("manuscriptId", article.originalManuscriptId))
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

        const fileUrl = await ctx.storage.getUrl(article.finalFileId);

        return {
          ...article,
          authors,
          fileUrl,
        };
      })
    );

    return articlesWithAuthors;
  },
});

// Get a specific published article by slug
export const getArticleBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (!article) {
      return null;
    }

    const authorLinks = await ctx.db
      .query("manuscriptAuthors")
      .withIndex("by_manuscriptId", (q) => q.eq("manuscriptId", article.originalManuscriptId))
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

    const fileUrl = await ctx.storage.getUrl(article.finalFileId);

    return {
      ...article,
      authors,
      fileUrl,
    };
  },
});

// Publish an article from a completed proofing task (Editor only)
export const publishArticle = mutation({
  args: {
    proofingTaskId: v.id("proofingTasks"),
    doi: v.optional(v.string()),
    volume: v.optional(v.string()),
    issue: v.optional(v.string()),
    pageNumbers: v.optional(v.string()),
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
      throw new Error("Only editors can publish articles");
    }

    // Get the proofing task
    const proofingTask = await ctx.db.get(args.proofingTaskId);
    if (!proofingTask) {
      throw new Error("Proofing task not found");
    }

    if (proofingTask.status !== "completed") {
      throw new Error("Proofing task must be completed before publishing");
    }

    if (!proofingTask.proofedFileId) {
      throw new Error("No proofed file available");
    }

    // Get the manuscript
    const manuscript = await ctx.db.get(proofingTask.manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    // Generate slug if not exists
    let slug = manuscript.slug;
    if (!slug) {
      slug = manuscript.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      
      // Ensure slug is unique
      let counter = 1;
      let uniqueSlug = slug;
      while (await ctx.db
        .query("articles")
        .withIndex("by_slug", (q) => q.eq("slug", uniqueSlug))
        .unique()) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      slug = uniqueSlug;
    }

    const now = Date.now();

    // Create the published article
    const articleId = await ctx.db.insert("articles", {
      title: manuscript.title,
      abstract: manuscript.abstract,
      keywords: manuscript.keywords,
      language: manuscript.language,
      finalFileId: proofingTask.proofedFileId,
      originalManuscriptId: manuscript._id,
      slug,
      publishedAt: now,
      publishedBy: userId,
      doi: args.doi,
      volume: args.volume,
      issue: args.issue,
      pageNumbers: args.pageNumbers,
    });

    // Update proofing task status
    await ctx.db.patch(proofingTask._id, {
      status: "published",
      publishedAt: now,
    });

    // Update manuscript status to published
    await ctx.db.patch(manuscript._id, {
      status: "published",
    });

    return articleId;
  },
});
