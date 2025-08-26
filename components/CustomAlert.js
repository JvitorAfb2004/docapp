import { useState } from 'react';
import { AlertCircle, CheckCircle, X, Info } from 'lucide-react';
import { Button } from './ui/button';

export default function CustomAlert({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  type = 'info',
  actions = null 
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      default:
        return <Info className="h-6 w-6 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 relative">
        {/* Botão de fechar */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-full"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>

        <div className="p-6">
          {/* Header com ícone */}
          <div className="flex items-start gap-3 mb-4">
            <div className={`p-2 rounded-full ${getBackgroundColor()}`}>
              {getIcon()}
            </div>
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {title}
                </h3>
              )}
              <p className="text-gray-600 whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            {actions && actions.length > 0 ? (
              actions.map((action, index) => (
                <Button
                  key={index}
                  onClick={action.onClick}
                  variant={action.variant || 'default'}
                  size="sm"
                >
                  {action.label}
                </Button>
              ))
            ) : (
              <Button onClick={onClose} size="sm">
                OK
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export function useCustomAlert() {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    actions: null
  });

  const showAlert = ({ title, message, type = 'info', actions = null }) => {
    setAlertState({
      isOpen: true,
      title,
      message,
      type,
      actions
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  const AlertComponent = () => (
    <CustomAlert
      isOpen={alertState.isOpen}
      onClose={closeAlert}
      title={alertState.title}
      message={alertState.message}
      type={alertState.type}
      actions={alertState.actions}
    />
  );

  return {
    showAlert,
    closeAlert,
    AlertComponent
  };
}