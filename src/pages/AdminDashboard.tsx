import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const stats = useQuery(api.admin.getAdminStats);
  const users = useQuery(api.admin.getAllUsers);
  const pendingRequestsCount = useQuery(api.roleRequests.getPendingRequestsCount);
  const createUser = useMutation(api.admin.createUser);
  const updateUserRoles = useMutation(api.admin.updateUserRoles);
  const deleteUser = useMutation(api.admin.deleteUser);
  const initializeSuperAdmin = useMutation(api.admin.initializeSuperAdmin);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    roles: ["author"] as ("author" | "editor" | "reviewer")[],
    orcid: "",
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({
        email: newUser.email,
        name: newUser.name,
        roles: newUser.roles,
        orcid: newUser.orcid || undefined,
      });
      toast.success("User created successfully");
      setNewUser({ email: "", name: "", roles: ["author"], orcid: "" });
      setShowCreateUser(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    }
  };

  const handleRoleToggle = (userId: Id<"users">, role: "author" | "editor" | "reviewer", currentRoles: string[]) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    // Ensure at least one role is selected
    if (newRoles.length === 0) {
      toast.error("User must have at least one role");
      return;
    }

    updateUserRoles({ targetUserId: userId, roles: newRoles as any })
      .then(() => toast.success("User roles updated successfully"))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to update roles"));
  };

  const handleDeleteUser = async (userId: Id<"users">, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUser({ targetUserId: userId });
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    }
  };

  const handleInitializeSuperAdmin = async () => {
    try {
      await initializeSuperAdmin();
      toast.success("Super admin account initialized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initialize");
    }
  };

  const toggleNewUserRole = (role: "author" | "editor" | "reviewer") => {
    const newRoles = newUser.roles.includes(role)
      ? newUser.roles.filter(r => r !== role)
      : [...newUser.roles, role];
    
    // Ensure at least one role is selected
    if (newRoles.length === 0) {
      return;
    }
    
    setNewUser({ ...newUser, roles: newRoles });
  };

  if (stats === undefined || users === undefined) {
    return <div>Loading admin dashboard...</div>;
  }

  if (stats === null) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Access Required</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            You need super admin privileges to access this dashboard.
          </p>
          <button
            onClick={handleInitializeSuperAdmin}
            className="mt-4 auth-button w-auto px-4 py-2"
          >
            Initialize Super Admin Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <Link
          to="/admin/role-requests"
          className="auth-button w-auto px-4 py-2 relative"
        >
          Role Requests
          {pendingRequestsCount && pendingRequestsCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {pendingRequestsCount}
            </span>
          )}
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Manuscripts</h3>
          <div className="text-3xl font-bold text-blue-600 mb-2">{stats.manuscripts.total}</div>
          <div className="space-y-1 text-sm">
            {Object.entries(stats.manuscripts.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize">{status}:</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Reviews</h3>
          <div className="text-3xl font-bold text-green-600 mb-2">{stats.reviews.total}</div>
          <div className="space-y-1 text-sm">
            {Object.entries(stats.reviews.byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize">{status}:</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Users</h3>
          <div className="text-3xl font-bold text-purple-600 mb-2">{stats.users.total}</div>
          <div className="space-y-1 text-sm">
            {Object.entries(stats.users.byRole).map(([role, count]) => (
              <div key={role} className="flex justify-between">
                <span className="capitalize">{role}s:</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">User Management</h2>
          <button
            onClick={() => setShowCreateUser(!showCreateUser)}
            className="auth-button w-auto px-4 py-2"
          >
            {showCreateUser ? "Cancel" : "Create User"}
          </button>
        </div>

        {/* Create User Form */}
        {showCreateUser && (
          <form onSubmit={handleCreateUser} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="auth-input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="auth-input-field"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Roles</label>
                <div className="flex gap-4">
                  {["author", "reviewer", "editor"].map((role) => (
                    <label key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newUser.roles.includes(role as any)}
                        onChange={() => toggleNewUserRole(role as any)}
                        className="mr-2"
                      />
                      <span className="capitalize">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ORCID (optional)</label>
                <input
                  type="text"
                  value={newUser.orcid}
                  onChange={(e) => setNewUser({ ...newUser, orcid: e.target.value })}
                  className="auth-input-field"
                  placeholder="0000-0000-0000-0000"
                />
              </div>
            </div>
            <button type="submit" className="auth-button w-auto px-6 py-2 mt-4">
              Create User
            </button>
          </form>
        )}

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ORCID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2 flex-wrap">
                      {["author", "reviewer", "editor"].map((role) => (
                        <label key={role} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={user.userData?.roles?.includes(role as "author" | "editor" | "reviewer") || false}
                            onChange={() => handleRoleToggle(user._id, role as any, user.userData?.roles || [])}
                            className="mr-1"
                          />
                          <span className="capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.userData?.orcid || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user._creationTime).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {user.email === "michael.ruderman@cyansociety.org" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Super Admin
                        </span>
                      ) : (
                        <button
                          onClick={() => handleDeleteUser(user._id, user.email || "")}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
