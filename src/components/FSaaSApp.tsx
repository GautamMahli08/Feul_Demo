import React, { useState } from 'react';
import { UserRole } from '@/types/truck';
import LoginScreen from './LoginScreen';
import ManagerDashboard from './dashboards/ManagerDashboard';
import ClientDashboard from './dashboards/ClientDashboard';
import OperatorDashboard from './dashboards/OperatorDashboard';
import DriverDashboard from './dashboards/DriverDashboard';
import { useTruckSimulation } from '@/hooks/useTruckSimulation';

const FSaaSApp = () => {
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; name: string } | null>(null);
  const { trucks, alerts, totalSavings, fuelConsumptionData, fuelLossHistory, acknowledgeAlert, assignTrip } = useTruckSimulation();

  const handleLogin = (role: UserRole, name: string) => {
    setCurrentUser({ role, name });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const dashboardProps = {
    trucks,
    alerts,
    totalSavings,
    fuelConsumptionData,
    fuelLossHistory,
    acknowledgeAlert,
    assignTrip,
    currentUser,
    onLogout: handleLogout,
  };

  switch (currentUser.role) {
    case 'manager':
      return <ManagerDashboard {...dashboardProps} />;
    case 'client':
      return <ClientDashboard {...dashboardProps} />;
    case 'operator':
      return <OperatorDashboard {...dashboardProps} />;
    case 'driver':
      return <DriverDashboard {...dashboardProps} />;
    default:
      return <LoginScreen onLogin={handleLogin} />;
  }
};

export default FSaaSApp;