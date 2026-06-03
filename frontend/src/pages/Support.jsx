import React, { useState } from "react";
import Footer from "../components/Footer";

const Support = () => {
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const faqs = [
    "How to reset password?",
    "Why is video buffering?",
    "How to cancel subscription?",
    "Payment failed, what to do?",
    "How to change video quality?",
    "How to download movies?",
    "How to enable subtitles?",
    "Why app is not opening?",
    "How to upgrade plan?",
    "How to contact support?",
    "Audio not working issue",
    "Login problem",
    "Subscription not activated",
  ];

  // 🔥 Filter + limit
  const filteredFaqs = faqs.filter((faq) =>
    faq.toLowerCase().includes(search.toLowerCase())
  );

  const visibleFaqs = search ? filteredFaqs : faqs.slice(0, 10);

  // 🔥 Send message to backend
  const sendMessage = async (msg) => {
    try {
      setLoading(true);

      const res = await fetch("window.API_BASE_URL/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: msg || message,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("Message sent ✅");
        setMessage("");
      } else {
        alert("Failed to send message");
      }
    } catch (error) {
      console.error(error);
      alert("Error sending message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black px-10 py-10 text-white">

      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">Support</h1>
        <p className="text-gray-400 text-lg">
          How can we help you today?
        </p>
      </div>

      {/* 🔍 Search */}
      <div className="max-w-2xl mx-auto mb-10">
        <input
          type="text"
          placeholder="🔍 Search your issue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-4 rounded-xl bg-zinc-900 border border-zinc-700 focus:outline-none focus:border-gold text-white"
        />
      </div>

      {/* ❓ FAQ */}
      <div className="max-w-4xl mx-auto mb-14">
        <h2 className="text-2xl font-semibold mb-6">❓ FAQ</h2>

        <div className="grid gap-4">
          {visibleFaqs.map((faq, index) => (
            <div
              key={index}
              className="p-4 bg-zinc-900 rounded-xl border border-zinc-700 hover:border-gold transition cursor-pointer"
              onClick={() => setMessage(faq)}
            >
              {faq}
            </div>
          ))}
        </div>

        {visibleFaqs.length === 0 && (
          <p className="text-gray-500 mt-4 text-center">
            No results found
          </p>
        )}
      </div>

      {/* ⚡ Quick Message */}
      <div className="max-w-4xl mx-auto mb-14">
        <h2 className="text-2xl font-semibold mb-6">⚡ Quick Help</h2>

        <div className="flex flex-wrap gap-3">
          {[
            "Video not working",
            "Payment issue",
            "Login problem",
            "Subscription issue",
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => sendMessage(item)}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-gold hover:text-gold transition"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* 💬 Direct Message */}
      <div className="max-w-3xl mx-auto mb-14">
        <h2 className="text-2xl font-semibold mb-6">💬 Direct Message</h2>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-700">
          <textarea
            rows="4"
            placeholder="Write your issue here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-4 rounded-lg bg-black border border-zinc-700 focus:outline-none focus:border-gold text-white mb-4"
          />

          <button
            onClick={() => sendMessage()}
            disabled={loading}
            className="px-6 py-2 bg-gold text-black font-semibold rounded-lg hover:bg-yellow-400 transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>

      {/* 📧 Email */}
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">📧 Email Support</h2>
        <p className="text-gray-400 mb-2">
          You can also contact us via email:
        </p>

        <a
          href="mailto:orgsuperb@gmail.com"
          className="text-gold text-lg font-semibold hover:underline"
        >
          orgsuperb@gmail.com
        </a>
      </div>
      <Footer />
    </div>
  );
};

export default Support;