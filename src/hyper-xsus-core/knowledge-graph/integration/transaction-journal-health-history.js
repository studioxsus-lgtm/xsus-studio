/**
 * Hyper XSUS Core — bounded in-memory health history v4.3.0.
 * Stores copies of advisory reports, never mutates journal files.
 * RAM-only: restart clears history; observations are not atomic across files.
 */
import { createTransactionJournalHealthReport } from "./transaction-journal-health-report.js";

export const TRANSACTION_JOURNAL_HEALTH_HISTORY_VERSION = "4.3.0";
const LEVEL_RANK = Object.freeze({healthy:0,attention:1,unknown:2,critical:3});
const LEVELS = new Set(Object.keys(LEVEL_RANK));
const COUNTS = ["running","completed","failed","interrupted"];

function snapshot(report, timestamp) {
  if (!report || typeof report !== "object" || !LEVELS.has(report.level) ||
      !Array.isArray(report.warnings) || report.warnings.some(w => typeof w !== "string") ||
      !Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new TypeError("Invalid health observation.");
  }
  const counts = report.transactionCounts;
  if (counts !== null && counts !== undefined &&
      (typeof counts !== "object" || COUNTS.some(k => !Number.isSafeInteger(counts[k]) || counts[k] < 0))) {
    throw new TypeError("Invalid health transaction counts.");
  }
  return Object.freeze({
    timestamp, level:report.level, journalStatus:report.journalStatus,
    revision:report.revision ?? null,
    warnings:Object.freeze([...report.warnings]),
    transactionCounts:counts == null ? null : Object.freeze(Object.fromEntries(COUNTS.map(k=>[k,counts[k]]))),
  });
}

export function createTransactionJournalHealthHistory({maxEntries=100}={}) {
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 10000)
    throw new RangeError("maxEntries must be between 1 and 10000.");
  const history=[];
  function record(report,{timestamp=Date.now()}={}) {
    const entry=snapshot(report,timestamp);
    history.push(entry);
    if (history.length > maxEntries) history.splice(0,history.length-maxEntries);
    return entry;
  }
  function list() {return Object.freeze([...history]);}
  function analyze() {
    const first=history[0] ?? null;
    const latest=history.at(-1) ?? null;
    const previous=history.at(-2) ?? null;
    const direction=!previous ? "insufficient-data"
      : LEVEL_RANK[latest.level] > LEVEL_RANK[previous.level] ? "worsening"
      : LEVEL_RANK[latest.level] < LEVEL_RANK[previous.level] ? "improving" : "stable";
    const frequencies=new Map();
    for(const item of history)
      for(const warning of new Set(item.warnings))
        frequencies.set(warning,(frequencies.get(warning)??0)+1);
    const repeatedWarnings=[...frequencies].filter(([,count])=>count>=2)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([code,occurrences])=>Object.freeze({code,occurrences}));
    return Object.freeze({
      version:TRANSACTION_JOURNAL_HEALTH_HISTORY_VERSION,
      sampleCount:history.length,
      firstTimestamp:first?.timestamp ?? null,
      latestTimestamp:latest?.timestamp ?? null,
      previousLevel:previous?.level ?? null,
      latestLevel:latest?.level ?? null,
      direction,
      repeatedWarnings:Object.freeze(repeatedWarnings),
      persistence:"memory-only",
    });
  }
  async function sample(filePath, options={}) {
    const {timestamp=Date.now(),...diagnosticOptions}=options;
    const report=await createTransactionJournalHealthReport(filePath,diagnosticOptions);
    return record(report,{timestamp});
  }
  return Object.freeze({record,list,analyze,sample});
}
