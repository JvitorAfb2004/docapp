'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Input } from '../../../components/ui/input';
import { Save, Plus, Edit, Trash2, MessageSquare } from 'lucide-react';
import { useCustomAlert } from '../../../components/CustomAlert';

export default function AdminPrompts() {
  const { showAlert, AlertComponent } = useCustomAlert();
  const [prompts, setPrompts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    type: 'dfd',
    content: ''
  });


  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      const response = await fetch('/api/admin/prompts', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrompts(data.prompts);
      }
    } catch (error) {
      console.error('Erro ao carregar prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPrompt = () => {
    setEditingPrompt(null);
    
  
    const existingTypes = prompts.map(p => p.type);
    const availableType = ['dfd', 'etp'].find(type => !existingTypes.includes(type));
    
    setFormData({
      type: availableType || 'dfd',
      content: ''
    });
    setShowModal(true);
  };

  const handleEditPrompt = (prompt) => {
    setEditingPrompt(prompt);
    setFormData({
      type: prompt.type,
      content: prompt.content
    });
    setShowModal(true);
  };

  const handleSavePrompt = async () => {
    try {
      const url = editingPrompt 
        ? `/api/admin/prompts/${editingPrompt.id}`
        : '/api/admin/prompts';
      
      const method = editingPrompt ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchPrompts();
        setShowModal(false);
        setFormData({ type: 'dfd', content: '' });
        setEditingPrompt(null);
      } else {
        const error = await response.json();
        showAlert({
          title: 'Erro ao Salvar Prompt',
          message: `Erro: ${error.error}`,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      showAlert({
        title: 'Erro de Conexão',
        message: 'Erro ao salvar prompt. Verifique sua conexão e tente novamente.',
        type: 'error'
      });
    }
  };

  const handleDeletePrompt = async (promptId) => {
    showAlert({
      title: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja remover este prompt?',
      type: 'warning',
      actions: [
        {
          label: 'Cancelar',
          onClick: () => {},
          variant: 'outline'
        },
        {
          label: 'Excluir',
          onClick: async () => {
            try {
              const response = await fetch(`/api/admin/prompts/${promptId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
              });

              if (response.ok) {
                await fetchPrompts();
              } else {
                const error = await response.json();
                showAlert({
                  title: 'Erro ao Excluir',
                  message: `Erro: ${error.error}`,
                  type: 'error'
                });
              }
            } catch (error) {
              console.error('Erro ao remover prompt:', error);
              showAlert({
                title: 'Erro de Conexão',
                message: 'Erro ao remover prompt. Verifique sua conexão e tente novamente.',
                type: 'error'
              });
            }
          },
          variant: 'destructive'
        }
      ]
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Carregando prompts...</p>
      </div>
    );
  }


  const existingTypes = prompts.map(p => p.type);
  const allTypesUsed = ['dfd', 'etp'].every(type => existingTypes.includes(type));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Prompts</h1>
          <p className="text-gray-600">
            Configure prompts para geração de DFD e ETP
            {allTypesUsed && <span className="text-orange-600 ml-2">(Máximo de prompts atingido)</span>}
          </p>
        </div>
        {!allTypesUsed && (
          <Button onClick={handleNewPrompt} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Novo Prompt
          </Button>
        )}
      </div>

      {/* Lista de Prompts */}
      {prompts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Nenhum prompt configurado</p>
            <Button onClick={handleNewPrompt} className="mt-4" disabled={allTypesUsed}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Prompt
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                                         <CardTitle className="flex items-center gap-2">
                       <span className={`px-2 py-1 text-xs rounded-full ${
                         prompt.type === 'dfd' ? 'bg-blue-100 text-blue-800' :
                         'bg-green-100 text-green-800'
                       }`}>
                         {prompt.type.toUpperCase()}
                       </span>
                       Prompt {prompt.type.toUpperCase()}
                     </CardTitle>
                     <CardDescription>
                       Versão: {prompt.version}
                     </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPrompt(prompt)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePrompt(prompt.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Conteúdo do Prompt
                  </Label>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {prompt.content}
                    </p>
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
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingPrompt ? 'Editar Prompt' : 'Novo Prompt'}
            </h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  disabled={editingPrompt} 
                >
                  <option 
                    value="dfd" 
                    disabled={!editingPrompt && existingTypes.includes('dfd')}
                  >
                    DFD - Diagrama de Fluxo de Dados
                    {!editingPrompt && existingTypes.includes('dfd') && ' (Já existe)'}
                  </option>
                  <option 
                    value="etp" 
                    disabled={!editingPrompt && existingTypes.includes('etp')}
                  >
                    ETP - Esquema de Transição de Estados
                    {!editingPrompt && existingTypes.includes('etp') && ' (Já existe)'}
                  </option>
                </select>
                {editingPrompt && (
                  <p className="text-sm text-gray-500 mt-1">
                    Não é possível alterar o tipo ao editar um prompt
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="content">Conteúdo do Prompt</Label>
                <Textarea
                  id="content"
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Digite o conteúdo do prompt..."
                  className="resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  setFormData({ type: 'dfd', content: '' });
                  setEditingPrompt(null);
                }}
              >
                Cancelar
              </Button>
                              <Button
                  onClick={handleSavePrompt}
                  disabled={!formData.content}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                <Save className="h-4 w-4 mr-2" />
                {editingPrompt ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AlertComponent />
    </div>
  );
}
