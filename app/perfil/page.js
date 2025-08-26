'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  User, 
  Lock, 
  Mail, 
  Calendar,
  Shield,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function Perfil() {
  const { user, updateUser } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setMessage({ type: 'error', text: 'Senha atual é obrigatória' });
      return false;
    }

    if (formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Nova senha deve ter pelo menos 6 caracteres' });
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
    
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setMessage({ 
        type: 'success', 
        text: 'Senha alterada com sucesso!' 
      });
   
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Erro ao alterar senha. Tente novamente.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais e configurações de conta</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informações do Usuário */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Informações da Conta
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Email</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Último Acesso</p>
                      <p className="text-sm text-gray-500">{formatDate(user.last_access)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Tipo de Conta</p>
                      <p className="text-sm text-gray-500">
                        {user.isAdmin ? 'Administrador' : 'Usuário'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alterar Senha */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-600" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>
                  Para sua segurança, use uma senha forte com pelo menos 6 caracteres
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Mensagem de Status */}
                  {message.text && (
                    <div className={`p-4 rounded-lg border ${
                      message.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {message.type === 'success' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">{message.text}</span>
                      </div>
                    </div>
                  )}

                  {/* Senha Atual */}
                  <div>
                    <Label htmlFor="currentPassword">Senha Atual</Label>
                    <div className="relative mt-1">
                      <Input
                        id="currentPassword"
                        type={showPassword.current ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        placeholder="Digite sua senha atual"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('current')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.current ? '🔓' : '🔒'}
                      </button>
                    </div>
                  </div>

                  {/* Nova Senha */}
                  <div>
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <div className="relative mt-1">
                      <Input
                        id="newPassword"
                        type={showPassword.new ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        placeholder="Digite a nova senha"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('new')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.new ? '🔓' : '🔒'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Mínimo de 6 caracteres
                    </p>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div>
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <div className="relative mt-1">
                      <Input
                        id="confirmPassword"
                        type={showPassword.confirm ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirme a nova senha"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility('confirm')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showPassword.confirm ? '🔓' : '🔒'}
                      </button>
                    </div>
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                        setMessage({ type: '', text: '' });
                      }}
                    >
                      Limpar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="min-w-[120px]"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Alterando...</span>
                        </div>
                      ) : (
                        'Alterar Senha'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

         
          </div>
        </div>
      </div>
    </div>
  );
}
