import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { AppRole, Unit } from "@/types/database";
import { normalizeRole } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";

interface PermissionsContextType {
  role: AppRole | null;
  baseRole: AppRole | null;
  roles: UserRoleRow[] | null;
  units: Unit[];
  activeUnitId: string | null;
  activeNetworkId: string | null;
  setActiveUnitId: (id: string | null) => void;
  adminView: AdminView | null;
  setAdminView: (view: AdminView | null) => void;
  isSuperAdmin: boolean;
  permissionsLoading: boolean;
  permissionsError: Error | null;
}

type UserRoleRow = {
  role: string;
  network_id: string | null;
  unit_id: string | null;
  units?: Unit | null;
};

type UnitRow = Unit & {
  network_id?: string | null;
};

type AdminView = "OPERATOR" | "MANAGER";

const SUPER_ADMIN_EMAILS = ["admin@codex.app", "erycryto@gmail.com", "erick@nectar.com"];
const ADMIN_VIEW_STORAGE_KEY = "codex_admin_view";
const PERMISSIONS_CACHE_KEY = "codex_permissions_cache_v1";

interface PermissionsCache {
  userId: string;
  baseRole: AppRole;
  roles: UserRoleRow[];
  units: Unit[];
  isSuperAdmin: boolean;
  timestamp: number;
}

