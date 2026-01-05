
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppState } from '../types';

interface AppContextType {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  selectedPlotName: string;
  setSelectedPlotName: (name: string) => void;
  getCached: (key: string) => any;
  setCached: (key: string, data: any) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [appState, setAppState] = useState<AppState>({
    weatherChartData: [],
    weatherSelectedDay: null,
    selectedPlot: '369_12',
  });
  const [selectedPlotName, setSelectedPlotName] = useState('369_12');

  const cache = new Map<string, any>();

  const getCached = (key: string) => cache.get(key);
  const setCached = (key: string, data: any) => cache.set(key, data);

  return (
    <AppContext.Provider value={{ 
      appState, 
      setAppState, 
      selectedPlotName, 
      setSelectedPlotName,
      getCached,
      setCached
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
