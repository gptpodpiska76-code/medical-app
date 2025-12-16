import { supabase } from "./supabase";

export async function signUp({ email, password, fullName, phone }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const userId = data.user?.id;
  if (userId) {
    const { error: pErr } = await supabase
      .from("profiles")
      .insert({ id: userId, full_name: fullName, phone });
    if (pErr) throw pErr;
  }

  return data;
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
