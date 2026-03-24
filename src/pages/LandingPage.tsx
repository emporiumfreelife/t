import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Star, Users, Gem, ArrowRight, Play, Globe, Sparkles, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isUserAdmin } from '../lib/adminUtils';
import AppDownloadModal from '../components/AppDownloadModal';
import FeaturedContentModal from '../components/FeaturedContentModal';

interface FeaturedRelease {
  id: string;
  type: string;
  title: string;
  creator: string;
  thumbnail: string;
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openAppModal, setOpenAppModal] = useState<'ios' | 'android' | null>(null);
  const [featuredReleases, setFeaturedReleases] = useState<FeaturedRelease[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [isAdmin] = useState(user?.email ? isUserAdmin(user.email) : false);
  const [featuredModal, setFeaturedModal] = useState<{
    isOpen: boolean;
    content: any | null;
  }>({ isOpen: false, content: null });

  useEffect(() => {
    fetchFeaturedReleases();
  }, []);

  const fetchFeaturedReleases = async () => {
    try {
      setLoadingFeatured(true);
      const { data, error } = await supabase
        .from('featured_releases')
        .select(`
          id,
          media_content_id,
          admin_edited_title,
          admin_edited_creator,
          display_order,
          media_page_content:media_content_id (
            id,
            type,
            title,
            creator,
            thumbnail_url,
            content_url
          )
        `)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(4);

      if (error) {
        console.error('Error fetching featured releases:', error);
        // Continue with empty state - fallback to default empty featured
        setFeaturedReleases([]);
      } else if (data && data.length > 0) {
        const formatted = data.map((item: any) => ({
          id: item.media_content_id,
          type: item.media_page_content?.type || 'Content',
          title: item.admin_edited_title || item.media_page_content?.title || 'Untitled',
          creator: item.admin_edited_creator || item.media_page_content?.creator || 'Unknown',
          thumbnail: item.media_page_content?.thumbnail_url || ''
        }));
        setFeaturedReleases(formatted);
      } else {
        setFeaturedReleases([]);
      }
    } catch (err) {
      console.error('Error:', err);
      setFeaturedReleases([]);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const handleFeaturedContentClick = (contentId: string) => {
    // Navigate to media page and highlight the featured content
    navigate(`/media?featuredId=${contentId}`);
  };

  const handleFeatureContent = async (contentData: {
    media_content_id: string;
    admin_edited_title: string | null;
    admin_edited_creator: string | null;
  }) => {
    try {
      // Check if this content is already featured
      const { data: existingFeatured } = await supabase
        .from('featured_releases')
        .select('id')
        .eq('media_content_id', contentData.media_content_id)
        .single();

      if (existingFeatured) {
        // Update existing featured content
        const { error } = await supabase
          .from('featured_releases')
          .update({
            admin_edited_title: contentData.admin_edited_title,
            admin_edited_creator: contentData.admin_edited_creator,
            updated_at: new Date().toISOString()
          })
          .eq('media_content_id', contentData.media_content_id);

        if (error) throw error;
      } else {
        // Insert new featured content
        const { error } = await supabase
          .from('featured_releases')
          .insert([
            {
              media_content_id: contentData.media_content_id,
              admin_edited_title: contentData.admin_edited_title,
              admin_edited_creator: contentData.admin_edited_creator,
              admin_id: user?.id,
              is_active: true,
              display_order: 0
            }
          ]);

        if (error) throw error;
      }

      // Refresh featured releases
      await fetchFeaturedReleases();
    } catch (err) {
      console.error('Error featuring content:', err);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-float mb-8">
            <Crown className="w-20 h-20 text-rose-400 mx-auto mb-6" />
          </div>

          <h1 className="text-6xl md:text-7xl font-playfair font-bold text-white mb-6">
            Bringing <span className="gradient-text">Creative Dreams</span>
            <br />
            to Life
          </h1>

          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Celebrate and support the Creatives you love. Realize your own potential through Media, Masterclass and Project opportunities
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              to="/signin"
              className="px-8 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 animate-glow"
            >
              Get Started <ArrowRight className="inline w-5 h-5 ml-2" />
            </Link>
            <button className="px-8 py-4 glass-effect text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 flex items-center justify-center">
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </button>
          </div>

          <div className="flex flex-nowrap justify-center gap-6 md:gap-8 px-4 md:px-8 text-gray-300">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-green-400" />
              <span>Global</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span>Community</span>
            </div>
            <div className="flex items-center space-x-2">
              <Gem className="w-5 h-5 text-purple-400 animate-pulse" />
              <span>Premium</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              To create memorable, <span className="gradient-text">timeless experiences</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl md:max-w-6xl md:whitespace-nowrap mx-auto">
              We develop, present and represent talent - from portfolio to project management support
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Outstanding Portfolios",
                description: "Showcase your creative work and potential in the best light. Get discovered by a global network of talent.",
              },
              {
                icon: <Play className="w-8 h-8" />,
                title: "Media Streaming",
                description: "Share your best and build a devoted fanbase worldwide. Get more famous, more payment, and more opportunities."
              },
              {
                icon: <BookOpen className="w-8 h-8" />,
                title: "Masterclasses",
                description: "Learn from industry experts. Get certified in digital marketing, acting, modeling, music, media, and more."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Events",
                description: "Stay up to date with events, secure your exclusive early bird tickets, personalize your experiences and network in your industry."
              },
              {
                icon: <Crown className="w-8 h-8" />,
                title: "Projects",
                description: "Explore live projects to join or hire for. Build your portfolio with real work, from gigs to full-time opportunities."
              },
              {
                icon: <Star className="w-8 h-8" />,
                title: "Awards",
                description: "Participate in challenges, competitions, and promotions. Get awarded with prizes or contracts and recognition."
              }
            ].map((feature, index) => (
              <div key={index} className="glass-effect p-8 rounded-2xl hover-lift">
                <div className="text-rose-400 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Releases Section */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              Featured <span className="gradient-text">Releases</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              What's trending? Get the latest from outstanding creators
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loadingFeatured ? (
              // Loading skeleton
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="glass-effect rounded-2xl overflow-hidden animate-pulse">
                  <div className="relative aspect-video bg-gray-800" />
                  <div className="p-4">
                    <div className="h-4 bg-gray-700 rounded mb-3 w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : featuredReleases.length > 0 ? (
              // Display actual featured releases
              featuredReleases.map((release) => (
                <button
                  key={release.id}
                  onClick={() => handleFeaturedContentClick(release.id)}
                  className="glass-effect rounded-2xl overflow-hidden hover-lift group text-left w-full transition-all hover:shadow-lg"
                >
                  <div className="relative aspect-video bg-gray-800">
                    <img src={release.thumbnail} alt={release.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-1 bg-rose-500/80 text-white text-xs font-bold rounded-full">
                      {release.type}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-1">{release.title}</h3>
                    <p className="text-gray-400 text-sm">by {release.creator}</p>
                  </div>
                </button>
              ))
            ) : (
              // Fallback to default placeholders when no featured releases
              [
                {
                  type: 'Music',
                  title: 'I Just Might',
                  creator: 'Bruno Mars',
                  thumbnail: 'https://images.pexels.com/photos/3587620/pexels-photo-3587620.jpeg?auto=compress&cs=tinysrgb&w=400'
                },
                {
                  type: 'Movie',
                  title: 'Dreamland',
                  creator: 'Divine Pictures',
                  thumbnail: 'https://images.pexels.com/photos/269140/pexels-photo-269140.jpeg?auto=compress&cs=tinysrgb&w=400'
                },
                {
                  type: 'Art',
                  title: 'Abstract Arts',
                  creator: 'Art de Galleria',
                  thumbnail: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=400'
                },
                {
                  type: 'Interview',
                  title: 'My Creative Journey',
                  creator: 'Talents day Podcast',
                  thumbnail: 'https://images.pexels.com/photos/417273/pexels-photo-417273.jpeg?auto=compress&cs=tinysrgb&w=400'
                }
              ].map((release, index) => (
                <div key={index} className="glass-effect rounded-2xl overflow-hidden hover-lift group">
                  <div className="relative aspect-video bg-gray-800">
                    <img src={release.thumbnail} alt={release.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute top-2 left-2 px-2 py-1 bg-rose-500/80 text-white text-xs font-bold rounded-full">
                      {release.type}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-semibold mb-1">{release.title}</h3>
                    <p className="text-gray-400 text-sm">by {release.creator}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/media"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700"
            >
              View More
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Creators */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              Featured <span className="gradient-text">Creators</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Explore amazing talent - Follow, support, hire or tip your favourites.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Ouma Chris',
                role: 'Digital Marketer',
                avatar: 'https://s3.eu-central-003.backblazeb2.com/houzing/projects_page_avatars/12a44762-df97-499a-91d9-11ddd8b6d6a0/1769836259361-dgtmktg.jpg'
              },
              {
                name: 'Ruby Nesda',
                role: 'Model & Actress',
                avatar: 'https://images.pexels.com/photos/6311651/pexels-photo-6311651.jpeg?auto=compress&cs=tinysrgb&w=400'
              },
              {
                name: 'Eli Cooper',
                role: 'Event Producer',
                avatar: 'https://images.pexels.com/photos/15023413/pexels-photo-15023413.jpeg?auto=compress&cs=tinysrgb&w=150'
              },
              {
                name: 'Alex Carter',
                role: 'Content Creator',
                avatar: 'https://images.pexels.com/photos/1704488/pexels-photo-1704488.jpeg?auto=compress&cs=tinysrgb&w=150'
              }
            ].map((creator, index) => (
              <div key={index} className="glass-effect rounded-2xl p-6 hover-lift text-center">
                <img src={creator.avatar} alt={creator.name} className="w-20 h-20 rounded-full mx-auto mb-4 object-cover" />
                <h3 className="text-white font-semibold">{creator.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{creator.role}</p>
                <Link to="/portfolio" className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all text-sm">
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Membership Overview */}
      <div className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-playfair font-bold text-white mb-6">
              Join <span className="gradient-text">FlourishTalents</span>
            </h2>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">
              Access premium features, personalized content and exclusive support.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16">
              {[
                {
                  name: 'Member Account',
                  description: 'Support creators, follow favorites, access exclusive media and events.',
                  benefits: ['Exclusive Media', 'Follow & Support', 'Priority Access', 'Community'],
                  link: '/members-membership'
                },
                {
                  name: 'Creator Account',
                  description: 'Build a standout portfolio, stream your media, access masterclasses, and apply to projects.',
                  benefits: ['Advanced Portfolio', 'Media & Streaming', 'Masterclasses', 'Career Projects'],
                  link: '/creators-membership'
                }
              ].map((tier, index) => {
                const isCreator = tier.name.includes('Creator');
                const ringClass = isCreator ? 'ring-2 ring-blue-400' : 'ring-2 ring-yellow-400';
                const badgeClass = isCreator
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black';
                const ctaClass = isCreator
                  ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white hover:shadow-xl'
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black hover:shadow-xl';

                return (
                  <div key={index} className={`relative glass-effect p-8 rounded-2xl hover-lift ${ringClass}`}>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className={`${badgeClass} px-4 py-1 rounded-full text-sm font-semibold`}>
                        Recommended
                      </span>
                    </div>

                    <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-rose-500 to-purple-600 flex items-center justify-center mb-4">
                      <Crown className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
                    <p className="text-gray-300 mb-6">{tier.description}</p>

                    <ul className="space-y-2 mb-6">
                      {tier.benefits.map((b) => (
                        <li key={b} className="flex items-center text-gray-300">
                          <Star className="w-4 h-4 text-green-400 mr-3 flex-shrink-0" />
                          {b}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => (user ? navigate(tier.link) : navigate(`/signin?redirect=${tier.link}`))}
                      className={`block w-full py-3 text-center font-semibold rounded-lg transition-all duration-300 ${ctaClass}`}
                    >
                      Get Started
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-playfair font-bold text-white mb-6">
            Get in the <span className="gradient-text">Flow</span>
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Membership is by invitation only. Get started as a Creator or a Member
          </p>
          <Link
            to="/signin"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-lg"
          >
            Sign up <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Get the App Section */}
      <div className="py-20 px-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-playfair font-bold text-white mb-6">
            Get the <span className="gradient-text">App</span>
          </h2>
          <p className="text-lg text-gray-300 mb-12">
            Stay connected on the go
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button
              onClick={() => setOpenAppModal('ios')}
              className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded-lg"
            >
              <img src="https://f003.backblazeb2.com/file/houzing/admin1images/download+button+ios.png" alt="Download on the App Store" className="h-14" />
            </button>
            <button
              onClick={() => setOpenAppModal('android')}
              className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-950 rounded-lg"
            >
              <img src="https://f003.backblazeb2.com/file/houzing/admin1images/download+button+playstore.png" alt="Get it on Google Play" className="h-14" />
            </button>
          </div>
        </div>
      </div>

      {/* App Download Modals */}
      <AppDownloadModal
        isOpen={openAppModal === 'ios'}
        appType="ios"
        onClose={() => setOpenAppModal(null)}
      />
      <AppDownloadModal
        isOpen={openAppModal === 'android'}
        appType="android"
        onClose={() => setOpenAppModal(null)}
      />
    </div>
  );
}
