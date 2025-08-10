import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

export default function AdminRoleRequestsPage() {
  const allRequests = useQuery(api.roleRequests.getAllRoleRequests);
  const reviewRequest = useMutation(api.roleRequests.reviewRoleRequest);
  
  const [reviewForm, setReviewForm] = useState<{
    requestId: Id<"roleRequests"> | null;
    action: "approve" | "reject" | null;
    adminNotes: string;
  }>({
    requestId: null,
    action: null,
    adminNotes: "",
  });

  const handleReviewRequest = async (
    requestId: Id<"roleRequests">, 
    action: "approve" | "reject"
  ) => {
    setReviewForm({ requestId, action, adminNotes: "" });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.requestId || !reviewForm.action) return;

    try {
      await reviewRequest({
        requestId: reviewForm.requestId,
        action: reviewForm.action,
        adminNotes: reviewForm.adminNotes || undefined,
      });
      
      toast.success(`Role request ${reviewForm.action}d successfully!`);
      setReviewForm({ requestId: null, action: null, adminNotes: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to review request");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (allRequests === undefined) {
    return <div>Loading admin role requests...</div>;
  }

  const pendingRequests = allRequests.filter(req => req.status === "pending");
  const reviewedRequests = allRequests.filter(req => req.status !== "pending");

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Role Request Management</h1>

      {/* Pending Requests */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Pending Requests ({pendingRequests.length})
        </h2>
        
        {pendingRequests.length === 0 ? (
          <p className="text-gray-500">No pending role requests.</p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request._id} className="border rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">
                      {request.userName} ({request.userEmail})
                    </h3>
                    <p className="text-sm text-gray-600">
                      Requesting: <span className="font-medium capitalize">{request.requestedRole}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Current roles: <span className="capitalize">{request.currentRoles.join(", ")}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Requested on {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                
                <div className="mb-4">
                  <strong className="text-sm">Reason:</strong>
                  <p className="text-sm text-gray-700 mt-1 bg-white p-3 rounded border">
                    {request.reason}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleReviewRequest(request._id, "approve")}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReviewRequest(request._id, "reject")}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      {reviewForm.requestId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {reviewForm.action === "approve" ? "Approve" : "Reject"} Role Request
            </h3>
            
            <form onSubmit={handleSubmitReview}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Admin Notes (optional)
                </label>
                <textarea
                  value={reviewForm.adminNotes}
                  onChange={(e) => setReviewForm({ ...reviewForm, adminNotes: e.target.value })}
                  className="auth-input-field"
                  rows={3}
                  placeholder="Add any notes for the user..."
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className={`px-4 py-2 text-white rounded ${
                    reviewForm.action === "approve" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Confirm {reviewForm.action === "approve" ? "Approval" : "Rejection"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewForm({ requestId: null, action: null, adminNotes: "" })}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reviewed Requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          Reviewed Requests ({reviewedRequests.length})
        </h2>
        
        {reviewedRequests.length === 0 ? (
          <p className="text-gray-500">No reviewed requests yet.</p>
        ) : (
          <div className="space-y-4">
            {reviewedRequests.map((request) => (
              <div key={request._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">
                      {request.userName} ({request.userEmail})
                    </h3>
                    <p className="text-sm text-gray-600">
                      Requested: <span className="font-medium capitalize">{request.requestedRole}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Reviewed on {request.reviewedAt ? new Date(request.reviewedAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                
                {request.adminNotes && (
                  <div>
                    <strong className="text-sm">Admin Notes:</strong>
                    <p className="text-sm text-gray-700 mt-1">{request.adminNotes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
