import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  CheckCircle, 
  Users, 
  ClipboardList, 
  CreditCard, 
  PiggyBank,
  TrendingUp,
  AlertTriangle,
  TrendingDown
} from 'lucide-react';
import DashboardCard from '@/components/DashboardCard';
import FinancialChart from '@/components/FinancialChart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '@/lib/utils';


const MainDashboard = ({ currentUser }) => {
  const [dashboardData, setDashboardData] = useState({
    totalInvoices: 0,
    paidInvoices: 0,
    totalUsers: 0,
    deliveredNotes: 0,
    accountsPayable: 0,
    accountsReceivable: 0,
    clients: [],
    performanceData: [],
    clientPerformance: []
  });

  useEffect(() => {
    const handleStorageChange = () => {
      loadDashboardData();
    };

    loadDashboardData();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadDashboardData = () => {
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const accountsPayable = JSON.parse(localStorage.getItem('accountsPayable') || '[]');
    const accountsReceivable = JSON.parse(localStorage.getItem('accountsReceivable') || '[]');

    const clientStats = {};
    invoices.forEach(invoice => {
      if (!clientStats[invoice.client]) {
        clientStats[invoice.client] = { total: 0, paid: 0, pending: 0 };
      }
      clientStats[invoice.client].total++;
      if (invoice.status === 'paid') {
        clientStats[invoice.client].paid++;
      } else {
        clientStats[invoice.client].pending++;
      }
    });

    const clients = Object.entries(clientStats).map(([name, stats]) => ({
      name,
      ...stats
    }));

    let onTime = 0;
    let late = 0;
    const clientPerf = {};

    notes.forEach(note => {
      const clientName = note.shipper || 'Desconhecido';
      if (!clientPerf[clientName]) {
        clientPerf[clientName] = { onTime: 0, late: 0 };
      }

      if (note.deliveryDate && note.dueDate) {
        if (new Date(note.deliveryDate) <= new Date(note.dueDate)) {
          onTime++;
          clientPerf[clientName].onTime++;
        } else {
          late++;
          clientPerf[clientName].late++;
        }
      }
    });

    const performanceData = [
      { name: 'No Prazo', value: onTime, color: '#22c55e' },
      { name: 'Atrasado', value: late, color: '#ef4444' },
    ];

    const clientPerformance = Object.entries(clientPerf).map(([name, data]) => ({
      name,
      onTime: data.onTime,
      late: data.late,
      total: data.onTime + data.late,
      performance: (data.onTime + data.late > 0) ? (data.onTime / (data.onTime + data.late)) * 100 : 0
    }));

    setDashboardData({
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(inv => inv.status === 'paid').length,
      totalUsers: users.length,
      deliveredNotes: notes.filter(note => note.status === 'delivered' || note.status === 'onTime').length,
      accountsPayable: accountsPayable.filter(acc => acc.status === 'pending').reduce((sum, acc) => sum + acc.amount, 0),
      accountsReceivable: accountsReceivable.filter(acc => acc.status === 'pending').reduce((sum, acc) => sum + acc.amount, 0),
      clients,
      performanceData,
      clientPerformance
    });
  };

  const cards = [
    { title: 'Total de Faturas', value: dashboardData.totalInvoices, icon: FileText, color: 'from-blue-500 to-blue-600', description: 'Faturas geradas' },
    { title: 'Faturas Pagas', value: dashboardData.paidInvoices, icon: CheckCircle, color: 'from-green-500 to-green-600', description: 'Faturas quitadas' },
    { title: 'Usuários', value: dashboardData.totalUsers, icon: Users, color: 'from-purple-500 to-purple-600', description: 'Usuários cadastrados' },
    { title: 'Notas Entregues', value: dashboardData.deliveredNotes, icon: ClipboardList, color: 'from-indigo-500 to-indigo-600', description: 'Notas processadas' },
    { title: 'Contas a Pagar', value: formatCurrency(dashboardData.accountsPayable), icon: CreditCard, color: 'from-red-500 to-red-600', description: 'Pendentes' },
    { title: 'Contas a Receber', value: formatCurrency(dashboardData.accountsReceivable), icon: PiggyBank, color: 'from-yellow-500 to-yellow-600', description: 'Pendentes' }
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard Financeiro</h1>
        <p className="text-gray-300">Visão geral do sistema de gestão financeira</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
            <DashboardCard {...card} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.6 }} className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Faturas: Geradas vs Pagas
          </h3>
          <FinancialChart data={[
              { name: 'Geradas', value: dashboardData.totalInvoices },
              { name: 'Pagas', value: dashboardData.paidInvoices },
              { name: 'Pendentes', value: dashboardData.totalInvoices - dashboardData.paidInvoices }
            ]}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.7 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <TrendingDown className="w-5 h-5 mr-2" />
            Performance Geral de Entrega
          </h3>
          {dashboardData.performanceData.reduce((a, b) => a + b.value, 0) > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={dashboardData.performanceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {dashboardData.performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }} />
                <Legend wrapperStyle={{ color: '#F9FAFB', fontSize: '14px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-gray-400 py-8">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>Nenhuma nota com data de entrega para análise.</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Relação de Clientes (Faturamento)
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dashboardData.clients.length > 0 ? (
              dashboardData.clients.map((client, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium">{client.name}</span>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-green-400">Pagas: {client.paid}</span>
                      <span className="text-yellow-400">Pendentes: {client.pending}</span>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full" style={{ width: `${client.total > 0 ? (client.paid / client.total) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p>Nenhum cliente encontrado</p>
              </div>
            )}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Performance de Entrega por Cliente
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {dashboardData.clientPerformance.length > 0 ? (
              dashboardData.clientPerformance.map((client, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium">{client.name}</span>
                    <span className={`font-bold ${client.performance >= 80 ? 'text-green-400' : client.performance >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {client.performance.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>Total: {client.total}</span>
                    <div className="flex space-x-2">
                      <span className="text-green-400">No Prazo: {client.onTime}</span>
                      <span className="text-red-400">Atrasado: {client.late}</span>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-700 rounded-full h-2">
                    <div className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" style={{ width: `${client.performance}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p>Nenhuma nota para análise de performance.</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MainDashboard;