import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run all grant scrapers every 7 days (168 hours)
crons.interval(
  "scrape all grant sources",
  { hours: 168 },
  internal.scrapers.index.runAllScrapers,
  {}
);

export default crons;
