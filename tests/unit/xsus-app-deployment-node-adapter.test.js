import {describe,it,expect} from 'vitest';
import {Readable} from 'node:stream';
import {createDeploymentNodeHandler} from '../../services/src/deployment/deployment-node-adapter.js';
async function invoke({url='/api/deployments/validate',method='POST',body='{}',headers={}}={}) {
 const req=Readable.from([Buffer.from(body)]);req.url=url;req.method=method;req.headers=headers;
 const res={headersSent:false,writableEnded:false,writeHead(status,headers){this.status=status;this.headers=headers;this.headersSent=true;},end(data){this.body=JSON.parse(data);this.writableEnded=true;}};
 await createDeploymentNodeHandler({allowedOrigins:['https://www.xsusstudio.com']})(req,res);
 return res;
}
describe('Node deployment validation route adapter',()=>{
 it('rejects unknown paths',async()=>expect((await invoke({url:'/other'})).status).toBe(404));
 it('rejects GET',async()=>expect((await invoke({method:'GET'})).status).toBe(405));
 it('rejects oversized bodies',async()=>expect((await invoke({body:'x'.repeat(16385)})).status).toBe(413));
 it('requires bearer authentication',async()=>{
   const res=await invoke({headers:{origin:'https://www.xsusstudio.com','content-type':'application/json'}});
   expect(res.status).toBe(401);
   expect(res.body.deployed).toBe(false);
 });
 it('does not treat a request as a deployment',async()=>{
   const res=await invoke({headers:{origin:'https://www.xsusstudio.com','content-type':'application/json',authorization:'Bearer abc'}});
   expect(res.status).toBe(503);
   expect(res.body.deployed).toBe(false);
 });
});
