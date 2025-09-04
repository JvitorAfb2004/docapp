'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { useAuth } from '../lib/AuthContext';
import { useAdminCheck } from '../lib/hooks/useAdminCheck';
import { User, FileText, Plus, Home, LogOut, ChevronDown, Settings, Menu, MessageSquare, Users } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from './ui/dropdown-menu';

function Header() {
  const router = useRouter();
  const { isLoggedIn, logout, user, isLoading, isAdmin } = useAuth();
  

  useAdminCheck(30000);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleMenuClick = (action) => {
    switch (action) {
      case 'inicio':
        router.push('/');
        break;
      case 'perfil':
        router.push('/perfil');
        break;
      case 'documentos':
        router.push('/documentos/lista');
        break;
      case 'novo':
        router.push('/documentos');
        break;
      case 'painel':
        router.push('/admin/painel');
        break;
      case 'prompts':
        router.push('/admin/prompts');
        break;
      case 'usuarios':
        router.push('/admin/usuarios');
        break;
      case 'sair':
        handleLogout();
        break;
      default:
        break;
    }
  };


  if (isLoading) {
    return (
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h1 onClick={() => router.push('/')} className="text-xl font-bold text-black cursor-pointer">Doc App</h1>
         
        </div>
        <nav className="flex items-center gap-4">
          <div className="w-32 h-10 bg-gray-200 animate-pulse rounded"></div>
        </nav>
      </header>
    );
  }

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <h1 onClick={() => router.push('/')} className="text-xl cursor-pointer font-bold text-black">Doc App</h1>
       
      </div>
      <nav className="flex items-center gap-4">
        {isLoggedIn ? (
          <div className="flex items-center gap-3">

            {isAdmin && (
              <div className="bg-black text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                Admin
              </div>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex h-46 items-center gap-2 border-gray-300  hover:bg-gray-50">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-gray-700">{user?.name || 'Usuário'}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleMenuClick('inicio')} className="cursor-pointer">
                  <Home className="h-4 w-4 mr-2" />
                  Início
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('perfil')} className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('documentos')} className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Meus Documentos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('novo')} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Documento
                </DropdownMenuItem>
                

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleMenuClick('painel')} className="cursor-pointer text-purple-600 hover:bg-purple-50">
                      <Settings className="h-4 w-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick('prompts')} className="cursor-pointer text-purple-600 hover:bg-purple-50">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Gerenciar Prompts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMenuClick('usuarios')} className="cursor-pointer text-purple-600 hover:bg-purple-50">
                      <Users className="h-4 w-4 mr-2" />
                      Gerenciar Usuários
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMenuClick('sair')} className="text-red-600 cursor-pointer hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <Button onClick={() => router.push('/login')} variant="outline">
            Entrar
          </Button>
        )}
      </nav>
    </header>
  );
}

export default Header;