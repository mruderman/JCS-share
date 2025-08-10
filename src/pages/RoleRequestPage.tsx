import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

export default function RoleRequestPage() {
  const userRequests = useQuery(api.roleRequests.getUserRoleRequests);
  const requestRole = useMutation(api.roleRequests.requestRole);
  
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestForm, setRequestForm] = useState({
    requestedRole: "reviewer" as "editor" | "reviewer",
    reason: "",
  });

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await requestRole({
        requestedRole: requestForm.requestedRole,
        reason: requestForm.reason,
      });
      
      toast.success("Role request submitted successfully!");
      setRequestForm({ requestedRole: "reviewer", reason: "" });
      setShowRequestForm(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit request");
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

  if (userRequests === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Role Requests</h1>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Request Additional Roles</h2>
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="auth-button w-auto px-4 py-2"
          >
            {showRequestForm ? "Cancel" : "Request Role"}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">ℹ️ Role Information</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li><strong>Author:</strong> Default role - can submit manuscripts</li>
            <li><strong>Reviewer:</strong> Can review submitted manuscripts</li>
            <li><strong>Editor:</strong> Can manage the review process and make publication decisions</li>
          </ul>
        </div>

        {showRequestForm && (
          <form onSubmit={handleSubmitRequest} className="p-4 bg-gray-50 rounded-lg">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Requested Role</label>
                <select
                  value={requestForm.requestedRole}
                  onChange={(e) => setRequestForm({ ...requestForm, requestedRole: e.target.value as any })}
                  className="auth-input-field"
                  required
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">
                  Reason for Request <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={requestForm.reason}
                  onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  className="auth-input-field"
                  rows={4}
                  placeholder="Please explain why you are requesting this role and your relevant qualifications..."
                  required
                />
              </div>
            </div>
            
            <button type="submit" className="auth-button w-auto px-6 py-2 mt-4">
              Submit Request
            </button>
          </form>
        )}
      </div>

      {/* User's Role Requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Role Requests</h2>
        
        {userRequests.length === 0 ? (
          <p className="text-gray-500">You haven't submitted any role requests yet.</p>
        ) : (
          <div className="space-y-4">
            {userRequests.map((request) => (
              <div key={request._id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold capitalize">
                      {request.requestedRole} Role Request
                    </h3>
                    <p className="text-sm text-gray-600">
                      Requested on {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <strong className="text-sm">Reason:</strong>
                    <p className="text-sm text-gray-700 mt-1">{request.reason}</p>
                  </div>
                  
                  {request.status !== "pending" && request.reviewedAt && (
                    <div>
                      <strong className="text-sm">
                        {request.status === "approved" ? "Approved" : "Rejected"} on:
                      </strong>
                      <p className="text-sm text-gray-700">
                        {new Date(request.reviewedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {request.adminNotes && (
                    <div>
                      <strong className="text-sm">Admin Notes:</strong>
                      <p className="text-sm text-gray-700 mt-1">{request.adminNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
