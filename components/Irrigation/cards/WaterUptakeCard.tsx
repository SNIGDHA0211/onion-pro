import React from "react";
import { Activity } from "lucide-react";
import "../Irrigation.css";
import { useAppContext } from "../../../context/AppContext";

interface WaterUptakeCardProps {
  plotsLoading?: boolean;
}

const WaterUptakeCard: React.FC<WaterUptakeCardProps> = ({ plotsLoading }) => {
  const { selectedPlotName } = useAppContext();
  
  if (!selectedPlotName || plotsLoading) {
    return (
      <div className="irrigation-card">
        <div className="card-header">
          <Activity className="card-icon" size={28} />
          <h3 className="font-semibold">Plant Water Uptake</h3>
        </div>
        <div className="card-content card-content-water" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '180px',
          color: '#64748b',
          fontSize: '1rem',
          fontWeight: '500'
        }}>
          {plotsLoading ? 'Loading...' : 'Select a plot'}
        </div>
      </div>
    );
  }
  return (
    <div className="irrigation-card">
      <div className="card-header">
        <Activity className="card-icon" size={28} />
        <h3 className="font-semibold">Plant Water Uptake</h3>
      </div>
      <div className="card-content card-content-water" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '180px',
        color: '#64748b',
        fontSize: '1.5rem',
        fontWeight: '700'
      }}>
        Insufficient Data
      </div>
    </div>
  );
};

export default WaterUptakeCard;
