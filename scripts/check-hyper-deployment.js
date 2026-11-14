#!/usr/bin/env node
import {inspectHyperDeploymentConfig} from "../src/platform/xsus-app/hyper-deployment-gate.js";

const report=inspectHyperDeploymentConfig(process.env);
if(report.ready){
 console.log("XSUS Hyper deployment configuration: READY (shape only; not a live connection test).");
 process.exitCode=0;
}else{
 console.error("XSUS Hyper deployment configuration: BLOCKED");
 for(const blocker of report.blockers)console.error(" - "+blocker);
 process.exitCode=1;
}
