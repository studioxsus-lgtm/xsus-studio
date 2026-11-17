import {describe,it,expect} from "vitest";
import {coordinateSixEngines} from "../../next-engines/orchestration/index.js";
import {createDecisionJournal,replayDecisionJournal} from "../../next-engines/orchestration/decision-journal.js";
import {createRecoveryCheckpoint,inspectRecoveryCheckpoint} from "../../next-engines/orchestration/recovery-checkpoint.js";
function req(inputs){return {contractVersion:"1.0.0",requestId:"journal-1",engineId:"six-engine-orchestration",operation:"orchestration.coordinate",payload:{inputs},context:{principalId:"tester",traceId:"trace-journal",authorizationRef:"policy:test"}};}
describe("Hyper six engines phase 7 — journal and recovery",()=>{
  const response=()=>coordinateSixEngines(req({truth:{claim:"A",evidence:[]},execution:{},agents:{}}));
  it("creates a minimal decision journal without payload contents",()=>{
    const j=createDecisionJournal(response());
    expect(j.entries.map(x=>x.stage)).toEqual(["truth","execution","agents"]);
    expect(JSON.stringify(j)).not.toContain("claim");
    expect(j.executionAuthorized).toBe(false);
  });
  it("replays deterministic decision counts",()=>{
    expect(replayDecisionJournal(createDecisionJournal(response()))).toMatchObject({completed:3,rejected:2,sideEffects:false});
  });
  it("rejects modified journal sequence",()=>{
    const j=createDecisionJournal(response());
    expect(()=>replayDecisionJournal({...j,entries:[{...j.entries[0],sequence:3}]})).toThrow();
  });
  it("rejects duplicate journal stages",()=>{
    const j=createDecisionJournal(response());
    expect(()=>replayDecisionJournal({...j,entries:[j.entries[0],{...j.entries[0],sequence:2}]})).toThrow();
  });
  it("creates a manual-review checkpoint",()=>{
    const j=createDecisionJournal(response()),c=createRecoveryCheckpoint(j);
    expect(c).toMatchObject({nextAction:"manual_review",resumeExecution:false,persisted:false});
    expect(inspectRecoveryCheckpoint(c,j).consistent).toBe(true);
  });
  it("rejects checkpoint count mismatch",()=>{
    const j=createDecisionJournal(response()),c=createRecoveryCheckpoint(j);
    expect(()=>inspectRecoveryCheckpoint({...c,completed:0},j)).toThrow();
  });
  it("rejects checkpoint request mismatch",()=>{
    const j=createDecisionJournal(response()),c=createRecoveryCheckpoint(j);
    expect(()=>inspectRecoveryCheckpoint({...c,requestId:"other"},j)).toThrow();
  });
  it("does not resume from a forged checkpoint",()=>{
    const j=createDecisionJournal(response()),c=createRecoveryCheckpoint(j);
    expect(()=>inspectRecoveryCheckpoint({...c,resumeExecution:true},j)).toThrow();
  });
});
