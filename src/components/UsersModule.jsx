import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { 
  Plus, 
  Users, 
  Edit, 
  Trash2, 
  Shield,
  User,
  Check,
  X,
  Clock
} from 'lucide-react';

const UsersModule = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'pending'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const saved = localStorage.getItem('users');
    if (saved) {
      setUsers(JSON.parse(saved));
    }
  };

  const saveUsers = (newUsers) => {
    localStorage.setItem('users', JSON.stringify(newUsers));
    setUsers(newUsers);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (currentUser.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem gerenciar usuários.",
        variant: "destructive"
      });
      return;
    }

    const emailExists = users.find(user => 
      user.email === formData.email && (!editingUser || user.id !== editingUser.id)
    );
    
    if (emailExists) {
      toast({
        title: "Email já cadastrado",
        description: "Este email já está sendo usado por outro usuário.",
        variant: "destructive"
      });
      return;
    }

    const user = {
      id: editingUser ? editingUser.id : Date.now(),
      name: formData.name,
      email: formData.email,
      password: formData.password || (editingUser ? editingUser.password : ''),
      role: formData.role,
      status: formData.status,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let newUsers;
    if (editingUser) {
      newUsers = users.map(u => u.id === editingUser.id ? user : u);
      toast({
        title: "Usuário atualizado!",
        description: "O usuário foi atualizado com sucesso.",
      });
    } else {
      newUsers = [...users, user];
      toast({
        title: "Usuário criado!",
        description: "O usuário foi criado com sucesso.",
      });
    }

    saveUsers(newUsers);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'user',
      status: 'pending'
    });
    setShowForm(false);
    setEditingUser(null);
  };

  const handleEdit = (user) => {
    if (currentUser.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem editar usuários.",
        variant: "destructive"
      });
      return;
    }

    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't show password
      role: user.role,
      status: user.status
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (currentUser.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir usuários.",
        variant: "destructive"
      });
      return;
    }

    if (id === currentUser.id) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode excluir sua própria conta.",
        variant: "destructive"
      });
      return;
    }

    const newUsers = users.filter(user => user.id !== id);
    saveUsers(newUsers);
    toast({
      title: "Usuário excluído!",
      description: "O usuário foi excluído com sucesso.",
    });
  };

  const handleAuthorization = (id, newStatus) => {
    if (currentUser.role !== 'admin') {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem autorizar usuários.",
        variant: "destructive"
      });
      return;
    }
    const newUsers = users.map(user => user.id === id ? { ...user, status: newStatus } : user);
    saveUsers(newUsers);
    toast({
      title: `Usuário ${newStatus === 'authorized' ? 'autorizado' : 'bloqueado'}!`,
      description: `O status do usuário foi atualizado.`,
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
          <h1 className="text-3xl font-bold text-white">Gestão de Usuários</h1>
          <p className="text-gray-300">Gerencie usuários, permissões e autorizações do sistema</p>
        </div>
        
        {currentUser.role === 'admin' && (
          <Button onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Usuário
          </Button>
        )}
      </motion.div>

      {showForm && currentUser.role === 'admin' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20"
        >
          <h3 className="text-xl font-semibold text-white mb-4">
            {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required={!editingUser}
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Função
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="user" className="bg-gray-800">Usuário</option>
                <option value="admin" className="bg-gray-800">Administrador</option>
              </select>
            </div>

            {editingUser && (
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="pending" className="bg-gray-800">Pendente</option>
                  <option value="authorized" className="bg-gray-800">Autorizado</option>
                </select>
              </div>
            )}
            
            <div className="md:col-span-2 flex space-x-3">
              <Button type="submit">
                {editingUser ? 'Atualizar' : 'Criar'} Usuário
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Lista de Usuários</h3>
          
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Nenhum usuário cadastrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left text-gray-300 font-medium py-3">Nome</th>
                    <th className="text-left text-gray-300 font-medium py-3">Email</th>
                    <th className="text-left text-gray-300 font-medium py-3">Função</th>
                    <th className="text-left text-gray-300 font-medium py-3">Status</th>
                    {currentUser.role === 'admin' && (
                      <th className="text-left text-gray-300 font-medium py-3">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 text-white flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-semibold">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{user.name}</span>
                      </td>
                      <td className="py-3 text-white">{user.email}</td>
                      <td className="py-3">
                        <span className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                          user.role === 'admin'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          <span>{user.role === 'admin' ? 'Administrador' : 'Usuário'}</span>
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                          user.status === 'authorized'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {user.status === 'authorized' ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          <span>{user.status === 'authorized' ? 'Autorizado' : 'Pendente'}</span>
                        </span>
                      </td>
                      {currentUser.role === 'admin' && (
                        <td className="py-3">
                          <div className="flex space-x-1">
                            {user.status === 'pending' && (
                              <Button size="sm" variant="ghost" onClick={() => handleAuthorization(user.id, 'authorized')} className="text-green-400 hover:text-green-300">
                                <Check className="w-4 h-4" />
                              </Button>
                            )}
                            {user.status === 'authorized' && user.id !== currentUser.id && (
                               <Button size="sm" variant="ghost" onClick={() => handleAuthorization(user.id, 'pending')} className="text-yellow-400 hover:text-yellow-300">
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.id !== currentUser.id && (
                              <Button size="sm" variant="ghost" onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
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

export default UsersModule;