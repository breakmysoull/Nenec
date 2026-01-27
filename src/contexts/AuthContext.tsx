import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppRole, Unit } from "@/types/database";
import { normalizeRole } from "@/lib/permissions";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: any | null;
  roles: any[] | null;
  role: AppRole | null; // Computed primary role
  units: Unit[]; // Available units for the user
  activeUnitId: string | null;
  setActiveUnitId: (id: string | null) => void;
  isSuperAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

<<<<<<< HEAD
const SUPER_ADMIN_EMAILS = ['admin@nenec.app', 'erycryto@gmail.com'];
=======
const SUPER_ADMIN_EMAILS = ['admin@opfood.app', 'erycryto@gmail.com'];
>>>>>>> origin/master

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: null,
  role: null,
  units: [],
  activeUnitId: null,
  setActiveUnitId: () => {},
  isSuperAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [roles, setRoles] = useState<any[] | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety timeout: force loading to false after 5 seconds
    // This prevents the app from getting stuck on the loading screen if Supabase hangs
    const safetyTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("AuthContext: Force stopping loading state due to timeout");
          return false;
        }
        return prev;
      });
    }, 5000);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("AuthContext: Auth state change:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Check Super Admin Status
        const userEmail = session?.user?.email;
        const isSuper = userEmail ? SUPER_ADMIN_EMAILS.includes(userEmail) : false;
        setIsSuperAdmin(isSuper);
        if (isSuper) {
          console.log("AuthContext: 🔐 SUPER ADMIN DETECTED:", userEmail);
        }

        if (session?.user) {
          // Wrap DB calls in timeout to prevent hanging
          const dbTimeout = new Promise((resolve) => setTimeout(() => resolve({ error: { message: 'Timeout' } }), 3000));

          // Fetch profile
          console.log("AuthContext: Fetching profile...");
          const profilePromise = supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          const { data: profileData, error: profileError } = await Promise.race([profilePromise, dbTimeout]) as any;
            
          if (profileError) {
            console.warn('AuthContext: Profile fetch warning/timeout:', profileError.message);
          }
          
          setProfile(profileData || {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email,
          });

          // Fetch roles and units
          console.log("AuthContext: Fetching roles and units...");
          const rolesPromise = supabase
            .from('user_roles')
            .select(`
              role, 
              network_id, 
              unit_id,
              units:unit_id (
                id,
                name,
                is_active
              )
            `)
            .eq('user_id', session.user.id);

          const { data: rolesData, error: rolesError } = await Promise.race([rolesPromise, dbTimeout]) as any;
            
          if (rolesError) {
            console.warn('AuthContext: Roles fetch warning/timeout:', rolesError.message);
          }
          
          const fetchedRoles = rolesData || [];
          setRoles(fetchedRoles);

          // Extract unique units from roles
          let fetchedUnits: Unit[] = [];
          const seenUnitIds = new Set();
          const seenNetworkIds = new Set<string>();
          
          fetchedRoles.forEach((r: any) => {
            // Case 1: Specific Unit assigned
            if (r.units && !seenUnitIds.has(r.units.id)) {
              fetchedUnits.push(r.units);
              seenUnitIds.add(r.units.id);
            }

            // Case 2: Network level access (no specific unit assigned)
            // If unit_id is null but network_id exists, fetch all units for that network
            if (!r.unit_id && r.network_id) {
              seenNetworkIds.add(r.network_id);
            }
          });

          // Fetch units for network-wide roles
          if (seenNetworkIds.size > 0) {
            console.log("AuthContext: Fetching units for networks:", Array.from(seenNetworkIds));
            const { data: networkUnits, error: networkUnitsError } = await supabase
              .from('units')
              .select('id, name, is_active, network_id')
              .in('network_id', Array.from(seenNetworkIds))
              .eq('is_active', true);

            if (networkUnitsError) {
              console.error("AuthContext: Error fetching network units:", networkUnitsError);
            } else if (networkUnits) {
              networkUnits.forEach((u: any) => {
                if (!seenUnitIds.has(u.id)) {
                  fetchedUnits.push(u);
                  seenUnitIds.add(u.id);
                }
              });
            }
          }

          // If Super Admin, fetch ALL units (override)
          if (isSuper) {
             const { data: allUnits } = await supabase.from('units').select('id, name, is_active');
             if (allUnits) {
                // Merge or replace? For super admin, usually replace to see everything.
                // But let's merge to keep consistent shape if needed, though replace is safer for "God Mode"
                fetchedUnits = allUnits;
             }
          }

          console.log("AuthContext: Final units list:", fetchedUnits);
          setUnits(fetchedUnits);

          // Auto-select unit logic
          // 1. Try to restore from localStorage
          const savedUnitId = localStorage.getItem('opfood_active_unit');
          const savedUnitExists = fetchedUnits.find(u => u.id === savedUnitId);

          if (savedUnitExists) {
            setActiveUnitId(savedUnitId);
          } else if (fetchedUnits.length === 1) {
            // 2. If only one unit, select it
            setActiveUnitId(fetchedUnits[0].id);
            localStorage.setItem('opfood_active_unit', fetchedUnits[0].id);
          } else if (fetchedUnits.length > 0) {
            // 3. Default to first if multiple and no saved preference
            setActiveUnitId(fetchedUnits[0].id);
            localStorage.setItem('opfood_active_unit', fetchedUnits[0].id);
          } else {
            setActiveUnitId(null);
          }

          // Compute primary role
          if (isSuper) {
            setRole('super_admin');
          } else if (fetchedRoles.length > 0) {
            // Take the first role and normalize it
            const rawRole = fetchedRoles[0].role;
            setRole(normalizeRole(rawRole));
          } else {
            // Default to super_admin for MVP testing purposes (was operator)
            setRole('super_admin');
          }

        } else {
          setProfile(null);
          setRoles(null);
          setRole(null);
          setUnits([]);
          setIsSuperAdmin(false);
        }
        
        console.log("AuthContext: Loading finished.");
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // If we already have a session from onAuthStateChange, skip this to avoid race conditions
      // But we set it here just in case onAuthStateChange didn't fire yet (rare but possible)
      if (!user && session) {
        console.log("AuthContext: getSession found existing session");
        setSession(session);
        setUser(session.user);
        
        // Super Admin check for session restoration
        const userEmail = session.user.email;
        const isSuper = userEmail ? SUPER_ADMIN_EMAILS.includes(userEmail) : false;
        setIsSuperAdmin(isSuper);

        if (isSuper) {
          setRole('super_admin');
        }
        // Note: roles fetching happens in onAuthStateChange, but if we need it here we might need to fetch again
        // For now, we rely on onAuthStateChange triggering eventually or the user already having state if we didn't full reload
        // Actually, onAuthStateChange fires on initial load too usually.
        
        // We reuse the logic from onAuthStateChange listener implicitly 
        // by letting the state update trigger re-renders, 
        // BUT for safety, let's just ensure loading is false if we have no session
      }
      
      if (!session) {
         setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles(null);
    setRole(null);
    setUnits([]);
    setActiveUnitId(null);
    localStorage.removeItem('opfood_active_unit');
    setIsSuperAdmin(false);
  };

  const handleSetActiveUnitId = (id: string | null) => {
    setActiveUnitId(id);
    if (id) {
      localStorage.setItem('opfood_active_unit', id);
    } else {
      localStorage.removeItem('opfood_active_unit');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, role, units, activeUnitId, setActiveUnitId: handleSetActiveUnitId, isSuperAdmin, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};
