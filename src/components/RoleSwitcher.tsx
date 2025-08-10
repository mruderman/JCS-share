import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";

interface RoleSwitcherProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
}

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const userData = useQuery(api.userData.getCurrentUserData);

  const userRoles = userData?.roles || ["author"];
  const isAdmin = loggedInUser?.email === "michael.ruderman@cyansociety.org";

  const availableRoles = [
    { id: "author", name: "Author", icon: "📝", color: "blue", path: "/author" },
    ...(userRoles.includes("reviewer") ? [{ id: "reviewer", name: "Reviewer", icon: "📋", color: "orange", path: "/reviewer" }] : []),
    ...(userRoles.includes("editor") ? [{ id: "editor", name: "Editor", icon: "🏛️", color: "green", path: "/editor" }] : []),
    ...(isAdmin ? [{ id: "admin", name: "Admin", icon: "🔧", color: "purple", path: "/admin" }] : []),
  ];

  const currentRoleData = availableRoles.find(role => role.id === currentRole) || availableRoles[0];

  const handleRoleSwitch = (roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId);
    if (role) {
      onRoleChange(roleId);
      navigate(role.path);
      setIsOpen(false);
    }
  };

  if (availableRoles.length <= 1) {
    return (
      <button
        onClick={() => navigate(currentRoleData.path)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 hover:opacity-80 ${
          currentRoleData.color === "blue" ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" :
          currentRoleData.color === "orange" ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" :
          currentRoleData.color === "green" ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" :
          "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
        }`}
      >
        <span className="text-lg">{currentRoleData.icon}</span>
        <span className="text-sm font-medium">{currentRoleData.name}</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 ${
          currentRoleData.color === "blue" ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100" :
          currentRoleData.color === "orange" ? "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100" :
          currentRoleData.color === "green" ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" :
          "border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
        }`}
      >
        <span className="text-lg">{currentRoleData.icon}</span>
        <span className="text-sm font-medium">{currentRoleData.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Switch Role
              </div>
              
              {availableRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSwitch(role.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    role.id === currentRole ? "bg-blue-50 border-r-2 border-blue-500" : ""
                  }`}
                >
                  <span className="text-lg">{role.icon}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{role.name}</div>
                    <div className="text-xs text-gray-500">
                      {role.id === "author" && "Submit and track manuscripts"}
                      {role.id === "reviewer" && "Review assigned manuscripts"}
                      {role.id === "editor" && "Manage submissions and reviews"}
                      {role.id === "admin" && "System administration"}
                    </div>
                  </div>
                  {role.id === currentRole && (
                    <div className={`w-2 h-2 rounded-full ${
                      role.color === "blue" ? "bg-blue-500" :
                      role.color === "orange" ? "bg-orange-500" :
                      role.color === "green" ? "bg-green-500" :
                      "bg-purple-500"
                    }`} />
                  )}
                </button>
              ))}
              
              {/* Role Request Link */}
              <div className="border-t border-gray-100 mt-2 pt-2">
                <button
                  onClick={() => {
                    navigate("/role-requests");
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">🎯</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-purple-600">Request New Role</div>
                    <div className="text-xs text-gray-500">Apply for reviewer or editor access</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
