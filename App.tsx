
import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-50">
        <Header onLogout={() => setIsLoggedIn(false)} />
        <div className="w-full">
          <Dashboard />
        </div>
      </div>
    </AppProvider>
  );
};

export default App;
