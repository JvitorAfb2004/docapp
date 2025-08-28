# 📋 Sistema de Geração de Documentos de Contratação Pública

## 🎯 Visão Geral

O **Sistema de Geração de Documentos de Contratação Pública** é uma aplicação web desenvolvida em **Next.js** que automatiza a criação de documentos essenciais para processos de contratação pública, utilizando **Inteligência Artificial (IA)** para otimizar e validar o preenchimento dos formulários.

## 🚀 Funcionalidades Principais

### 📄 **Documentos Suportados**

- **ETP (Estudo Técnico Preliminar)** - Documento obrigatório para contratações públicas
- **DFD (Documento de Formalização de Demanda)** - Formalização inicial da demanda
- **Importação Inteligente** - Extração automática de dados de arquivos DOCX

### 🤖 **Inteligência Artificial Integrada**

- **Processamento Automático** de formulários com IA
- **Validação Inteligente** de campos obrigatórios
- **Extração de Dados** de documentos DOCX existentes
- **Preenchimento Automático** baseado em padrões e regras

### 🔐 **Sistema de Autenticação e Controle**

- **Login/Registro** de usuários
- **Controle de Acesso** baseado em perfis
- **Painel Administrativo** para gestão do sistema
- **Histórico de Documentos** gerados

## 🛠️ Tecnologias Utilizadas

### **Frontend**

- **Next.js 15.5.0** - Framework React para aplicações web
- **React 19.1.0** - Biblioteca para interfaces de usuário
- **Tailwind CSS** - Framework CSS utilitário
- **Radix UI** - Componentes de interface acessíveis
- **Lucide React** - Ícones vetoriais

### **Backend**

- **Node.js** - Runtime JavaScript
- **Sequelize** - ORM para banco de dados
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação baseada em tokens
- **Multer** - Middleware para upload de arquivos

### **Processamento de Documentos**

- **DocxTemplater** - Geração de documentos DOCX
- **Mammoth** - Extração de texto de arquivos DOCX
- **PDF-Parse** - Processamento de arquivos PDF
- **OpenAI API** - Integração com IA para processamento

### **Segurança e Validação**

- **bcrypt** - Criptografia de senhas
- **Rate Limiting** - Proteção contra ataques
- **Sanitização de Input** - Prevenção de injeção de código
- **Validação de Campos** - Verificação de dados obrigatórios

## 📁 Estrutura do Projeto

```
doc-app/
├── app/                          # App Router do Next.js
│   ├── documentos/              # Páginas de documentos
│   │   ├── etp/                # Criação de ETP
│   │   ├── dfd/                # Criação de DFD
│   │   ├── lista/              # Lista de documentos
│   │   └── criar/              # Criação geral
│   ├── admin/                   # Painel administrativo
│   ├── perfil/                  # Gerenciamento de perfil
│   ├── login/                   # Autenticação
│   └── register/                # Registro de usuários
├── components/                   # Componentes reutilizáveis
│   ├── ui/                      # Componentes de interface
│   ├── DFDImportModal.js        # Modal de importação DFD
│   ├── ProtectedRoute.js        # Rota protegida
│   └── CustomAlert.js           # Sistema de alertas
├── pages/api/                    # API Routes
│   ├── documentos/              # Endpoints de documentos
│   ├── auth/                    # Autenticação
│   └── admin/                   # Administração
├── lib/                         # Bibliotecas e utilitários
├── models/                      # Modelos do banco de dados
├── config/                      # Configurações
└── scripts/                     # Scripts de banco de dados
```

## 🚀 Como Executar

### **Pré-requisitos**

- Node.js 18+
- PostgreSQL 12+
- NPM ou Yarn

### **Instalação**

1. **Clone o repositório**

   ```bash
   git clone [URL_DO_REPOSITORIO]
   cd doc-app
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Configure o banco de dados**

   ```bash
   # Configure as variáveis de ambiente
   cp .env.example .env.local

   # Execute as migrações
   npm run migrate
   ```

4. **Inicialize o banco de dados**

   ```bash
   npm run init-db
   ```

5. **Execute em modo de desenvolvimento**
   ```bash
   npm run dev
   ```

### **Scripts Disponíveis**

- `npm run dev` - Executa em modo de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run start` - Executa build de produção
- `npm run migrate` - Executa migrações do banco
- `npm run init-db` - Inicializa o banco de dados

## 🔧 Configuração

### **Variáveis de Ambiente**

