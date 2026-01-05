
import React, { useState } from 'react';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Credentials as requested: Adminonion / onionfarm
    if (username === 'Adminonion' && password === 'onionfarm') {
      onLogin();
    } else {
      setError('Invalid credentials. Please use Adminonion / onionfarm');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0">
        <img
          src="/3.jpg"
          alt="Red Onion Background"
          className="w-full h-full object-cover brightness-[0.7]"
        />
        {/* Subtle overlay to help card pop */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Login Card */}
      <div className="relative z-10 w-[90%] max-w-[440px] p-10 bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center">
        <div className="mb-8 flex flex-col items-center">
          <img
            src="/CROPEYE Updated.png"
            alt="CropEye Logo"
            className="max-w-[280px] w-full h-auto mb-4"
          />
          <p className="text-gray-400 text-sm font-medium">
            Sustainable Onion Management System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl text-center font-medium">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-gray-400 text-sm font-bold ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 bg-white border-2 border-[#00a676] rounded-2xl text-gray-700 focus:outline-none focus:ring-4 focus:ring-[#00a676]/10 transition-all font-medium"
              placeholder="Adminonion"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-gray-400 text-sm font-bold ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-gray-700 focus:outline-none focus:border-[#00a676] focus:border-2 transition-all font-medium"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-4 bg-[#00a676] hover:bg-[#008f65] text-white font-bold text-lg rounded-2xl shadow-[0_10px_20px_rgba(0,166,118,0.3)] transform transition-all active:scale-[0.98]"
          >
            Login to PlanetEyeFarm
          </button>
        </form>

        <div className="mt-10 text-gray-400 text-xs font-bold tracking-tight">
          Powered by IT AI Solutions
        </div>
      </div>
    </div>
  );
};

export default Login;
