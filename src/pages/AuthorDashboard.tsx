import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function AuthorDashboard() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userManuscripts = useQuery(api.manuscripts.getManuscriptsForAuthor);
  const generateUploadUrl = useMutation(api.manuscripts.generateUploadUrl);
  const createManuscript = useMutation(api.manuscripts.createManuscript);
  
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionForm, setSubmissionForm] = useState({
    title: "",
    abstract: "",
    keywords: "",
    language: "English",
    file: null as File | null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type (PDF only)
      if (file.type !== "application/pdf") {
        toast.error("Please upload a PDF file");
        return;
      }
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSubmissionForm({ ...submissionForm, file });
    }
  };

  const handleSubmitManuscript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionForm.file) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Step 2: Upload file
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": submissionForm.file.type },
        body: submissionForm.file,
      });
      
      if (!uploadResult.ok) {
        throw new Error("Failed to upload file");
      }
      
      const { storageId } = await uploadResult.json();
      
      // Step 3: Create manuscript record
      await createManuscript({
        title: submissionForm.title,

        abstract: submissionForm.abstract,
        keywords: submissionForm.keywords.split(",").map(k => k.trim()).filter(k => k),
        language: submissionForm.language,
        fileId: storageId,
      });
      
      toast.success("Manuscript submitted successfully!");
      setSubmissionForm({
        title: "",
        abstract: "",
        keywords: "",
        language: "English",
        file: null,
      });
      setShowSubmissionForm(false);
      
      // Reset file input
      const fileInput = document.getElementById("manuscript-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit manuscript");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "inReview":
        return "bg-yellow-100 text-yellow-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "published":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loggedInUser === undefined || userManuscripts === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Author Dashboard</h1>
        <p className="text-gray-600">Welcome back, {loggedInUser?.name || loggedInUser?.email}!</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-blue-600">📝 Submit New Manuscript</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Submit your research for peer review and publication consideration.
          </p>
          <button
            onClick={() => setShowSubmissionForm(true)}
            className="auth-button w-full"
          >
            Start Submission
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-green-600">📊 My Manuscripts</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Track the status of your submitted manuscripts and reviews.
          </p>
          <div className="text-2xl font-bold text-green-600 mb-2">
            {userManuscripts?.length || 0}
          </div>
          <p className="text-sm text-gray-500">Total submissions</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-purple-600">🎯 Need More Roles?</h3>
          <p className="text-gray-600 mb-4 text-sm">
            Request reviewer or editor privileges to contribute more to the community.
          </p>
          <Link
            to="/role-requests"
            className="auth-button w-full inline-block text-center"
          >
            Request Roles
          </Link>
        </div>
      </div>

      {/* Submission Form Modal */}
      {showSubmissionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Submit New Manuscript</h2>
              <button
                onClick={() => setShowSubmissionForm(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitManuscript} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={submissionForm.title}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, title: e.target.value })}
                  className="auth-input-field"
                  placeholder="Enter your manuscript title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Abstract <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={submissionForm.abstract}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, abstract: e.target.value })}
                  className="auth-input-field"
                  rows={6}
                  placeholder="Provide a comprehensive abstract of your research..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Keywords <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={submissionForm.keywords}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, keywords: e.target.value })}
                  className="auth-input-field"
                  placeholder="keyword1, keyword2, keyword3"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Separate keywords with commas</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select
                  value={submissionForm.language}
                  onChange={(e) => setSubmissionForm({ ...submissionForm, language: e.target.value })}
                  className="auth-input-field"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Manuscript File (PDF) <span className="text-red-500">*</span>
                </label>
                <input
                  id="manuscript-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="auth-input-field"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload your manuscript as a PDF file (max 10MB)
                </p>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="auth-button flex-1"
                >
                  {isSubmitting ? "Submitting..." : "Submit Manuscript"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSubmissionForm(false)}
                  className="px-6 py-3 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My Manuscripts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-6">My Manuscripts</h2>
        
        {!userManuscripts || userManuscripts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No manuscripts yet</h3>
            <p className="text-gray-500 mb-6">
              Start by submitting your first manuscript for peer review.
            </p>
            <button
              onClick={() => setShowSubmissionForm(true)}
              className="auth-button w-auto px-6 py-3"
            >
              Submit Your First Manuscript
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userManuscripts.map((manuscript) => (
              <div key={manuscript._id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{manuscript.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{manuscript.abstract}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Submitted: {new Date(manuscript._creationTime).toLocaleDateString()}</span>
                      <span>Language: {manuscript.language}</span>
                      {manuscript.keywords && manuscript.keywords.length > 0 && (
                        <span>Keywords: {manuscript.keywords.slice(0, 3).join(", ")}</span>
                      )}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(manuscript.status)}`}>
                    {manuscript.status.charAt(0).toUpperCase() + manuscript.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    {manuscript.status === "submitted" && "Awaiting editorial review"}
                    {manuscript.status === "inReview" && "Currently under peer review"}
                    {manuscript.status === "accepted" && "Accepted for publication"}
                    {manuscript.status === "rejected" && "Not accepted for publication"}
                    {manuscript.status === "published" && manuscript.slug && (
                      <Link to={`/article/${manuscript.slug}`} className="text-blue-600 hover:underline">
                        View published article
                      </Link>
                    )}
                  </div>
                  
                  {manuscript.fileUrl && (
                    <a
                      href={manuscript.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View PDF
                    </a>
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
