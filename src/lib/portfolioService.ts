import { supabase } from './supabase';

// =============================================
// PORTFOLIO SERVICE - CRUD OPERATIONS
// =============================================

export interface PortfolioProfile {
  id?: string;
  name: string;
  email: string;
  bio: string;
  location: string;
  phone: string;
  website: string;
  avatar_url: string;
  cover_image_url?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

export interface PortfolioCertification {
  id?: string;
  user_id?: string;
  name: string;
  issuer: string;
  year: number;
  credential_url?: string;
}

export interface PortfolioAward {
  id?: string;
  user_id?: string;
  name: string;
  issuer: string;
  year: number;
  description?: string;
  award_image_url?: string;
}

export interface PortfolioInterview {
  id?: string;
  user_id?: string;
  title: string;
  platform: string;
  interview_date: string;
  description?: string;
  interview_url?: string;
  thumbnail_url?: string;
}

export interface PortfolioExperience {
  id?: string;
  user_id?: string;
  title: string;
  company: string;
  employment_type: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  start_date: string;
  end_date?: string;
  is_current: boolean;
  description?: string;
  company_logo_url?: string;
}

export interface PortfolioTestimonial {
  id?: string;
  user_id?: string;
  client_name: string;
  client_company: string;
  client_image_url?: string;
  rating: number;
  comment: string;
  project_description?: string;
  testimonial_date?: string;
  verified?: boolean;
}

export interface PortfolioSkill {
  id?: string;
  user_id?: string;
  skill_name: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsement_count?: number;
}

export interface PortfolioContent {
  id?: string;
  user_id?: string;
  title: string;
  creator: string;
  description?: string;
  type: 'music-video' | 'movie' | 'audio-music' | 'blog' | 'image' | 'document';
  category?: string;
  thumbnail_url: string;
  content_url?: string;
  duration?: string;
  read_time?: string;
  views_count?: number;
  like_count?: number;
  is_premium?: boolean;
  status?: 'draft' | 'published' | 'archived' | 'pending_deletion' | 'permanently_deleted';
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// PROFILE OPERATIONS
// =============================================

export async function getPortfolioProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch profile' };
  }
}

export async function updatePortfolioProfile(userId: string, updates: Partial<PortfolioProfile>) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update profile' };
  }
}

// =============================================
// CERTIFICATIONS OPERATIONS
// =============================================

export async function getCertifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_certifications')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch certifications' };
  }
}