Crie um arquivo `.env.local` com as seguintes variáveis:

```env
# Banco de Dados
DATABASE_URL=postgresql://usuario:senha@localhost:5432/doc_app

# JWT
JWT_SECRET=sua_chave_secreta_jwt

# OpenAI
OPENAI_API_KEY=sua_chave_api_openai

# Configurações do Servidor
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=sua_chave_secreta_nextauth
```

### **Configuração do Banco de Dados**

O sistema utiliza **PostgreSQL** com **Sequelize** como ORM. As configurações estão em `config/database.js`.

## 📋 Funcionalidades Detalhadas

### **1. Criação de ETP (Estudo Técnico Preliminar)**

- **Formulário Multi-seção** com validação em tempo real
- **Preenchimento Automático** de campos baseado em regras
- **Validação Inteligente** de campos obrigatórios
- **Processamento com IA** para otimização do conteúdo
- **Geração Automática** de documento DOCX

### **2. Importação de DFD (Documento de Formalização de Demanda)**

- **Upload de arquivos DOCX** contendo DFDs
- **Extração automática** de texto com Mammoth
- **Processamento com IA** para extrair informações relevantes
- **Mapeamento inteligente** para campos do ETP
- **Preenchimento automático** do formulário

### **3. Sistema de Validação Inteligente**

- **Validação em tempo real** de campos obrigatórios
- **Verificação de consistência** entre campos relacionados
- **Preenchimento automático** baseado em lógicas de negócio
- **Alertas visuais** para campos com problemas

### **4. Processamento com Inteligência Artificial**

- **Análise de conteúdo** com OpenAI
- **Otimização automática** de textos
- **Validação semântica** de campos
- **Sugestões inteligentes** para preenchimento

## 🔐 Sistema de Autenticação

### **Perfis de Usuário**

- **Usuário Comum** - Criação e gerenciamento de documentos
- **Administrador** - Gestão de usuários e configurações do sistema
- **Fiscal** - Acesso específico a documentos de fiscalização

### **Segurança**

- **JWT (JSON Web Tokens)** para autenticação
- **Criptografia bcrypt** para senhas
- **Rate limiting** para proteção contra ataques
- **Validação de entrada** para prevenir injeções

## 📊 Banco de Dados

### **Modelos Principais**

- **Usuários** - Informações de autenticação e perfil
- **Documentos** - Metadados dos documentos gerados
- **Prompts** - Configurações de IA personalizáveis
- **Logs** - Histórico de atividades do sistema

### **Relacionamentos**

- Usuários podem criar múltiplos documentos
- Documentos mantêm histórico de versões
- Prompts podem ser personalizados por usuário

## 🚀 Deploy

### **Ambiente de Produção**

- **Vercel** - Deploy automático do frontend
- **Railway/Heroku** - Hosting do backend
- **PostgreSQL** - Banco de dados gerenciado

### **Configurações de Produção**

- **HTTPS** obrigatório
- **Rate limiting** ativo
- **Logs estruturados**
- **Monitoramento de performance**

## 🤝 Contribuição

### **Como Contribuir**

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### **Padrões de Código**

- **ESLint** para linting
- **Prettier** para formatação
- **Conventional Commits** para mensagens de commit
- **TypeScript** (opcional) para tipagem

## 📝 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

### **Canais de Ajuda**

- **Issues do GitHub** - Para bugs e solicitações de features
- **Documentação** - Guias detalhados de uso
- **Wiki** - Perguntas frequentes e tutoriais

### **Contato**

- **Email**: suporte@doc-app.com
- **Telefone**: (11) 99999-9999
- **Horário**: Segunda a Sexta, 9h às 18h

## 🔮 Roadmap

### **Versão 1.1 (Próxima)**

- [ ] Suporte a mais tipos de documentos
- [ ] Integração com sistemas externos
- [ ] Dashboard de analytics
- [ ] API pública para integrações

### **Versão 1.2 (Futura)**

- [ ] Aplicativo mobile
- [ ] Workflow de aprovação
- [ ] Assinatura digital
- [ ] Integração com blockchain

---

## 🎉 Agradecimentos

Agradecemos a todos os contribuidores e usuários que tornaram este projeto possível. Este sistema foi desenvolvido para modernizar e simplificar os processos de contratação pública, tornando-os mais eficientes e transparentes.

---

**Desenvolvido com ❤️ para a Administração Pública Brasileira**
