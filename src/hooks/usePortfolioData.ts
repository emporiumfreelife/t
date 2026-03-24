import { useState, useCallback, useEffect } from 'react';
import * as portfolioService from '../lib/portfolioService';
import type {
  PortfolioProfile,
  PortfolioCertification,
  PortfolioAward,
  PortfolioInterview,
  PortfolioExperience,
  PortfolioTestimonial,
  PortfolioSkill,
  PortfolioContent,
} from '../lib/portfolioService';

interface PortfolioState {
  profile: PortfolioProfile | null;
  certifications: PortfolioCertification[];
  awards: PortfolioAward[];
  interviews: PortfolioInterview[];
  experience: PortfolioExperience[];
  testimonials: PortfolioTestimonial[];
  skills: PortfolioSkill[];
  portfolioContent: PortfolioContent[];
  stats: any | null;
}

function getCacheKey(userId: string | undefined): string {
  return `portfolioData_${userId || 'anonymous'}`;
}

function getEmptyState(): PortfolioState {
  return {
    profile: null,
    certifications: [],
    awards: [],
    interviews: [],
    experience: [],
    testimonials: [],
    skills: [],
    portfolioContent: [],
    stats: null,
  };
}

function getInitialState(userId: string | undefined): PortfolioState {
  if (typeof window === 'undefined') {
    return getEmptyState();
  }

  // Always start with empty state - never load from old user's cache
  return getEmptyState();
}

function persistToCache(state: PortfolioState, userId: string | undefined) {
  if (typeof window !== 'undefined' && userId) {
    try {
      localStorage.setItem(getCacheKey(userId), JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist portfolio data:', error);
    }
  }
}

function clearOtherUsersCaches(currentUserId: string | undefined) {
  if (typeof window === 'undefined' || !currentUserId) return;

  // Clear any old cache keys that don't match the current user
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('portfolioData_') && key !== getCacheKey(currentUserId)) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Failed to clear old portfolio cache:', error);
      }
    }
  });
}

