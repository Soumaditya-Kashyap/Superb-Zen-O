import React, { useState } from "react";
import Footer from "../components/Footer";

const SettingsPage = () => {

  // =====================================================
  // 🔐 Password Modal State
  // =====================================================
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // =====================================================
  // 🔑 Password Data
  // =====================================================
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  });

  // =====================================================
  // 🔐 JWT Token
  // =====================================================
  const token = localStorage.getItem("token");

  // =====================================================
  // 🔐 Change Password Function
  // =====================================================
  const handleChangePassword = async () => {

    try {

      // Validation
      if (
        !passwordData.currentPassword ||
        !passwordData.newPassword
      ) {
        alert("Please fill all fields");
        return;
      }

      // API Request
      const res = await fetch(
        "window.API_BASE_URL/user/change-password",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        }
      );

      const data = await res.json();

      // Success
      if (data.success) {

        alert("Password updated successfully");

        setPasswordData({
          currentPassword: "",
          newPassword: "",
        });

        setShowPasswordModal(false);

      } else {

        alert(data.message);
      }

    } catch (error) {

      console.log(error);

      alert("Something went wrong");
    }
  };

  // =====================================================
  // 🚪 Logout
  // =====================================================
  const handleLogout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "/login";
  };

  return (

    <div className="min-h-screen bg-black text-white px-6 md:px-10 py-10">

      {/* =====================================================
          🌟 Header
      ===================================================== */}
      <div className="mb-12 text-center">

        <h1 className="
          text-5xl md:text-6xl
          font-bold
          bg-gradient-to-r
          from-gold
          to-yellow-200
          bg-clip-text
          text-transparent
        ">
          Settings
        </h1>

        <p className="text-zinc-400 mt-3 text-lg">
          Manage your account securely
        </p>

      </div>

      {/* =====================================================
          🔐 Main Card
      ===================================================== */}
      <div className="max-w-3xl mx-auto">

        <div className="
          bg-zinc-900/80
          backdrop-blur-md
          border border-zinc-800
          rounded-3xl
          p-8
          shadow-2xl
        ">

          {/* Title */}
          <h2 className="
            text-3xl
            font-bold
            mb-8
            flex items-center gap-3
          ">
            <span>⚙️</span>
            Account Settings
          </h2>

          {/* =====================================
              Change Password Card
          ===================================== */}
          <div className="
            bg-zinc-800/60
            border border-zinc-700
            rounded-2xl
            p-6
            mb-5
            hover:border-gold/50
            transition
          ">

            <div className="
              flex
              flex-col md:flex-row
              md:items-center
              md:justify-between
              gap-4
            ">

              <div>

                <h3 className="text-xl font-semibold mb-1">
                  Change Password
                </h3>

                <p className="text-zinc-400 text-sm">
                  Update your account password securely
                </p>

              </div>

              <button
                onClick={() => setShowPasswordModal(true)}
                className="
                  px-6 py-3
                  rounded-xl
                  bg-gold
                  text-black
                  font-semibold
                  hover:scale-105
                  transition
                "
              >
                Update Password
              </button>

            </div>

          </div>

          {/* =====================================
              Logout Card
          ===================================== */}
          <div className="
            bg-zinc-800/60
            border border-red-500/20
            rounded-2xl
            p-6
            hover:border-red-500/40
            transition
          ">

            <div className="
              flex
              flex-col md:flex-row
              md:items-center
              md:justify-between
              gap-4
            ">

              <div>

                <h3 className="text-xl font-semibold mb-1 text-red-400">
                  Logout
                </h3>

                <p className="text-zinc-400 text-sm">
                  Logout from your current account
                </p>

              </div>

              <button
                onClick={handleLogout}
                className="
                  px-6 py-3
                  rounded-xl
                  bg-red-600
                  hover:bg-red-700
                  font-semibold
                  transition
                "
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          🔐 Password Modal
      ===================================================== */}
      {showPasswordModal && (

        <div className="
          fixed inset-0
          bg-black/80
          backdrop-blur-sm
          flex items-center justify-center
          z-50
        ">

          {/* Modal */}
          <div className="
            bg-zinc-900
            border border-zinc-700
            rounded-3xl
            p-8
            w-[90%]
            max-w-md
            shadow-2xl
            animate-fadeIn
          ">

            {/* Header */}
            <div className="
              flex items-center justify-between
              mb-6
            ">

              <h2 className="text-2xl font-bold">
                🔐 Change Password
              </h2>

              <button
                onClick={() => setShowPasswordModal(false)}
                className="
                  text-zinc-400
                  hover:text-white
                  text-2xl
                "
              >
                ✕
              </button>

            </div>

            {/* Current Password */}
            <div className="mb-5">

              <label className="
                block mb-2
                text-sm text-zinc-400
              ">
                Current Password
              </label>

              <input
                type="password"
                placeholder="Enter current password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    currentPassword: e.target.value,
                  })
                }
                className="
                  w-full
                  p-4
                  rounded-xl
                  bg-black
                  border border-zinc-700
                  outline-none
                  focus:border-gold
                  transition
                "
              />

            </div>

            {/* New Password */}
            <div className="mb-7">

              <label className="
                block mb-2
                text-sm text-zinc-400
              ">
                New Password
              </label>

              <input
                type="password"
                placeholder="Enter new password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                className="
                  w-full
                  p-4
                  rounded-xl
                  bg-black
                  border border-zinc-700
                  outline-none
                  focus:border-gold
                  transition
                "
              />

            </div>

            {/* Buttons */}
            <div className="
              flex justify-end gap-3
            ">

              <button
                onClick={() => setShowPasswordModal(false)}
                className="
                  px-5 py-3
                  rounded-xl
                  bg-zinc-700
                  hover:bg-zinc-600
                  transition
                "
              >
                Cancel
              </button>

              <button
                onClick={handleChangePassword}
                className="
                  px-5 py-3
                  rounded-xl
                  bg-gold
                  text-black
                  font-semibold
                  hover:scale-105
                  transition
                "
              >
                Update Password
              </button>

            </div>

          </div>

        </div>
      )}

      {/* Footer */}
      <Footer />

    </div>
  );
};

export default SettingsPage;