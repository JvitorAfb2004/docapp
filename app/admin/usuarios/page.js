'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { 
  Users, 
  Search, 
  Trash2,
  Calendar,
  Activity,
  Shield
} from 'lucide-react';

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  
  useEffect(() => {
    fetchUsers();
  }, []);


  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = async (search = '') => {
    try {
      setSearching(!!search);
      const url = search 
        ? `/api/admin/usuarios?search=${encodeURIComponent(search)}`
        : '/api/admin/usuarios';
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setStats(data.stats);
      } else {
        console.error('Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = () => {

    setUsers(users.filter(u => u.id !== userToDelete.id));
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (isAdmin) => {
    return isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Usuários</h1>
          <p className="text-gray-600">Visualize usuários do sistema Doc App</p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalUsers || users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.adminUsers || users.filter(u => u.isAdmin).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Documentos</CardTitle>
            <Calendar className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalDocuments || users.reduce((sum, user) => sum + (user.documents_count || 0), 0)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Tokens Consumidos</CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalTokensConsumed?.toLocaleString() || users.reduce((sum, user) => sum + (user.tokens_used || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Usuários</CardTitle>
          <CardDescription>
            Digite o nome ou email para buscar usuários no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar usuário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                {searching && (
                  <div className="absolute right-3 top-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              {searchTerm && (
                <p className="text-sm text-gray-600 mt-1">
                  {users.length} resultado(s) para "{searchTerm}"
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            {users.length} usuário(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Carregando usuários...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Usuário</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Último Acesso</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Documentos</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Tokens Usados</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Downloads</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.isAdmin)}`}>
                          {user.isAdmin ? 'Admin' : 'Usuário'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {formatDate(user.last_access)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        <span className="font-semibold text-blue-600">{user.documents_count}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        <span className="font-semibold text-purple-600">{user.tokens_used?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        <span className="font-semibold text-green-600">{user.total_downloads?.toLocaleString() || '0'}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && !loading && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-gray-500">
                        {searchTerm ? `Nenhum usuário encontrado para "${searchTerm}"` : 'Nenhum usuário cadastrado'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-600">
              Confirmar Exclusão
            </h2>
            
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o usuário <strong>{userToDelete.name}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
