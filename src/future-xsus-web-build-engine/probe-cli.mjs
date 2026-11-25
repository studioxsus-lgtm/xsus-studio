import {probeConfiguredCores} from './probe.mjs';
try{const report=await probeConfiguredCores({env:process.env});console.log(JSON.stringify(report));process.exitCode=report.compatible?0:1}catch{console.error('Core compatibility probe configuration failed');process.exitCode=1}
