import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, Unit } from "@/types/database";
import { normalizeRole } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";

interface PermissionsContextType {
  role: AppRole | null;
  baseRole: AppRole | null;
  roles: UserRoleRow[] | null;
  units: Unit[];
  activeUnitId: string | null;
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

const SUPER_ADMIN_EMAILS = ["admin@codex.app", "erycryto@gmail.com"];
const ADMIN_VIEW_STORAGE_KEY = "codex_admin_view";

const PermissionsContext = createContext<PermissionsContextType>({
  role: null,
  baseRole: null,
  roles: null,
  units: [],
  activeUnitId: null,
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
  const [baseRole, setBaseRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<UserRoleRow[] | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
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
      return;
    }

    let cancelled = false;
    setPermissionsLoading(true);
    setPermissionsError(null);
    setIsSuperAdmin(emailIsSuperAdmin);

    const loadPermissions = async () => {
      try {
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("Timeout") }), 3000)
        );

        const rolesPromise = supabase
          .from("user_roles")
          .select(
            `
              role,
              network_id,
              unit_id,
              units:unit_id (
                id,
                name,
                is_active
              )
            `
          )
          .eq("user_id", user.id);

        const { data: rolesData, error: rolesError } = (await Promise.race([
          rolesPromise,
          timeoutPromise,
        ])) as { data: UserRoleRow[] | null; error: Error | null };

        if (rolesError) {
          throw rolesError;
        }

        const fetchedRoles = rolesData || [];
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
          }
          if (!r.unit_id && r.network_id) {
            seenNetworkIds.add(r.network_id);
          }
        });

        if (seenNetworkIds.size > 0) {
          const { data: networkUnits, error: networkUnitsError } = await supabase
            .from("units")
            .select("id, name, is_active, network_id")
            .in("network_id", Array.from(seenNetworkIds))
            .eq("is_active", true);

          if (networkUnitsError) {
            throw networkUnitsError;
          }

          (networkUnits || []).forEach((u: UnitRow) => {
            if (!seenUnitIds.has(u.id)) {
              fetchedUnits.push(u);
              seenUnitIds.add(u.id);
            }
          });
        }

        if (emailIsSuperAdmin) {
          const { data: allUnits, error: allUnitsError } = await supabase
            .from("units")
            .select("id, name, is_active");

          if (allUnitsError) {
            throw allUnitsError;
          }

          fetchedUnits = allUnits || [];
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

          if (emailIsSuperAdmin) {
            setBaseRole("super_admin");
          } else if (fetchedRoles.length > 0) {
            setBaseRole(normalizeRole(fetchedRoles[0].role));
          } else {
            setBaseRole("operator");
          }
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
        setAdminView("OPERATOR");
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