const PermissionsContext = createContext<PermissionsContextType>({
  role: null,
  baseRole: null,
  roles: null,
  units: [],
  activeUnitId: null,
  activeNetworkId: null,
  setActiveUnitId: () => {},
  adminView: null,
  setAdminView: () => {},
  isSuperAdmin: false,
  permissionsLoading: false,
  permissionsError: null,
});

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
};

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // Helper to load cache
  const getCache = (): PermissionsCache | null => {
    if (typeof window === "undefined" || !user) return null;
    try {
      const stored = localStorage.getItem(PERMISSIONS_CACHE_KEY);
      if (!stored) return null;
      const parsed = JSON.parse(stored) as PermissionsCache;
      if (parsed.userId !== user.uid) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const cache = useMemo(() => getCache(), [user?.uid]);

  const [baseRole, setBaseRole] = useState<AppRole | null>(() => cache?.baseRole || null);
  const [roles, setRoles] = useState<UserRoleRow[] | null>(() => cache?.roles || null);
  const [units, setUnits] = useState<Unit[]>(() => cache?.units || []);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => cache?.isSuperAdmin || false);
  const [permissionsLoading, setPermissionsLoading] = useState(() => !cache);
  const [permissionsError, setPermissionsError] = useState<Error | null>(null);
  const [adminView, setAdminView] = useState<AdminView | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(ADMIN_VIEW_STORAGE_KEY);
    return stored === "OPERATOR" || stored === "MANAGER" ? stored : null;
  });

  const effectiveRole = useMemo(() => {
    if (!baseRole) return null;
    if (baseRole === "admin" || baseRole === "super_admin") {
      if (adminView === "OPERATOR") return "operator";
      if (adminView === "MANAGER") return "manager";
    }
    return baseRole;
  }, [baseRole, adminView]);

  const emailIsSuperAdmin = useMemo(() => {
    const email = user?.email;
    return email ? SUPER_ADMIN_EMAILS.includes(email) : false;
  }, [user?.email]);

  const activeNetworkId = useMemo(() => {
    if (!roles || roles.length === 0) return null;
    if (activeUnitId) {
      const matchRole = roles.find(r => r.unit_id === activeUnitId);
      if (matchRole?.network_id) return matchRole.network_id;
      const u = units.find(u => u.id === activeUnitId) as UnitRow;
      if (u?.network_id) return u.network_id;
    }
    return roles.find(r => r.network_id)?.network_id || null;
  }, [roles, units, activeUnitId]);

  useEffect(() => {
    if (!user) {
      setBaseRole(null);
      setRoles(null);
      setUnits([]);
      setActiveUnitId(null);
      setAdminView(null);
      setIsSuperAdmin(false);
      setPermissionsLoading(false);
      setPermissionsError(null);
      localStorage.removeItem(ADMIN_VIEW_STORAGE_KEY);
      localStorage.removeItem(PERMISSIONS_CACHE_KEY);
      return;
    }

    let cancelled = false;
    
    // Only show loading if we don't have a valid cache
    if (!cache) {
      setPermissionsLoading(true);
    }
    
    setPermissionsError(null);
    setIsSuperAdmin(emailIsSuperAdmin);

    const loadPermissions = async () => {
      try {
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("Timeout") }), 3000)
        );

        const { getDoc, doc, collectionGroup, getDocs, query: fbQuery, where } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        
        let fetchedRoles: UserRoleRow[] = [];

        try {
          // Firebase Role Fetch
          const userDoc = await getDoc(doc(db, "user_roles", user.uid));
          if (userDoc.exists()) {
            fetchedRoles = userDoc.data().roles || [];
          }
        } catch (fbError) {
          console.error("Firestore user_roles schema not yet generated or missing permissions.");
        }

        // Auto-grant full access to super admins even if Firestore role doc is missing
        if (emailIsSuperAdmin && fetchedRoles.length === 0) {
          fetchedRoles = [{
            role: "super_admin",
            network_id: "codex_network_default",
            unit_id: null
          }];
        }

        if (!cancelled) {
          setRoles(fetchedRoles);
        }

        let fetchedUnits: Unit[] = [];
        const seenUnitIds = new Set<string>();
        const seenNetworkIds = new Set<string>();

        fetchedRoles.forEach((r) => {
          if (r.units && !seenUnitIds.has(r.units.id)) {
            fetchedUnits.push(r.units);
            seenUnitIds.add(r.units.id);
          } else if (r.unit_id && !seenUnitIds.has(r.unit_id)) {
             // Fallback to fetch single units later if no join
             seenUnitIds.add(r.unit_id);
          }
          if (r.network_id) {
            seenNetworkIds.add(r.network_id);
          }
        });

        if (seenNetworkIds.size > 0 || seenUnitIds.size > 0) {
          try {
            const unitsQuery = fbQuery(collectionGroup(db, 'units'), where("is_active", "==", true));
            const unitsSnapshot = await getDocs(unitsQuery);
            const allActiveUnits = unitsSnapshot.docs.map(d => ({
              id: d.id,
              network_id: d.ref.parent.parent?.id,
              ...(d.data() as any)
            })) as UnitRow[];

            const filteredUnits = allActiveUnits.filter(u => 
              (u.network_id && seenNetworkIds.has(u.network_id)) || seenUnitIds.has(u.id)
            );

            filteredUnits.forEach(u => {
              if (!fetchedUnits.find(fu => fu.id === u.id)) {
                fetchedUnits.push(u);
              }
            });
          } catch (err) {
            console.error("Erro ao buscar units no Firestore:", err);
          }
        }

        if (emailIsSuperAdmin) {
          try {
            const allUnitsQuery = fbQuery(collectionGroup(db, 'units'));
            const unitsSnapshot = await getDocs(allUnitsQuery);
            const allActiveUnits = unitsSnapshot.docs.map(d => ({
              id: d.id,
              network_id: d.ref.parent.parent?.id,
              ...(d.data() as any)
            })) as UnitRow[];
            
            fetchedUnits = allActiveUnits;
          } catch (err) {
            console.error("Erro ao buscar todas as units:", err);
            throw err;
          }
        }

        if (!cancelled) {
          setUnits(fetchedUnits);
          const savedUnitId = localStorage.getItem("codex_active_unit");
          const savedUnitExists = fetchedUnits.find((u) => u.id === savedUnitId);

          if (savedUnitExists) {
            setActiveUnitId(savedUnitId);
          } else if (fetchedUnits.length === 1) {
            setActiveUnitId(fetchedUnits[0].id);
            localStorage.setItem("codex_active_unit", fetchedUnits[0].id);
          } else if (fetchedUnits.length > 0) {
            setActiveUnitId(fetchedUnits[0].id);
            localStorage.setItem("codex_active_unit", fetchedUnits[0].id);
          } else {
            setActiveUnitId(null);
          }

          const finalBaseRole = emailIsSuperAdmin 
            ? "super_admin" 
            : (fetchedRoles.length > 0 ? normalizeRole(fetchedRoles[0].role) : "operator");
            
          setBaseRole(finalBaseRole);

          // Save to cache
          const newCache: PermissionsCache = {
            userId: user.uid,
            baseRole: finalBaseRole as AppRole,
            roles: fetchedRoles,
            units: fetchedUnits,
            isSuperAdmin: emailIsSuperAdmin,
            timestamp: Date.now()
          };
          localStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify(newCache));
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error("Erro ao carregar permissões");
        if (!cancelled) {
          setRoles([]);
          setUnits([]);
          setActiveUnitId(null);
          setBaseRole("operator");
          setPermissionsError(err);
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [user, emailIsSuperAdmin]);

  useEffect(() => {
    if (!adminView) {
      localStorage.removeItem(ADMIN_VIEW_STORAGE_KEY);
      return;
    }
    localStorage.setItem(ADMIN_VIEW_STORAGE_KEY, adminView);
  }, [adminView]);

  useEffect(() => {
    if (!baseRole) return;
    if (baseRole === "admin" || baseRole === "super_admin") {
      if (!adminView) {
        // Default to MANAGER view for admins
        setAdminView("MANAGER");
      }
      return;
    }
    if (adminView) {
      setAdminView(null);
    }
  }, [baseRole, adminView]);

  const handleSetActiveUnitId = (id: string | null) => {
    setActiveUnitId(id);
    if (id) {
      localStorage.setItem("codex_active_unit", id);
    } else {
      localStorage.removeItem("codex_active_unit");
    }
  };

  return (
    <PermissionsContext.Provider
      value={{
        role: effectiveRole,
        baseRole,
        roles,
        units,
        activeUnitId,
        activeNetworkId,
        setActiveUnitId: handleSetActiveUnitId,
        adminView,
        setAdminView,
        isSuperAdmin,
        permissionsLoading,
        permissionsError,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};
