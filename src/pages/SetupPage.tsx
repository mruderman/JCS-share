import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

export default function SetupPage() {
  const createSuperAdmin = useMutation(api.admin.createSuperAdminDirectly);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCreateSuperAdmin = async () => {
    setIsCreating(true);
    try {
      const result = await createSuperAdmin({ email: "michael.ruderman@cyansociety.org" });
      toast.success("Super admin account created successfully!");
      setCreated(true);
      setResult(result);
      console.log("Super admin created:", result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create super admin");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">System Setup</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Initialize Super Admin Account</h2>
        
        {!created ? (
          <div>
            <p className="text-gray-600 mb-4">
              This will create a super admin account for <strong>michael.ruderman@cyansociety.org</strong> 
              with full editorial privileges.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</h3>
              <ul className="text-yellow-700 text-sm space-y-1">
                <li>• This should only be run once during initial setup</li>
                <li>• The super admin will have full access to all system functions</li>
                <li>• After creation, you'll need to sign up with a password</li>
              </ul>
            </div>
            
            <button
              onClick={handleCreateSuperAdmin}
              disabled={isCreating}
              className="auth-button w-auto px-6 py-3"
            >
              {isCreating ? "Creating..." : "Create Super Admin Account"}
            </button>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">✅ Setup Complete!</h3>
            <p className="text-green-700 mb-4">
              The super admin account has been created successfully.
            </p>
            <div className="space-y-2 text-sm text-green-600">
              <p><strong>Email:</strong> michael.ruderman@cyansociety.org</p>
              <p><strong>Role:</strong> Editor (Super Admin)</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-800 mb-2">🔑 Next Steps to Login:</h4>
                <ol className="list-decimal list-inside text-blue-700 space-y-1">
                  <li>Go to the homepage</li>
                  <li>Click "Sign Up" (not Sign In)</li>
                  <li>Use email: <code className="bg-blue-100 px-1 rounded">michael.ruderman@cyansociety.org</code></li>
                  <li>Set your password</li>
                  <li>After signup, you'll have super admin access</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 text-center">
        <a href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
