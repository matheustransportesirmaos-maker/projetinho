import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ClipboardList, 
  CreditCard, 
  PiggyBank, 
  BarChart3, 
  Truck,
  LogOut,
  Home
} from 'lucide-react';

const Sidebar = ({ activeModule, setActiveModule, currentUser, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Página Inicial', icon: Home },
    { id: 'invoices', label: 'Faturas', icon: FileText },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'notes', label: 'Notas Entregues', icon: ClipboardList },
    { id: 'accounts-payable', label: 'Contas a Pagar', icon: CreditCard },
    { id: 'accounts-receivable', label: 'Contas a Receber', icon: PiggyBank },
    { id: 'driver-payments', label: 'Pagamentos Motorista', icon: Truck },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  return (
    <motion.div
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      className="w-64 bg-white/10 backdrop-blur-lg border-r border-white/20 flex flex-col"
    >
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Sistema Financeiro</h2>
            <p className="text-gray-300 text-sm">{currentUser?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/20">
        <motion.button
          onClick={onLogout}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair do Sistema</span>
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Sidebar;