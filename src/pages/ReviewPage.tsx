import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "react-router-dom";
import { Id } from "../../convex/_generated/dataModel";
import { FormEvent } from "react";
import { toast } from "sonner";

export default function ReviewPage() {
  const { reviewId } = useParams<{ reviewId: Id<"reviews"> }>();
  const reviewData = useQuery(api.reviews.getReview, {
    reviewId: reviewId!,
  });
  const submitReview = useMutation(api.reviews.submitReview);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const score = parseInt(formData.get("score") as string, 10);
    const commentsMd = formData.get("comments") as string;
    const recommendation = formData.get("recommendation") as any;

    if (!score || !commentsMd || !recommendation) {
      toast.error("Please fill out all fields.");
      return;
    }

    submitReview({ reviewId: reviewId!, score, commentsMd, recommendation })
      .then(() => toast.success("Review submitted!"))
      .catch((err) => toast.error(err.message));
  };

  if (reviewData === undefined) return <p>Loading...</p>;
  if (reviewData === null) return <p>Review not found or not authorized.</p>;

  const { review, manuscript } = reviewData;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Review Manuscript</h1>
      <h2 className="text-2xl font-semibold mb-4">{manuscript.title}</h2>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-blue-800 text-sm">
          <strong>Double-blind review:</strong> Author and reviewer identities remain hidden during the review process. 
          All identities will be disclosed publicly only after the final editorial decision is made.
        </p>
      </div>

      <p className="mb-4">
        <a href={manuscript.fileUrl!} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Download Manuscript PDF
        </a>
      </p>
      <p className="mb-4 text-gray-600">{manuscript.abstract}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="score" className="block font-semibold">Score (1-10)</label>
          <input type="number" id="score" name="score" min="1" max="10" required className="auth-input-field" />
        </div>
        <div>
          <label htmlFor="comments" className="block font-semibold">Comments (Markdown)</label>
          <textarea id="comments" name="comments" rows={10} required className="auth-input-field" />
        </div>
        <div>
          <label htmlFor="recommendation" className="block font-semibold">Recommendation</label>
          <select id="recommendation" name="recommendation" required className="auth-input-field">
            <option value="">Select...</option>
            <option value="accept">Accept</option>
            <option value="minor">Minor Revisions</option>
            <option value="major">Major Revisions</option>
            <option value="reject">Reject</option>
          </select>
        </div>
        <button type="submit" className="auth-button">Submit Review</button>
      </form>
    </div>
  );
}
