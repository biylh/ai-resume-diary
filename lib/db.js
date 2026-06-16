import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { localDb } from './localDb';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Determine if Supabase is properly configured
export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return (
    url && 
    url !== 'https://your-project-id.supabase.co' && 
    url !== 'your_supabase_project_url_here' && 
    url.trim() !== '' &&
    anonKey &&
    anonKey !== 'your_supabase_anon_key_here' &&
    anonKey.trim() !== ''
  );
}

// Get the cookie store asynchronously
async function getCookieStore() {
  return await cookies();
}

// Initialize Supabase Server Client
export async function getSupabaseClient() {
  const cookieStore = await getCookieStore();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Can be ignored if called from Server Component
          }
        },
      },
    }
  );
}

// Unified Auth Interface
export const dbAuth = {
  getCurrentUser: async () => {
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      
      // Fetch user profile info from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      return {
        id: user.id,
        email: user.email,
        display_name: profile?.display_name || user.email.split('@')[0],
        industry: profile?.industry || "通用行业",
        current_role: profile?.current_role || "职场人",
        target_role: profile?.target_role || "待定",
      };
    } else {
      // Local db fallback: read mock-session cookie
      const cookieStore = await getCookieStore();
      const mockSession = cookieStore.get('mock-session')?.value;
      if (!mockSession) return null;
      try {
        return await localDb.getUserProfile(mockSession);
      } catch (err) {
        return null;
      }
    }
  },

  login: async (email, password) => {
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    } else {
      const data = await localDb.login(email, password);
      const cookieStore = await getCookieStore();
      // Set mock cookie for 7 days
      cookieStore.set('mock-session', data.user.id, { maxAge: 60 * 60 * 24 * 7, path: '/' });
      return data;
    }
  },

  signup: async (email, password, displayName, industry, currentRole, targetRole) => {
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      // Sign up user in auth
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      
      if (data.user) {
        // Create profile in profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: email,
              display_name: displayName || email.split('@')[0],
              industry: industry || "通用行业",
              current_role: currentRole || "职场人",
              target_role: targetRole || "待定",
            }
          ]);
        if (profileError) console.error("Error creating profile:", profileError);
      }
      return data;
    } else {
      const data = await localDb.signup(email, password, displayName, industry, currentRole, targetRole);
      const cookieStore = await getCookieStore();
      cookieStore.set('mock-session', data.user.id, { maxAge: 60 * 60 * 24 * 7, path: '/' });
      return data;
    }
  },

  logout: async () => {
    const cookieStore = await getCookieStore();
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
    } else {
      cookieStore.delete('mock-session');
    }
    return { success: true };
  },

  updateProfile: async (profileUpdates) => {
    const user = await dbAuth.getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      return await localDb.updateUserProfile(user.id, profileUpdates);
    }
  }
};

// Unified Database Interface for Diaries
export const dbDiaries = {
  getDiaries: async () => {
    const user = await dbAuth.getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('diaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } else {
      return await localDb.getDiaries(user.id);
    }
  },

  addDiary: async (rawInput, refinedBullet, chatHistory, category) => {
    const user = await dbAuth.getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('diaries')
        .insert([
          {
            user_id: user.id,
            raw_input: rawInput,
            refined_bullet: refinedBullet,
            chat_history: chatHistory || [],
            category: category || "日常工作",
            is_pinned: false
          }
        ])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      return await localDb.addDiary(user.id, rawInput, refinedBullet, chatHistory, category);
    }
  },

  updateDiary: async (diaryId, updates) => {
    const user = await dbAuth.getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('diaries')
        .update(updates)
        .eq('id', diaryId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      return await localDb.updateDiary(user.id, diaryId, updates);
    }
  },

  deleteDiary: async (diaryId) => {
    const user = await dbAuth.getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from('diaries')
        .delete()
        .eq('id', diaryId)
        .eq('user_id', user.id);
      if (error) throw error;
      return { success: true };
    } else {
      return await localDb.deleteDiary(user.id, diaryId);
    }
  }
};
