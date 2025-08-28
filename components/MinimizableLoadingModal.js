import { useState, useEffect, useRef } from 'react';
import { FileText, Minus, X, Maximize2 } from 'lucide-react';

export default function MinimizableLoadingModal({ 
  isOpen, 
  progress, 
  message, 
  onClose 
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [fakeMessage, setFakeMessage] = useState('');
  const intervalRef = useRef(null);

  // Função para simular progresso fake até 90%
  const simulateFakeProgress = () => {
    const steps = [
      { progress: 8, message: 'Iniciando processamento...', delay: 400 },
      { progress: 18, message: 'Preparando dados do formulário...', delay: 800 },
      { progress: 32, message: 'Conectando com a IA...', delay: 1200 },
      { progress: 48, message: 'Analisando conteúdo...', delay: 1800 },
      { progress: 62, message: 'Processando com inteligência artificial...', delay: 2200 },
      { progress: 75, message: 'Otimizando dados extraídos...', delay: 2000 },
      { progress: 85, message: 'Validando informações...', delay: 1500 },
      { progress: 90, message: 'Finalizando processamento...', delay: 1000 }
    ];

    let currentStep = 0;
    let timeoutId;

    const executeStep = () => {
      if (currentStep < steps.length) {
        setFakeProgress(steps[currentStep].progress);
        setFakeMessage(steps[currentStep].message);
        
        timeoutId = setTimeout(() => {
          currentStep++;
          executeStep();
        }, steps[currentStep].delay);
      }
    };

    // Iniciar primeira etapa
    executeStep();

    // Retornar função de limpeza
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  };

  useEffect(() => {
    if (isOpen && progress === 0) {
      // Iniciar simulação fake quando abrir
      const clearSimulation = simulateFakeProgress();
      intervalRef.current = clearSimulation;
    } else if (!isOpen) {
      // Limpar simulação quando fechar
      if (intervalRef.current) {
        intervalRef.current();
        intervalRef.current = null;
      }
      setFakeProgress(0);
      setFakeMessage('');
    }

    return () => {
      if (intervalRef.current) {
        intervalRef.current();
      }
    };
  }, [isOpen, progress]);

  // Usar progresso real se estiver acima de 90%, senão usar fake
  const displayProgress = progress > 90 ? progress : fakeProgress;
  const displayMessage = progress > 90 ? message : fakeMessage;

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 flex items-center gap-3 max-w-xs">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500 animate-pulse" />
            <div className="w-16 bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">{displayProgress}%</span>
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
          <p className="text-gray-600 mb-4">{displayMessage}</p>
          
          {/* Barra de Progresso */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out shadow-sm"
              style={{ width: `${displayProgress}%` }}
            >
              <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500">{displayProgress}% concluído</p>
          
          {/* Mensagem especial quando atingir 90% */}
          {displayProgress >= 90 && (
            <p className="text-xs text-orange-600 mt-2 animate-pulse">
              🔜 Aguardando resposta da IA...
            </p>
          )}
          
          {/* Dica sobre minimizar */}
          <p className="text-xs text-gray-400 mt-4">
            💡 Você pode minimizar esta janela clicando no ícone "–" acima
          </p>
        </div>
      </div>
    </div>
  );
}