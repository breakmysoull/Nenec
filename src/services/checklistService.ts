import { db, storage } from "@/lib/firebase";
import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ChecklistType } from "@/types/database";

export type ChecklistItem = {
  id: string;
  title: string;
  type: "check" | "photo" | "observation";
  isRequired: boolean;
};

export type TodayChecklist = {
  id: string;
  name: string;
  type: ChecklistType;
  totalItems: number;
  completedItems: number;
  status: "pending" | "in_progress" | "completed";
  scheduledFor: string | null;
  deadline: string | null;
  items: ChecklistItem[];
  timefenceStart?: string | null;
  timefenceEnd?: string | null;
};

export const checklistService = {
  // =========================================================================
  // 1. GERENCIAMENTO DE MODELOS DE CHECKLIST (DEFINITIONS)
  // Path: networks/{networkId}/checklists/{checklistId}
  // =========================================================================

  upsertChecklist: async (networkId: string, name: string, type: ChecklistType, description?: string) => {
    try {
      const checklistsRef = collection(db, "networks", networkId, "checklists");
      // Verifica se já existe um checklist com mesmo nome e network para ativar
      const q = query(checklistsRef, where("name", "==", name));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const existingDoc = snapshot.docs[0];
        if (!existingDoc.data().isActive) {
          await updateDoc(existingDoc.ref, { isActive: true });
        }
        return existingDoc.id;
      }

      // Cria novo caso não exista
      const newDocRef = await addDoc(checklistsRef, {
        name,
        type,
        isActive: true,
        createdAt: serverTimestamp(),
      });
      return newDocRef.id;
    } catch (error) {
      console.error("Erro ao criar checklist no Firestore:", error);
      return null;
    }
  },

  updateChecklist: async (networkId: string, checklistId: string, updates: { name?: string; isActive?: boolean; timefenceStart?: string | null; timefenceEnd?: string | null }) => {
    try {
      const docRef = doc(db, "networks", networkId, "checklists", checklistId);
      await updateDoc(docRef, updates);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar checklist no Firestore:", error);
      return false;
    }
  },

  // =========================================================================
  // 1.1 GERENCIAMENTO DE ITENS DO CHECKLIST
  // Path: networks/{networkId}/checklists/{checklistId}/items/{itemId}
  // =========================================================================

  upsertChecklistItems: async (networkId: string, checklistId: string, items: { title: string; type?: "check" | "photo" | "observation"; isRequired?: boolean }[]) => {
    try {
      const itemsRef = collection(db, "networks", networkId, "checklists", checklistId, "items");
      
      // Busca títulos existentes para não duplicar
      const existingDocs = await getDocs(itemsRef);
      const existingTitles = new Set(existingDocs.docs.map(i => i.data().title.trim().toLowerCase()));

      let orderIndex = existingDocs.size + 1;

      for (const item of items) {
        if (!existingTitles.has(item.title.trim().toLowerCase())) {
          await addDoc(itemsRef, {
            title: item.title,
            type: item.type || "check",
            isRequired: item.isRequired ?? true,
            orderIndex: orderIndex++,
            createdAt: serverTimestamp()
          });
        }
      }
      return true;
    } catch (error) {
      console.error("Erro ao inserir itens no Firestore:", error);
      return false;
    }
  },

  addChecklistItem: async (networkId: string, checklistId: string, item: { title: string; isRequired?: boolean; orderIndex: number }) => {
    try {
      const itemsRef = collection(db, "networks", networkId, "checklists", checklistId, "items");
      await addDoc(itemsRef, {
        title: item.title,
        isRequired: item.isRequired ?? true,
        orderIndex: item.orderIndex,
        type: "check",
        createdAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Erro ao adicionar item de checklist no Firestore:", error);
      return false;
    }
  },

  updateChecklistItem: async (networkId: string, checklistId: string, itemId: string, updates: { title?: string; isRequired?: boolean; orderIndex?: number }) => {
    try {
      const docRef = doc(db, "networks", networkId, "checklists", checklistId, "items", itemId);
      await updateDoc(docRef, updates);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar item do checklist no Firestore:", error);
      return false;
    }
  },

  deleteChecklistItem: async (networkId: string, checklistId: string, itemId: string) => {
    try {
      const docRef = doc(db, "networks", networkId, "checklists", checklistId, "items", itemId);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error("Erro ao excluir item do checklist no Firestore:", error);
      return false;
    }
  },

  // =========================================================================
  // 2. EXECUÇÃO DE CHECKLISTS E VERIFICAÇÕES DIÁRIAS
  // Path: networks/{networkId}/units/{unitId}/responses/{responseId}
  // =========================================================================

  getTodayChecklists: async (networkId: string, unitId: string): Promise<TodayChecklist[]> => {
    try {
      // 1. Busca todos os checklists ativos da rede
      const checklistsRef = collection(db, "networks", networkId, "checklists");
      const qChecklists = query(checklistsRef, where("isActive", "==", true));
      const checklistsSnap = await getDocs(qChecklists);
      
      const checklists: any[] = [];
      checklistsSnap.forEach(doc => checklists.push({ id: doc.id, ...doc.data() }));

      // 2. Para cada checklist, busca seus itens
      const itemsByChecklist = new Map<string, ChecklistItem[]>();
      await Promise.all(checklists.map(async (c) => {
        const itemsRef = collection(db, "networks", networkId, "checklists", c.id, "items");
        const itemsSnap = await getDocs(itemsRef);
        const items: ChecklistItem[] = [];
        itemsSnap.forEach(iDoc => {
          const idata = iDoc.data();
          items.push({
            id: iDoc.id,
            title: idata.title,
            type: idata.type,
            isRequired: idata.isRequired
          });
        });
        itemsByChecklist.set(c.id, items);
      }));

      // 3. Busca as responses de hoje para a unidade
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const responsesRef = collection(db, "networks", networkId, "units", unitId, "responses");
      const qResponses = query(responsesRef, where("startedAt", ">=", startOfDay));
      const responsesSnap = await getDocs(qResponses);
      
      const responseByChecklist = new Map<string, any>();
      responsesSnap.forEach(rDoc => {
        const rdata = rDoc.data();
        responseByChecklist.set(rdata.checklistId, { id: rDoc.id, ...rdata });
      });

      // 4. Monta o objeto final TodayChecklist
      return checklists.map(c => {
        const items = itemsByChecklist.get(c.id) || [];
        const response = responseByChecklist.get(c.id);
        
        // Verifica itens completados lendo o Map `itemResponses` salvo desnormalizado
        const itemResponses = response?.itemResponses || {};
        const completedItems = Object.keys(itemResponses).length;
        
        let status: "pending" | "in_progress" | "completed" = "pending";
        if (response) {
          status = response.status || "in_progress";
        }

        return {
          id: c.id,
          name: c.name,
          type: c.type as ChecklistType,
          totalItems: items.length,
          completedItems,
          status,
          scheduledFor: null,
          deadline: "Hoje",
          items,
          timefenceStart: c.timefenceStart || null,
          timefenceEnd: c.timefenceEnd || null
        };
      }).sort((a, b) => {
        const aIsBowl = a.name.includes("BOWL");
        const bIsBowl = b.name.includes("BOWL");
        if (aIsBowl && !bIsBowl) return -1;
        if (!aIsBowl && bIsBowl) return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error("Erro ao carregar checklists de hoje:", error);
      return [];
    }
  },

  startChecklistRun: async (networkId: string, unitId: string, checklistId: string, userId: string) => {
    try {
      const responsesRef = collection(db, "networks", networkId, "units", unitId, "responses");
      const newDocRef = await addDoc(responsesRef, {
        checklistId,
        completedBy: userId,
        status: "in_progress",
        startedAt: serverTimestamp(),
        itemResponses: {} // Inicializa o mapa de respostas
      });
      return newDocRef.id;
    } catch (error) {
      console.error("Erro ao iniciar checklist:", error);
      return null;
    }
  },

  saveChecklistItemResult: async (networkId: string, unitId: string, runId: string, itemId: string, payload: { status: "ok" | "nok"; reason?: string; observation?: string; photoUrl?: string | null }) => {
    try {
      const docRef = doc(db, "networks", networkId, "units", unitId, "responses", runId);
      
      // Salva o item dentro do map itemResponses evitando subcoleções desnecessárias
      await updateDoc(docRef, {
        [`itemResponses.${itemId}`]: {
          status: payload.status,
          reason: payload.reason || null,
          observation: payload.observation || null,
          photoUrl: payload.photoUrl || null,
          checkedAt: new Date().toISOString()
        }
      });
      return true;
    } catch (error) {
      console.error("Erro ao salvar resultado de item:", error);
      return false;
    }
  },

  createActionPlan: async (networkId: string, unitId: string, payload: { responseId: string; description: string; assignedTo?: string }) => {
    try {
      const plansRef = collection(db, "networks", networkId, "units", unitId, "action_plans");
      const newDocRef = await addDoc(plansRef, {
        responseId: payload.responseId,
        description: payload.description,
        assignedTo: payload.assignedTo || null,
        status: "PENDING",
        createdAt: serverTimestamp()
      });
      return newDocRef.id;
    } catch (error) {
      console.error("Erro ao criar plano de ação:", error);
      return null;
    }
  },

  completeChecklistRun: async (networkId: string, unitId: string, runId: string) => {
    try {
      const docRef = doc(db, "networks", networkId, "units", unitId, "responses", runId);
      await updateDoc(docRef, {
        isComplete: true,
        completedAt: serverTimestamp(),
        status: "completed"
      });
      return true;
    } catch (error) { 
      console.error("Erro ao completar checklist:", error);
      return false; 
    }
  },
  // =========================================================================
  // 3. STORAGE DE FOTOS E EVIDÊNCIAS
  // Path: Firebase Storage
  // =========================================================================

  uploadChecklistPhoto: async (file: File, networkId: string, unitId: string, runId: string, itemId: string) => {
    try {
      const filePath = `evidences/${networkId}/${unitId}/${runId}/${itemId}-${Date.now()}.jpg`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error("Erro ao enviar foto do checklist:", error);
      return null;
    }
  },

  uploadFinalPhoto: async (file: File, networkId: string, unitId: string, runId: string, tag: "setup" | "stock") => {
    try {
      const filePath = `evidences/${networkId}/${unitId}/${runId}/final-${tag}-${Date.now()}.jpg`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file, { contentType: "image/jpeg" });
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (error) {
      console.error("Erro ao enviar foto final:", error);
      return null;
    }
  },

  saveFinalEvidence: async (networkId: string, unitId: string, runId: string, photoUrl: string, userId: string) => {
    try {
      const evRef = collection(db, "networks", networkId, "units", unitId, "responses", runId, "evidences");
      await addDoc(evRef, {
        fileUrl: photoUrl,
        uploadedBy: userId,
        fileType: "image",
        uploadedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Erro ao salvar evidência final:", error);
      return false;
    }
  },

  // =========================================================================
  // 4. VALIDAÇÕES E ANALYTICS (Esqueletos p/ Fase Secundária)
  // =========================================================================

  undoChecklistItemAnswer: async (networkId: string, unitId: string, runId: string, itemId: string) => {
    try {
      const docRef = doc(db, "networks", networkId, "units", unitId, "responses", runId);
      // Workaround: setando como nulo. O ideal é importar `deleteField` do firestore.
      await updateDoc(docRef, {
        [`itemResponses.${itemId}`]: null
      });
      return true;
    } catch (error) { return false; }
  },

  getChecklistCompletionStatus: async (networkId: string, unitId: string, runId: string) => {
    // Esqueleto: Lerá o runId e os itens preenchidos e comparará com o total obrigatório do checklist.
    return { isComplete: false, totalItems: 0, requiredItems: 0, respondedItems: 0 };
  },

  getChecklistQualityIssues: async (networkId: string, unitId: string, runId: string) => {
    // Esqueleto: Mapeia as "itemResponses" procurando status == "nok" e fotoUrl ausentes se exigido.
    return [] as string[];
  },

  validateChecklistDefinition: async (networkId: string, checklistId: string) => {
    return { valid: true, errors: [] as string[] };
  },

  getAnalyticsData: async (networkId: string, unitId: string | undefined, isSuperAdmin: boolean, days = 7) => {
    // Requer uso de Cloud Functions ou índices compostos complexos no app.
    return { overallCompliance: 0, totalRuns: 0, totalComplete: 0, dailyData: [], typeBreakdown: [] };
  },

  // =========================================================================
  // 5. REVISÃO E HISTÓRICO (Esqueletos p/ UI)
  // =========================================================================

  getCompletedChecklistRuns: async (networkId: string, unitId: string | undefined, isSuperAdmin: boolean) => {
    return [];
  },

  getChecklistRunDetails: async (networkId: string, unitId: string | undefined, runId: string) => {
    return [];
  },

  reviewChecklist: async (networkId: string, unitId: string | undefined, runId: string, observation: string, reviewedBy: string) => {
    return true;
  },


  seedOperationalChecklists: async (networkId: string) => {
    const defs: Array<{
      name: string
      type: ChecklistType
      description: string
      items: string[]
    }> = [
      {
        name: "CHECKLIST ABERTURA — POKE",
        type: "abertura",
        description: "Setor: Cozinha | Responsável: Preparador Poke | Horário: Antes das 11:00",
        items: [
          "Chegar com uniforme completo e limpo",
          "Guardar objetos pessoais",
          "Retirar adornos (relógio, anéis, pulseiras)",
          "Colocar touca cobrindo cabelo e orelhas",
          "Higienizar as mãos",
          "Abastecer papeleira e saboneteira do setor",
          "Montar lixeira do setor",
          "Limpar piso da área Poke",
          "Limpar superfícies de inox e telas KDS",
          "Verificar funcionamento de refrigeradores",
          "Verificar ingrediente: Cebola roxa",
          "Verificar ingrediente: Quinoa",
          "Verificar ingrediente: Mix de folhas",
          "Verificar ingrediente: Arroz japonês",
          "Verificar ingrediente: Pepino laminado",
          "Verificar ingrediente: Cebolinha",
          "Verificar ingrediente: Edamame",
          "Verificar ingrediente: Abacate",
          "Verificar ingrediente: Manga",
          "Verificar ingrediente: Sunomono",
          "Verificar ingrediente: Pepino palito",
          "Verificar ingrediente: Cenoura palito",
          "Verificar ingrediente: Shimeji",
          "Verificar ingrediente: Salmão",
          "Verificar ingrediente: Atum",
          "Verificar complemento: Bear Flakes",
          "Verificar complemento: Nori",
          "Verificar complemento: Farofa vegana",
          "Verificar complemento: Gergelim torrado",
          "Verificar molho: Molho Black Beer",
          "Verificar molho: Molho Cítrico",
          "Verificar molho: Molho Cítrico Vegano",
          "Verificar molho: Molho Cenoura",
          "Verificar molho: Molho Togarashi",
          "Verificar molho: Azeite de trufas",
          "Conferir etiquetas de validade de todos os insumos",
          "Realizar requisição de itens faltantes",
          "Organizar insumos nas cubas/GNs",
          "Informar coordenador sobre produtos vencidos",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — BOWL",
        type: "abertura",
        description: "Setor: Cozinha | Responsável: Preparador Bowl | Horário: Antes das 11:00",
        items: [
          "Chegar com uniforme completo e limpo",
          "Higienização pessoal completa",
          "Abastecer borrifadores do setor",
          "Montar lixeira específica",
          "Limpar piso da área Bowl",
          "Limpar superfícies de trabalho",
          "Temperatura de mantenedores",
          "Mix arroz 7 grãos com cogumelo",
          "Mix arroz 7 grãos",
          "Arroz de brócolis",
          "Feijão carioca",
          "Feijão fradinho",
          "Purê de abóbora",
          "Vinagrete",
          "Brócolis",
          "Couve flor",
          "Batata doce",
          "Abóbora",
          "Abobrinha",
          "Tomate cereja e milho",
          "Couve",
          "Rúcula",
          "Creme de milho",
          "Creme de queijo",
          "Queijo coalho",
          "Bacon salgado",
          "Farofa de pão",
          "Farofa de banana",
          "Gergelim torrado",
          "Cebola crocante",
          "Carne da vovó",
          "Picadinho vegano",
          "Carne picadinho",
          "Salmão grelhado",
          "Frango grelhado",
          "Molho Teriyaki",
          "Molho da Vovó",
          "Molho Cítrico",
          "Molho Pesto",
          "Molho Picadinho Vegano",
          "Caldo de mandioquinha",
          "Canja",
          "Quinoa crocante",
          "Castanha caramelizada",
          "Validades conferidas",
          "Reposições solicitadas",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — WRAP",
        type: "abertura",
        description: "Setor: Cozinha | Responsável: Preparador Wrap | Horário: Não informado",
        items: [
          "Uniforme e higiene pessoal OK",
          "Área limpa e organizada",
          "Equipamentos verificados",
          "Verificar vegetal: Picles de repolho",
          "Verificar vegetal: Picles de cenoura",
          "Verificar vegetal: Cebolinha",
          "Verificar vegetal: Alface romana",
          "Verificar vegetal: Alface americana",
          "Verificar vegetal: Alface americana com roxa",
          "Verificar vegetal: Mix de folhas",
          "Verificar vegetal: Tomate cereja ao meio",
          "Verificar vegetal: Tomate rodela",
          "Verificar vegetal: Pepino fatiado",
          "Verificar pasta/creme: Guacamole",
          "Verificar pasta/creme: Hommus",
          "Verificar pasta/creme: Cream cheese",
          "Verificar pasta/creme: Creme de cogumelos",
          "Verificar pasta/creme: Creme de milho",
          "Verificar pasta/creme: Frijoles",
          "Verificar complemento: Azeitona preta fatiada",
          "Verificar complemento: Parmesão ralado",
          "Verificar complemento: Farofa de bacon",
          "Verificar complemento: Croutons",
          "Verificar complemento: Bacon laqueado",
          "Verificar complemento: Castanha de cajú",
          "Verificar complemento: Granola salgada",
          "Verificar complemento: Cheddar",
          "Verificar molho: Chimichurri",
          "Verificar molho: Molho Ranch",
          "Verificar molho: Molho Red Chili",
          "Verificar molho: Molho Mostarda e Mel",
          "Verificar molho: Molho Gorgonzola",
          "Verificar molho: Molho Barbecue",
          "Verificar molho: Molho Tahini",
          "Verificar molho: Azeite",
          "Verificar sal (saleiro abastecido)",
          "Conferir tortilhas/wraps disponíveis",
          "Verificar equipamento de aquecimento (se houver)",
          "Organizar estação de montagem",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — SALADA",
        type: "abertura",
        description: "Setor: Cozinha | Responsável: Preparador Salada | Horário: Não informado",
        items: [
          "Preparação pessoal completa",
          "Limpeza inicial da área",
          "Verificar vegetal grelhado: Abobrinha grelhada",
          "Verificar vegetal grelhado: Brócolis",
          "Verificar vegetal grelhado: Milho grelhado",
          "Verificar vegetal fresco: Pepino com cebola roxa",
          "Verificar vegetal fresco: Tomate cereja",
          "Verificar vegetal fresco: Picles de manga",
          "Verificar vegetal fresco: Picles de cenoura",
          "Verificar base: Fusili",
          "Verificar base: Quinoa",
          "Verificar base: Mix de folhas",
          "Verificar base: Alface romana baby",
          "Verificar proteína: Mussarela de búfala",
          "Verificar proteína: Parmesão",
          "Verificar proteína: Bacon laqueado",
          "Verificar proteína: Salmão desfiado",
          "Verificar complemento: Guacamole",
          "Verificar complemento: Azeitona",
          "Verificar complemento: Beer Flakes",
          "Verificar complemento: Croutons",
          "Verificar complemento: Granola salgada",
          "Verificar complemento: Nori",
          "Verificar complemento: Farofa vegana",
          "Verificar complemento: Gergelim torrado",
          "Verificar molho: Molho Mostarda e Mel",
          "Verificar molho: Molho Pesto",
          "Verificar molho: Molho Gorgonzola",
          "Verificar molho: Molho Ranch",
          "Verificar molho: Molho Itália",
          "Verificar bowls/embalagens para saladas",
          "Organizar estação de montagem",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — PROTEÍNA",
        type: "abertura",
        description: "Setor: Cozinha | Praça: Proteína | Responsável: Preparador Proteína | Horário: Antes das 11:00",
        items: [
          "Uniforme completo (atenção à touca)",
          "Limpeza da área de proteínas",
          "Verificar proteína pronta: Apara de frango",
          "Verificar proteína pronta: Frango defumado",
          "Verificar proteína pronta: Carne da vovó",
          "Verificar proteína pronta: Carne steak",
          "Verificar proteína pronta: Frango crocante",
          "Verificar proteína pronta: Frango italianinha",
          "Verificar proteína pronta: Espeto de sobrecoxa",
          "Verificar proteína pronta: Smash burger",
          "Verificar proteína pronta: Falafel",
          "Verificar proteína pronta: Ovos fritos",
          "Verificar proteína pronta: Clara de ovos fritos",
          "Verificar acompanhamento: Cebola caramelizada",
          "Verificar molho: Molho da vovó",
          "Verificar molho: Chimichurri",
          "Verificar massa (se aplicável): Massa branca",
          "Verificar massa (se aplicável): Massa amarela",
          "Verificar massa (se aplicável): Massa preta",
          "Verificar massa (se aplicável): Massa roxa",
          "Verificar equipamentos (chapa, fritadeira)",
          "Conferir estoque de proteínas para cocção",
          "Verificar temperatura de geladeiras",
          "Organizar estação de finalização",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — CHAPA/FRITADEIRA",
        type: "abertura",
        description: "Setor: Cozinha | Área: Cocção | Responsável: Chapeiro/Fritador | Horário: 8:00-9:00",
        items: [
          "Preparação pessoal completa",
          "Limpar chapa completamente",
          "Limpar fritadeira (por dentro e por fora)",
          "Limpar mini freezer",
          "Limpar superfícies de inox",
          "Abastecer papeleira e saboneteira",
          "Montar lixeiras específicas",
          "Chapa - testar funcionamento",
          "Fritadeira - testar aquecimento",
          "Verificar termostatos",
          "Verificar exaustão/coifa",
          "Conferir etiquetas de validade",
          "Organizar proteínas para cocção",
          "Verificar estoque de batatas para fritar",
          "Verificar óleo da fritadeira (nível e qualidade)",
          "Preparar bandejas organizadas",
          "Ligar chapa para pré-aquecimento",
          "Ligar fritadeira (se necessário)",
          "Testar temperatura ideal",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — DELIVERY",
        type: "abertura",
        description: "Setor: Salão | Área: Delivery | Responsável: Atendente Delivery | Horário: Antes das 11:00",
        items: [
          "Uniforme completo",
          "Limpar piso do delivery",
          "Limpar superfícies de inox",
          "Organizar área de embalagem",
          "Verificar seladora (ligar e testar)",
          "Verificar refrigeradores do delivery",
          "Preencher planilha de temperatura",
          "Verificar molhos embalados (Ranch, Mostarda e Mel, etc.)",
          "Verificar condimentos (Bear Flakes, farofas, cebola crispy)",
          "Verificar bebidas (sucos, refrigerantes, kombuchas)",
          "Verificar sobremesas (brownies)",
          "Verificar talheres, guardanapos, sacolas",
          "Verificar tablets/impressoras",
          "Testar conexão com apps (iFood, UberEats, etc.)",
          "Verificar estoque de embalagens",
          "Conferir lista de pedidos pendentes (se houver)",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — BAR/SOBREMESA",
        type: "abertura",
        description: "Setor: Salão | Área: Bar | Responsável: Barista | Horário: Antes das 11:00",
        items: [
          "Preparação pessoal",
          "Limpar máquina de café",
          "Abastecer com água",
          "Abastecer com grãos",
          "Testar funcionamento",
          "Fazer teste de extração",
          "Verificar base: Morning Shot de tangerina",
          "Verificar base: Supercoffee Choconilla",
          "Verificar base: Whey de coco",
          "Verificar base: Whey de baunilha",
          "Verificar base: Whey de chocolate",
          "Verificar frutas congeladas",
          "Verificar líquidos (leites, iogurtes, água de coco)",
          "Verificar complementos (canela, mel, pasta de amendoim)",
          "Limpar liquidificadores",
          "Organizar copos e canudos",
          "Verificar gelo",
          "Organizar estação de preparo",
          "Verificar brownies",
          "Verificar tortas/bombs",
          "Organizar display",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — LAVAGEM",
        type: "abertura",
        description: "Setor: Apoio | Área: Lavagem | Responsável: Auxiliar de Lavagem | Horário: 8:00",
        items: [
          "Uniforme completo (com avental impermeável)",
          "Limpar pias e bancadas",
          "Organizar prateleiras",
          "Verificar produtos de limpeza",
          "Abastecer sabão e desinfetante",
          "Verificar abastecimento de produtos da máquina",
          "Fazer lavagem inicial da máquina",
          "Verificar temperatura da água",
          "Testar ciclos de lavagem",
          "Montar bandejas com jogo americano",
          "Organizar cestos para talheres",
          "Preparar área de pré-lavagem",
          "Verificar estoque de luvas",
          "Conferir caixas de utensílios das praças",
          "Organizar por tipo (cubas, potes, talheres)",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — LIMPEZA GERAL",
        type: "abertura",
        description: "Setor: Apoio | Responsável: Auxiliar de Limpeza | Horário: 8:00-11:00",
        items: [
          "Limpar e desinfetar área do lixo",
          "Organizar contêineres do lixo",
          "Verificar vazamentos na área do lixo",
          "Limpar e desinfetar bebedouro e pia de lavagem de mãos",
          "Abastecer sabonete e papel (bebedouro/pia)",
          "Varrer e passar pano úmido no salão",
          "Limpar janelas/vidros do salão",
          "Organizar tapetes externos (se aplicável)",
          "Limpar sanitários dos banheiros clientes",
          "Limpar pias e espelhos dos banheiros clientes",
          "Abastecer papel, sabonete e toalhas (banheiros clientes)",
          "Varrer calçada",
          "Limpar mesas externas",
          "Verificar lixeiras externas",
          "Limpar e desinfetar banheiros funcionários",
          "Abastecer insumos (banheiros funcionários)",
          "Limpar mesas e bancadas do refeitório e corredor",
          "Organizar armários do refeitório e corredor",
          "Varrer e lavar piso do refeitório e corredor",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — COORDENAÇÃO",
        type: "abertura",
        description: "Setor: Gerência | Responsável: Coordenador | Horário: 8:00-11:00",
        items: [
          "Conferir presença de todos",
          "Verificar uniformes",
          "Verificar adornos retirados",
          "Verificar toucas",
          "Fazer plano de chão",
          "Checar caixa e totens",
          "Testar internet",
          "Verificar menu boards",
          "Verificar telas de senha",
          "Testar sistema de impressão",
          "Verificar todas as praças",
          "Conferir validades",
          "Verificar temperaturas",
          "Verificar limpeza geral",
          "Confirmar requisições",
          "Ligar ar condicionado",
          "Ligar som (playlist)",
          "Ligar iluminação",
          "Testar máquina de café",
          "Posicionar equipe",
          "Degustação amostral",
          "Verificar apresentação",
          "Verificar complemento: Nori",
          "Verificar complemento: Farofa vegana",
          "Verificar complemento: Gergelim torrado",
          "Verificar molho: Molho Mostarda e Mel",
          "Verificar molho: Molho Pesto",
          "Verificar molho: Molho Gorgonzola",
          "Verificar molho: Molho Ranch",
          "Verificar molho: Molho Itália",
          "Verificar bowls/embalagens para saladas",
          "Organizar estação de montagem",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — PROTEÍNA",
        type: "abertura",
        description: "Setor: Cozinha | Praça: Proteína | Responsável: Preparador Proteína | Horário: Antes das 11:00",
        items: [
          "Uniforme completo (atenção à touca)",
          "Limpeza da área de proteínas",
          "Verificar proteína pronta: Apara de frango",
          "Verificar proteína pronta: Frango defumado",
          "Verificar proteína pronta: Carne da vovó",
          "Verificar proteína pronta: Carne steak",
          "Verificar proteína pronta: Frango crocante",
          "Verificar proteína pronta: Frango italianinha",
          "Verificar proteína pronta: Espeto de sobrecoxa",
          "Verificar proteína pronta: Smash burger",
          "Verificar proteína pronta: Falafel",
          "Verificar proteína pronta: Ovos fritos",
          "Verificar proteína pronta: Clara de ovos fritos",
          "Verificar acompanhamento: Cebola caramelizada",
          "Verificar molho: Molho da vovó",
          "Verificar molho: Chimichurri",
          "Verificar massa (se aplicável): Massa branca",
          "Verificar massa (se aplicável): Massa amarela",
          "Verificar massa (se aplicável): Massa preta",
          "Verificar massa (se aplicável): Massa roxa",
          "Verificar equipamentos (chapa, fritadeira)",
          "Conferir estoque de proteínas para cocção",
          "Verificar temperatura de geladeiras",
          "Organizar estação de finalização",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — CHAPA/FRITADEIRA",
        type: "abertura",
        description: "Setor: Cozinha | Área: Cocção | Responsável: Chapeiro/Fritador | Horário: 8:00-9:00",
        items: [
          "Preparação pessoal completa",
          "Limpar chapa completamente",
          "Limpar fritadeira (por dentro e por fora)",
          "Limpar mini freezer",
          "Limpar superfícies de inox",
          "Abastecer papeleira e saboneteira",
          "Montar lixeiras específicas",
          "Chapa - testar funcionamento",
          "Fritadeira - testar aquecimento",
          "Verificar termostatos",
          "Verificar exaustão/coifa",
          "Conferir etiquetas de validade",
          "Organizar proteínas para cocção",
          "Verificar estoque de batatas para fritar",
          "Verificar óleo da fritadeira (nível e qualidade)",
          "Preparar bandejas organizadas",
          "Ligar chapa para pré-aquecimento",
          "Ligar fritadeira (se necessário)",
          "Testar temperatura ideal",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — DELIVERY",
        type: "abertura",
        description: "Setor: Salão | Área: Delivery | Responsável: Atendente Delivery | Horário: Antes das 11:00",
        items: [
          "Uniforme completo",
          "Limpar piso do delivery",
          "Limpar superfícies de inox",
          "Organizar área de embalagem",
          "Verificar seladora (ligar e testar)",
          "Verificar refrigeradores do delivery",
          "Preencher planilha de temperatura",
          "Verificar molhos embalados (Ranch, Mostarda e Mel, etc.)",
          "Verificar condimentos (Bear Flakes, farofas, cebola crispy)",
          "Verificar bebidas (sucos, refrigerantes, kombuchas)",
          "Verificar sobremesas (brownies)",
          "Verificar talheres, guardanapos, sacolas",
          "Verificar tablets/impressoras",
          "Testar conexão com apps (iFood, UberEats, etc.)",
          "Verificar estoque de embalagens",
          "Conferir lista de pedidos pendentes (se houver)",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — BAR/SOBREMESA",
        type: "abertura",
        description: "Setor: Salão | Área: Bar | Responsável: Barista | Horário: Antes das 11:00",
        items: [
          "Preparação pessoal",
          "Limpar máquina de café",
          "Abastecer com água",
          "Abastecer com grãos",
          "Testar funcionamento",
          "Fazer teste de extração",
          "Verificar base: Morning Shot de tangerina",
          "Verificar base: Supercoffee Choconilla",
          "Verificar base: Whey de coco",
          "Verificar base: Whey de baunilha",
          "Verificar base: Whey de chocolate",
          "Verificar frutas congeladas",
          "Verificar líquidos (leites, iogurtes, água de coco)",
          "Verificar complementos (canela, mel, pasta de amendoim)",
          "Limpar liquidificadores",
          "Organizar copos e canudos",
          "Verificar gelo",
          "Organizar estação de preparo",
          "Verificar brownies",
          "Verificar tortas/bombs",
          "Organizar display",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — LAVAGEM",
        type: "abertura",
        description: "Setor: Apoio | Área: Lavagem | Responsável: Auxiliar de Lavagem | Horário: 8:00",
        items: [
          "Uniforme completo (com avental impermeável)",
          "Limpar pias e bancadas",
          "Organizar prateleiras",
          "Verificar produtos de limpeza",
          "Abastecer sabão e desinfetante",
          "Verificar abastecimento de produtos da máquina",
          "Fazer lavagem inicial da máquina",
          "Verificar temperatura da água",
          "Testar ciclos de lavagem",
          "Montar bandejas com jogo americano",
          "Organizar cestos para talheres",
          "Preparar área de pré-lavagem",
          "Verificar estoque de luvas",
          "Conferir caixas de utensílios das praças",
          "Organizar por tipo (cubas, potes, talheres)",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — LIMPEZA GERAL",
        type: "abertura",
        description: "Setor: Apoio | Responsável: Auxiliar de Limpeza | Horário: 8:00-11:00",
        items: [
          "Limpar e desinfetar área do lixo",
          "Organizar contêineres do lixo",
          "Verificar vazamentos na área do lixo",
          "Limpar e desinfetar bebedouro e pia de lavagem de mãos",
          "Abastecer sabonete e papel (bebedouro/pia)",
          "Varrer e passar pano úmido no salão",
          "Limpar janelas/vidros do salão",
          "Organizar tapetes externos (se aplicável)",
          "Limpar sanitários dos banheiros clientes",
          "Limpar pias e espelhos dos banheiros clientes",
          "Abastecer papel, sabonete e toalhas (banheiros clientes)",
          "Varrer calçada",
          "Limpar mesas externas",
          "Verificar lixeiras externas",
          "Limpar e desinfetar banheiros funcionários",
          "Abastecer insumos (banheiros funcionários)",
          "Limpar mesas e bancadas do refeitório e corredor",
          "Organizar armários do refeitório e corredor",
          "Varrer e lavar piso do refeitório e corredor",
        ],
      },
      {
        name: "CHECKLIST ABERTURA — COORDENAÇÃO",
        type: "abertura",
        description: "Setor: Gerência | Responsável: Coordenador | Horário: 8:00-11:00",
        items: [
          "Conferir presença de todos",
          "Verificar uniformes",
          "Verificar adornos retirados",
          "Verificar toucas",
          "Fazer plano de chão",
          "Checar caixa e totens",
          "Testar internet",
          "Verificar menu boards",
          "Verificar telas de senha",
          "Testar sistema de impressão",
          "Verificar todas as praças",
          "Conferir validades",
          "Verificar temperaturas",
          "Verificar limpeza geral",
          "Confirmar requisições",
          "Ligar ar condicionado",
          "Ligar som (playlist)",
          "Ligar iluminação",
          "Testar máquina de café",
          "Posicionar equipe",
          "Degustação amostral",
          "Verificar apresentação",
          "Confirmar estoques",
          "Liberar abertura",
        ],
      },
    ]
    for (const def of defs) {
      const checklistId = await checklistService.upsertChecklist(networkId, def.name, def.type, def.description)
      if (!checklistId) continue
      await checklistService.upsertChecklistItems(networkId, checklistId, def.items.map((t) => ({ title: t })))
    }
    return true
  },
};
