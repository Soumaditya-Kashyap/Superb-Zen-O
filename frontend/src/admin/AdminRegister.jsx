//this is the file Superb-Zen-O/frontend/src/admin/Register.jsx



import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, Eye, EyeOff } from "lucide-react";

const AdminRegister = ({ setIsAdminAuthenticated }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCPassword, setShowCPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    nickName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match!");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          role: "admin"   // force admin registration
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("Admin account created successfully! Redirecting...");

        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminUser", JSON.stringify(data.user));

        setIsAdminAuthenticated(true);

        setTimeout(() => navigate("/admin/dashboard"), 800);
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("Register error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black">

      {/* Left Section */}
      <div className="flex items-center justify-center px-8 lg:px-16 py-12">
        <div className="w-full max-w-lg">

          <h2 className="text-3xl font-bold text-white mb-2">Admin Sign Up</h2>
          <p className="text-white/60 mb-8">Create your admin account</p>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 mb-5 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="px-4 py-3 mb-5 rounded-lg text-sm bg-green-500/10 border border-green-500/30 text-green-400">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-5">

            {/* Full Name */}
            <div>
              <label className="text-white/80 text-sm mb-2 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter full name"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 focus:border-gold"
                />
              </div>
            </div>

            {/* Nickname */}
            <div>
              <label className="text-white/80 text-sm mb-2 block">Nickname</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="text"
                  name="nickName"
                  required
                  value={formData.nickName}
                  onChange={handleChange}
                  placeholder="Enter nickname"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 focus:border-gold"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-white/80 text-sm mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 focus:border-gold"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="text-white/80 text-sm mb-2 block">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone"
                  className="w-full py-3.5 pl-12 pr-4 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 focus:border-gold"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-white/80 text-sm mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full py-3.5 pl-12 pr-12 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 focus:border-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-white/80 text-sm mb-2 block">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                <input
                  type={showCPassword ? "text" : "password"}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className="w-full py-3.5 pl-12 pr-12 bg-white/5 border border-white/10 
                  rounded-lg text-white placeholder:text-white/30 focus:border-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowCPassword(!showCPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                >
                  {showCPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-gold to-gold-light text-black
              font-semibold rounded-lg hover:shadow-lg hover:shadow-gold/30 disabled:opacity-50"
            >
              {loading ? "Creating Admin..." : "Register as Admin"}
            </button>
          </form>

          <div className="mt-6 text-center text-white/70">
            Already have an admin account?{" "}
            <button
              onClick={() => navigate("/admin/login")}
              className="text-gold font-medium hover:underline"
            >
              Login here
            </button>
          </div>


        </div>
      </div>
      {/* Right Side Image */}
      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-black px-16">
        <div className="w-full max-w-2xl text-center">
          <img
            src="/images/appLogo/superb-light.png"
            className="h-20 mx-auto mb-4"
            alt="Admin Logo"
          />
          <p className="text-gold mb-10 tracking-widest">ADMIN REGISTRATION</p>

          <div className="glass-effect-dark rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <img
              src="/images/authScreen/3942584.jpg"
              className="w-full h-[380px] object-cover"
              alt="Admin Signup"
            />
          </div>

          <h3 className="text-3xl text-white font-bold mt-8">Secure Admin Access</h3>
          <p className="text-white/70 mt-2">
            Create your admin account to manage Superb platform controls and user content.
          </p>
        </div>
      </div>

    </div>
  );
};

export default AdminRegister;