export function usePortfolioData(userId: string | undefined) {
  const [state, setState] = useState<PortfolioState>(getEmptyState);

  // Fetch all portfolio data - just load and store, no loading flags
  const fetchAllData = useCallback(async () => {
    if (!userId) return;

    try {
      const [
        profileResult,
        certificationsResult,
        awardsResult,
        interviewsResult,
        experienceResult,
        testimonialsResult,
        skillsResult,
        contentResult,
        statsResult,
      ] = await Promise.all([
        portfolioService.getPortfolioProfile(userId),
        portfolioService.getCertifications(userId),
        portfolioService.getAwards(userId),
        portfolioService.getInterviews(userId),
        portfolioService.getExperience(userId),
        portfolioService.getTestimonials(userId),
        portfolioService.getSkills(userId),
        portfolioService.getPortfolioContent(userId),
        portfolioService.getPortfolioStats(userId),
      ]);

      const newState = {
        profile: profileResult.data,
        certifications: certificationsResult.data,
        awards: awardsResult.data,
        interviews: interviewsResult.data,
        experience: experienceResult.data,
        testimonials: testimonialsResult.data,
        skills: skillsResult.data,
        portfolioContent: contentResult.data,
        stats: statsResult.data,
      };

      setState(newState);
      persistToCache(newState, userId);
    } catch (error) {
      // Silently fail - show whatever data we have
      console.error('Portfolio data fetch error:', error);
    }
  }, [userId]);

  // Clear other users' caches and fetch data when userId changes
  useEffect(() => {
    if (!userId) {
      // User logged out - clear state
      setState(getEmptyState());
      return;
    }

    // Clear any cached data from other users
    clearOtherUsersCaches(userId);

    // Always reset state to empty when user ID changes, then fetch fresh data
    setState(getEmptyState());
    fetchAllData();
  }, [userId, fetchAllData]);

  // Profile operations
  const updateProfile = useCallback(
    async (updates: Partial<PortfolioProfile>) => {
      if (!userId) return { error: 'No user ID' };

      const result = await portfolioService.updatePortfolioProfile(userId, updates);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            profile: { ...prev.profile, ...result.data } as PortfolioProfile,
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  // Certifications operations
  const addCertification = useCallback(
    async (certification: PortfolioCertification) => {
      if (!userId) return { data: null, error: 'No user ID' };

      const result = await portfolioService.addCertification(userId, certification);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            certifications: [result.data, ...prev.certifications],
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const updateCertification = useCallback(
    async (id: string, updates: Partial<PortfolioCertification>) => {
      const result = await portfolioService.updateCertification(id, updates);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            certifications: prev.certifications.map((c) =>
              c.id === id ? { ...c, ...result.data } : c
            ),
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const deleteCertification = useCallback(async (id: string) => {
    const result = await portfolioService.deleteCertification(id);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          certifications: prev.certifications.filter((c) => c.id !== id),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  // Awards operations
  const addAward = useCallback(
    async (award: PortfolioAward) => {
      if (!userId) return { data: null, error: 'No user ID' };

      const result = await portfolioService.addAward(userId, award);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            awards: [result.data, ...prev.awards],
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const updateAward = useCallback(async (id: string, updates: Partial<PortfolioAward>) => {
    const result = await portfolioService.updateAward(id, updates);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          awards: prev.awards.map((a) => (a.id === id ? { ...a, ...result.data } : a)),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  const deleteAward = useCallback(async (id: string) => {
    const result = await portfolioService.deleteAward(id);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          awards: prev.awards.filter((a) => a.id !== id),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  // Interviews operations
  const addInterview = useCallback(
    async (interview: PortfolioInterview) => {
      if (!userId) return { data: null, error: 'No user ID' };

      const result = await portfolioService.addInterview(userId, interview);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            interviews: [result.data, ...prev.interviews],
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const updateInterview = useCallback(
    async (id: string, updates: Partial<PortfolioInterview>) => {
      const result = await portfolioService.updateInterview(id, updates);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            interviews: prev.interviews.map((i) =>
              i.id === id ? { ...i, ...result.data } : i
            ),
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const deleteInterview = useCallback(async (id: string) => {
    const result = await portfolioService.deleteInterview(id);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          interviews: prev.interviews.filter((i) => i.id !== id),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  // Experience operations
  const addExperience = useCallback(
    async (experience: PortfolioExperience) => {
      if (!userId) return { data: null, error: 'No user ID' };

      const result = await portfolioService.addExperience(userId, experience);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            experience: [result.data, ...prev.experience],
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const updateExperience = useCallback(
    async (id: string, updates: Partial<PortfolioExperience>) => {
      const result = await portfolioService.updateExperience(id, updates);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            experience: prev.experience.map((e) =>
              e.id === id ? { ...e, ...result.data } : e
            ),
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const deleteExperience = useCallback(async (id: string) => {
    const result = await portfolioService.deleteExperience(id);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          experience: prev.experience.filter((e) => e.id !== id),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  // Testimonials operations
  const addTestimonial = useCallback(
    async (testimonial: PortfolioTestimonial) => {
      if (!userId) return { data: null, error: 'No user ID' };

      const result = await portfolioService.addTestimonial(userId, testimonial);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            testimonials: [result.data, ...prev.testimonials],
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const updateTestimonial = useCallback(
    async (id: string, updates: Partial<PortfolioTestimonial>) => {
      const result = await portfolioService.updateTestimonial(id, updates);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            testimonials: prev.testimonials.map((t) =>
              t.id === id ? { ...t, ...result.data } : t
            ),
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const deleteTestimonial = useCallback(async (id: string) => {
    const result = await portfolioService.deleteTestimonial(id);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          testimonials: prev.testimonials.filter((t) => t.id !== id),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  // Skills operations
  const addSkill = useCallback(
    async (skill: PortfolioSkill) => {
      if (!userId) return { data: null, error: 'No user ID' };

      const result = await portfolioService.addSkill(userId, skill);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            skills: [result.data, ...prev.skills],
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const updateSkill = useCallback(async (id: string, updates: Partial<PortfolioSkill>) => {
    const result = await portfolioService.updateSkill(id, updates);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          skills: prev.skills.map((s) => (s.id === id ? { ...s, ...result.data } : s)),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  const deleteSkill = useCallback(async (id: string) => {
    const result = await portfolioService.deleteSkill(id);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          skills: prev.skills.filter((s) => s.id !== id),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  // Portfolio content operations
  const addPortfolioContent = useCallback(
    async (content: PortfolioContent) => {
      if (!userId) return { data: null, error: 'No user ID' };

      const result = await portfolioService.addPortfolioContent(userId, content);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            portfolioContent: [result.data, ...prev.portfolioContent],
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const updatePortfolioContent = useCallback(
    async (id: string, updates: Partial<PortfolioContent>) => {
      const result = await portfolioService.updatePortfolioContent(id, updates);
      if (!result.error) {
        setState((prev) => {
          const newState = {
            ...prev,
            portfolioContent: prev.portfolioContent.map((c) =>
              c.id === id ? { ...c, ...result.data } : c
            ),
          };
          persistToCache(newState, userId);
          return newState;
        });
      }
      return result;
    },
    [userId]
  );

  const deletePortfolioContent = useCallback(async (id: string) => {
    const result = await portfolioService.deletePortfolioContent(id);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          portfolioContent: prev.portfolioContent.filter((c) => c.id !== id),
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  const updateDisplayOrder = useCallback(async (contentIds: string[]) => {
    const result = await portfolioService.updatePortfolioContentDisplayOrder(contentIds);
    if (!result.error) {
      setState((prev) => {
        const newState = {
          ...prev,
          portfolioContent: contentIds
            .map((id) => prev.portfolioContent.find((c) => c.id === id))
            .filter(Boolean) as PortfolioContent[],
        };
        persistToCache(newState, userId);
        return newState;
      });
    }
    return result;
  }, [userId]);

  return {
    // State
    ...state,
    
    // Profile
    updateProfile,
    
    // Certifications
    addCertification,
    updateCertification,
    deleteCertification,
    
    // Awards
    addAward,
    updateAward,
    deleteAward,
    
    // Interviews
    addInterview,
    updateInterview,
    deleteInterview,
    
    // Experience
    addExperience,
    updateExperience,
    deleteExperience,
    
    // Testimonials
    addTestimonial,
    updateTestimonial,
    deleteTestimonial,
    
    // Skills
    addSkill,
    updateSkill,
    deleteSkill,
    
    // Portfolio Content
    addPortfolioContent,
    updatePortfolioContent,
    deletePortfolioContent,
    updateDisplayOrder,
    
    // Refresh
    refresh: fetchAllData,
  };
}
