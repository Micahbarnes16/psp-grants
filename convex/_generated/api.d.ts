/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as civicSync from "../civicSync.js";
import type * as crons from "../crons.js";
import type * as funders from "../funders.js";
import type * as grants from "../grants.js";
import type * as leaders from "../leaders.js";
import type * as leadersSync from "../leadersSync.js";
import type * as lib_auth from "../lib/auth.js";
import type * as psp from "../psp.js";
import type * as scrapers_chatlos from "../scrapers/chatlos.js";
import type * as scrapers_crowell from "../scrapers/crowell.js";
import type * as scrapers_evangelism from "../scrapers/evangelism.js";
import type * as scrapers_givingcompass from "../scrapers/givingcompass.js";
import type * as scrapers_grantwatch from "../scrapers/grantwatch.js";
import type * as scrapers_index from "../scrapers/index.js";
import type * as scrapers_lilly from "../scrapers/lilly.js";
import type * as scrapers_mutations from "../scrapers/mutations.js";
import type * as scrapers_ncf from "../scrapers/ncf.js";
import type * as scrapers_parseUtils from "../scrapers/parseUtils.js";
import type * as scrapers_stewardship from "../scrapers/stewardship.js";
import type * as scrapers_zeffy from "../scrapers/zeffy.js";
import type * as statewideOffices from "../statewideOffices.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  civicSync: typeof civicSync;
  crons: typeof crons;
  funders: typeof funders;
  grants: typeof grants;
  leaders: typeof leaders;
  leadersSync: typeof leadersSync;
  "lib/auth": typeof lib_auth;
  psp: typeof psp;
  "scrapers/chatlos": typeof scrapers_chatlos;
  "scrapers/crowell": typeof scrapers_crowell;
  "scrapers/evangelism": typeof scrapers_evangelism;
  "scrapers/givingcompass": typeof scrapers_givingcompass;
  "scrapers/grantwatch": typeof scrapers_grantwatch;
  "scrapers/index": typeof scrapers_index;
  "scrapers/lilly": typeof scrapers_lilly;
  "scrapers/mutations": typeof scrapers_mutations;
  "scrapers/ncf": typeof scrapers_ncf;
  "scrapers/parseUtils": typeof scrapers_parseUtils;
  "scrapers/stewardship": typeof scrapers_stewardship;
  "scrapers/zeffy": typeof scrapers_zeffy;
  statewideOffices: typeof statewideOffices;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
