import {createBrandCoreClient} from './brand-v5/core-client.mjs';
import {createBrandApprovalStore} from './brand-v5/approval-store.mjs';
import {createLogoServer} from './api.mjs';
import {createCoreClient} from './core-client.mjs';
import {createOrchestrator} from './orchestrator.mjs';
import {createUserGateway} from './user-gateway.mjs';
const port=Number(process.env.PORT??8080);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid port');
const env=process.env;
const keys=['XSUS_LOGO_INTERPRET_URL','XSUS_LOGO_INTERPRET_TOKEN','XSUS_LOGO_PLAN_URL','XSUS_LOGO_PLAN_TOKEN'];
const orchestrator=keys.every(k=>env[k])?createOrchestrator({
 interpret:createCoreClient({url:env.XSUS_LOGO_INTERPRET_URL,token:env.XSUS_LOGO_INTERPRET_TOKEN,operation:'logo.interpret'}),
 plan:createCoreClient({url:env.XSUS_LOGO_PLAN_URL,token:env.XSUS_LOGO_PLAN_TOKEN,operation:'logo.plan'})
}):undefined;
const approvals=env.XSUS_LOGO_V5_ENABLED==='true'&&keys.every(k=>env[k])?createBrandApprovalStore({interpret:createBrandCoreClient({url:env.XSUS_LOGO_INTERPRET_URL,token:env.XSUS_LOGO_INTERPRET_TOKEN,operation:'brand.interpret'}),plan:createBrandCoreClient({url:env.XSUS_LOGO_PLAN_URL,token:env.XSUS_LOGO_PLAN_TOKEN,operation:'brand.plan'})}):undefined;
const userGateway=env.XSUS_LOGO_PUBLIC_ENABLED==='true'?createUserGateway({supabaseUrl:env.XSUS_LOGO_SUPABASE_URL,publishableKey:env.XSUS_LOGO_SUPABASE_PUBLISHABLE_KEY,orchestrator,approvals}):undefined;
createLogoServer({token:env.XSUS_LOGO_SERVICE_TOKEN,orchestrator,userGateway}).listen(port,'0.0.0.0');
