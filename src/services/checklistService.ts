import { supabase } from "@/integrations/supabase/client";
import { ChecklistType } from "@/types/database";
import { Tables } from "@/integrations/supabase/types";

type ChecklistItemType = Tables<"checklist_items">["item_type"];

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
};

type SaveChecklistItemResultInput = {
  runId: string;
  itemId: string;
  status: "ok" | "nok";
  reason?: string;
  observation?: string;
  photoUrl?: string | null;
  userId: string;
};

const mapItemType = (itemType: ChecklistItemType): ChecklistItem["type"] => {
  if (itemType === "foto_obrigatoria") return "photo";
  if (itemType === "video_opcional") return "observation";
  return "check";
};

const formatDeadlineLabel = () => {
  return "Hoje";
};

export const checklistService = {
  uploadChecklistPhoto: async (file: File, runId: string, itemId: string) => {
    try {
      const filePath = `${runId}/${itemId}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("checklist-evidences")
        .upload(filePath, file, { upsert: true, contentType: "image/jpeg" });

      if (error) {
        console.error("Erro ao enviar foto do checklist:", error);
        return null;
      }

      const { data } = supabase.storage.from("checklist-evidences").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error("Erro ao enviar foto do checklist:", error);
      return null;
    }
  },

  uploadFinalPhoto: async (file: File, runId: string, tag: "setup" | "stock") => {
    try {
      const filePath = `${runId}/final-${tag}-${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from("checklist-evidences")
        .upload(filePath, file, { upsert: true, contentType: "image/jpeg" });
      if (error) return null;
      const { data } = supabase.storage.from("checklist-evidences").getPublicUrl(filePath);
      return data.publicUrl;
    } catch {
      return null;
    }
  },

  saveFinalEvidence: async (photoUrl: string, userId: string) => {
    try {
      const { error } = await supabase.from("checklist_evidences").insert({
        file_url: photoUrl,
        uploaded_by: userId,
        file_type: "image",
      });
      if (error) return false;
      return true;
    } catch {
      return false;
    }
  },

  getTodayChecklists: async (unitId: string): Promise<TodayChecklist[]> => {
    try {
      console.log("SUPABASE URL:", import.meta.env.VITE_SUPABASE_URL)
      console.log("UNIT ID:", unitId)
      const { data: unit, error: unitError } = await supabase
        .from("units")
        .select("network_id")
        .eq("id", unitId)
        .single();

      if (unitError) {
        console.error("Erro ao buscar unidade:", unitError);
        return [];
      }

      if (!unit?.network_id) {
        console.log("UNIT RESULT:", unit)
        return [];
      }

      console.log("NETWORK ID USADO NA QUERY:", unit.network_id)
      const { data: checklistsData, error: checklistsError } = await supabase
        .from("checklists")
        .select("id, name, checklist_type, is_active")
        .eq("network_id", unit.network_id)
        .eq("is_active", true);

      if (checklistsError) {
        console.error("Erro ao buscar checklists:", checklistsError);
        return [];
      }

      let checklists = checklistsData || [];

      // Ordenação customizada: BOWL primeiro, depois os outros por nome
      checklists.sort((a, b) => {
        const aIsBowl = a.name.includes("BOWL");
        const bIsBowl = b.name.includes("BOWL");
        if (aIsBowl && !bIsBowl) return -1;
        if (!aIsBowl && bIsBowl) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log("CHECKLISTS RAW (Sorted):", checklists)
      if (checklists.length > 0) {
        console.log("Nomes dos checklists encontrados:", checklists.map(c => c.name));
      }
      
      const hasBowl = checklists.some(c => c.name.includes("BOWL"));
      console.log("TEM BOWL NA LISTA?", hasBowl);

      if (!hasBowl) {
        console.log("BOWL não encontrado! Tentando forçar o seed...");
        await checklistService.seedOperationalChecklists(unit.network_id);
        // Recarrega checklists após o seed
        const { data: recheck, error: recheckErr } = await supabase
          .from("checklists")
          .select("id, name, checklist_type, is_active")
          .eq("network_id", unit.network_id)
          .eq("is_active", true);
        if (!recheckErr && recheck) {
          console.log("Checklists após seed forçado:", recheck.map(c => c.name));
          // Atualiza a variável local para o restante da função
          checklists = recheck;
        }
      }

      if (checklists.length === 0) {
        const { data: all } = await supabase.from("checklists").select("*")
        console.log("CHECKLISTS SEM FILTRO:", all)
      }

      const checklistIds = checklists.map((checklist) => checklist.id);

      if (checklistIds.length === 0) {
        return [];
      }

      const { data: itemsTest, error: itemsTestError } = await supabase
        .from("checklist_items")
        .select("*");
      console.log("ITEMS TESTE:", itemsTest);
      console.log("ITEMS ERROR:", itemsTestError);

      let items: {
        id: string;
        title: string;
        item_type: ChecklistItemType;
        required: boolean | null;
        order_index: number | null;
        checklist_id: string;
      }[] = [];
      const { data: itemsData, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id, title, item_type, required, order_index, checklist_id")
        .in("checklist_id", checklistIds)
        .order("order_index", { ascending: true });

      if (itemsError) {
        console.error("Erro ao buscar itens do checklist:", itemsError);
        const fallbackResults = await Promise.all(
          checklistIds.map((checklistId) =>
            supabase
              .from("checklist_items")
              .select("id, title, item_type, required, order_index, checklist_id")
              .eq("checklist_id", checklistId)
              .order("order_index", { ascending: true })
          )
        );
        const fallbackError = fallbackResults.find((result) => result.error)?.error;
        if (fallbackError) {
          console.error("Erro ao buscar itens do checklist (fallback):", fallbackError);
          return [];
        }
        items = fallbackResults.flatMap((result) => result.data || []);
      } else {
        items = itemsData || [];
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const { data: responses, error: responsesError } = await supabase
        .from("checklist_responses")
        .select("id, checklist_id, is_complete, started_at, completed_at")
        .eq("unit_id", unitId)
        .gte("started_at", startOfDay.toISOString())
        .lt("started_at", endOfDay.toISOString());

      if (responsesError) {
        console.error("Erro ao buscar respostas do checklist:", responsesError);
        // Se a tabela não existir (404) ou RLS bloquear, seguimos exibindo como "pending"
      }

      const responseIds = (responses || []).map((response) => response.id);
      const responseItemCounts: Record<string, number> = {};

      if (responseIds.length > 0) {
        const { data: itemResponses, error: itemResponsesError } = await supabase
          .from("checklist_item_responses")
          .select("response_id")
          .in("response_id", responseIds);

        if (itemResponsesError) {
          console.error("Erro ao buscar itens respondidos:", itemResponsesError);
          // Prosseguir sem contagem
        }

        (itemResponses || []).forEach((itemResponse) => {
          responseItemCounts[itemResponse.response_id] =
            (responseItemCounts[itemResponse.response_id] || 0) + 1;
        });
      }

      const responseByChecklist = new Map<string, typeof responses[number]>();
      (responses || []).forEach((response) => {
        const current = responseByChecklist.get(response.checklist_id);
        if (!current || (response.started_at || "") > (current.started_at || "")) {
          responseByChecklist.set(response.checklist_id, response);
        }
      });

      const itemsByChecklist = new Map<string, ChecklistItem[]>();
      (items || []).forEach((item) => {
        const mapped: ChecklistItem = {
          id: item.id,
          title: item.title,
          type: mapItemType(item.item_type),
          isRequired: item.required ?? true,
        };

        const existing = itemsByChecklist.get(item.checklist_id) || [];
        existing.push(mapped);
        itemsByChecklist.set(item.checklist_id, existing);
      });

      const emptyIds = (checklists || [])
        .map((c) => c.id)
        .filter((id) => (itemsByChecklist.get(id) || []).length === 0);
      if (emptyIds.length > 0) {
        const fallbackPerChecklist = await Promise.all(
          emptyIds.map((id) =>
            supabase
              .from("checklist_items")
              .select("id, title, item_type, required, order_index, checklist_id")
              .eq("checklist_id", id)
              .order("order_index", { ascending: true })
          )
        );
        fallbackPerChecklist.forEach((res, idx) => {
          const cid = emptyIds[idx];
          const arr = (res.data || []).map((it) => ({
            id: it.id,
            title: it.title,
            type: mapItemType(it.item_type as ChecklistItemType),
            isRequired: it.required ?? true,
          }));
          itemsByChecklist.set(cid, arr);
        });

        // Verificação final e Auto-Seed se ainda houver checklists vazios
        const stillEmptyIds = (checklists || [])
          .map((c) => c.id)
          .filter((id) => (itemsByChecklist.get(id) || []).length === 0);

        if (stillEmptyIds.length > 0) {
          console.log("Checklists ainda vazios após fallback. Tentando auto-seed:", stillEmptyIds);
          // Tenta rodar o seed para garantir que os itens existam
          await checklistService.seedOperationalChecklists(unit.network_id);
          
          // Tenta buscar novamente os itens para os checklists que estavam vazios
          const finalFallback = await Promise.all(
            stillEmptyIds.map((id) =>
              supabase
                .from("checklist_items")
                .select("id, title, item_type, required, order_index, checklist_id")
                .eq("checklist_id", id)
                .order("order_index", { ascending: true })
            )
          );
          
          finalFallback.forEach((res, idx) => {
            const cid = stillEmptyIds[idx];
            const arr = (res.data || []).map((it) => ({
              id: it.id,
              title: it.title,
              type: mapItemType(it.item_type as ChecklistItemType),
              isRequired: it.required ?? true,
            }));
            if (arr.length > 0) {
              itemsByChecklist.set(cid, arr);
              console.log(`Itens recuperados após seed para checklist ${cid}: ${arr.length}`);
            }
          });
        }
      }

      return (checklists || []).map((checklist) => {
        const response = responseByChecklist.get(checklist.id);
        const checklistItems = itemsByChecklist.get(checklist.id) || [];
        const totalItems = checklistItems.length;
        const completedItems = response ? responseItemCounts[response.id] || 0 : 0;
        const status = response
          ? response.is_complete
            ? "completed"
            : "in_progress"
          : "pending";

        return {
          id: checklist.id,
          name: checklist.name,
          type: checklist.checklist_type as ChecklistType,
          totalItems,
          completedItems,
          status,
          scheduledFor: null,
          deadline: formatDeadlineLabel(),
          items: checklistItems,
        };
      });
    } catch (error) {
      console.error("Erro ao carregar checklists:", error);
      return [];
    }
  },

  startChecklistRun: async (checklistId: string, unitId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from("checklist_responses")
        .insert({
          checklist_id: checklistId,
          unit_id: unitId,
          completed_by: userId,
          started_at: new Date().toISOString(),
          is_complete: false,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Erro ao iniciar checklist:", error);
        return null;
      }

      return data?.id ?? null;
    } catch (error) {
      console.error("Erro ao iniciar checklist:", error);
      return null;
    }
  },

  saveChecklistItemResult: async ({
    runId,
    itemId,
    status,
    reason,
    observation,
    photoUrl,
    userId,
  }: SaveChecklistItemResultInput) => {
    try {
      const notesPayload = {
        status,
        reason: reason || null,
        observation: observation || null,
      };

      const { data, error } = await supabase
        .from("checklist_item_responses")
        .insert({
          response_id: runId,
          item_id: itemId,
          is_checked: status === "ok",
          checked_at: new Date().toISOString(),
          notes: JSON.stringify(notesPayload),
        })
        .select("id")
        .single();

      if (error) {
        console.error("Erro ao salvar item do checklist:", error);
        return null;
      }

      if (photoUrl) {
        const { error: evidenceError } = await supabase.from("checklist_evidences").insert({
          item_response_id: data.id,
          file_url: photoUrl,
          file_type: "image",
          uploaded_by: userId,
        });

        if (evidenceError) {
          console.error("Erro ao salvar evidência do checklist:", evidenceError);
        }
      }

      return data?.id ?? null;
    } catch (error) {
      console.error("Erro ao salvar item do checklist:", error);
      return null;
    }
  },

  undoChecklistItemAnswer: async (runId: string, itemId: string) => {
    try {
      const { data, error } = await supabase
        .from("checklist_item_responses")
        .select("id")
        .eq("response_id", runId)
        .eq("item_id", itemId)
        .order("checked_at", { ascending: false })
        .limit(1)
        .single();
      if (error || !data?.id) return false;
      const { error: delErr } = await supabase
        .from("checklist_item_responses")
        .delete()
        .eq("id", data.id);
      if (delErr) return false;
      return true;
    } catch {
      return false;
    }
  },

  validateChecklistDefinition: async (checklistId: string) => {
    try {
      const { data: checklist, error: checklistError } = await supabase
        .from("checklists")
        .select("id, name, checklist_type, is_active, network_id")
        .eq("id", checklistId)
        .single();
      if (checklistError || !checklist) {
        return { valid: false, errors: ["Checklist inexistente ou erro de leitura"] };
      }
      const errors: string[] = []
      if (!["abertura", "praca", "fechamento"].includes(String(checklist.checklist_type))) {
        errors.push("Tipo de checklist inválido")
      }
      if (checklist.is_active !== true) {
        errors.push("Checklist inativo")
      }
      if (!checklist.network_id) {
        errors.push("Checklist sem rede vinculada")
      }
      const { data: items, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id, title, item_type, order_index, required, checklist_id")
        .eq("checklist_id", checklistId)
        .order("order_index", { ascending: true });
      if (itemsError) {
        errors.push("Erro ao ler itens")
      }
      const list = items || []
      if (list.length === 0) {
        errors.push("Checklist sem itens")
      }
      let expectedIndex = 1
      for (const it of list) {
        if (!it.title || it.title.trim().length === 0) errors.push(`Item ${it.id} sem título`)
        if (!["check", "foto_obrigatoria", "video_opcional"].includes(String(it.item_type || ""))) {
          errors.push(`Item ${it.id} com tipo inválido`)
        }
        const idx = Number(it.order_index || 0)
        if (idx !== expectedIndex) errors.push(`Ordem fora de sequência: esperado ${expectedIndex}, recebido ${idx}`)
        expectedIndex += 1
      }
      return { valid: errors.length === 0, errors }
    } catch {
      return { valid: false, errors: ["Falha inesperada na validação"] }
    }
  },

  getChecklistCompletionStatus: async (runId: string) => {
    try {
      const { data: response, error: respError } = await supabase
        .from("checklist_responses")
        .select("id, checklist_id, is_complete")
        .eq("id", runId)
        .single()
      if (respError || !response) {
        return { isComplete: false, totalItems: 0, requiredItems: 0, respondedItems: 0 }
      }
      const { data: items, error: itemsError } = await supabase
        .from("checklist_items")
        .select("id, required, checklist_id")
        .eq("checklist_id", response.checklist_id)
      if (itemsError) {
        return { isComplete: false, totalItems: 0, requiredItems: 0, respondedItems: 0 }
      }
      const totalItems = (items || []).length
      const requiredItems = (items || []).filter((i) => (i as { required?: boolean }).required !== false).length
      const { data: itemResponses, error: irError } = await supabase
        .from("checklist_item_responses")
        .select("item_id, is_checked, notes")
        .eq("response_id", runId)
      if (irError) {
        return { isComplete: false, totalItems, requiredItems, respondedItems: 0 }
      }
      const respondedItems = (itemResponses || []).length
      const isComplete = response.is_complete === true
      return { isComplete, totalItems, requiredItems, respondedItems }
    } catch {
      return { isComplete: false, totalItems: 0, requiredItems: 0, respondedItems: 0 }
    }
  },

  getChecklistQualityIssues: async (runId: string) => {
    try {
      const { data: itemData, error } = await supabase
        .from("checklist_item_responses")
        .select(
          `
            item_id,
            is_checked,
            notes,
            checklist_items (
              item_type
            ),
            checklist_evidences (
              file_url
            )
          `
        )
        .eq("response_id", runId)
      if (error) return ["Erro ao ler respostas"]
      const issues: string[] = []
      for (const ir of itemData || []) {
        let parsed: { status?: "ok" | "nok"; reason?: string | null } = {}
        if (ir.notes) {
          try {
            parsed = JSON.parse(ir.notes)
          } catch {
            parsed = {}
          }
        }
        const status = parsed.status || (ir.is_checked ? "ok" : "nok")
        const t = ir.checklist_items?.item_type
        const hasEvidence = Array.isArray(ir.checklist_evidences) && ir.checklist_evidences.length > 0
        if (status === "nok" && !parsed.reason) issues.push("Item NOK sem motivo")
        if (t === "foto_obrigatoria" && !hasEvidence) issues.push("Item com foto obrigatória sem evidência")
      }
      return issues
    } catch {
      return ["Falha inesperada na verificação"]
    }
  },

  upsertChecklist: async (networkId: string, name: string, type: ChecklistType, description?: string) => {
    console.log(`Upserting checklist: ${name} for network: ${networkId}`);
    const { data: existing, error: existingError } = await supabase
      .from("checklists")
      .select("id")
      .eq("network_id", networkId)
      .eq("name", name)
      .limit(1)
    if (existingError) {
      console.error(`Erro ao buscar checklist existente (${name}):`, existingError);
      return null
    }
    if (existing && existing.length > 0) {
      const id = existing[0].id;
      console.log(`Checklist existente encontrado: ${id} (${name}). Garantindo que está ativo...`);
      // Garante que o checklist existente está ativo
      const { error: upErr } = await supabase.from("checklists").update({ is_active: true }).eq("id", id);
      if (upErr) console.error(`Erro ao ativar checklist (${name}):`, upErr);
      return id as string
    }
    console.log(`Criando novo checklist: ${name}`);
    const { data: created, error: createError } = await supabase
      .from("checklists")
      .insert({
        network_id: networkId,
        name,
        checklist_type: type,
        is_active: true,
      })
      .select("id")
      .single()
    if (createError) {
      console.error(`Erro ao criar novo checklist (${name}):`, createError);
      return null
    }
    console.log(`Checklist criado com sucesso: ${created?.id} (${name})`);
    return created?.id || null
  },

  upsertChecklistItems: async (checklistId: string, items: { title: string; item_type?: ChecklistItemType; is_required?: boolean }[]) => {
    console.log(`Upserting ${items.length} items for checklist: ${checklistId}`);
    const { data: existing, error: existingError } = await supabase
      .from("checklist_items")
      .select("id, title")
      .eq("checklist_id", checklistId)
    if (existingError) {
      console.error(`Erro ao buscar itens existentes para checklist ${checklistId}:`, existingError);
      return false
    }
    const existingTitles = new Set((existing || []).map((i) => i.title.trim().toLowerCase()))
    const payload = items
      .map((it, idx) => ({
        checklist_id: checklistId,
        title: it.title,
        item_type: it.item_type || ("check" as ChecklistItemType),
        order_index: idx + 1,
        required: it.is_required ?? true,
      }))
      .filter((p) => !existingTitles.has(p.title.trim().toLowerCase()))
    
    if (payload.length === 0) {
      console.log(`Nenhum item novo para inserir no checklist ${checklistId}`);
      return true
    }
    
    console.log(`Inserindo ${payload.length} novos itens no checklist ${checklistId}`);
    const { error } = await supabase.from("checklist_items").insert(payload)
    if (error) {
      console.error(`Erro ao inserir itens no checklist ${checklistId}:`, error);
      return false
    }
    console.log(`Itens inseridos com sucesso no checklist ${checklistId}`);
    return true
  },

  updateChecklistItem: async (itemId: string, updates: { title?: string; is_required?: boolean; order_index?: number }) => {
    try {
      const payload: any = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.is_required !== undefined) payload.required = updates.is_required;
      if (updates.order_index !== undefined) payload.order_index = updates.order_index;

      const { error } = await supabase
        .from("checklist_items")
        .update(payload)
        .eq("id", itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erro ao atualizar item do checklist:", error);
      return false;
    }
  },

  addChecklistItem: async (checklistId: string, item: { title: string; is_required?: boolean; order_index: number }) => {
    try {
      const { error } = await supabase
        .from("checklist_items")
        .insert({
          checklist_id: checklistId,
          title: item.title,
          required: item.is_required ?? true,
          order_index: item.order_index,
          item_type: 'check'
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erro ao adicionar item ao checklist:", error);
      return false;
    }
  },

  deleteChecklistItem: async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("checklist_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erro ao excluir item do checklist:", error);
      return false;
    }
  },

  updateChecklist: async (checklistId: string, updates: { name?: string; is_active?: boolean }) => {
    try {
      const { error } = await supabase
        .from("checklists")
        .update(updates)
        .eq("id", checklistId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erro ao atualizar checklist:", error);
      return false;
    }
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
          "Confirmar estoques",
          "Liberar abertura",
        ],
      },
    ]
    for (const def of defs) {
      const checklistId = await checklistService.upsertChecklist(networkId, def.name, def.type, def.description)
      if (!checklistId) continue
      await checklistService.upsertChecklistItems(checklistId, def.items.map((t) => ({ title: t })))
    }
    return true
  },

  ensureAndGetFirstChecklist: async (unitId: string): Promise<TodayChecklist[]> => {
    const { data: unit, error: unitError } = await supabase
      .from("units")
      .select("id, network_id")
      .eq("id", unitId)
      .single()
    if (unitError || !unit?.network_id) return []
    const pokeName = "CHECKLIST ABERTURA — POKE"
    const pokeDesc = "Setor: Cozinha | Responsável: Preparador Poke | Horário: Antes das 11:00"
    const checklistId = await checklistService.upsertChecklist(unit.network_id, pokeName, "abertura", pokeDesc)
    if (!checklistId) return []
    await checklistService.upsertChecklistItems(checklistId, [
      { title: "Chegar com uniforme completo e limpo" },
      { title: "Guardar objetos pessoais" },
      { title: "Retirar adornos (relógio, anéis, pulseiras)" },
      { title: "Colocar touca cobrindo cabelo e orelhas" },
      { title: "Higienizar as mãos" },
      { title: "Abastecer papeleira e saboneteira do setor" },
      { title: "Montar lixeira do setor" },
      { title: "Limpar piso da área Poke" },
      { title: "Limpar superfícies de inox e telas KDS" },
      { title: "Verificar funcionamento de refrigeradores" },
    ])
    const { data: checklists } = await supabase
      .from("checklists")
      .select("id, name, checklist_type, is_active")
      .eq("network_id", unit.network_id)
      .eq("is_active", true)
      .eq("name", pokeName)
    const ids = (checklists || []).map((c) => c.id)
    if (ids.length === 0) return []
    const { data: itemsData } = await supabase
      .from("checklist_items")
      .select("id, title, item_type, required, order_index, checklist_id")
      .in("checklist_id", ids)
      .order("order_index", { ascending: true })
    const itemsByChecklist = new Map<string, ChecklistItem[]>()
    for (const it of itemsData || []) {
      const mapped: ChecklistItem = {
        id: it.id,
        title: it.title,
        type: mapItemType(it.item_type as ChecklistItemType),
        isRequired: (it as { required?: boolean }).required ?? true,
      }
      const existing = itemsByChecklist.get(it.checklist_id) || []
      existing.push(mapped)
      itemsByChecklist.set(it.checklist_id, existing)
    }
    return (checklists || []).map((c) => ({
      id: c.id,
      name: c.name,
      type: c.checklist_type as ChecklistType,
      totalItems: (itemsByChecklist.get(c.id) || []).length,
      completedItems: 0,
      status: "pending",
      scheduledFor: null,
      deadline: formatDeadlineLabel(),
      items: itemsByChecklist.get(c.id) || [],
    }))
  },

  completeChecklistRun: async (runId: string) => {
    try {
      const { error } = await supabase
        .from("checklist_responses")
        .update({
          is_complete: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);

      if (error) {
        console.error("Erro ao concluir checklist:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao concluir checklist:", error);
      return false;
    }
  },

  getCompletedChecklistRuns: async (unitId?: string, isSuperAdmin?: boolean) => {
    try {
      let query = supabase
        .from("checklist_responses")
        .select(
          `
            id,
            checklist_id,
            started_at,
            completed_at,
            completed_by,
            unit_id,
            reviewed_at,
            checklists (
              name
            ),
            units (
              name
            ),
            profiles:profiles!checklist_responses_completed_by_fkey (
              full_name
            )
          `
        )
        .eq("is_complete", true)
        .order("completed_at", { ascending: false });

      if (unitId && !isSuperAdmin) {
        query = query.eq("unit_id", unitId);
      }

      const { data: runs, error } = await query;

      if (error) {
        console.error("Erro ao buscar checklists concluídos:", error);
        return [];
      }

      const runIds = (runs || []).map((run) => run.id);
      const statusByRun: Record<string, "ok" | "warning" | "critical"> = {};

      if (runIds.length > 0) {
        const { data: itemResponses, error: itemResponsesError } = await supabase
          .from("checklist_item_responses")
          .select("response_id, is_checked, notes")
          .in("response_id", runIds);

        if (itemResponsesError) {
          console.error("Erro ao buscar itens do checklist:", itemResponsesError);
          return [];
        }

        (itemResponses || []).forEach((item) => {
          const existing = statusByRun[item.response_id] || "ok";
          if (existing === "critical") return;
          const parsedStatus = (() => {
            if (item.notes) {
              try {
                const parsed = JSON.parse(item.notes);
                if (parsed?.status === "nok") return "critical";
              } catch {
                return null;
              }
            }
            return null;
          })();

          if (parsedStatus === "critical" || item.is_checked === false) {
            statusByRun[item.response_id] = "critical";
          } else {
            statusByRun[item.response_id] = existing;
          }
        });
      }

      return (runs || []).map((run) => {
        const completedAt = run.completed_at ? new Date(run.completed_at) : null;
        const startedAt = run.started_at ? new Date(run.started_at) : null;
        const dateLabel = completedAt
          ? completedAt.toLocaleDateString("pt-BR")
          : new Date().toLocaleDateString("pt-BR");

        return {
          id: run.id,
          name: run.checklists?.name || "Checklist",
          unit: run.units?.name || "Unidade",
          executor: run.profiles?.full_name || "Usuário",
          startTime: startedAt
            ? startedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            : "--:--",
          endTime: completedAt
            ? completedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
            : "--:--",
          date: dateLabel,
          status: statusByRun[run.id] || "ok",
          reviewedAt: run.reviewed_at || null,
        };
      });
    } catch (error) {
      console.error("Erro ao buscar checklists concluídos:", error);
      return [];
    }
  },

  getChecklistRunDetails: async (runId: string) => {
    try {
      const { data, error } = await supabase
        .from("checklist_item_responses")
        .select(
          `
            id,
            is_checked,
            notes,
            checklist_items (
              title
            ),
            checklist_evidences (
              file_url
            )
          `
        )
        .eq("response_id", runId);

      if (error) {
        console.error("Erro ao buscar itens do checklist:", error);
        return [];
      }

      return (data || []).map((item) => {
        let reason: string | undefined;
        let observation: string | undefined;
        let parsedStatus: "ok" | "nok" | undefined;

        if (item.notes) {
          try {
            const parsed = JSON.parse(item.notes);
            reason = parsed?.reason ?? undefined;
            observation = parsed?.observation ?? undefined;
            parsedStatus = parsed?.status ?? undefined;
          } catch {
            reason = undefined;
            observation = undefined;
            parsedStatus = undefined;
          }
        }

        const status = parsedStatus || (item.is_checked ? "ok" : "nok");

        return {
          id: item.id,
          title: item.checklist_items?.title || "Item",
          status,
          reason,
          observation,
          photo: item.checklist_evidences?.[0]?.file_url || undefined,
        };
      });
    } catch (error) {
      console.error("Erro ao buscar itens do checklist:", error);
      return [];
    }
  },

  reviewChecklist: async (runId: string, managerObservation: string, userId: string) => {
    try {
      const { error } = await supabase
        .from("checklist_responses")
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          manager_observation: managerObservation,
        })
        .eq("id", runId);

      if (error) {
        console.error("Erro ao revisar checklist:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Erro ao revisar checklist:", error);
      return false;
    }
  },
};
