import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const assignReviewer = mutation({
  args: {
    manuscriptId: v.id("manuscripts"),
    reviewerId: v.id("users"),
    deadline: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // In a real app, we'd check for an editor role.

    const deadline = args.deadline;

    // Check if reviewer is already assigned to this manuscript
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", args.manuscriptId))
      .filter((q) => q.eq(q.field("reviewerId"), args.reviewerId))
      .unique();

    if (existingReview) {
      throw new Error("This reviewer is already assigned to this manuscript");
    }

    await ctx.db.insert("reviews", {
      manuscriptId: args.manuscriptId,
      reviewerId: args.reviewerId,
      deadline,
      status: "pending",
    });

    // Check how many reviewers are now assigned
    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", args.manuscriptId))
      .collect();

    // Only change status to inReview if we have at least 3 reviewers
    if (allReviews.length >= 3) {
      await ctx.db.patch(args.manuscriptId, { status: "inReview" });
    }
  },
});

export const removeReviewer = mutation({
  args: {
    reviewId: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user data to check role
    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    
    // Check if user is admin or editor
    const user = await ctx.db.get(userId);
    const isAdmin = user?.email === "michael.ruderman@cyansociety.org";
    const isEditor = userData?.roles 
      ? userData.roles.includes("editor")
      : userData?.role === "editor" || false;
    
    if (!isAdmin && !isEditor) {
      throw new Error("Only editors can remove reviewers");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    // Delete the review
    await ctx.db.delete(args.reviewId);

    // Check if this was the last reviewer for the manuscript
    const remainingReviews = await ctx.db
      .query("reviews")
      .withIndex("by_manuscript", (q) => q.eq("manuscriptId", review.manuscriptId))
      .collect();

    // If no reviewers left, change manuscript status back to submitted
    if (remainingReviews.length === 0) {
      await ctx.db.patch(review.manuscriptId, { status: "submitted" });
    }
  },
});

export const getAssignedReviews = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get user data to check if they're a reviewer
    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    
    // Check if user has reviewer role
    const hasReviewerRole = userData?.roles 
      ? userData.roles.includes("reviewer")
      : userData?.role === "reviewer";
      
    if (!hasReviewerRole) {
      return [];
    }

    // Get all reviews assigned to this user
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_reviewer", (q) => q.eq("reviewerId", userId))
      .collect();

    // Get manuscript details for each review
    const reviewsWithManuscripts = [];
    for (const review of reviews) {
      const manuscript = await ctx.db.get(review.manuscriptId);
      if (manuscript) {
        const fileUrl = await ctx.storage.getUrl(manuscript.fileId);
        
        // Double-blind: don't return author info
        const { ...restOfManuscript } = manuscript;
        
        reviewsWithManuscripts.push({
          ...review,
          manuscript: {
            ...restOfManuscript,
            fileUrl,
          },
        });
      }
    }

    return reviewsWithManuscripts.sort((a, b) => a.deadline - b.deadline);
  },
});

export const getReview = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.reviewerId !== userId) {
      throw new Error("You are not authorized to view this review");
    }

    const manuscript = await ctx.db.get(review.manuscriptId);
    if (!manuscript) {
      throw new Error("Manuscript not found");
    }

    const manuscriptFileUrl = await ctx.storage.getUrl(manuscript.fileId);

    // Double-blind: don't return author info
    const { ...restOfManuscript } = manuscript;

    return {
      review,
      manuscript: { ...restOfManuscript, fileUrl: manuscriptFileUrl },
    };
  },
});

export const submitReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    score: v.number(),
    commentsMd: v.string(),
    recommendation: v.union(
      v.literal("accept"),
      v.literal("minor"),
      v.literal("major"),
      v.literal("reject"),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    if (review.reviewerId !== userId) {
      throw new Error("You are not authorized to submit this review");
    }

    await ctx.db.patch(args.reviewId, {
      score: args.score,
      commentsMd: args.commentsMd,
      recommendation: args.recommendation,
      status: "submitted",
    });
  },
});

export const checkForOverdueReviews = internalAction({
  handler: async (ctx) => {
    const overdueReviews = await ctx.runQuery(
      internal.reviews.getOverdueReviews,
    );
    for (const review of overdueReviews) {
      const user = await ctx.runQuery(internal.users.getUser, {
        userId: review.reviewerId,
      });
      if (user?.email && review.manuscript) {
        await ctx.runAction(internal.reviews.notifyUser, {
          email: user.email,
          manuscriptTitle: review.manuscript.title,
        });
      }
    }
  },
});

export const getOverdueReviews = internalQuery({
  handler: async (ctx) => {
    const now = Date.now();
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_deadline_and_status", (q) =>
        q.lt("deadline", now)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const results = [];
    for (const review of reviews) {
      const manuscript = await ctx.db.get(review.manuscriptId);
      results.push({ ...review, manuscript });
    }
    return results;
  },
});

export const notifyUser = internalAction({
  args: { email: v.string(), manuscriptTitle: v.string() },
  handler: async (ctx, { email, manuscriptTitle }) => {
    console.log(
      `TODO: Send email to ${email} about overdue review for "${manuscriptTitle}"`,
    );
    // In a real app, you'd use an email service like Resend.
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send(...)
  },
});

export const getReviewsForEditor = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const userData = await ctx.db
      .query("userData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!userData?.roles?.includes("editor")) {
      return [];
    }

    const reviews = await ctx.db.query("reviews").order("desc").collect();

    const reviewsWithDetails = await Promise.all(
      reviews.map(async (review) => {
        const manuscript = await ctx.db.get(review.manuscriptId);
        if (!manuscript) {
          return null;
        }
        const reviewerUser = await ctx.db.get(review.reviewerId);
        const reviewerData = await ctx.db
          .query("userData")
          .withIndex("by_userId", (q) => q.eq("userId", review.reviewerId))
          .unique();
        
        const reviewerName = reviewerData?.name || reviewerUser?.name || "Unknown Reviewer";

        return {
          ...review,
          manuscript: {
            title: manuscript.title,
          },
          reviewerName,
        };
      })
    );

    return reviewsWithDetails.filter((r): r is NonNullable<typeof r> => r !== null);
  },
});