export async function addCertification(userId: string, certification: PortfolioCertification) {
  try {
    const { data, error } = await supabase
      .from('portfolio_certifications')
      .insert([{ ...certification, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add certification' };
  }
}

export async function updateCertification(id: string, updates: Partial<PortfolioCertification>) {
  try {
    const { data, error } = await supabase
      .from('portfolio_certifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update certification' };
  }
}

export async function deleteCertification(id: string) {
  try {
    const { error } = await supabase
      .from('portfolio_certifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete certification' };
  }
}

// =============================================
// AWARDS OPERATIONS
// =============================================

export async function getAwards(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_awards')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch awards' };
  }
}

export async function addAward(userId: string, award: PortfolioAward) {
  try {
    const { data, error } = await supabase
      .from('portfolio_awards')
      .insert([{ ...award, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add award' };
  }
}

export async function updateAward(id: string, updates: Partial<PortfolioAward>) {
  try {
    const { data, error } = await supabase
      .from('portfolio_awards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update award' };
  }
}

export async function deleteAward(id: string) {
  try {
    const { error } = await supabase
      .from('portfolio_awards')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete award' };
  }
}

// =============================================
// INTERVIEWS OPERATIONS
// =============================================

export async function getInterviews(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_interviews')
      .select('*')
      .eq('user_id', userId)
      .order('interview_date', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch interviews' };
  }
}

export async function addInterview(userId: string, interview: PortfolioInterview) {
  try {
    const { data, error } = await supabase
      .from('portfolio_interviews')
      .insert([{ ...interview, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add interview' };
  }
}

export async function updateInterview(id: string, updates: Partial<PortfolioInterview>) {
  try {
    const { data, error } = await supabase
      .from('portfolio_interviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update interview' };
  }
}

export async function deleteInterview(id: string) {
  try {
    const { error } = await supabase
      .from('portfolio_interviews')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete interview' };
  }
}

// =============================================
// EXPERIENCE OPERATIONS
// =============================================

export async function getExperience(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_experience')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch experience' };
  }
}

export async function addExperience(userId: string, experience: PortfolioExperience) {
  try {
    const { data, error } = await supabase
      .from('portfolio_experience')
      .insert([{ ...experience, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add experience' };
  }
}

export async function updateExperience(id: string, updates: Partial<PortfolioExperience>) {
  try {
    const { data, error } = await supabase
      .from('portfolio_experience')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update experience' };
  }
}

export async function deleteExperience(id: string) {
  try {
    const { error } = await supabase
      .from('portfolio_experience')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete experience' };
  }
}

// =============================================
// TESTIMONIALS OPERATIONS
// =============================================

export async function getTestimonials(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_testimonials')
      .select('*')
      .eq('user_id', userId)
      .order('testimonial_date', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch testimonials' };
  }
}

export async function addTestimonial(userId: string, testimonial: PortfolioTestimonial) {
  try {
    const { data, error } = await supabase
      .from('portfolio_testimonials')
      .insert([{ ...testimonial, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add testimonial' };
  }
}

export async function updateTestimonial(id: string, updates: Partial<PortfolioTestimonial>) {
  try {
    const { data, error } = await supabase
      .from('portfolio_testimonials')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update testimonial' };
  }
}

export async function deleteTestimonial(id: string) {
  try {
    const { error } = await supabase
      .from('portfolio_testimonials')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete testimonial' };
  }
}

// =============================================
// SKILLS OPERATIONS
// =============================================

export async function getSkills(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_skills')
      .select('*')
      .eq('user_id', userId)
      .order('endorsement_count', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch skills' };
  }
}

export async function addSkill(userId: string, skill: PortfolioSkill) {
  try {
    const { data, error } = await supabase
      .from('portfolio_skills')
      .insert([{ ...skill, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add skill' };
  }
}

export async function updateSkill(id: string, updates: Partial<PortfolioSkill>) {
  try {
    const { data, error } = await supabase
      .from('portfolio_skills')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update skill' };
  }
}

export async function deleteSkill(id: string) {
  try {
    const { error } = await supabase
      .from('portfolio_skills')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete skill' };
  }
}

// =============================================
// PORTFOLIO CONTENT OPERATIONS
// =============================================

export async function getPortfolioContent(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_page_content')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'permanently_deleted')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch portfolio content' };
  }
}

export async function getPublishedPortfolioContent(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_page_content')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'published')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : 'Failed to fetch published content' };
  }
}

export async function addPortfolioContent(userId: string, content: PortfolioContent) {
  try {
    const { data, error } = await supabase
      .from('portfolio_page_content')
      .insert([{ ...content, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to add portfolio content' };
  }
}

export async function updatePortfolioContent(id: string, updates: Partial<PortfolioContent>) {
  try {
    const { data, error } = await supabase
      .from('portfolio_page_content')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to update portfolio content' };
  }
}

export async function deletePortfolioContent(id: string) {
  try {
    const { error } = await supabase
      .from('portfolio_page_content')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to delete portfolio content' };
  }
}

export async function updatePortfolioContentDisplayOrder(contentIds: string[]) {
  try {
    const updates = contentIds.map((id, index) => ({
      id,
      display_order: index
    }));

    const promises = updates.map(({ id, display_order }) =>
      supabase
        .from('portfolio_page_content')
        .update({ display_order })
        .eq('id', id)
    );

    await Promise.all(promises);
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to update display order' };
  }
}

// =============================================
// PORTFOLIO STATS
// =============================================

export async function getPortfolioStats(userId: string) {
  try {
    const { data, error } = await supabase
      .from('portfolio_stats')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to fetch portfolio stats' };
  }
}
