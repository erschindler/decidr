import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Session, User } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, displayName: string) => void;
  signIn: (email: string, password: string) => void;
  signOut: () => void;
  signUpError: string | null;
  signInError: string | null;
  isSigningUp: boolean;
  isSigningIn: boolean;
}

export const [AuthProvider, useAuth] = createContextHook((): AuthState => {
  /* eslint-disable rork/general-context-optimization */
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    console.log("[Auth] Initializing auth state...");
    void supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log("[Auth] Got session:", s ? "yes" : "no");
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      console.log("[Auth] Auth state changed:", _event);
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpMutation = useMutation({
    mutationFn: async ({ email, password, displayName }: { email: string; password: string; displayName: string }) => {
      setSignUpError(null);
      console.log("[Auth] Signing up:", email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      console.log("[Auth] Sign up error:", error.message);
      setSignUpError(error.message);
    },
    onSuccess: () => {
      console.log("[Auth] Sign up success");
    },
  });

  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      setSignInError(null);
      console.log("[Auth] Signing in:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    onError: (error: Error) => {
      console.log("[Auth] Sign in error:", error.message);
      setSignInError(error.message);
    },
    onSuccess: () => {
      console.log("[Auth] Sign in success");
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      console.log("[Auth] Signing out...");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      console.log("[Auth] Sign out success");
      setSession(null);
      setUser(null);
    },
  });

  const signUp = useCallback(
    (email: string, password: string, displayName: string) => {
      signUpMutation.mutate({ email, password, displayName });
    },
    [signUpMutation]
  );

  const signIn = useCallback(
    (email: string, password: string) => {
      signInMutation.mutate({ email, password });
    },
    [signInMutation]
  );

  const signOut = useCallback(() => {
    signOutMutation.mutate();
  }, [signOutMutation]);

  return useMemo(() => ({
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    signUp,
    signIn,
    signOut,
    signUpError,
    signInError,
    isSigningUp: signUpMutation.isPending,
    isSigningIn: signInMutation.isPending,
  }), [session, user, isLoading, signUp, signIn, signOut, signUpError, signInError, signUpMutation.isPending, signInMutation.isPending]);
});
