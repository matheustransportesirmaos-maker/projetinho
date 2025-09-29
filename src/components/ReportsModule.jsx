import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { BarChart3, Download, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReportsModule = ({ currentUser }) => {
  const [reportData, setReportData] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  useEffect(() => {
    generateReport();
  }, [dateRange]);

  const generateReport = () => {
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const accountsPayable = JSON.parse(localStorage.getItem('accountsPayable') || '[]');
    const accountsReceivable = JSON.parse(localStorage.getItem('accountsReceivable') || '[]');
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');

    const filterByDate = (items, dateField) => {
      if (!dateRange.start || !dateRange.end) return items;
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return items.filter(item => {
        const itemDate = new Date(item[dateField]);
        return itemDate >= startDate && itemDate <= endDate;
      });
    };

    const filteredInvoices = filterByDate(invoices, 'dueDate');
    const filteredPayable = filterByDate(accountsPayable, 'dueDate');
    const filteredReceivable = filterByDate(accountsReceivable, 'dueDate');
    const filteredNotes = filterByDate(notes, 'dueDate');

    const data = [
      {
        name: 'Faturas',
        Geradas: filteredInvoices.length,
        Pagas: filteredInvoices.filter(i => i.status === 'paid').length,
      },
      {
        name: 'Contas a Pagar',
        Pendentes: filteredPayable.filter(a => a.status === 'pending').length,
        Pagas: filteredPayable.filter(a => a.status === 'paid').length,
      },
      {
        name: 'Contas a Receber',
        Pendentes: filteredReceivable.filter(a => a.status === 'pending').length,
        Recebidas: filteredReceivable.filter(a => a.status === 'received').length,
      },
      {
        name: 'Notas',
        Pendentes: filteredNotes.filter(n => n.status === 'pending').length,
        Entregues: filteredNotes.filter(n => n.status === 'delivered').length,
        Vencidas: filteredNotes.filter(n => n.status === 'expired').length,
      },
    ];

    setReportData(data);
  };

  const exportReport = () => {
    if (reportData.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Gere um relatório primeiro.",
        variant: "destructive"
      });
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Categoria,Status,Quantidade\n";

    reportData.forEach(item => {
      Object.entries(item).forEach(([key, value]) => {
        if (key !== 'name') {
          csvContent += `${item.name},${key},${value}\n`;
        }
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_financeiro.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Relatório exportado!",
      description: "O relatório foi exportado com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios Financeiros</h1>
          <p className="text-gray-300">Análise visual dos seus dados financeiros</p>
        </div>
        
        <Button onClick={exportReport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Filtrar por Período
        </h3>
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <Button onClick={() => setDateRange({ start: '', end: '' })} variant="outline" className="self-end">
            Limpar Filtro
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6"
      >
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Resumo Geral
        </h3>
        
        {reportData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={reportData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Legend wrapperStyle={{ color: '#F9FAFB' }} />
              <Bar dataKey="Geradas" fill="#3b82f6" />
              <Bar dataKey="Pagas" fill="#22c55e" />
              <Bar dataKey="Pendentes" fill="#f59e0b" />
              <Bar dataKey="Recebidas" fill="#14b8a6" />
              <Bar dataKey="Entregues" fill="#8b5cf6" />
              <Bar dataKey="Vencidas" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Nenhum dado para exibir. Tente ajustar o filtro de data.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ReportsModule;