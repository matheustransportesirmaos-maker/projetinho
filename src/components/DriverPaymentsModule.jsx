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
  Truck, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';

const DriverPaymentsModule = ({ currentUser }) => {
  const [payments, setPayments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showPdfForm, setShowPdfForm] = useState(false);
  const [pdfFormData, setPdfFormData] = useState({ driverName: '', startDate: '', endDate: '' });
  const [formData, setFormData] = useState({
    invoice: '',
    departureDate: '',
    driverName: '',
    agreedAmount: '',
    status: 'pending',
    bankAccount: '',
    description: ''
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = () => {
    const saved = localStorage.getItem('driverPayments');
    if (saved) {
      setPayments(JSON.parse(saved));
    }
  };

  const savePayments = (newPayments) => {
    localStorage.setItem('driverPayments', JSON.stringify(newPayments));
    setPayments(newPayments);
    updateAccountsPayable(newPayments);
    window.dispatchEvent(new Event('storage'));
  };

  const updateAccountsPayable = (paymentsList) => {
    let accountsPayable = JSON.parse(localStorage.getItem('accountsPayable') || '[]');
    const paymentIds = new Set(paymentsList.map(p => p.id));

    accountsPayable = accountsPayable.filter(acc => acc.category !== 'Motoristas' || paymentIds.has(acc.driverPaymentId));

    paymentsList.forEach(payment => {
      const existingIndex = accountsPayable.findIndex(acc => acc.driverPaymentId === payment.id);
      const payableItem = {
        id: existingIndex >= 0 ? accountsPayable[existingIndex].id : Date.now() + Math.random(),
        driverPaymentId: payment.id,
        description: `Pagamento Motorista - ${payment.driverName} (${payment.invoice})`,
        amount: parseFloat(payment.agreedAmount),
        dueDate: payment.departureDate,
        status: payment.status,
        supplier: payment.driverName,
        category: 'Motoristas',
        createdAt: existingIndex >= 0 ? accountsPayable[existingIndex].createdAt : new Date().toISOString()
      };
      
      if (existingIndex >= 0) {
        accountsPayable[existingIndex] = payableItem;
      } else {
        accountsPayable.push(payableItem);
      }
    });
    
    localStorage.setItem('accountsPayable', JSON.stringify(accountsPayable));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const payment = {
      id: editingPayment ? editingPayment.id : Date.now(),
      ...formData,
      agreedAmount: parseFloat(formData.agreedAmount),
      createdAt: editingPayment ? editingPayment.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let newPayments;
    if (editingPayment) {
      newPayments = payments.map(p => p.id === editingPayment.id ? payment : p);
      toast({ title: "Pagamento atualizado!", description: "O pagamento foi atualizado com sucesso." });
    } else {
      newPayments = [...payments, payment];
      toast({ title: "Pagamento criado!", description: "O pagamento foi criado com sucesso." });
    }

    savePayments(newPayments);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ invoice: '', departureDate: '', driverName: '', agreedAmount: '', status: 'pending', bankAccount: '', description: '' });
    setShowForm(false);
    setEditingPayment(null);
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData(payment);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const newPayments = payments.filter(p => p.id !== id);
    savePayments(newPayments);
    toast({ title: "Pagamento excluído!", description: "O pagamento foi excluído com sucesso." });
  };

  const toggleStatus = (id) => {
    const newPayments = payments.map(payment => 
      payment.id === id ? { ...payment, status: payment.status === 'paid' ? 'pending' : 'paid' } : payment
    );
    savePayments(newPayments);
    toast({ title: "Status atualizado!", description: "O status do pagamento foi atualizado." });
  };

  const downloadTemplate = () => {
    const headers = ["Fatura", "Data de Saída", "Nome do Motorista", "Valor Combinado", "Status", "Conta Bancária", "Descrição"];
    const example = ["FAT001", "2025-12-15", "João Silva", 500.00, "pending", "Banco do Brasil - Ag: 1234 Cc: 56789", "Entrega São Paulo"];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_pagamentos_motorista.xlsx");

    toast({ title: "Modelo baixado!", description: "O modelo de pagamentos foi baixado com sucesso." });
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
          "Fatura": "invoice",
          "Data de Saída": "departureDate",
          "Nome do Motorista": "driverName",
          "Valor Combinado": "agreedAmount",
          "Status": "status",
          "Conta Bancária": "bankAccount",
          "Descrição": "description"
        };

        let currentPayments = [...payments];
        let newCount = 0;
        let updatedCount = 0;

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          let paymentData = {};
          headers.forEach((header, index) => {
            const field = headerMap[header];
            if (field) {
              let value = row[index];
              if (field === 'departureDate' && typeof value === 'number') {
                value = new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString().split('T')[0];
              }
              paymentData[field] = value;
            }
          });

          if (!paymentData.invoice) continue;

          const existingIndex = currentPayments.findIndex(p => p.invoice === paymentData.invoice && p.driverName === paymentData.driverName);

          if (existingIndex >= 0) {
            currentPayments[existingIndex] = { ...currentPayments[existingIndex], ...paymentData, updatedAt: new Date().toISOString() };
            updatedCount++;
          } else {
            currentPayments.push({ ...paymentData, id: Date.now() + i, createdAt: new Date().toISOString() });
            newCount++;
          }
        }
        savePayments(currentPayments);
        toast({ title: "Importação concluída!", description: `${newCount} pagamentos novos adicionados e ${updatedCount} pagamentos atualizados.` });
      } catch (error) {
        console.error("Import Error:", error);
        toast({ title: "Erro na importação", description: "Verifique o formato do arquivo e os cabeçalhos das colunas.", variant: "destructive" });
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportPayments = () => {
    if (payments.length === 0) {
      toast({ title: "Nenhum pagamento para exportar", variant: "destructive" });
      return;
    }

    const headers = ["Fatura", "Data de Saída", "Nome do Motorista", "Valor Combinado", "Status", "Conta Bancária", "Descrição", "Data de Criação"];
    const dataToExport = payments.map(p => [
      p.invoice,
      p.departureDate,
      p.driverName,
      p.agreedAmount,
      p.status,
      p.bankAccount,
      p.description,
      new Date(p.createdAt).toLocaleDateString('pt-BR')
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    ws['D1'].z = 'R$ #,##0.00';
    payments.forEach((p, index) => {
        ws[`D${index + 2}`].z = 'R$ #,##0.00';
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagamentos");
    XLSX.writeFile(wb, "pagamentos_motorista.xlsx");

    toast({ title: "Pagamentos exportados!", description: "Os pagamentos foram exportados com sucesso." });
  };

  const generateDriverPDF = () => {
    const { driverName, startDate, endDate } = pdfFormData;
    if (!driverName || !startDate || !endDate) {
      toast({ title: "Campos obrigatórios", description: "Por favor, selecione motorista e período.", variant: "destructive" });
      return;
    }

    const filteredPayments = payments.filter(p => {
      const paymentDate = new Date(p.departureDate);
      return p.driverName === driverName && paymentDate >= new Date(startDate) && paymentDate <= new Date(endDate);
    });

    if (filteredPayments.length === 0) {
      toast({ title: "Nenhum dado encontrado", description: "Não há pagamentos para este motorista no período selecionado.", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    doc.text(`Relatório de Pagamentos - ${driverName}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`, 14, 22);

    const headers = [["Fatura", "Data Saída", "Valor", "Status", "Conta Bancária"]];
    const body = filteredPayments.map(p => [
      p.invoice,
      new Date(p.departureDate).toLocaleDateString('pt-BR'),
      formatCurrency(p.agreedAmount),
      p.status === 'paid' ? 'Pago' : 'Pendente',
      p.bankAccount || '-'
    ]);

    doc.autoTable({
      head: headers,
      body: body,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`relatorio_${driverName}_${startDate}_${endDate}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
    setShowPdfForm(false);
  };

  const uniqueDrivers = [...new Set(payments.map(p => p.driverName))];
  const totalPending = payments.reduce((sum, p) => p.status === 'pending' ? sum + p.agreedAmount : sum, 0);
  const totalPaid = payments.reduce((sum, p) => p.status === 'paid' ? sum + p.agreedAmount : sum, 0);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Pagamentos de Motorista</h1>
          <p className="text-gray-300">Gerencie pagamentos e relatórios dos motoristas</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={downloadTemplate} variant="outline"><Download className="w-4 h-4 mr-2" />Baixar Modelo</Button>
          <Button asChild variant="outline" className="cursor-pointer"><label htmlFor="import-driver-payments"><Upload className="w-4 h-4 mr-2" />Importar</label></Button>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImport} className="hidden" id="import-driver-payments" />
          <Button onClick={exportPayments} variant="outline"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button onClick={() => setShowPdfForm(true)} variant="outline"><FileText className="w-4 h-4 mr-2" />Gerar PDF</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Novo Pagamento</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-yellow-500/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between"><p className="text-yellow-400 text-sm font-medium">Total Pendente</p><p className="text-2xl font-bold text-white">{formatCurrency(totalPending)}</p><Clock className="w-8 h-8 text-yellow-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-green-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between"><p className="text-green-400 text-sm font-medium">Total Pago</p><p className="text-2xl font-bold text-white">{formatCurrency(totalPaid)}</p><CheckCircle className="w-8 h-8 text-green-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-blue-500/20 backdrop-blur-lg rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between"><p className="text-blue-400 text-sm font-medium">Total Geral</p><p className="text-2xl font-bold text-white">{formatCurrency(totalPending + totalPaid)}</p><Truck className="w-8 h-8 text-blue-400" /></div>
        </motion.div>
      </div>

      {showPdfForm && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">Gerar Relatório PDF</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Motorista</label><select value={pdfFormData.driverName} onChange={(e) => setPdfFormData({...pdfFormData, driverName: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required><option value="" className="bg-gray-800">Selecione</option>{uniqueDrivers.map(name => <option key={name} value={name} className="bg-gray-800">{name}</option>)}</select></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Data Inicial</label><input type="date" value={pdfFormData.startDate} onChange={(e) => setPdfFormData({...pdfFormData, startDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Data Final</label><input type="date" value={pdfFormData.endDate} onChange={(e) => setPdfFormData({...pdfFormData, endDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
          </div>
          <div className="flex space-x-3 mt-4"><Button onClick={generateDriverPDF}><FileText className="w-4 h-4 mr-2" />Gerar PDF</Button><Button variant="outline" onClick={() => setShowPdfForm(false)}>Cancelar</Button></div>
        </motion.div>
      )}

      {showForm && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">{editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Fatura</label><input type="text" value={formData.invoice} onChange={(e) => setFormData({...formData, invoice: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Data de Saída</label><input type="date" value={formData.departureDate} onChange={(e) => setFormData({...formData, departureDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Nome do Motorista</label><input type="text" value={formData.driverName} onChange={(e) => setFormData({...formData, driverName: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Valor Combinado</label><input type="number" step="0.01" value={formData.agreedAmount} onChange={(e) => setFormData({...formData, agreedAmount: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Conta Bancária</label><input type="text" value={formData.bankAccount} onChange={(e) => setFormData({...formData, bankAccount: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-2">Descrição</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" /></div>
            <div className="md:col-span-2 flex space-x-3"><Button type="submit">{editingPayment ? 'Atualizar' : 'Criar'} Pagamento</Button><Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button></div>
          </form>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Lista de Pagamentos</h3>
          {payments.length === 0 ? (
            <div className="text-center py-12"><Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-400">Nenhum pagamento cadastrado</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/20"><th className="text-left text-gray-300 font-medium py-3">Fatura</th><th className="text-left text-gray-300 font-medium py-3">Motorista</th><th className="text-left text-gray-300 font-medium py-3">Valor</th><th className="text-left text-gray-300 font-medium py-3">Data Saída</th><th className="text-left text-gray-300 font-medium py-3">Status</th><th className="text-left text-gray-300 font-medium py-3">Ações</th></tr></thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 text-white">{payment.invoice}</td>
                      <td className="py-3 text-white">{payment.driverName}</td>
                      <td className="py-3 text-white">{formatCurrency(payment.agreedAmount)}</td>
                      <td className="py-3 text-white">{new Date(payment.departureDate).toLocaleDateString('pt-BR')}</td>
                      <td className="py-3"><button onClick={() => toggleStatus(payment.id)} className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${payment.status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{payment.status === 'paid' ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}<span>{payment.status === 'paid' ? 'Pago' : 'Pendente'}</span></button></td>
                      <td className="py-3"><div className="flex space-x-2"><Button size="sm" variant="ghost" onClick={() => handleEdit(payment)}><Edit className="w-4 h-4" /></Button><Button size="sm" variant="ghost" onClick={() => handleDelete(payment.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button></div></td>
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

export default DriverPaymentsModule;