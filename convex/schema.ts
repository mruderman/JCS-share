import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  userData: defineTable({
    userId: v.id("users"),
    roles: v.optional(v.array(v.union(v.literal("author"), v.literal("editor"), v.literal("reviewer")))),
    role: v.optional(v.union(v.literal("author"), v.literal("editor"), v.literal("reviewer"))), // Legacy field for migration
    name: v.string(),
    orcid: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),

  roleRequests: defineTable({
    userId: v.id("users"),
    requestedRole: v.union(v.literal("editor"), v.literal("reviewer")),
    currentRoles: v.array(v.union(v.literal("author"), v.literal("editor"), v.literal("reviewer"))),
    reason: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    requestedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    adminNotes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_requested_role", ["requestedRole"]),

  manuscripts: defineTable({
    title: v.string(),
    authorIds: v.optional(v.array(v.id("users"))),
    abstract: v.string(),
    keywords: v.array(v.string()),
    language: v.string(),
    fileId: v.id("_storage"),
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
    slug: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_slug", ["slug"]),

  manuscriptAuthors: defineTable({
    manuscriptId: v.id("manuscripts"),
    authorId: v.id("users"),
  })
    .index("by_manuscriptId", ["manuscriptId"])
    .index("by_authorId", ["authorId"])
    .index("by_manuscript_and_author", ["manuscriptId", "authorId"]),

  // New table for published articles - separate from manuscripts
  articles: defineTable({
    title: v.string(),
    abstract: v.string(),
    keywords: v.array(v.string()),
    language: v.string(),
    finalFileId: v.id("_storage"), // Final proofed file
    originalManuscriptId: v.id("manuscripts"), // Reference to original manuscript
    slug: v.string(),
    publishedAt: v.number(),
    publishedBy: v.id("users"), // Editor who published it
    doi: v.optional(v.string()),
    volume: v.optional(v.string()),
    issue: v.optional(v.string()),
    pageNumbers: v.optional(v.string()),
  })
    .index("by_published_at", ["publishedAt"])
    .index("by_slug", ["slug"])
    .index("by_original_manuscript", ["originalManuscriptId"]),

  reviews: defineTable({
    manuscriptId: v.id("manuscripts"),
    reviewerId: v.id("users"),
    deadline: v.number(),
    status: v.union(v.literal("pending"), v.literal("submitted")),
    score: v.optional(v.number()),
    commentsMd: v.optional(v.string()),
    recommendation: v.optional(
      v.union(
        v.literal("accept"),
        v.literal("minor"),
        v.literal("major"),
        v.literal("reject"),
      ),
    ),
  })
    .index("by_manuscript", ["manuscriptId"])
    .index("by_reviewer", ["reviewerId"])
    .index("by_deadline_and_status", ["deadline", "status"]),

  editorialDecisions: defineTable({
    manuscriptId: v.id("manuscripts"),
    editorId: v.id("users"),
    decision: v.union(
      v.literal("proofing"),
      v.literal("minorRevisions"),
      v.literal("majorRevisions"),
      v.literal("reject"),
    ),
    comments: v.optional(v.string()),
    decidedAt: v.number(),
  })
    .index("by_manuscript", ["manuscriptId"])
    .index("by_editor", ["editorId"]),

  // New table for proofing tasks
  proofingTasks: defineTable({
    manuscriptId: v.id("manuscripts"),
    editorId: v.id("users"),
    status: v.union(
      v.literal("pending"), // Waiting for proofed file upload
      v.literal("completed"), // Proofed file uploaded, ready to publish
      v.literal("published"), // Article has been published
    ),
    proofedFileId: v.optional(v.id("_storage")), // Final proofed file
    proofingNotes: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
  })
    .index("by_manuscript", ["manuscriptId"])
    .index("by_editor", ["editorId"])
    .index("by_status", ["status"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
