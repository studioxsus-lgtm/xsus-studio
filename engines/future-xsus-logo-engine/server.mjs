import {createLogoServer} from './api.mjs';
import {createCoreClient} from './core-client.mjs';
import {createOrchestrator} from './orchestrator.mjs';
const port=Number(process.env.PORT??8080);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
const env=process.env;
const keys=['XSUS_LOGO_INTERPRET_URL','XSUS_LOGO_INTERPRET_TOKEN','XSUS_LOGO_PLAN_URL','XSUS_LOGO_PLAN_TOKEN'];
const orchestrator=keys.every(k=>env[k])?createOrchestrator({
 interpret:createCoreClient({url:env.XSUS_LOGO_INTERPRET_URL,token:env.XSUS_LOGO_INTERPRET_TOKEN,operation:'logo.interpret'}),
 plan:createCoreClient({url:env.XSUS_LOGO_PLAN_URL,token:env.XSUS_LOGO_PLAN_TOKEN,operation:'logo.plan'})
}):undefined;
createLogoServer({token:env.XSUS_LOGO_SERVICE_TOKEN,orchestrator}).listen(port,'0.0.0.0');
