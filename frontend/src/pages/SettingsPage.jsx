import { Link } from "react-router-dom";

const SettingsPage = () => {
  return (
    <div className="min-h-screen p-10">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-6">Settings</h1>
          <p className="text-2xl text-gold mb-4">Coming Soon</p>
          <p className="text-gray-400 text-lg max-w-2xl">
            This feature will be developed in the next phase. Customize your experience!
          </p>
        </div>
        <Link to="/about" className="mt-6 text-gold hover:text-white">
          About
        </Link>
      </div>
    </div>
  );
};

export default SettingsPage;
