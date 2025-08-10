import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Link } from "react-router-dom";

export default function ReviewerDashboard() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userData = useQuery(api.userData.getCurrentUserData);
  const assignedReviews = useQuery(api.reviews.getAssignedReviews);

  const formatDeadline = (deadline: number) => {
    const date = new Date(deadline);
    const now = new Date();
    const isOverdue = date < now;
    
    return {
      formatted: date.toLocaleDateString(),
      isOverdue,
      daysLeft: Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "submitted":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case "accept":
        return "text-green-600";
      case "minor":
        return "text-blue-600";
      case "major":
        return "text-orange-600";
      case "reject":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  if (loggedInUser === undefined || userData === undefined || assignedReviews === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user has reviewer role
  const userRoles = userData?.roles || ["author"];
  const isReviewer = userRoles.includes("reviewer");

  if (!isReviewer) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Reviewer Access Required</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 mb-4">
            You need reviewer privileges to access this dashboard.
          </p>
          <Link
            to="/role-requests"
            className="auth-button w-auto px-4 py-2 inline-block"
          >
            Request Reviewer Role
          </Link>
        </div>
      </div>
    );
  }

  const pendingReviews = assignedReviews?.filter(review => review.status === "pending") || [];
  const completedReviews = assignedReviews?.filter(review => review.status === "submitted") || [];
  const overdueReviews = pendingReviews.filter(review => formatDeadline(review.deadline).isOverdue);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Reviewer Dashboard</h1>
        <p className="text-gray-600">Welcome back, {userData?.name || loggedInUser?.email}!</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">📋 Total Assigned</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">
            {assignedReviews?.length || 0}
          </div>
          <p className="text-sm text-gray-500">All time reviews</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-yellow-600">⏳ Pending</h3>
          <div className="text-3xl font-bold text-yellow-600 mb-2">
            {pendingReviews.length}
          </div>
          <p className="text-sm text-gray-500">Awaiting your review</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-red-600">🚨 Overdue</h3>
          <div className="text-3xl font-bold text-red-600 mb-2">
            {overdueReviews.length}
          </div>
          <p className="text-sm text-gray-500">Past deadline</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-600">✅ Completed</h3>
          <div className="text-3xl font-bold text-green-600 mb-2">
            {completedReviews.length}
          </div>
          <p className="text-sm text-gray-500">Reviews submitted</p>
        </div>
      </div>

      {/* Pending Reviews */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">
          Pending Reviews ({pendingReviews.length})
        </h2>
        
        {pendingReviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">You have no pending reviews at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((review) => {
              const deadlineInfo = formatDeadline(review.deadline);
              
              return (
                <div key={review._id} className={`border rounded-lg p-6 bg-white hover:shadow-md transition-shadow ${
                  deadlineInfo.isOverdue ? 'border-red-200 bg-red-50' : ''
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{review.manuscript.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{review.manuscript.abstract}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Language: {review.manuscript.language}</span>
                        {review.manuscript.keywords && review.manuscript.keywords.length > 0 && (
                          <span>Keywords: {review.manuscript.keywords.slice(0, 3).join(", ")}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                        {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                      </span>
                      <div className={`text-sm mt-2 ${deadlineInfo.isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {deadlineInfo.isOverdue ? (
                          <>
                            <span className="text-red-600">⚠️ Overdue</span>
                            <br />
                            <span>Due: {deadlineInfo.formatted}</span>
                          </>
                        ) : (
                          <>
                            <span>Due: {deadlineInfo.formatted}</span>
                            <br />
                            <span className="text-green-600">
                              {deadlineInfo.daysLeft > 0 ? `${deadlineInfo.daysLeft} days left` : 'Due today'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <a
                        href={review.manuscript.fileUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        📄 Download PDF
                      </a>
                    </div>
                    
                    <Link
                      to={`/review/${review._id}`}
                      className={`auth-button w-auto px-6 py-2 ${
                        deadlineInfo.isOverdue ? 'bg-red-600 hover:bg-red-700' : ''
                      }`}
                    >
                      {deadlineInfo.isOverdue ? 'Submit Overdue Review' : 'Start Review'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Reviews */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-6">
          Completed Reviews ({completedReviews.length})
        </h2>
        
        {completedReviews.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No completed reviews yet.</p>
        ) : (
          <div className="space-y-4">
            {completedReviews.map((review) => (
              <div key={review._id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold">{review.manuscript.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Submitted: {new Date(review.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </span>
                    {review.recommendation && (
                      <div className={`text-sm font-medium mt-1 ${getRecommendationColor(review.recommendation)}`}>
                        Recommendation: {review.recommendation}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Score: {review.score}/10
                  </div>
                  <Link
                    to={`/review/${review._id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
