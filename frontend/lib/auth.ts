import { supabase, UserRole } from "./supabase";

export async function register(
    email: string, 
    password: string, 
    fullName: string, 
    role: UserRole = 'JOB_SEEKER'
) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName, 
                role
            }
        }
    })
    if (error) throw error
    if (!data.user?.id) throw new Error('Registration failed')
    
    const { error: insertError } = await supabase.from("users").insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role
    });
    
    if (insertError) throw insertError;
    
    return data
}

export async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword(
        {email, password}
    )
    if (error) throw error
    return data
}

export async function logout() {
    await supabase.auth.signOut()
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    return userData;
}

export async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
    
    return data;
}

export async function updateProfile(updates: {
    full_name?: string;
    region?: string;
    target_regions?: string[];
    tutorial_completed?: boolean;
}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();
    
    if (error) throw error;
    return data;
}