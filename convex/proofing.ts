import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get all proofing tasks for editors
export const getProofingTasks = query({
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
      throw new Error("Only editors can view proofing tasks");
    }

    const proofingTasks = await ctx.db
      .query("proofingTasks")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const completedTasks = await ctx.db
      .query("proofingTasks")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    const allTasks = [...proofingTasks, ...completedTasks].sort(
      (a, b) => b.createdAt - a.createdAt
    );

    // Get manuscript details for each task
    const tasksWithDetails = await Promise.all(
      allTasks.map(async (task) => {
        const manuscript = await ctx.db.get(task.manuscriptId);
        if (!manuscript) return null;

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

        // Get original file URL
        const originalFileUrl = await ctx.storage.getUrl(manuscript.fileId);

        // Get proofed file URL if available
        let proofedFileUrl = null;
        if (task.proofedFileId) {
          proofedFileUrl = await ctx.storage.getUrl(task.proofedFileId);
        }

        return {
          ...task,
          manuscript: {
            ...manuscript,
            authors,
            originalFileUrl,
          },
          proofedFileUrl,
        };
      })
    );

    return tasksWithDetails.filter(Boolean);
  },
});

// Create a proofing task when manuscript is moved to proofing status (internal)
export const createProofingTask = internalMutation({
  args: {
    manuscriptId: v.id("manuscripts"),
  },
  handler: async (ctx, args) => {
    // Check if proofing task already exists
    const existingTask = await ctx.db
      .query("proofingTasks")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", args.manuscriptId))
      .unique();

    if (existingTask) {
      return existingTask._id; // Return existing task ID
    }

    // Verify manuscript is in proofing status
    const manuscript = await ctx.db.get(args.manuscriptId);
    if (!manuscript || manuscript.status !== "proofing") {
      throw new Error("Manuscript must be in proofing status");
    }

    // Find an editor to assign the task to (for now, just use the first editor)
    const editors = await ctx.db
      .query("userData")
      .collect();
    
    const editor = editors.find(user => user.roles?.includes("editor"));
    if (!editor) {
      throw new Error("No editors available to assign proofing task");
    }

    return await ctx.db.insert("proofingTasks", {
      manuscriptId: args.manuscriptId,
      editorId: editor.userId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Generate upload URL for proofed file
export const generateProofedFileUploadUrl = mutation({
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
      throw new Error("Only editors can upload proofed files");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Upload proofed file and complete proofing task
export const uploadProofedFile = mutation({
  args: {
    proofingTaskId: v.id("proofingTasks"),
    fileId: v.id("_storage"),
    proofingNotes: v.optional(v.string()),
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
      throw new Error("Only editors can upload proofed files");
    }

    // Get the proofing task
    const proofingTask = await ctx.db.get(args.proofingTaskId);
    if (!proofingTask) {
      throw new Error("Proofing task not found");
    }

    if (proofingTask.status !== "pending") {
      throw new Error("Proofing task is not in pending status");
    }

    // Update the proofing task
    await ctx.db.patch(args.proofingTaskId, {
      proofedFileId: args.fileId,
      proofingNotes: args.proofingNotes,
      status: "completed",
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get proofing task by ID
export const getProofingTask = query({
  args: { taskId: v.id("proofingTasks") },
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
      throw new Error("Only editors can view proofing tasks");
    }

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      return null;
    }

    const manuscript = await ctx.db.get(task.manuscriptId);
    if (!manuscript) {
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
        return userData?.name || user?.name || "Unknown Author";
      })
    );

    // Get file URLs
    const originalFileUrl = await ctx.storage.getUrl(manuscript.fileId);
    let proofedFileUrl = null;
    if (task.proofedFileId) {
      proofedFileUrl = await ctx.storage.getUrl(task.proofedFileId);
    }

    return {
      ...task,
      manuscript: {
        ...manuscript,
        authors,
        originalFileUrl,
      },
      proofedFileUrl,
    };
  },
});
