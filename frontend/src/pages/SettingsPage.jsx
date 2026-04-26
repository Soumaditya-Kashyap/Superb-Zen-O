import React, { useState } from "react";
import Footer from "../components/Footer";

const SettingsPage = () => {
  const [notifications, setNotifications] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="min-h-screen bg-black text-white px-10 py-10">
      
     <div className="mb-10 flex flex-col items-center justify-center text-center gap-2">
  <h1 className="text-5xl font-bold">Settings</h1>
  <p className="text-gray-400">Manage your account and preferences</p>
</div>

      {/* Container */}
      <div className="max-w-4xl mx-auto space-y-8">

        {/* 🔐 Account Settings */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">🔐 Account</h2>

          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
              Change Password
            </button>

            <button className="w-full text-left p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
              Manage Subscription
            </button>

            <button className="w-full text-left p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
              Logout from all devices
            </button>
          </div>
        </div>

        {/* 🔔 Preferences */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">🔔 Preferences</h2>

          <div className="space-y-4">

            {/* Notifications */}
            <div className="flex justify-between items-center">
              <span>Enable Notifications</span>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`px-4 py-1 rounded-full ${
                  notifications ? "bg-gold text-black" : "bg-zinc-700"
                }`}
              >
                {notifications ? "ON" : "OFF"}
              </button>
            </div>

            {/* Autoplay */}
            <div className="flex justify-between items-center">
              <span>Autoplay Next Episode</span>
              <button
                onClick={() => setAutoplay(!autoplay)}
                className={`px-4 py-1 rounded-full ${
                  autoplay ? "bg-gold text-black" : "bg-zinc-700"
                }`}
              >
                {autoplay ? "ON" : "OFF"}
              </button>
            </div>

            {/* Dark Mode */}
            <div className="flex justify-between items-center">
              <span>Dark Mode</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`px-4 py-1 rounded-full ${
                  darkMode ? "bg-gold text-black" : "bg-zinc-700"
                }`}
              >
                {darkMode ? "ON" : "OFF"}
              </button>
            </div>

          </div>
        </div>

        {/* 🎥 Playback */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
          <h2 className="text-2xl font-semibold mb-4">🎥 Playback</h2>

          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
              Video Quality (Auto / HD / 4K)
            </button>

            <button className="w-full text-left p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
              Subtitle Settings
            </button>

            <button className="w-full text-left p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition">
              Audio Language
            </button>
          </div>
        </div>

        {/* 🚨 Danger Zone */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-red-500/30">
          <h2 className="text-2xl font-semibold mb-4 text-red-400">🚨 Danger Zone</h2>

          <button className="w-full p-3 bg-red-600 rounded-lg hover:bg-red-700 transition">
            Delete Account
          </button>
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default SettingsPage;