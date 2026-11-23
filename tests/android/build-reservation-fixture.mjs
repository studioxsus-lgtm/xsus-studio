import {readFile,writeFile} from 'node:fs/promises';
import {buildApk,createSigningKey} from '../../src/xsus-app-build-engine/android/distribution/apk.js';
import {generateWorkerStaticPreview} from '../../services/src/build-worker/static-preview-build.js';
const appSpec={version:1,resource:'table',rule:'exclusive-time-range',ruleCapacity:'party-fits-table',seats:[4,8],durationMinutes:90};
const preview=generateWorkerStaticPreview({name:'Restaurant reservations',appSpec});
const files=Object.fromEntries(preview.files.map(file=>[file.path,file.content]));
// Only the emulator fixture drives the generated form. A sample export retains the original app.
if(process.argv.includes('--emulator')) {
  files['main.js'] += `
    const form=document.querySelector('form'), fields=form.elements;
    if(document.querySelector('#bookings li')) {
      document.querySelector('h1').textContent='XSUS booking restored';
    } else {
      fields.customer.value='Android test';
      fields.time.value='2030-02-10T19:00';
      fields.party.value='6';
      fields.party.dispatchEvent(new Event('input',{bubbles:true}));
      if(fields.resource.options.length===1 && fields.resource.options[0].text.includes('8 seats')) {
        form.requestSubmit();
        if(document.querySelector('#bookings li')) document.querySelector('h1').textContent='XSUS booking saved';
      }
    }
  `;
}
const host=JSON.parse(await readFile(new URL('../../src/xsus-app-build-engine/android/distribution/host.json',import.meta.url)));
const apk=await buildApk({files,host,title:'XSUS Restaurant',projectId:'ab'.repeat(16),keys:await createSigningKey()});
await writeFile(process.argv[2],apk);
