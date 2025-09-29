import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Download, 
  Upload, 
  ClipboardList, 
  Edit, 
  Trash2, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Hourglass,
  ThumbsUp
} from 'lucide-react';

const NotesModule = ({ currentUser }) => {
  const [notes, setNotes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    number: '',
    shipper: '',
    dueDate: '',
    deliveryDate: '',
    nfeKey: '',
    description: ''
  });

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = () => {
    const saved = localStorage.getItem('notes');
    if (saved) {
      setNotes(JSON.parse(saved).map(updateNoteStatus));
    }
  };

  const saveNotes = (newNotes) => {
    localStorage.setItem('notes', JSON.stringify(newNotes));
    setNotes(newNotes.map(updateNoteStatus));
    window.dispatchEvent(new Event('storage'));
  };

  const updateNoteStatus = (note) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(note.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    let status = 'pending';
    if (note.deliveryDate) {
      const deliveryDate = new Date(note.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      status = deliveryDate <= dueDate ? 'onTime' : 'delivered';
    } else if (dueDate < today) {
      status = 'expired';
    } else if (dueDate.getTime() === today.getTime()) {
      status = 'dueToday';
    } else {
      status = 'pending';
    }
    return { ...note, status };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const noteData = {
      id: editingNote ? editingNote.id : Date.now(),
      ...formData,
      createdAt: editingNote ? editingNote.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedNote = updateNoteStatus(noteData);

    let newNotes;
    if (editingNote) {
      newNotes = notes.map(n => n.id === editingNote.id ? updatedNote : n);
      toast({ title: "Nota atualizada!", description: "A nota foi atualizada com sucesso." });
    } else {
      newNotes = [...notes, updatedNote];
      toast({ title: "Nota criada!", description: "A nota foi criada com sucesso." });
    }

    saveNotes(newNotes);
    resetForm();
  };

  const resetForm = () => {
    setFormData({ number: '', shipper: '', dueDate: '', deliveryDate: '', nfeKey: '', description: '' });
    setShowForm(false);
    setEditingNote(null);
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setFormData({
      number: note.number,
      shipper: note.shipper,
      dueDate: note.dueDate,
      deliveryDate: note.deliveryDate || '',
      nfeKey: note.nfeKey,
      description: note.description
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const newNotes = notes.filter(note => note.id !== id);
    saveNotes(newNotes);
    toast({ title: "Nota excluída!", description: "A nota foi excluída com sucesso." });
  };

  const downloadTemplate = () => {
    const headers = ["Número da Nota", "Embarcador", "Data de Vencimento", "Data de Entrega", "Chave NFe", "Descrição"];
    const example = ["NF001", "Embarcador Exemplo", "2025-12-31", "2025-12-30", "35200114200166000166550010000000001123456789", "Descrição da nota"];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_notas.xlsx");
    
    toast({ title: "Modelo baixado!", description: "O modelo de notas foi baixado com sucesso." });
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
          "Número da Nota": "number",
          "Embarcador": "shipper",
          "Data de Vencimento": "dueDate",
          "Data de Entrega": "deliveryDate",
          "Chave NFe": "nfeKey",
          "Descrição": "description"
        };

        let currentNotes = [...notes];
        let newCount = 0;
        let updatedCount = 0;

        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          let noteData = {};
          headers.forEach((header, index) => {
            const field = headerMap[header];
            if (field) {
              let value = row[index];
              if ((field === 'dueDate' || field === 'deliveryDate') && typeof value === 'number') {
                value = new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString().split('T')[0];
              }
              noteData[field] = value;
            }
          });

          if (!noteData.number) continue;

          const updatedNote = updateNoteStatus(noteData);
          const existingIndex = currentNotes.findIndex(n => n.number === updatedNote.number);

          if (existingIndex >= 0) {
            currentNotes[existingIndex] = { ...currentNotes[existingIndex], ...updatedNote, updatedAt: new Date().toISOString() };
            updatedCount++;
          } else {
            currentNotes.push({ ...updatedNote, id: Date.now() + i, createdAt: new Date().toISOString() });
            newCount++;
          }
        }
        
        saveNotes(currentNotes);
        toast({ title: "Importação concluída!", description: `${newCount} notas novas adicionadas e ${updatedCount} notas atualizadas.` });
      } catch (error) {
        console.error("Import Error:", error);
        toast({ title: "Erro na importação", description: "Verifique o formato do arquivo e os cabeçalhos das colunas.", variant: "destructive" });
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const exportNotes = () => {
    if (notes.length === 0) {
      toast({ title: "Nenhuma nota para exportar", variant: "destructive" });
      return;
    }

    const headers = ["Número da Nota", "Embarcador", "Data de Vencimento", "Data de Entrega", "Status", "Chave NFe", "Descrição", "Performance"];
    const dataToExport = notes.map(note => {
      const statusInfo = getStatusInfo(note);
      const performance = note.deliveryDate && note.dueDate ? (new Date(note.deliveryDate) <= new Date(note.dueDate) ? 'No Prazo' : 'Atrasado') : 'N/A';
      return [
        note.number,
        note.shipper,
        note.dueDate,
        note.deliveryDate || '',
        statusInfo.text,
        note.nfeKey,
        note.description,
        performance
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataToExport]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notas");
    XLSX.writeFile(wb, "notas_exportadas.xlsx");

    toast({ title: "Notas exportadas com sucesso!" });
  };

  const getStatusInfo = (note) => {
    switch (note.status) {
      case 'onTime': return { color: 'bg-teal-500/20 text-teal-400', icon: ThumbsUp, text: 'Entregue no Prazo' };
      case 'delivered': return { color: 'bg-green-500/20 text-green-400', icon: CheckCircle, text: 'Entregue (Atrasado)' };
      case 'expired': return { color: 'bg-red-500/20 text-red-400', icon: AlertTriangle, text: 'Vencida' };
      case 'dueToday': return { color: 'bg-yellow-500/20 text-yellow-400', icon: Hourglass, text: 'Vence Hoje' };
      default: return { color: 'bg-blue-500/20 text-blue-400', icon: Clock, text: 'Pendente' };
    }
  };

  const stats = notes.reduce((acc, note) => {
    acc[note.status] = (acc[note.status] || 0) + 1;
    return acc;
  }, { pending: 0, delivered: 0, expired: 0, dueToday: 0, onTime: 0 });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Controle de Notas Entregues</h1>
          <p className="text-gray-300">Gerencie prazos e status das notas fiscais</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={downloadTemplate} variant="outline"><Download className="w-4 h-4 mr-2" />Baixar Modelo</Button>
          <Button asChild variant="outline" className="cursor-pointer"><label htmlFor="import-notes"><Upload className="w-4 h-4 mr-2" />Importar</label></Button>
          <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImport} className="hidden" id="import-notes" />
          <Button onClick={exportNotes} variant="outline"><Download className="w-4 h-4 mr-2" />Exportar</Button>
          <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-2" />Nova Nota</Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-teal-500/20 backdrop-blur-lg rounded-xl p-4 border border-teal-500/30">
          <div className="flex items-center justify-between"><p className="text-teal-400 text-sm font-medium">No Prazo</p><p className="text-2xl font-bold text-white">{stats.onTime}</p><ThumbsUp className="w-8 h-8 text-teal-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-yellow-500/20 backdrop-blur-lg rounded-xl p-4 border border-yellow-500/30">
          <div className="flex items-center justify-between"><p className="text-yellow-400 text-sm font-medium">Vencendo Hoje</p><p className="text-2xl font-bold text-white">{stats.dueToday}</p><Hourglass className="w-8 h-8 text-yellow-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-500/30">
          <div className="flex items-center justify-between"><p className="text-red-400 text-sm font-medium">Vencidas</p><p className="text-2xl font-bold text-white">{stats.expired}</p><AlertTriangle className="w-8 h-8 text-red-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-green-500/20 backdrop-blur-lg rounded-xl p-4 border border-green-500/30">
          <div className="flex items-center justify-between"><p className="text-green-400 text-sm font-medium">Entregues</p><p className="text-2xl font-bold text-white">{stats.delivered + stats.onTime}</p><CheckCircle className="w-8 h-8 text-green-400" /></div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-blue-500/20 backdrop-blur-lg rounded-xl p-4 border border-blue-500/30">
          <div className="flex items-center justify-between"><p className="text-blue-400 text-sm font-medium">Total</p><p className="text-2xl font-bold text-white">{notes.length}</p><ClipboardList className="w-8 h-8 text-blue-400" /></div>
        </motion.div>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">{editingNote ? 'Editar Nota' : 'Nova Nota'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Número da Nota</label><input type="text" value={formData.number} onChange={(e) => setFormData({...formData, number: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Embarcador</label><input type="text" value={formData.shipper} onChange={(e) => setFormData({...formData, shipper: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Data de Vencimento</label><input type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
            <div><label className="block text-gray-300 text-sm font-medium mb-2">Data de Entrega (Opcional)</label><input type="date" value={formData.deliveryDate} onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" /></div>
            <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-2">Chave da NFe</label><input type="text" value={formData.nfeKey} onChange={(e) => setFormData({...formData, nfeKey: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="44 dígitos da chave de acesso" /></div>
            <div className="md:col-span-2"><label className="block text-gray-300 text-sm font-medium mb-2">Descrição</label><textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" rows="3" /></div>
            <div className="md:col-span-2 flex space-x-3"><Button type="submit">{editingNote ? 'Atualizar' : 'Criar'} Nota</Button><Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button></div>
          </form>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Lista de Notas</h3>
          {notes.length === 0 ? (
            <div className="text-center py-12"><ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" /><p className="text-gray-400">Nenhuma nota cadastrada</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-gray-300 font-medium py-3">Número</th>
                    <th className="text-left text-gray-300 font-medium py-3">Embarcador</th>
                    <th className="text-left text-gray-300 font-medium py-3">Vencimento</th>
                    <th className="text-left text-gray-300 font-medium py-3">Entrega</th>
                    <th className="text-left text-gray-300 font-medium py-3">Status</th>
                    <th className="text-left text-gray-300 font-medium py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((note) => {
                    const statusInfo = getStatusInfo(note);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <tr key={note.id} className="border-b border-white/10 hover:bg-white/5">
                        <td className="py-3 text-white">{note.number}</td>
                        <td className="py-3 text-white">{note.shipper}</td>
                        <td className="py-3 text-white">{new Date(note.dueDate).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 text-white">{note.deliveryDate ? new Date(note.deliveryDate).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="py-3">
                          <span className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-4 h-4" />
                            <span>{statusInfo.text}</span>
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(note)}><Edit className="w-4 h-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDelete(note.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NotesModule;