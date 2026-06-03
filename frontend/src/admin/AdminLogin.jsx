import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const AdminLogin = ({ setIsAdminAuthenticated }) => {
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const handleInput = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("window.API_BASE_URL/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData),
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        if (data.user.role !== "admin") {
          setError("Access denied! This portal is for admins only.");
          setLoading(false);
          return;
        }

        setSuccess("Login successful! Redirecting...");

        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUser", JSON.stringify(data.user));

        setIsAdminAuthenticated(true);

        setTimeout(() => navigate("/admin/dashboard"), 600);
      } else {
        setError(data.message || "Invalid login credentials.");
      }
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Network Error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black">

      {/* Left Form Section */}
      <div className="flex items-center justify-center px-8 lg:px-16 py-12">
        <div className="w-full max-w-lg">

          <h2 className="text-3xl font-bold text-white mb-2">Admin Login</h2>
          <p className="text-white/60 mb-8">Sign in with your admin credentials</p>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-lg text-sm mb-5 bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="px-4 py-3 rounded-lg text-sm mb-5 bg-green-500/10 border border-green-500/30 text-green-400">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="space-y-5">

            {/* Email */}
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />

                <input
                  type="email"
                  name="email"
                  value={loginData.email}
                  onChange={handleInput}
                  required
                  placeholder="Admin email"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 transition-all 
                  focus:border-gold focus:bg-white/8 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-white/80 text-sm font-medium mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={loginData.password}
                  onChange={handleInput}
                  required
                  placeholder="Admin password"
                  className="w-full py-3.5 pl-12 pr-12 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 transition-all 
                  focus:border-gold focus:bg-white/8 focus:outline-none"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-light 
              text-black text-base font-semibold rounded-lg transition-all 
              hover:shadow-lg hover:shadow-gold/30 disabled:opacity-60 disabled:cursor-not-allowed mt-6"
            >
              {loading ? "Signing In..." : "Login as Admin"}
            </button>
          </form>
          <div className="mt-6 text-center text-white/70">
            Create an admin account?{" "}
            <button
              onClick={() => navigate("/admin/register")}
              className="text-gold font-medium hover:underline"
            >
              Register here
            </button>
          </div>


        </div>
      </div>

      {/* Right Image Section */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-black px-16 py-12">
        <div className="w-full max-w-2xl text-center">
          <img
            src="/images/appLogo/superb-light.png"
            className="h-20 mx-auto mb-4"
            alt="Admin Logo"
          />

          <p className="text-gold text-sm font-medium tracking-widest">ADMIN PORTAL</p>

          <div className="glass-effect-dark rounded-3xl overflow-hidden border border-white/10 shadow-2xl mt-8">
            <img
              src="/images/authScreen/3942584.jpg"
              className="w-full h-[380px] object-cover"
              alt="Admin"
            />
          </div>

          <h3 className="text-3xl font-bold text-white mt-8">Secure Access</h3>
          <p className="text-white/70 text-base mt-2">
            Only authorized administrators can access the Superb control panel.
          </p>
        </div>
      </div>

    </div>
  );
};

export default AdminLogin;
