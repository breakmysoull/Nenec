import { supabase } from "@/integrations/supabase/client";

export { supabase };

type SignInResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
type SetSessionResult = Awaited<ReturnType<typeof supabase.auth.setSession>>;
type SessionCheckResult = Awaited<ReturnType<typeof supabase.auth.getSession>>;

// Auth helpers
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: fullName,
      },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  try {
    console.log("Supabase Lib: Attempting signInWithPassword...");
    
    const attemptLogin = async (timeoutMs: number = 5000) => {
       const timeoutPromise = new Promise<{ data: { user: null; session: null }; error: Error }>((_, reject) => {
         setTimeout(() => reject(new Error(`Timeout: signIn took longer than ${timeoutMs}ms`)), timeoutMs);
       });
   
       const signInPromise = supabase.auth.signInWithPassword({
         email,
         password,
       });
   
       return (await Promise.race([signInPromise, timeoutPromise])) as SignInResult;
    };

    // First Attempt
    try {
      const result = await attemptLogin(5000);
      console.log("Supabase Lib: signInWithPassword success (1st attempt):", result);
      return result;
    } catch (firstErr) {
      console.warn("Supabase Lib: First login attempt failed/timed out:", firstErr);
      
      // FALLBACK: Try Direct REST API Login
      // If the SDK is hanging, we bypass it and use fetch directly
      try {
        console.log("Supabase Lib: Attempting direct REST API fallback...");
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        if (!supabaseUrl || !supabaseKey) throw new Error("Missing env vars for REST fallback");

        const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password })
        });

        const data = (await response.json()) as {
          error_description?: string;
          msg?: string;
          access_token: string;
          refresh_token: string;
          user: unknown;
          token_type?: string;
          expires_in: number;
        };

        if (!response.ok) {
          throw new Error(data.error_description || data.msg || "REST API Login failed");
        }

        console.log("Supabase Lib: REST API success, attempting to set session...");
        
        // 3. Try to set session via SDK with timeout
        try {
           const setSessionPromise = supabase.auth.setSession({
             access_token: data.access_token,
             refresh_token: data.refresh_token,
           });
           
           const timeoutPromise = new Promise((_, reject) => {
             setTimeout(() => reject(new Error("setSession timeout")), 3000);
           });

           const { data: sessionData, error: sessionError } = (await Promise.race([setSessionPromise, timeoutPromise])) as SetSessionResult;

           if (sessionError) throw sessionError;
           
           console.log("Supabase Lib: Session manually set via SDK.");
           return { data: sessionData, error: null };
        } catch (sdkError) {
           console.warn("Supabase Lib: SDK setSession failed or timed out. Forcing localStorage write.", sdkError);
           
           // 4. NUCLEAR OPTION: Manual LocalStorage Write + Reload
           // This bypasses the SDK completely if it's broken
           try {
             const projectId = supabaseUrl.split('//')[1].split('.')[0];
             const storageKey = `sb-${projectId}-auth-token`;
             
             const sessionObj = {
               access_token: data.access_token,
               refresh_token: data.refresh_token,
               user: data.user,
               token_type: data.token_type || 'bearer',
               expires_in: data.expires_in,
               expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
             };

             localStorage.setItem(storageKey, JSON.stringify(sessionObj));
             console.log("Supabase Lib: Session written to localStorage manually. Key:", storageKey);
             
             // Return a fake success so the UI attempts to navigate
             // But we really need a reload to fix the SDK state
             setTimeout(() => {
                console.log("Supabase Lib: Forcing page reload to pick up new session...");
                window.location.reload();
             }, 500);

             return { data: { session: sessionObj, user: data.user }, error: null };
           } catch (writeError) {
             console.error("Supabase Lib: Manual localStorage write failed:", writeError);
             throw writeError;
           }
        }

      } catch (restErr) {
        console.error("Supabase Lib: REST fallback failed:", restErr);
        // If REST failed, throw the original error or the REST error
        throw restErr;
      }
    }

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Supabase Lib: Unexpected error or timeout in signIn:", err);
    return { 
      data: { user: null, session: null }, 
      error: { message } 
    };
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const checkConnection = async () => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    console.log("Supabase Config Check:", {
      urlDefined: !!supabaseUrl,
      keyDefined: !!supabaseKey,
      url: supabaseUrl ? `${supabaseUrl.substring(0, 10)}...` : 'undefined'
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error("Supabase environment variables missing!");
      return false;
    }

    // 1. Simple Network Check (fetch)
    try {
      console.log("Testing network connectivity to Supabase URL...");
      // Using AbortController for fetch timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("Network check response:", response.status, response.statusText);
      
      if (response.ok || response.status === 404) {
         console.log("Network connection verified (fetch success).");
         return true; // Return true immediately if network is reachable
      }
      
      console.warn("Network check returned non-200:", response.status);
    } catch (fetchError) {
      console.error("Network connectivity check failed (fetch):", fetchError);
      // Don't return false yet, try SDK as fallback
    }

    // 2. SDK Check (Fallback)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), 5000);
    });

    // Check auth service availability instead of database
    const checkPromise = supabase.auth.getSession();

    const { error } = (await Promise.race([checkPromise, timeoutPromise])) as SessionCheckResult;
      
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Connection check failed:", err);
    return false;
  }
};
