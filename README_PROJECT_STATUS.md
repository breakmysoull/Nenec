# Status do Projeto Nenec (Codex) - Março 2026

## 1. Visão Geral do Projeto
O **Nenec (Codex)** é uma plataforma de gestão operacional para restaurantes e franquias, focada em padronização, controle de qualidade e eficiência. O sistema permite o gerenciamento de checklists operacionais, treinamentos de equipe, controle de estoque e pedidos de compra, com uma hierarquia de permissões robusta (Rede > Unidade > Papel).

### Stack Tecnológico
- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Shadcn/UI.
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **Gerenciamento de Estado:** React Context API (Auth, Permissions).
- **Roteamento:** React Router v6 (com flags v7).

---

## 2. Desenvolvimentos Recentes (Sessão Atual)

Nesta etapa, focamos na estabilização do núcleo operacional e na experiência administrativa.

### ✅ Correções Críticas
- **Ambiente Local:** Correção de erros de execução do Vite e permissões do PowerShell (`npm.cmd`).
- **Sincronização Git:** Resolução de conflitos de merge e configuração correta de upstream.
- **Checklist "Bowl":**
    - Identificação e correção de divergência de IDs de rede entre o app e scripts SQL.
    - Implementação de lógica de "Auto-Seed" robusta para garantir a criação do checklist.
    - Correção de mapeamento de colunas (`required` vs `is_required`) que causava falhas silenciosas.

### 🛡️ Segurança e Permissões (RLS)
- **Refatoração Completa de RLS:** Substituição de políticas complexas por regras diretas e funcionais no Supabase.
- **Acesso Administrativo:** Garantia de permissões totais (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) para administradores de rede.
- **Correção de Contexto:** Ajuste no `PermissionsContext` para que administradores entrem por padrão na visão de gerenciamento (`MANAGER`), evitando bloqueios indevidos.

### 🚀 Novas Funcionalidades
- **Gestão de Checklists no App:**
    - Criação da página `/checklists/manage` para edição completa.
    - Funcionalidades: Renomear checklists, adicionar/editar/excluir itens e reordenar.
    - Integração no menu do usuário e botão de atalho na tela de checklists.
- **Ordenação Inteligente:** Lógica personalizada para destacar o checklist prioritário ("Bowl") no topo da lista.
- **UX Aprimorada:** Melhoria no botão de alternância de visão ("MG"/"OP") para clareza imediata do estado.

---

## 3. Roadmap Sugerido (Fase 4)

Com a base estabilizada, o foco deve migrar para a expansão de funcionalidades e inteligência de dados.

### Curto Prazo: Consolidação Operacional
- [ ] **Módulo de Estoque:** Implementar a baixa automática de estoque baseada nas respostas dos checklists (ex: desperdício apontado).
- [ ] **Histórico e Relatórios:** Criar visualizações gráficas de conformidade dos checklists ao longo do tempo (Dashboard de Qualidade).
- [ ] **Notificações:** Alertas em tempo real (email/push) para checklists não realizados ou itens críticos marcados como "Não Conforme".

### Médio Prazo: Expansão e Mobile
- [ ] **PWA (Progressive Web App):** Otimizar para instalação em tablets e celulares das lojas, com suporte offline básico.
- [ ] **Gestão de Turnos:** Vincular checklists a turnos específicos e bloquear execução fora do horário.
- [ ] **Upload de Mídia:** Aprimorar o upload de fotos/vídeos nos checklists com compressão automática e pré-visualização rápida.

### Longo Prazo: Inteligência e Escala
- [ ] **IA de Análise:** Usar IA para analisar fotos enviadas nos checklists e sugerir aprovação/reprovação automática.
- [ ] **Multi-Unidade Avançado:** Painel consolidado para franqueadores verem a performance de todas as lojas em uma única tela.
- [ ] **Integração com PDV:** Conectar com sistemas de ponto de venda para cruzar dados de vendas com checklists de produção.
