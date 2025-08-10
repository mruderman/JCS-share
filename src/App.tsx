import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import React, { useState } from "react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import EditorDashboard from "./pages/EditorDashboard";
import AuthorDashboard from "./pages/AuthorDashboard";
import ReviewerDashboard from "./pages/ReviewerDashboard";
import ReviewPage from "./pages/ReviewPage";
import ArticlePage from "./pages/ArticlePage";
import AdminDashboard from "./pages/AdminDashboard";
import SetupPage from "./pages/SetupPage";
import RoleRequestPage from "./pages/RoleRequestPage";
import AdminRoleRequestsPage from "./pages/AdminRoleRequestsPage";
import ProfilePage from "./pages/ProfilePage";
import RoleSwitcher from "./components/RoleSwitcher";
import JournalPage from "./pages/JournalPage";
import ArticleViewerPage from "./pages/ArticleViewerPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-10 bg-white h-16 flex justify-between items-center border-b shadow-sm px-4">
          <Link to="/" className="text-xl font-semibold text-primary">
            Cyan Science
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/journal" className="text-gray-600 hover:text-gray-800 hover:underline cursor-pointer px-2 py-1 rounded transition-colors">
              Journal
            </Link>
            <Authenticated>
              <Navigation />
              <SignOutButton />
            </Authenticated>
            <Unauthenticated>
              <Link to="/" className="text-gray-600 hover:text-gray-800 hover:underline cursor-pointer px-2 py-1 rounded transition-colors">
                Sign In
              </Link>
            </Unauthenticated>
          </div>
        </header>
        <main className="flex-1 p-8">
          <div className="w-full max-w-4xl mx-auto">
            <Routes>
              <Route path="/" element={<Content />} />
              <Route
                path="/author"
                element={
                  <Authenticated>
                    <AuthorDashboard />
                  </Authenticated>
                }
              />
              <Route
                path="/editor"
                element={
                  <Authenticated>
                    <EditorDashboard />
                  </Authenticated>
                }
              />
              <Route
                path="/reviewer"
                element={
                  <Authenticated>
                    <ReviewerDashboard />
                  </Authenticated>
                }
              />
              <Route
                path="/review/:reviewId"
                element={
                  <Authenticated>
                    <ReviewPage />
                  </Authenticated>
                }
              />
              <Route path="/article/:slug" element={<ArticleViewerPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route
                path="/admin"
                element={
                  <Authenticated>
                    <AdminDashboard />
                  </Authenticated>
                }
              />
              <Route
                path="/admin/role-requests"
                element={
                  <Authenticated>
                    <AdminRoleRequestsPage />
                  </Authenticated>
                }
              />
              <Route
                path="/role-requests"
                element={
                  <Authenticated>
                    <RoleRequestPage />
                  </Authenticated>
                }
              />
              <Route
                path="/profile"
                element={
                  <Authenticated>
                    <ProfilePage />
                  </Authenticated>
                }
              />
              <Route path="/setup" element={<SetupPage />} />
            </Routes>
          </div>
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function Navigation() {
  const location = useLocation();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userData = useQuery(api.userData.getCurrentUserData);
  const pendingRequestsCount = useQuery(api.roleRequests.getPendingRequestsCount);
  
  // Determine current role based on the current path
  const getCurrentRoleFromPath = () => {
    if (location.pathname.startsWith("/author")) return "author";
    if (location.pathname.startsWith("/reviewer")) return "reviewer";
    if (location.pathname.startsWith("/editor")) return "editor";
    if (location.pathname.startsWith("/admin")) return "admin";
    return "author"; // default
  };

  const [currentRole, setCurrentRole] = useState(getCurrentRoleFromPath());

  // Update current role when path changes
  React.useEffect(() => {
    setCurrentRole(getCurrentRoleFromPath());
  }, [location.pathname]);

  // Get user roles for navigation
  const userRoles = userData?.roles || ["author"];
  const isAdmin = loggedInUser?.email === "michael.ruderman@cyansociety.org";

  // Update current role based on available roles if current role is not available
  React.useEffect(() => {
    const availableRoles = ["author", ...(userRoles.includes("reviewer") ? ["reviewer"] : []), ...(userRoles.includes("editor") ? ["editor"] : []), ...(isAdmin ? ["admin"] : [])];
    if (!availableRoles.includes(currentRole)) {
      setCurrentRole("author");
    }
  }, [userRoles, currentRole, isAdmin]);

  return (
    <nav className="flex items-center gap-4 text-sm">
      {/* Role Switcher - now the main navigation element */}
      <RoleSwitcher currentRole={currentRole} onRoleChange={setCurrentRole} />

      {/* Admin Role Requests - Only for admins */}
      {isAdmin && (
        <Link 
          to="/admin/role-requests" 
          className="text-red-600 hover:text-red-700 hover:underline relative cursor-pointer px-2 py-1 rounded transition-colors"
        >
          Role Requests
          {pendingRequestsCount && pendingRequestsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {pendingRequestsCount}
            </span>
          )}
        </Link>
      )}

      {/* Profile Link */}
      <Link 
        to="/profile" 
        className="text-gray-600 hover:text-gray-800 hover:underline cursor-pointer px-2 py-1 rounded transition-colors"
      >
        Profile
      </Link>
    </nav>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userData = useQuery(api.userData.getCurrentUserData);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get user roles for dashboard routing
  const userRoles = userData?.roles || ["author"];
  const isEditor = userRoles.includes("editor");
  const isReviewer = userRoles.includes("reviewer");
  const isAdmin = loggedInUser?.email === "michael.ruderman@cyansociety.org";

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-primary mb-4">Cyan Science</h1>
        <Authenticated>
          <p className="text-xl text-secondary">
            Welcome back, {userData?.name || loggedInUser?.email || "friend"}!
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-secondary">
            The future of peer review is here. Sign in to get started.
          </p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <div className="max-w-md mx-auto">
          <SignInForm />
        </div>
      </Unauthenticated>
      
      <Authenticated>
        <div className="text-center space-y-4">
          {/* Navigation hint */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-800 font-medium mb-2">
              👆 Use the role switcher in the navigation above to access your dashboards
            </p>
            <p className="text-blue-600 text-sm">
              Switch between Author, Reviewer, Editor, and Admin roles as needed
            </p>
          </div>

          {/* Role information cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-blue-600 mb-2">📄 Author</h3>
              <p className="text-sm text-gray-600 mb-3">Submit and track your manuscripts</p>
              <p className="text-xs text-blue-600 font-medium">
                Available to all users
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-orange-600 mb-2">📋 Reviewer</h3>
              <p className="text-sm text-gray-600 mb-3">Review assigned manuscripts</p>
              <p className="text-xs font-medium">
                {isReviewer ? (
                  <span className="text-green-600">✓ You have access</span>
                ) : (
                  <span className="text-gray-500">Request access needed</span>
                )}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-purple-600 mb-2">🎯 Role Requests</h3>
              <p className="text-sm text-gray-600 mb-3">Request additional privileges</p>
              <Link to="/role-requests" className="text-purple-600 hover:underline text-sm font-medium">
                Manage Requests →
              </Link>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-green-600 mb-2">🏛️ Editor</h3>
              <p className="text-sm text-gray-600 mb-3">Manage submissions and reviews</p>
              <p className="text-xs font-medium">
                {isEditor ? (
                  <span className="text-green-600">✓ You have access</span>
                ) : (
                  <span className="text-gray-500">Request access needed</span>
                )}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-600 mb-2">👤 Profile</h3>
              <p className="text-sm text-gray-600 mb-3">Manage your account settings</p>
              <Link to="/profile" className="text-gray-600 hover:underline text-sm font-medium">
                Edit Profile →
              </Link>
            </div>
            {isAdmin && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold text-purple-600 mb-2">🔧 Admin</h3>
                <p className="text-sm text-gray-600 mb-3">System administration</p>
                <p className="text-xs text-green-600 font-medium">
                  ✓ Admin access
                </p>
              </div>
            )}
          </div>
        </div>
      </Authenticated>
    </div>
  );
}
