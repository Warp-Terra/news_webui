export type Region = "US" | "CN" | "EU" | "JP" | "Global" | (string & {});

export type Category = "Economy" | "Technology" | "Politics" | "Military" | "Energy";

export type ImportanceLevel = "low" | "medium" | "high" | "critical";

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  sourceUrl?: string;
  region: Region;
  category: Category;
  tags: string[];
  publishedAt: string;
  summary: string;
  keyPoints: string[];
  impact?: string;
  importance: ImportanceLevel;
}
