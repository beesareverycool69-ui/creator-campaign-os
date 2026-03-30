// Creator Discovery Types

export interface BrandProfile {
  brand_name: string;
  industry: string;
  sub_niche: string;
  products_or_services: string[];
  target_audience: {
    age_range: string;
    gender_skew: string;
    interests: string[];
    income_level: string;
  };
  brand_tone: string[];
  brand_values: string[];
  content_themes: string[];
  competitors: string[];
}

export interface SearchKeywords {
  niche_keywords: string[];
  audience_keywords: string[];
  content_style_keywords: string[];
  hashtags: string[];
  search_queries: {
    instagram: string[];
    tiktok: string[];
    youtube: string[];
    x_twitter: string[];
  };
}

export interface DiscoveredCreator {
  name: string;
  handle: string;
  platform: string;
  profile_url: string;
  follower_count: string;
  niche: string;
  content_style: string;
  why_good_fit: string;
  source: string;
}

export interface ScoredCreator {
  name: string;
  handle: string;
  platform: string;
  profile_url: string;
  follower_count: string;
  score: number;
  reasoning: string;
  suggested_collab_type: string;
  source: "database" | "discovered";
}
