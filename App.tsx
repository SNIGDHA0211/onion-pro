
import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import Login from './components/Login';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import Irrigation from './components/Irrigation/Irrigation';

type Page = 'home' | 'irrigation';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('home');

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <AppProvider>
      <div className="min-h-screen bg-slate-50">
        <Header 
          onLogout={() => setIsLoggedIn(false)} 
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
        <div className="w-full">
          {currentPage === 'home' ? <Dashboard /> : <Irrigation />}
        </div>
      </div>
    </AppProvider>
  );
};

export default App;
