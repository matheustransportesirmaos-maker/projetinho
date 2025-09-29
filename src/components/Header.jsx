import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Building2, Upload, Edit } from 'lucide-react';

const Header = ({ companyInfo, updateCompanyInfo, currentUser }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(companyInfo);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setEditData({ ...editData, logo: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    updateCompanyInfo(editData);
    setIsEditing(false);
    toast({
      title: "Informações atualizadas!",
      description: "As informações da empresa foram salvas com sucesso.",
    });
  };

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-white/10 backdrop-blur-lg border-b border-white/20 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt="Logo da empresa" 
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          )}
          
          {isEditing ? (
            <div className="flex items-center space-x-3">
              <input
                type="text"
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Nome da empresa"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label htmlFor="logo-upload">
                <Button variant="outline" size="sm" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Logo
                </Button>
              </label>
              <Button onClick={handleSave} size="sm">
                Salvar
              </Button>
              <Button 
                onClick={() => {
                  setIsEditing(false);
                  setEditData(companyInfo);
                }} 
                variant="outline" 
                size="sm"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-white">{companyInfo.name}</h1>
              <Button
                onClick={() => setIsEditing(true)}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-white"
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-white font-medium">{currentUser?.name}</p>
            <p className="text-gray-300 text-sm capitalize">{currentUser?.role}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {currentUser?.name?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;