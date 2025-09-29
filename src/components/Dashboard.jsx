import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MainDashboard from '@/components/MainDashboard';
import InvoicesModule from '@/components/InvoicesModule';
import UsersModule from '@/components/UsersModule';
import NotesModule from '@/components/NotesModule';
import AccountsPayableModule from '@/components/AccountsPayableModule';
import AccountsReceivableModule from '@/components/AccountsReceivableModule';
import ReportsModule from '@/components/ReportsModule';
import DriverPaymentsModule from '@/components/DriverPaymentsModule';

const Dashboard = ({ currentUser, onLogout }) => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [companyInfo, setCompanyInfo] = useState(() => {
    const saved = localStorage.getItem('companyInfo');
    return saved ? JSON.parse(saved) : {
      name: 'Minha Empresa',
      logo: null
    };
  });

  const updateCompanyInfo = (newInfo) => {
    setCompanyInfo(newInfo);
    localStorage.setItem('companyInfo', JSON.stringify(newInfo));
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <MainDashboard currentUser={currentUser} />;
      case 'invoices':
        return <InvoicesModule currentUser={currentUser} />;
      case 'users':
        return <UsersModule currentUser={currentUser} />;
      case 'notes':
        return <NotesModule currentUser={currentUser} />;
      case 'accounts-payable':
        return <AccountsPayableModule currentUser={currentUser} />;
      case 'accounts-receivable':
        return <AccountsReceivableModule currentUser={currentUser} />;
      case 'reports':
        return <ReportsModule currentUser={currentUser} />;
      case 'driver-payments':
        return <DriverPaymentsModule currentUser={currentUser} />;
      default:
        return <MainDashboard currentUser={currentUser} />;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <Sidebar 
        activeModule={activeModule} 
        setActiveModule={setActiveModule}
        currentUser={currentUser}
        onLogout={onLogout}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          companyInfo={companyInfo}
          updateCompanyInfo={updateCompanyInfo}
          currentUser={currentUser}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={activeModule}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderActiveModule()}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;