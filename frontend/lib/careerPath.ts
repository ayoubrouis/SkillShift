import { supabase, Skill } from './supabase'

export async function getTopMarketSkills(limit: number = 10): Promise<Skill[]> {
    const { data, error } = await supabase
        .from('skills')
        .select('*')
        .order('demand_score', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}

export async function getJobListingsWithSkills(limit: number = 20): Promise<unknown[]> {
    const { data, error } = await supabase
        .from('job_listings')
        .select(`
            *,
            listing_skills(
                skill:skills(id, name, category, demand_score)
            )
        `)
        .eq('is_active', true)
        .order('fetched_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}
