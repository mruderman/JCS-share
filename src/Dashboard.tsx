import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import AuthorDashboard from "./pages/AuthorDashboard";
import EditorDashboard from "./pages/EditorDashboard";
import ReviewerDashboard from "./pages/ReviewerDashboard";
import AdminDashboard from "./pages/AdminDashboard";

export default function Dashboard() {
  const userData = useQuery(api.userData.getCurrentUserData);
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (!userData || !loggedInUser) {
    return <div>Loading...</div>;
  }

  const roles = userData.roles || [];
  const isAdmin = loggedInUser.email === "michael.ruderman@cyansociety.org";

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (roles.includes("editor")) {
    return <EditorDashboard />;
  }

  if (roles.includes("reviewer")) {
    return <ReviewerDashboard />;
  }

  return <AuthorDashboard />;
}
