# Arquitetura Firestore (Codex)

Este documento segue as diretrizes oficiais de modelagem para subcoleções e inclui as melhorias de Desnormalização, Índices e Controle de Permissão.

## 1. Árvore de Paths (Hierarquia)
O "Tenant" pai de tudo é a **Rede** (`networks`), garantindo isolamento total entre corporações (ex: Madero vs Burger King).

- `users/{userId}` *(Coleção Raiz - Perfil estático geral)*
- `networks/{networkId}` *(Coleção Raiz)*
  - `user_roles/{roleId}` *(Subcoleção - Permissões do funcionário na rede)*
  - `trainings/{trainingId}` *(Subcoleção - Catálogo de treinamentos)*
  - `checklists/{checklistId}` *(Subcoleção - Templates de auditoria)*
    - `items/{itemId}` *(Subcoleção - Perguntas do checklist)*
  - `units/{unitId}` *(Subcoleção - Lojas físicas)*
    - `responses/{responseId}` *(Subcoleção - Preenchimentos diários)*
    - `action_plans/{planId}` *(Subcoleção - Planos de ação gerados)*

## 2. Campos e [MELHORIA] Desnormalização
*Visando economizar leituras e carregamento rápido de listas, usaremos duplicação de dados estratégicos.*

- **`responses/{responseId}`**:
  - `checklistId` (string)
  - `completedBy` (userId)
  - `completedByName` (string) **[Desnormalizado]**: Evita buscar a coleção 'users' para exibir "Quem preencheu".
  - `status` ("pending" | "in_progress" | "completed")
  - `itemResponses` (Object/Map)

- **`action_plans/{planId}`**:
  - `responseId` (string)
  - `assignedTo` (userId)
  - `assignedToName` (string) **[Desnormalizado]**: Nome do responsável.

## 3. [MELHORIA] Índices Compostos Previstos
Para que as páginas não apresentem erro de bloqueio de query, o administrador do Firebase precisará criar os seguintes índices na aba "Indexes":

1. **Dashboard de Lojas (Responses):**
   - Collection: `responses`
   - Fields: `startedAt` (Ascending) + `status` (Ascending)
2. **Histórico e Relatórios:**
   - Collection: `responses`
   - Fields: `checklistId` (Ascending) + `startedAt` (Descending)

## 4. [MELHORIA] Segurança e Custom Claims
Adotaremos uma abordagem mista para proteger as Lojas:
- Os **Cargos Especiais** (Super Admin, Gerente de Rede) serão embutidos no token de login usando o Firebase **Custom Claims**, garantindo que as Security Rules as avaliem instantaneamente a custo zero (`request.auth.token.role == 'super_admin'`).
- Os **Vínculos de Lojas Locais** dos operadores serão validados contra a subcoleção `user_roles`, custando apenas 1 leitura no Firebase a cada requisição de segurança (`get(/databases/$(database)/documents/networks/$(netId)/user_roles/$(req.auth.uid)).data.unitId == unitId`).

## 5. Exceções Cadastradas
- Respostas iterativas (`itemResponses`) ficarão dentro do próprio documento `response` em formato de dicionário (`Map`), limitando o peso do documento e cortando 90% das requisições desnecessárias, uma vez que não ultrapassarão o limite de 1MB do Google.
- A exclusão em Cascata (ex: Deletar Rede apaga todas as Lojas e Checklists) será coberta por Cloud Functions ou via exclusão Lógica (`isActive: false`), pois o Delete do pai no Firebase não afeta as subcoleções filhas.
