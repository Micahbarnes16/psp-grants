import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every Monday at 11:00 UTC = 06:00 EST / 07:00 EDT (America/Indiana/Indianapolis)
crons.cron(
  "scrape all grant sources",
  "0 11 * * 1",
  internal.scrapers.index.runAllScrapers,
  {}
);

export default crons;
