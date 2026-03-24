import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Users, Briefcase, TrendingUp, Award } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CourseDetails {
  id: string;
  title: string;
  creator: string;
  category: string;
  thumbnail_url: string;
  description: string;
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  image?: string;
  content: string;
  rating: number;
}

export default function CareerGuidancePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourseDetails = useCallback(async () => {
    if (!courseId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('masterclass_page_content')
        .select('id, title, creator, category, thumbnail_url, description')
        .eq('id', courseId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Course not found');

      setCourse(data);
    } catch (err) {
      console.error('Error fetching course:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseDetails();
  }, [fetchCourseDetails]);

  const testimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'Marketing Manager',
      content: 'This course transformed my career trajectory. The practical insights and real-world applications directly contributed to my promotion.',
      rating: 5,
    },
    {
      id: '2',
      name: 'Michael Chen',
      role: 'Creative Director',
      content: 'The depth of knowledge and mentorship from industry experts was invaluable. Highly recommended for anyone serious about career growth.',
      rating: 5,
    },
    {
      id: '3',
      name: 'Priya Patel',
      role: 'Entrepreneur',
      content: 'I launched my own business based on concepts learned in this course. The support and guidance were exceptional throughout.',
      rating: 5,
    },
  ];

  const guidancePoints = [
    {
      icon: TrendingUp,
      title: 'Career Growth',
      description: 'Learn strategies to advance your career and achieve your professional goals.',
    },
    {
      icon: Award,
      title: 'Industry Recognition',
      description: 'Gain certifications and credentials valued by top companies in your field.',
    },
    {
      icon: Briefcase,
      title: 'Practical Skills',
      description: 'Master in-demand skills that employers actively seek.',
    },
    {
      icon: Users,
      title: 'Networking Opportunities',
      description: 'Connect with industry professionals and expand your professional network.',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-800 rounded w-1/4"></div>
            <div className="h-96 bg-gray-800 rounded-2xl"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-800 rounded w-1/3"></div>
              <div className="h-24 bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate('/masterclass')}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Courses
          </button>
          <div className="glass-effect p-8 rounded-2xl text-center">
            <p className="text-red-400 mb-4">{error || 'Course not found'}</p>
            <button
              onClick={() => navigate('/masterclass')}
              className="px-6 py-2 bg-gradient-to-r from-rose-500 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Back to Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/masterclass')}
          className="flex items-center gap-2 text-gray-300 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Courses
        </button>

        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start mb-8">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">{course.title}</h1>
              <p className="text-gray-300 text-lg mb-2">by {course.creator}</p>
              <span className="inline-block px-3 py-1 bg-purple-400/20 text-purple-300 text-sm rounded-full font-medium">
                {course.category}
              </span>
            </div>
            {course.thumbnail_url && (
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="w-full sm:w-48 h-40 sm:h-32 rounded-lg object-cover flex-shrink-0"
              />
            )}
          </div>
        </div>

        {/* Overview Section */}
        <div className="glass-effect p-8 rounded-2xl mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Course Overview</h2>
          <p className="text-gray-300 leading-relaxed text-lg">{course.description}</p>
        </div>

        {/* What You'll Gain */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {guidancePoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div key={index} className="glass-effect p-6 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-rose-500 to-purple-600 rounded-lg flex-shrink-0">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">{point.title}</h3>
                    <p className="text-gray-300 text-sm">{point.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Success Stories */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-white mb-8">Success Stories</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="glass-effect p-6 rounded-xl hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">{testimonial.name[0]}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{testimonial.name}</h3>
                    <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-current"
                    />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{testimonial.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Career Pathways */}
        <div className="glass-effect p-8 rounded-2xl mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Career Pathways</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-bold">1</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Entry Level Positions</h3>
                <p className="text-gray-300 text-sm">Start your career with foundational knowledge and practical skills that companies value.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-bold">2</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Mid-Level Advancement</h3>
                <p className="text-gray-300 text-sm">Build expertise and leadership skills to progress to senior roles and management positions.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm font-bold">3</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Leadership & Entrepreneurship</h3>
                <p className="text-gray-300 text-sm">Use your expertise to lead teams, launch ventures, or become a thought leader in your industry.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="glass-effect p-8 rounded-2xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Transform Your Career?</h2>
          <p className="text-gray-300 mb-6 text-lg max-w-2xl mx-auto">
            Join thousands of professionals who have advanced their careers through this comprehensive course. Start your journey today.
          </p>
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="px-8 py-3 bg-gradient-to-r from-rose-500 to-purple-600 text-white font-semibold rounded-lg hover:shadow-xl transition-all text-lg"
          >
            View Course & Enroll
          </button>
        </div>
      </div>
    </div>
  );
}
