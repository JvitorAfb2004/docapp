'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Key,
  Edit
} from 'lucide-react';
import { useAuth } from '../../../lib/AuthContext';
import { useCustomAlert } from '../../../components/CustomAlert';

export default function AdminOpenAI() {
  const { user } = useAuth();
  const { showAlert, AlertComponent } = useCustomAlert();
  const [tokens, setTokens] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingToken, setEditingToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    model: 'gpt-4'
  });

  
  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/admin/openai-tokens', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTokens(data.tokens);
      }
    } catch (error) {
      console.error('Erro ao carregar tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToken = (token) => {
    setEditingToken(token);
    setFormData({
      name: token.name,
      key: '', 
      model: token.model
    });
    setShowModal(true);
  };

  const handleSaveToken = async () => {
    try {
      const url = editingToken 
        ? `/api/admin/openai-tokens/${editingToken.id}`
        : '/api/admin/openai-tokens';
      
      const method = editingToken ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchTokens();
        setShowModal(false);
        setFormData({ name: '', key: '', model: 'gpt-4' });
        setEditingToken(null);
      } else {
        const error = await response.json();
        showAlert({
          title: 'Erro ao Salvar Token',
          message: `Erro: ${error.error}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erro ao salvar token:', error);
      showAlert({
        title: 'Erro de Conexão',
        message: 'Erro ao salvar token. Verifique sua conexão e tente novamente.',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Carregando tokens...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuração OpenAI</h1>
          <p className="text-gray-600">Gerencie os tokens da API OpenAI</p>
        </div>
      </div>

      {/* Lista de Tokens */}
      {tokens.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600">Nenhum token configurado. Entre em contato com o administrador para configurar tokens.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tokens.map((token) => (
            <Card key={token.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{token.name}</CardTitle>
                    <CardDescription>
                      Modelo: {token.model} • Status: {token.isActive ? 'Ativo' : 'Inativo'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditToken(token)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Key className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Chave da API</h3>
                        <p className="text-sm text-gray-500">ID: {token.id}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Status da Chave</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded flex-1">
                            Chave criptografada e armazenada com segurança
                          </code>
                          <div className="h-7 w-7 bg-green-100 rounded flex items-center justify-center">
                            <Key className="h-3 w-3 text-green-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              Editar Token
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome do Token</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Token Principal"
                />
              </div>

              <div>
                <Label htmlFor="key">Chave da API</Label>
                <Input
                  id="key"
                  type="password"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder={editingToken ? "Nova chave (deixe vazio para manter)" : "sk-..."}
                />
                {editingToken && (
                  <p className="text-xs text-gray-500 mt-1">
                    A chave atual está criptografada. Deixe em branco para manter a chave atual.
                  </p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  🔒 As chaves são criptografadas automaticamente antes de serem salvas.
                </p>
              </div>

              <div>
                <Label htmlFor="model">Modelo</Label>
                <select
                  id="model"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setFormData({ name: '', key: '', model: 'gpt-4' });
                  setEditingToken(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSaveToken}
                disabled={!formData.name}
              >
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}
