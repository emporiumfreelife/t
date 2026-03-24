import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Globe, Mail, Linkedin, Instagram, Twitter, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Portfolio {
  profile: any;
  projects: any[];
  skills: any[];
}

export default function ViewCreatorPortfolio() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(() => {
    // Check if portfolio data was passed through navigation
    const state = location.state as any;
    return state?.portfolio || null;
  });
  const [loading, setLoading] = useState(() => {
    // If we have portfolio data from location state, don't show loading
    const state = location.state as any;
    return !state?.portfolio;
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!creatorId) return;

    // If we already have portfolio data from location state, don't load again
    const state = location.state as any;
    if (state?.portfolio) {
      setPortfolio(state.portfolio);
      setLoading(false);
      return;
    }

    loadPortfolio();
  }, [creatorId, location.state]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', creatorId)
        .single();

      if (profileError || !profile) {
        setError('Creator not found');
        setLoading(false);
        return;
      }

      // Check if portfolio is public
      // If portfolio_visibility column doesn't exist (null), allow viewing
      // Only block if explicitly set to 'private'
      if (profile.portfolio_visibility === 'private') {
        setError('This portfolio is not public');
        setLoading(false);
        return;
      }

      // Load projects
      const { data: projects } = await supabase
        .from('portfolio_projects')
        .select('*')
        .eq('profile_id', creatorId)
        .order('created_at', { ascending: false });

      // Load skills
      const { data: skills } = await supabase
        .from('portfolio_skills')
        .select('*')
        .eq('profile_id', creatorId);

      // Track portfolio view
      if (user?.id && user.id !== creatorId) {
        await supabase.from('portfolio_views').insert({
          portfolio_id: creatorId,
          viewer_id: user.id,
          viewed_at: new Date().toISOString(),
        }).catch(() => {
          // Silently fail if portfolio_views table doesn't exist
        });
      }

      setPortfolio({
        profile,
        projects: projects || [],
        skills: skills || [],
      });
    } catch (err) {
      console.error('Error loading portfolio:', err);
      setError('Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-6">{error || 'Portfolio not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { profile, projects, skills } = portfolio;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/10 bg-gray-950/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="text-2xl font-bold text-center flex-1">{profile.full_name}'s Portfolio</h1>
          <div className="w-20" /> {/* Spacer for alignment */}
        </div>
      </div>

      {/* Cover Image */}
      {profile.cover_image_url && (
        <div className="h-48 bg-gradient-to-br from-rose-500/20 to-purple-600/20 overflow-hidden">
          <img
            src={profile.cover_image_url}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row gap-8 mb-12">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="w-32 h-32 rounded-full object-cover border-4 border-rose-500"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center text-4xl font-bold">
                {profile.full_name?.charAt(0) || '?'}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="mb-4">
              <h1 className="text-4xl font-bold mb-2">{profile.full_name}</h1>
              {profile.title && (
                <p className="text-xl text-gray-300 mb-2">{profile.title}</p>
              )}
              {profile.location && (
                <p className="text-gray-400 flex items-center gap-2">
                  📍 {profile.location}
                </p>
              )}
            </div>

            {/* Social Links */}
            {(profile.website || profile.email || profile.linkedin || profile.instagram || profile.twitter) && (
              <div className="flex flex-wrap gap-3 mb-6">
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Globe className="w-4 h-4" />
                    Website
                  </a>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>
                )}
                {profile.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Linkedin className="w-4 h-4" />
                    LinkedIn
                  </a>
                )}
                {profile.instagram && (
                  <a
                    href={profile.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                    Instagram
                  </a>
                )}
                {profile.twitter && (
                  <a
                    href={profile.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Twitter className="w-4 h-4" />
                    Twitter
                  </a>
                )}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-gray-300">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* About Section */}
        {profile.about && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 pb-3 border-b border-white/10">About</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap max-w-3xl">{profile.about}</p>
          </section>
        )}

        {/* Experience Section */}
        {profile.experience && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 pb-3 border-b border-white/10">Experience</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap max-w-3xl">{profile.experience}</p>
          </section>
        )}

        {/* Skills Section */}
        {skills.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 pb-3 border-b border-white/10">Skills</h2>
            <div className="flex flex-wrap gap-3">
              {skills.map((skill) => (
                <span
                  key={skill.id}
                  className="px-4 py-2 bg-gradient-to-r from-rose-500/20 to-purple-600/20 text-gray-200 rounded-full border border-white/10 hover:border-rose-400/50 transition-colors"
                >
                  {skill.skill_name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Projects Section */}
        {projects.length > 0 && (
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6 pb-3 border-b border-white/10">Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="glass-effect rounded-xl p-6 border border-white/10 hover:border-rose-400/50 transition-all group"
                >
                  {/* Project Image */}
                  {project.image_url && (
                    <div className="mb-4 rounded-lg overflow-hidden h-48 bg-gray-800">
                      <img
                        src={project.image_url}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}

                  {/* Project Info */}
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-xl font-bold text-white">{project.title}</h3>
                      {project.demo_url && (
                        <a
                          href={project.demo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 text-rose-400 hover:text-rose-300 transition-colors"
                          title="View project"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </div>

                    {project.description && (
                      <p className="text-gray-300 text-sm mb-4">{project.description}</p>
                    )}

                    {/* Technologies */}
                    {project.technologies && (
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.split(',').map((tech: string, idx: number) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-white/5 text-gray-300 rounded border border-white/10"
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {projects.length === 0 && skills.length === 0 && !profile.about && !profile.experience && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">This portfolio is still being built.</p>
          </div>
        )}
      </div>

      {/* Footer Spacing */}
      <div className="pb-12" />
    </div>
  );
}
