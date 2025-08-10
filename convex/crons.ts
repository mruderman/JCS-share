import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "Check for overdue reviews",
  { hours: 1 }, // Check every hour
  internal.reviews.checkForOverdueReviews,
);

export default crons;
