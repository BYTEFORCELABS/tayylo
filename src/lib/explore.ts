// Shared constants and types for the Explore feed.

export const EXPLORE_CATEGORIES = [
  "Traditional",
  "Formal",
  "Womenswear",
  "Menswear",
  "Wedding & Bridal",
  "Outerwear",
  "Casual",
  "Kids",
  "Accessories",
] as const;

export const EXPLORE_COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Senegal", "Cameroon", "Côte d'Ivoire", "Ethiopia", "Tanzania", "Uganda",
  "Egypt", "Morocco", "India", "Pakistan", "Bangladesh", "Japan", "China", "Philippines", "Indonesia", "Turkey",
  "United Arab Emirates", "Saudi Arabia", "United Kingdom", "France", "Italy", "Spain", "Germany", "Netherlands",
  "United States", "Canada", "Jamaica", "Brazil", "Mexico", "Australia",
] as const;

export interface ExplorePost {
  id: string;
  authorName: string;
  country: string;
  category: string;
  caption: string | null;
  tags: string[];
  imageUrl: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  saved: boolean;
  mine: boolean;
}

export interface ExplorePage {
  posts: ExplorePost[];
  nextCursor: string | null;
  countries: { name: string; count: number }[];
}
