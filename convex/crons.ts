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

// Leaders sync — Monday 06:00 EST (states 0–24: AL through MT)
crons.cron(
  "sync leaders states 0-24",
  "0 11 * * 1",
  internal.leadersSync.internalSyncRange,
  { startIndex: 0, endIndex: 24 }
);

// Leaders sync — Tuesday 06:00 EST (states 25–49: NE through WY)
crons.cron(
  "sync leaders states 25-49",
  "0 11 * * 2",
  internal.leadersSync.internalSyncRange,
  { startIndex: 25, endIndex: 49 }
);

export default crons;
