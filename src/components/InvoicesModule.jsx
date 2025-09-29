import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { formatCurrency } from '@/lib/utils';
import { 
  Plus, 
  Download, 
  Upload, 
  FileText, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock
} from 'lucide-react';

const InvoicesModule = ({ currentUser }) => {
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [formData, setFormData] = useState({
    number: '',
    client: '',
    amount: '',
    dueDate: '',
    status: 'pending',
    description: ''
  });

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = () => {
    const saved = localStorage.getItem('invoices');
    if (saved) {
      setInvoices(JSON.parse(saved));
    }
  };

  const saveInvoices = (newInvoices) => {
    localStorage.setItem('invoices', JSON.stringify(newInvoices));
    setInvoices(newInvoices);
    updateAccountsReceivable(newInvoices);
    window.dispatchEvent(new Event('storage'));
  };

  const updateAccountsReceivable = (invoicesList) => {
    let accountsReceivable = JSON.parse(localStorage.getItem('accountsReceivable') || '[]');
    const invoiceIds = new Set(invoicesList.map(inv => inv.id));

    accountsReceivable = accountsReceivable.filter(acc => acc.type !== 'invoice' || invoiceIds.has(acc.invoiceId));

    invoicesList.forEach(invoice => {
      const existingIndex = accountsReceivable.findIndex(acc => acc.invoiceId === invoice.id);
      const receivableItem = {
        id: existingIndex >= 0 ? accountsReceivable[existingIndex].id : Date.now() + Math.random(),
        invoiceId: invoice.id,
        description: `Fatura ${invoice.number} - ${invoice.client}`,
        amount: parseFloat(invoice.amount),
        dueDate: invoice.dueDate,
        status: invoice.status === 'paid' ? 'received' : 'pending',
        client: invoice.client,
        type: 'invoice',
        createdAt: existingIndex >= 0 ? accountsReceivable[existingIndex].createdAt : new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        accountsReceivable[existingIndex] = receivableItem;
      } else {
        accountsReceivable.push(receivableItem);
      }
    });
    
    localStorage.setItem('accountsReceivable', JSON.stringify(accountsReceivable));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const invoice = {
      id: editingInvoice ? editingInvoice.id : Date.now(),
      ...formData,
      amount: parseFloat(formData.amount),
      createdAt: editingInvoice ? editingInvoice.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let newInvoices;
    if (editingInvoice) {
      newInvoices = invoices.map(inv => inv.id === editingInvoice.id ? invoice : inv);
      toast({ title: "Fatura atualizada!", description: "A fatura foi atualizada com sucesso." });
    } else {
      newInvoices = [...invoices, invoice];
      toast({ title: "Fatura criada!", description: "A fatura foi criada com sucesso." });
    }

    saveInvoices(newInvoices);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ number: '', client: '', amount: '', dueDate: '', status: 'pending', description: '' });
    setShowForm(false);
    setEditingInvoice(null);
  };

  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    setFormData(invoice);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const newInvoices = invoices.filter(inv => inv.id !== id);
    saveInvoices(newInvoices);
    toast({ title: "Fatura excluída!", description: "A fatura foi excluída com sucesso." });
  };

  const toggleStatus = (id) => {
    const newInvoices = invoices.map(inv => 
      inv.id === id ? { ...inv, status: inv.status === 'paid' ? 'pending' : 'paid' } : inv
    );
    saveInvoices(newInvoices);
    toast({ title: "Status atualizado!", description: "O status da fatura foi atualizado." });
  };

  const downloadTemplate = () => {
    const headers = ["Número da Fatura", "Cliente", "Valor", "Data de Vencimento", "Status", "Descrição"];
    const example = ["FAT001", "Cliente Exemplo", 1500.00, "2025-12-31", "pending", "Descrição da fatura"];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_faturas.xlsx");

    toast({ title: "Modelo baixado!", description: "O modelo de faturas foi baixado com sucesso." });
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
          "Número da Fatura": "number",
          "Cliente": "client",
          "Valor": "amount",
          "Data de Vencimento": "dueDate",
          "Status": "status",
          "Descrição": "description"
        };

        let currentInvoices = [...invoices];
        let newCount = 0;
        let updatedCount = 0;

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          let invoiceData = {};
          headers.forEach((header, index) => {
            const field = headerMap[header];
            if (field) {
              let value = row[index];
              if (field === 'dueDate' && typeof value === 'number') {
                value = new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString().split('T')[0];
              }
              invoiceData[field] = value;
            }
          });

          if (!invoiceData.number) continue;

          const existingIndex = currentInvoices.findIndex(inv => inv.number === invoiceData.number);

          if (existingIndex >= 0) {
            currentInvoices[existingIndex] = { ...currentInvoices[existingIndex], ...invoiceData, updatedAt: new Date().toISOString() };
            updatedCount++;
          } else {
            currentInvoices.push({ ...invoiceData, id: Date.now() + i, createdAt: new Date().toISOString() });
            newCount++;
          }
        }
        saveInvoices(currentInvoices);
        toast({ title: "Importação concluída!", description: `${newCount} faturas novas adicionadas e ${updatedCount} faturas atualizadas.` });
      } catch (error) {
        console.error("Import Error:", error);
        toast({ title: "Erro na importação", description: "Verifique o formato do arquivo e os cabeçalhos das colunas.", variant: "destructive" });
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportInvoices = () => {
    if (invoices.length === 0) {
      toast({ title: "Nenhuma fatura para exportar", variant: "destructive" });
      return;
    }

    const headers = ["Número da Fatura", "Cliente", "Valor", "Data de Vencimento", "Status", "Descrição", "Data de Criação"];
    const dataToExport = invoices.map(inv => [
      inv.number,
      inv.client,
      inv.amount,
      new Date(inv.dueDate).toLocaleDateString('pt-BR'),
      inv.status,
      inv.description,
      new Date(inv.createdAt).toLocaleDateString('pt-BR')
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    ws['C1'].z = 'R$ #,##0.00';
    invoices.forEach((inv, index) => {
        ws[`C${index + 2}`].z = 'R$ #,##0.00';
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Faturas");
    XLSX.writeFile(wb, "faturas_exportadas.xlsx");

    toast({ title: "Faturas exportadas!", description: "As faturas foram exportadas com sucesso." });
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Gestão de Faturas</h1>
          <p className="text-gray-300">Gerencie suas faturas e controle de pagamentos</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={downloadTemplate} variant="outline"><Download className="w-4 h-4 mr-2" />Baixar Modelo</Button>
          <Button asChild variant="outline" className="cursor-pointer"><label htmlFor="import-invoices"><Upload className="w-4 h-4 mr-2" />Importar</label></Button>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImport} className="hidden" id="import-invoices" />
          <Button onClick={exportInvoices} variant="outline"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Nova Fatura</Button>
        </div>
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">{editingInvoice ? 'Editar Fatura' : 'Nova Fatura'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Número da Fatura</label><input type="text" value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Cliente</label><input type="text" value={formData.client} onChange={(e) => setFormData({...formData, client: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Valor</label><input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Data de Vencimento</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-2">Descrição</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" /></div>
            <div className="md:col-span-2 flex space-x-3"><Button type="submit">{editingInvoice ? 'Atualizar' : 'Criar'} Fatura</Button><Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button></div>
          </form>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Lista de Faturas</h3>
          {invoices.length === 0 ? (
            <div className="text-center py-12"><FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-400">Nenhuma fatura cadastrada</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/20"><th className="text-left text-gray-300 font-medium py-3">Número</th><th className="text-left text-gray-300 font-medium py-3">Cliente</th><th className="text-left text-gray-300 font-medium py-3">Valor</th><th className="text-left text-gray-300 font-medium py-3">Vencimento</th><th className="text-left text-gray-300 font-medium py-3">Status</th><th className="text-left text-gray-300 font-medium py-3">Ações</th></tr></thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 text-white">{invoice.number}</td>
                      <td className="py-3 text-white">{invoice.client}</td>
                      <td className="py-3 text-white">{formatCurrency(invoice.amount)}</td>
                      <td className="py-3 text-white">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3"><button onClick={() => toggleStatus(invoice.id)} className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${invoice.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{invoice.status === 'paid' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}<span>{invoice.status === 'paid' ? 'Pago' : 'Pendente'}</span></button></td>
                      <td className="py-3"><div className="flex space-x-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(invoice)}><Edit className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(invoice.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button></div></td>
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

export default InvoicesModule;