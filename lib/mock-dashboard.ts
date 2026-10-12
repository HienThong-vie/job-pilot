import type { ActivityItem } from "@/types";

// Feature 14 rendered from this. Features 15 and 17 replaced the stat cards and
// the charts; 16 replaces the activity list. Delete the file with it.

export const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", message: "Found 8 jobs for Frontend Engineer", timeAgo: "10 mins ago", tone: "accent" },
  { id: "2", message: "Researched Stripe", timeAgo: "1 hour ago", tone: "info" },
  { id: "3", message: "Found 12 jobs for React Developer", timeAgo: "2 hours ago", tone: "success" },
  { id: "4", message: "Researched Vercel", timeAgo: "Yesterday", tone: "accent" },
  { id: "5", message: "Found 10 jobs for Full Stack Engineer", timeAgo: "Yesterday", tone: "success" },
];
