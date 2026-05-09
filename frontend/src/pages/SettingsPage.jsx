import React, { useState, useEffect } from "react";
import Footer from "../components/Footer";

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    notifications: true,
    autoplay: true,
    darkMode: true,
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
  });

  const token = localStorage.getItem("token");

  // 🔥 Load settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          setSettings(data.data);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchSettings();
  }, []);

  // 🔥 Update settings
  const updateSettings = async (updated) => {
    try {
      await fetch("http://localhost:5000/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });

      setSettings((prev) => ({ ...prev, ...updated }));
    } catch (error) {
      console.error(error);
    }
  };

  // 🔔 Toggle handler
  const toggleSetting = (key) => {
    const value = !settings[key];
    updateSettings({ [key]: value });
  };

  // 🔐 Change password
  const handleChangePassword = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/settings/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordData),
      });

      const data = await res.json();

      if (data.success) {
        alert("Password updated");
        setShowPasswordModal(false);
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 🚪 Logout all devices
  const handleLogoutAll = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  // 🚨 Delete account
  const handleDeleteAccount = async () => {
    if (!window.confirm("Delete account permanently?")) return;

    try {
      const res = await fetch("http://localhost:5000/api/settings", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        alert("Account deleted");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-10 py-10">

      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-bold">Settings</h1>
        <p className="text-gray-400">Manage your account and preferences</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">

        {/* 🔐 Account */}
        <div className="bg-zinc-900 p-6 rounded-xl">
          <h2 className="text-2xl mb-4">🔐 Account</h2>

          <button
            onClick={() => setShowPasswordModal(true)}
            className="w-full p-3 bg-zinc-800 rounded-lg mb-3"
          >
            Change Password
          </button>

          <button className="w-full p-3 bg-zinc-800 rounded-lg mb-3">
            Manage Subscription
          </button>

          <button
            onClick={handleLogoutAll}
            className="w-full p-3 bg-zinc-800 rounded-lg"
          >
            Logout from all devices
          </button>
        </div>

        {/* 🔔 Preferences */}
        <div className="bg-zinc-900 p-6 rounded-xl">
          <h2 className="text-2xl mb-4">🔔 Preferences</h2>

          {["notifications", "autoplay", "darkMode"].map((key) => (
            <div key={key} className="flex justify-between mb-3">
              <span>{key}</span>
              <button
                onClick={() => toggleSetting(key)}
                className={`px-4 py-1 rounded ${
                  settings[key] ? "bg-gold text-black" : "bg-zinc-700"
                }`}
              >
                {settings[key] ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>

        {/* 🚨 Danger */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-red-500/30">
          <h2 className="text-red-400 mb-4">🚨 Danger Zone</h2>

          <button
            onClick={handleDeleteAccount}
            className="w-full p-3 bg-red-600 rounded-lg"
          >
            Delete Account
          </button>
        </div>

      </div>

      {/* 🔐 Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl w-96">
            <h2 className="text-xl mb-4">Change Password</h2>

            <input
              type="password"
              placeholder="Old Password"
              className="w-full mb-3 p-2 bg-black border"
              onChange={(e) =>
                setPasswordData({ ...passwordData, oldPassword: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="New Password"
              className="w-full mb-3 p-2 bg-black border"
              onChange={(e) =>
                setPasswordData({ ...passwordData, newPassword: e.target.value })
              }
            />

            <button
              onClick={handleChangePassword}
              className="bg-gold text-black px-4 py-2 rounded"
            >
              Update
            </button>

            <button
              onClick={() => setShowPasswordModal(false)}
              className="ml-3"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default SettingsPage;