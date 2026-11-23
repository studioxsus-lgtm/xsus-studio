// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';
import {buildFromChatGoal} from '../../assets/js/xsus-app/build-engine-chat-client.js';

vi.mock('../../assets/js/xsus-app/auth-session.js',()=>({getUserAccessToken:async()=>'test'}));
vi.mock('../../assets/js/xsus-app/hyper-future-bridge-client.js?v=20261122-goalplan1',()=>({
  createDraftPlan:async({goal})=>({status:'completed',language:{text:goal},plan:{steps:[{task:'Build booking screens'}]}})
}));
afterEach(()=>vi.unstubAllGlobals());
const goal='Build a restaurant booking app with 4-seat tables and 8-seat tables.';
function respond(html){
  vi.stubGlobal('fetch',vi.fn(async(_url,request)=>{
    expect(JSON.parse(request.body).appSpec.seats).toEqual([4,8]);
    return {ok:true,json:async()=>({kind:'static-preview',requiresReview:true,files:[
      {path:'index.html',content:html},{path:'styles.css',content:'body{}'},{path:'main.js',content:'void 0;'}
    ]})};
  }));
}
it('rejects the generic Booking Manager for the restaurant request',async()=>{
  respond('<form><input name="customer"><input name="service"><input name="date"></form>');
  await expect(buildFromChatGoal(goal)).rejects.toThrow(/booking options/);
});
it('accepts the restaurant booking form for the same request',async()=>{
  respond('<form><select name="resource"></select><input name="time" type="datetime-local"><input name="party" type="number"></form>');
  const result=await buildFromChatGoal(goal);
  expect(result.files['index.html']).toContain('name="party"');
});
