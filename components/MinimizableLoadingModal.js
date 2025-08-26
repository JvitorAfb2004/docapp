import { useState } from 'react';
import { FileText, Minus, X, Maximize2 } from 'lucide-react';

export default function MinimizableLoadingModal({ 
  isOpen, 
  progress, 
  message, 
  onClose 
}) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 flex items-center gap-3 max-w-xs">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500 animate-pulse" />
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{progress}%</span>
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Expandir"
            >
              <Maximize2 className="h-3 w-3 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded"
              title="Fechar"
            >
              <X className="h-3 w-3 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 relative">
        {/* Botões de controle */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-100 rounded"
            title="Minimizar"
          >
            <Minus className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            title="Fechar"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="text-center">
          <div className="mb-4">
            <FileText className="h-16 w-16 text-blue-500 mx-auto animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Gerando Documentos</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          
          {/* Barra de Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-sm text-gray-500">{progress}% concluído</p>
          
          {/* Dica sobre minimizar */}
          <p className="text-xs text-gray-400 mt-4">
            💡 Você pode minimizar esta janela clicando no ícone "–" acima
          </p>
        </div>
      </div>
    </div>
  );
}