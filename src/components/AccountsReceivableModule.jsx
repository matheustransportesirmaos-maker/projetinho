import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency } from '@/lib/utils';
import { 
  Plus, 
  Download, 
  Upload, 
  PiggyBank, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  Filter,
  FileDown
} from 'lucide-react';

const AccountsReceivableModule = ({ currentUser }) => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    status: 'pending',
    client: '',
    type: 'manual'
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (filter) {
      setFilteredAccounts(accounts.filter(acc => acc.client && acc.client.toLowerCase().includes(filter.toLowerCase())));
    } else {
      setFilteredAccounts(accounts);
    }
  }, [filter, accounts]);

  const loadAccounts = () => {
    const saved = localStorage.getItem('accountsReceivable');
    if (saved) {
      setAccounts(JSON.parse(saved));
    }
  };

  const saveAccounts = (newAccounts) => {
    localStorage.setItem('accountsReceivable', JSON.stringify(newAccounts));
    setAccounts(newAccounts);
    window.dispatchEvent(new Event('storage'));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const account = {
      id: editingAccount ? editingAccount.id : Date.now(),
      ...formData,
      amount: parseFloat(formData.amount),
      createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let newAccounts;
    if (editingAccount) {
      newAccounts = accounts.map(acc => acc.id === editingAccount.id ? account : acc);
      toast({ title: "Conta atualizada!", description: "A conta foi atualizada com sucesso." });
    } else {
      newAccounts = [...accounts, account];
      toast({ title: "Conta criada!", description: "A conta foi criada com sucesso." });
    }

    saveAccounts(newAccounts);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ description: '', amount: '', dueDate: '', status: 'pending', client: '', type: 'manual' });
    setShowForm(false);
    setEditingAccount(null);
  };

  const handleEdit = (account) => {
    if (account.type === 'invoice') {
      toast({ title: "Conta vinculada à fatura", description: "Edite a fatura para alterar os dados.", variant: "destructive" });
      return;
    }
    setEditingAccount(account);
    setFormData(account);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const account = accounts.find(acc => acc.id === id);
    if (account && account.type === 'invoice') {
      toast({ title: "Não é possível excluir", description: "Esta conta está vinculada a uma fatura.", variant: "destructive" });
      return;
    }
    const newAccounts = accounts.filter(acc => acc.id !== id);
    saveAccounts(newAccounts);
    toast({ title: "Conta excluída!", description: "A conta foi excluída com sucesso." });
  };

  const toggleStatus = (id) => {
    const newAccounts = accounts.map(acc => {
      if (acc.id === id) {
        const newStatus = acc.status === 'received' ? 'pending' : 'received';
        if (acc.type === 'invoice' && acc.invoiceId) {
          const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
          const updatedInvoices = invoices.map(inv => 
            inv.id === acc.invoiceId ? { ...inv, status: newStatus === 'received' ? 'paid' : 'pending' } : inv
          );
          localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
        }
        return { ...acc, status: newStatus };
      }
      return acc;
    });
    saveAccounts(newAccounts);
    toast({ title: "Status atualizado!", description: "O status da conta foi atualizado." });
  };

  const downloadTemplate = () => {
    const headers = ["Descrição", "Valor", "Data de Vencimento", "Status", "Cliente", "Tipo"];
    const example = ["Serviço de Consultoria", 1500.00, "2025-12-31", "pending", "Cliente ABC", "manual"];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_contas_receber.xlsx");

    toast({ title: "Modelo baixado!", description: "O modelo de contas a receber foi baixado com sucesso." });
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length <= 1) {
          toast({ title: "Arquivo vazio ou inválido", variant: "destructive" });
          return;
        }

        const headers = json[0];
        const headerMap = {
          "Descrição": "description",
          "Valor": "amount",
          "Data de Vencimento": "dueDate",
          "Status": "status",
          "Cliente": "client",
          "Tipo": "type"
        };

        let currentAccounts = [...accounts];
        let newCount = 0;
        let updatedCount = 0;

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          let accountData = {};
          headers.forEach((header, index) => {
            const field = headerMap[header];
            if (field) {
              let value = row[index];
              if (field === 'dueDate' && typeof value === 'number') {
                value = new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString().split('T')[0];
              }
              accountData[field] = value;
            }
          });

          if (!accountData.description) continue;

          const existingIndex = currentAccounts.findIndex(acc => acc.description === accountData.description && acc.client === accountData.client);

          if (existingIndex >= 0) {
            currentAccounts[existingIndex] = { ...currentAccounts[existingIndex], ...accountData, updatedAt: new Date().toISOString() };
            updatedCount++;
          } else {
            currentAccounts.push({ ...accountData, id: Date.now() + i, createdAt: new Date().toISOString() });
            newCount++;
          }
        }
        saveAccounts(currentAccounts);
        toast({ title: "Importação concluída!", description: `${newCount} contas novas adicionadas e ${updatedCount} contas atualizadas.` });
      } catch (error) {
        console.error("Import Error:", error);
        toast({ title: "Erro na importação", description: "Verifique o formato do arquivo e os cabeçalhos das colunas.", variant: "destructive" });
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportData = (format) => {
    if (filteredAccounts.length === 0) {
      toast({ title: "Nenhuma conta para exportar", variant: "destructive" });
      return;
    }

    const headers = ["Descrição", "Valor", "Data de Vencimento", "Status", "Cliente", "Tipo", "Data de Criação"];
    const dataToExport = filteredAccounts.map(acc => [
      acc.description,
      acc.amount,
      new Date(acc.dueDate).toLocaleDateString('pt-BR'),
      acc.status,
      acc.client,
      acc.type,
      new Date(acc.createdAt).toLocaleDateString('pt-BR')
    ]);

    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
      ws['B1'].z = 'R$ #,##0.00';
      filteredAccounts.forEach((acc, index) => {
          ws[`B${index + 2}`].z = 'R$ #,##0.00';
      });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contas a Receber");
      XLSX.writeFile(wb, `contas_a_receber.xlsx`);
      toast({ title: `Contas exportadas em XLSX!` });
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.text("Relatório de Contas a Receber", 14, 16);
      doc.autoTable({
        head: [headers],
        body: dataToExport.map(row => {
          row[1] = formatCurrency(row[1]);
          return row;
        }),
        startY: 20,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
      doc.save('contas_a_receber.pdf');
      toast({ title: "Contas exportadas em PDF!" });
    }
  };

  const totalPending = filteredAccounts.filter(acc => acc.status === 'pending').reduce((sum, acc) => sum + acc.amount, 0);
  const totalReceived = filteredAccounts.filter(acc => acc.status === 'received').reduce((sum, acc) => sum + acc.amount, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Contas a Receber</h1>
          <p className="text-gray-300">Gerencie seus recebimentos e faturas</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={downloadTemplate} variant="outline"><Download className="w-4 h-4 mr-2" />Baixar Modelo</Button>
          <Button asChild variant="outline" className="cursor-pointer"><label htmlFor="import-accounts-receivable"><Upload className="w-4 h-4 mr-2" />Importar</label></Button>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImport} className="hidden" id="import-accounts-receivable" />
          <Button onClick={() => exportData('xlsx')} variant="outline"><FileDown className="w-4 h-4 mr-2" />Exportar XLSX</Button>
          <Button onClick={() => exportData('pdf')} variant="outline"><FileDown className="w-4 h-4 mr-2" />Exportar PDF</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Nova Conta</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-yellow-500/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between"><p className="text-yellow-400 text-sm font-medium">Total Pendente</p><p className="text-2xl font-bold text-white">{formatCurrency(totalPending)}</p><Clock className="w-8 h-8 text-yellow-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-green-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between"><p className="text-green-400 text-sm font-medium">Total Recebido</p><p className="text-2xl font-bold text-white">{formatCurrency(totalReceived)}</p><CheckCircle className="w-8 h-8 text-green-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-blue-500/20 backdrop-blur-lg rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between"><p className="text-blue-400 text-sm font-medium">Total Geral</p><p className="text-2xl font-bold text-white">{formatCurrency(totalPending + totalReceived)}</p><PiggyBank className="w-8 h-8 text-blue-400" /></div>
        </motion.div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">{editingAccount ? 'Editar Conta' : 'Nova Conta a Receber'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Descrição</label><input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Valor</label><input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Data de Vencimento</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Cliente</label><input type="text" value={formData.client} onChange={(e) => setFormData({...formData, client: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div className="md:col-span-2 flex space-x-3"><Button type="submit">{editingAccount ? 'Atualizar' : 'Criar'} Conta</Button><Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button></div>
          </form>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-white">Lista de Contas a Receber</h3>
            <div className="relative"><Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" /><input type="text" placeholder="Filtrar por cliente..." value={filter} onChange={(e) => setFilter(e.target.value)} className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
          </div>
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12"><PiggyBank className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-400">Nenhuma conta encontrada</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/20"><th className="text-left text-gray-300 font-medium py-3">Descrição</th><th className="text-left text-gray-300 font-medium py-3">Valor</th><th className="text-left text-gray-300 font-medium py-3">Vencimento</th><th className="text-left text-gray-300 font-medium py-3">Cliente</th><th className="text-left text-gray-300 font-medium py-3">Tipo</th><th className="text-left text-gray-300 font-medium py-3">Status</th><th className="text-left text-gray-300 font-medium py-3">Ações</th></tr></thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 text-white">{account.description}</td>
                      <td className="py-3 text-white">{formatCurrency(account.amount)}</td>
                      <td className="py-3 text-white">{new Date(account.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3 text-white">{account.client || '-'}</td>
                      <td className="py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${account.type === 'invoice' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{account.type === 'invoice' ? 'Fatura' : 'Manual'}</span></td>
                      <td className="py-3"><button onClick={() => toggleStatus(account.id)} className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${account.status === 'received' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{account.status === 'received' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}<span>{account.status === 'received' ? 'Recebido' : 'Pendente'}</span></button></td>
                      <td className="py-3"><div className="flex space-x-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(account)}><Edit className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(account.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AccountsReceivableModule;