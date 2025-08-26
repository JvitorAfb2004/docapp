'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../lib/AuthContext';

function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        
     
        login(data.token, data.user);
        
        setSuccess('Cadastro bem-sucedido! Redirecionando...');
      
        setTimeout(() => {
          setIsLoading(false);
          setTimeout(() => {
            router.push('/');
          }, 1000);
        }, 1000);
      } else {
        const data = await response.json();
        console.error('Erro na resposta:', data);

        setError(data.error || data.message || 'Erro ao cadastrar');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      setError('Erro de rede: ' + error.message);
      setIsLoading(false);
    }
  };


  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* Ícone animado */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-black rounded-full animate-pulse"></div>
        </div>
        
        {/* Texto de loading */}
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-gray-800">Criando sua conta...</h3>
          <p className="text-gray-600">Configurando tudo para você</p>
        </div>
        
        {/* Barra de progresso animada */}
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-black rounded-full animate-pulse" style={{
            animation: 'loading 2s ease-in-out infinite'
          }}></div>
        </div>
        
        {/* Dots animados */}
        <div className="flex space-x-2">
          <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-black rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <Card className="w-full max-w-md border-2 border-gray-200 rounded-lg bg-white">
        <CardHeader>
          <CardTitle>Cadastro</CardTitle>
          <CardDescription>Crie sua conta.</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Seu nome" 
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="seu@email.com" 
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="Sua senha" 
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18"/>
                        <path d="M10.5 6.4a11.4 11.4 0 0 1 11.4 5.6c-.3.7-1.2 2-2.8 3.5M13.4 9.3a3 3 0 0 1 4.3 4.3M1 1l23 23"/>
                        <path d="M9.8 4.8c-.3.1-.6.3-1 .5-4 2-7 7-7 7s3 5 11 7c.4-.2.7-.4 1-.5m4.5-1.3c.4-.3.8-.7 1-1.2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="confirmPassword">Confirme a Senha</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Confirme sua senha" 
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <path d="M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18"/>
                        <path d="M10.5 6.4a11.4 11.4 0 0 1 11.4 5.6c-.3.7-1.2 2-2.8 3.5M13.4 9.3a3 3 0 0 1 4.3 4.3M1 1l23 23"/>
                        <path d="M9.8 4.8c-.3.1-.6.3-1 .5-4 2-7 7-7 7s3 5 11 7c.4-.2.7-.4 1-.5m4.5-1.3c.4-.3.8-.7 1-1.2"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between mt-6">
            <Button 
              type="button" 
              variant="outline" 
              className="border-black text-black hover:bg-gray-200 cursor-pointer"
              onClick={() => router.push('/')}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-black text-white hover:bg-gray-800 cursor-pointer"
            >
              Cadastrar
            </Button>
          </CardFooter>
        </form>
        <div className="px-6 pb-6">
          <p className="text-black mt-2 text-center">
            Já tem uma conta?{' '}
            <a href="/login" className="text-blue-500 hover:underline">
              Entre
            </a>
          </p>
        </div>
      </Card>
      
      {/* CSS para animação personalizada */}
      <style jsx>{`
        @keyframes loading {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
}

export default RegisterPage;