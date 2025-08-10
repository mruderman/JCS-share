import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Doc } from "../../convex/_generated/dataModel";

export default function EditorDashboard() {
  const [activeTab, setActiveTab] = useState<"submissions" | "reviews" | "proofing">("submissions");
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Editor Dashboard</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("submissions")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "submissions"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reviews"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab("proofing")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === "proofing"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Proofing & Publishing
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "submissions" && <SubmissionsTab />}
      {activeTab === "reviews" && <ReviewsTab />}
      {activeTab === "proofing" && <ProofingTab />}
    </div>
  );
}

function SubmissionsTab() {
  const manuscripts = useQuery(api.manuscripts.getManuscriptsForEditor);
  const makeDecision = useMutation(api.manuscripts.makeEditorialDecision);
  const assignReviewer = useMutation(api.reviews.assignReviewer);
  const users = useQuery(api.users.getUsers);

  const [selectedManuscript, setSelectedManuscript] = useState<string | null>(null);
  const [decision, setDecision] = useState<"proofing" | "minorRevisions" | "majorRevisions" | "reject">("proofing");
  const [comments, setComments] = useState("");
  const [selectedReviewer, setSelectedReviewer] = useState("");

  const handleMakeDecision = async (manuscriptId: string) => {
    try {
      await makeDecision({
        manuscriptId: manuscriptId as any,
        decision,
        comments: comments || undefined,
      });
      toast.success("Editorial decision made successfully");
      setSelectedManuscript(null);
      setComments("");
    } catch (error) {
      toast.error("Failed to make decision: " + (error as Error).message);
    }
  };

  const handleAssignReviewer = async (manuscriptId: string) => {
    if (!selectedReviewer) {
      toast.error("Please select a reviewer");
      return;
    }

    try {
      await assignReviewer({
        manuscriptId: manuscriptId as any,
        reviewerId: selectedReviewer as any,
        deadline: Date.now() + 14 * 24 * 60 * 60 * 1000, // 2 weeks from now
      });
      toast.success("Reviewer assigned successfully");
      setSelectedReviewer("");
    } catch (error) {
      toast.error("Failed to assign reviewer: " + (error as Error).message);
    }
  };

  if (!manuscripts || users === undefined) {
    return <div className="text-center py-8">Loading manuscripts...</div>;
  }

  const reviewers = users?.filter((user: Doc<"users"> & { userData: Doc<"userData"> | null }) => 
    user.userData?.roles?.includes("reviewer")
  ) || [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Manuscript Submissions</h2>
      
      {manuscripts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No manuscripts to review at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {manuscripts.map((manuscript) => (
            <div key={manuscript._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {manuscript.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Authors: {manuscript.authors.join(", ")}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    Status: <span className="capitalize font-medium">{manuscript.status}</span>
                  </p>
                  <p className="text-sm text-gray-700 mb-4">
                    {manuscript.abstract}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {manuscript.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-4 flex flex-col gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    manuscript.status === "submitted" ? "bg-yellow-100 text-yellow-800" :
                    manuscript.status === "inReview" ? "bg-blue-100 text-blue-800" :
                    manuscript.status === "accepted" ? "bg-green-100 text-green-800" :
                    manuscript.status === "proofing" ? "bg-purple-100 text-purple-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {manuscript.status}
                  </span>
                </div>
              </div>

              {manuscript.fileUrl && (
                <div className="mb-4">
                  <a
                    href={manuscript.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    📄 View Manuscript File
                  </a>
                </div>
              )}

              {/* Assign Reviewer Section */}
              {manuscript.status === "submitted" && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Assign Reviewer</h4>
                  <div className="flex gap-2">
                    <select
                      value={selectedReviewer}
                      onChange={(e) => setSelectedReviewer(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">Select a reviewer...</option>
                      {reviewers.map((reviewer) => (
                        <option key={reviewer._id} value={reviewer._id}>
                          {reviewer.userData?.name || reviewer.name || reviewer.email}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAssignReviewer(manuscript._id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              )}

              {/* Editorial Decision Section */}
              {manuscript.status === "inReview" && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  {selectedManuscript === manuscript._id ? (
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">Make Editorial Decision</h4>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Decision
                        </label>
                        <select
                          value={decision}
                          onChange={(e) => setDecision(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="proofing">Accept for Proofing</option>
                          <option value="minorRevisions">Minor Revisions Required</option>
                          <option value="majorRevisions">Major Revisions Required</option>
                          <option value="reject">Reject</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Comments (optional)
                        </label>
                        <textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Add any comments for the authors..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleMakeDecision(manuscript._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          Submit Decision
                        </button>
                        <button
                          onClick={() => setSelectedManuscript(null)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedManuscript(manuscript._id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Make Editorial Decision
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewsTab() {
  const reviews = useQuery(api.reviews.getReviewsForEditor);

  if (!reviews) {
    return <div className="text-center py-8">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Review Management</h2>
      
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No reviews to manage at this time.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {review.manuscript.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Reviewer: {review.reviewerName}
                  </p>
                  <p className="text-sm text-gray-500 mb-2">
                    Deadline: {new Date(review.deadline).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Status: <span className="capitalize font-medium">{review.status}</span>
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  review.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                  "bg-green-100 text-green-800"
                }`}>
                  {review.status}
                </span>
              </div>

              {review.status === "submitted" && (
                <div className="space-y-3">
                  {review.score && (
                    <p className="text-sm">
                      <span className="font-medium">Score:</span> {review.score}/10
                    </p>
                  )}
                  {review.recommendation && (
                    <p className="text-sm">
                      <span className="font-medium">Recommendation:</span>{" "}
                      <span className="capitalize">{review.recommendation}</span>
                    </p>
                  )}
                  {review.commentsMd && (
                    <div className="text-sm">
                      <span className="font-medium">Comments:</span>
                      <div className="mt-1 p-3 bg-gray-50 rounded border">
                        <pre className="whitespace-pre-wrap text-sm">{review.commentsMd}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProofingTab() {
  const proofingTasks = useQuery(api.proofing.getProofingTasks);
  const generateUploadUrl = useMutation(api.proofing.generateProofedFileUploadUrl);
  const uploadProofedFile = useMutation(api.proofing.uploadProofedFile);
  const publishArticle = useMutation(api.articles.publishArticle);

  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [proofingNotes, setProofingNotes] = useState("");
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [publishData, setPublishData] = useState({
    doi: "",
    volume: "",
    issue: "",
    pageNumbers: "",
  });

  const handleFileUpload = async (taskId: string, file: File) => {
    try {
      setUploadingTaskId(taskId);
      
      const uploadUrl = await generateUploadUrl();
      
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!result.ok) {
        throw new Error("Failed to upload file");
      }
      
      const { storageId } = await result.json();
      
      await uploadProofedFile({
        proofingTaskId: taskId as any,
        fileId: storageId,
        proofingNotes: proofingNotes || undefined,
      });
      
      toast.success("Proofed file uploaded successfully!");
      setProofingNotes("");
    } catch (error) {
      toast.error("Failed to upload file: " + (error as Error).message);
    } finally {
      setUploadingTaskId(null);
    }
  };

  const handlePublish = async (taskId: string) => {
    try {
      await publishArticle({
        proofingTaskId: taskId as any,
        doi: publishData.doi || undefined,
        volume: publishData.volume || undefined,
        issue: publishData.issue || undefined,
        pageNumbers: publishData.pageNumbers || undefined,
      });
      
      toast.success("Article published successfully!");
      setPublishingTaskId(null);
      setPublishData({ doi: "", volume: "", issue: "", pageNumbers: "" });
    } catch (error) {
      toast.error("Failed to publish article: " + (error as Error).message);
    }
  };

  if (!proofingTasks) {
    return <div className="text-center py-8">Loading proofing tasks...</div>;
  }

  const pendingTasks = proofingTasks.filter(task => task && task.status === "pending");
  const completedTasks = proofingTasks.filter(task => task && task.status === "completed");

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-gray-900">Proofing & Publishing</h2>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Pending Proofing Tasks ({pendingTasks.length})
        </h3>
        
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
            No manuscripts awaiting proofing.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingTasks.map((task) => (
              task && <div key={task._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {task.manuscript.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Authors: {task.manuscript.authors.join(", ")}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      Accepted for proofing on: {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    Awaiting Proofed File
                  </span>
                </div>

                <div className="mb-4">
                  <a
                    href={task.manuscript.originalFileUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    📄 Download Original Manuscript
                  </a>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-900 mb-3">Upload Proofed File</h5>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Proofing Notes (optional)
                      </label>
                      <textarea
                        value={proofingNotes}
                        onChange={(e) => setProofingNotes(e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="Add any notes about the proofing process..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Final Proofed File
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(task._id, file);
                          }
                        }}
                        disabled={uploadingTaskId === task._id}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  
                  {uploadingTaskId === task._id && (
                    <div className="mt-3 text-sm text-blue-600">
                      Uploading file...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Ready for Publishing ({completedTasks.length})
        </h3>
        
        {completedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg shadow">
            No articles ready for publishing.
          </div>
        ) : (
          <div className="space-y-4">
            {completedTasks.map((task) => (
              task && <div key={task._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      {task.manuscript.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Authors: {task.manuscript.authors.join(", ")}
                    </p>
                    <p className="text-sm text-gray-500 mb-2">
                      Proofing completed: {task.completedAt ? new Date(task.completedAt).toLocaleDateString() : "N/A"}
                    </p>
                    {task.proofingNotes && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Proofing notes:</span> {task.proofingNotes}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                    Ready to Publish
                  </span>
                </div>

                <div className="flex gap-4 mb-4">
                  <a
                    href={task.manuscript.originalFileUrl ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    📄 Original Manuscript
                  </a>
                  {task.proofedFileUrl && (
                    <a
                      href={task.proofedFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      📄 Proofed File
                    </a>
                  )}
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  {publishingTaskId === task._id ? (
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Publish Article</h5>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            DOI (optional)
                          </label>
                          <input
                            type="text"
                            value={publishData.doi}
                            onChange={(e) => setPublishData({...publishData, doi: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="10.1000/xyz123"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Volume (optional)
                          </label>
                          <input
                            type="text"
                            value={publishData.volume}
                            onChange={(e) => setPublishData({...publishData, volume: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Issue (optional)
                          </label>
                          <input
                            type="text"
                            value={publishData.issue}
                            onChange={(e) => setPublishData({...publishData, issue: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Page Numbers (optional)
                          </label>
                          <input
                            type="text"
                            value={publishData.pageNumbers}
                            onChange={(e) => setPublishData({...publishData, pageNumbers: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            placeholder="1-15"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePublish(task._id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                        >
                          Publish Article
                        </button>
                        <button
                          onClick={() => setPublishingTaskId(null)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setPublishingTaskId(task._id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Publish Article
                    </button>
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
