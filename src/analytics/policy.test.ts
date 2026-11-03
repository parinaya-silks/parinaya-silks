import test from 'node:test';import assert from 'node:assert/strict';
import {analyticsPage,consentValue,createPageViews,productionAnalytics} from './policy.ts';
const id='G-R785L2F0K0',base='https://www.parinayasarees.com';
test('GA is production-only, exact-domain-only and excluded from automation',()=>{
 const config={production:true,deployment:'production',measurementId:id,href:base,automated:false};assert.equal(productionAnalytics(config),true);assert.equal(productionAnalytics({...config,href:'https://parinayasarees.com'}),true);
 for(const href of ['http://www.parinayasarees.com','https://www.parinayasarees.com:8443','http://localhost:3000','https://parinayasilks.vercel.app','https://preview.vercel.app','https://www.parinayasarees.com.evil.test'])assert.equal(productionAnalytics({...config,href}),false,href);
 for(const change of [{production:false},{deployment:'preview'},{deployment:'local'},{automated:true},{measurementId:''},{measurementId:'UA-123'}])assert.equal(productionAnalytics({...config,...change}),false);
 assert.equal(consentValue('denied'),'denied');assert.equal(consentValue('yes'),'unknown');
});
test('locations, referrers and titles never contain customer data or private IDs',()=>{
 const privateId='0123456789abcdef0123456789abcdef';
 for(const path of ['/account/orders/'+privateId,'/order-confirmed/'+privateId,'/order-tracking/'+privateId,'/checkout/payment']){const page=analyticsPage(base+path+'?email=private@example.test&token=private-token#address','Hello Private Customer')!;assert.ok(page);assert.doesNotMatch(JSON.stringify(page.location+page.title),/Private Customer|private-token|example|0123456789|email=|address/);assert.equal(page.title,'Account | PARINAYA SAREES');}
 assert.equal(analyticsPage(base+'/shop?search=private@example.test&phone=9876543210#private','Shop sarees | PARINAYA SAREES')!.location,base+'/shop');
 assert.equal(analyticsPage(base+'/collections/cotton-sarees?returnTo=/account','cotton sarees | PARINAYA SAREES')!.title,'cotton sarees | PARINAYA SAREES');
 for(const path of ['/admin','/admin/orders/private','/#/admin/customers','/admin/#/shop','/collections/private%40example.test','/product/'+privateId,'/product/9876543210','/unknown/private'])assert.equal(analyticsPage(base+path,'Private'),null,path);
 assert.equal(analyticsPage(base+'/shop','private@example.test')!.title,'Shop sarees | PARINAYA SAREES');
});
function fixture(){let href=base+'/',allowed=false,resolve!:()=>void,reject!:(reason?:unknown)=>void;const calls:unknown[][]=[],disabled:boolean[]=[];let loads=0;
 const api=createPageViews(id,{load:()=>{loads++;return new Promise<void>((ok,no)=>{resolve=ok;reject=no;});},command:(...args)=>calls.push(args),disable:value=>disabled.push(value)},()=>href,()=>allowed);
 return {api,calls,disabled,setHref:(value:string)=>{href=value;api.routeChanged();},grant:()=>{allowed=true;api.preferenceChanged();},deny:()=>{allowed=false;api.preferenceChanged();},resolve:()=>resolve(),reject:()=>reject(),loads:()=>loads};
}
const events=(calls:unknown[][])=>calls.filter(c=>c[0]==='event');
test('opt-in gates loading; initial, query navigation, back and Strict Mode have exactly one manual view',async()=>{
 const f=fixture();f.api.page(base+'/','Sarees');assert.equal(f.loads(),0);assert.equal(f.calls.length,0);f.grant();assert.equal(f.loads(),1);f.api.page(base+'/','Sarees');f.resolve();await new Promise(ok=>setTimeout(ok,0));assert.equal(events(f.calls).length,1);
 f.setHref(base+'/shop?q=private@example.test');f.api.page(base+'/shop?q=private@example.test','Shop sarees');f.api.page(base+'/shop?q=private@example.test','Shop sarees');assert.equal(events(f.calls).length,2);
 f.setHref(base+'/');f.api.page(base+'/','Sarees');assert.equal(events(f.calls).length,3);assert.equal(f.loads(),1);
 const config=f.calls.find(c=>c[0]==='config')![2] as any;assert.equal(config.send_page_view,false);assert.equal(config.currency,'INR');assert.equal(config.allow_google_signals,false);assert.equal(config.allow_ad_personalization_signals,false);
 assert.doesNotMatch(JSON.stringify(f.calls),/private@example|user_id|user_properties|returnTo|form_/);assert.ok(events(f.calls).every(c=>c[1]==='page_view'));
});
test('Admin exclusion, withdrawal and delayed script loads drop unsent views and ignore stale effects',async()=>{
 const f=fixture();f.grant();f.api.page(base+'/','Sarees');f.setHref(base+'/admin/orders');f.resolve();await new Promise(ok=>setTimeout(ok,0));assert.equal(f.calls.length,0);assert.equal(f.disabled.at(-1),true);
 f.api.page(base+'/','Stale response');assert.equal(f.calls.length,0);f.setHref(base+'/shop');f.api.page(base+'/shop','Shop');assert.equal(events(f.calls).length,1);f.deny();f.setHref(base+'/bag');f.api.page(base+'/bag','Bag');assert.equal(events(f.calls).length,1);assert.equal(f.disabled.at(-1),true);f.grant();assert.equal(events(f.calls).length,2);
});
test('blocked analytics scripts never throw into the application or repeatedly reload',async()=>{
 const f=fixture();f.grant();assert.doesNotThrow(()=>f.api.page(base+'/','Sarees'));f.reject();await new Promise(ok=>setTimeout(ok,0));f.setHref(base+'/shop');assert.doesNotThrow(()=>f.api.page(base+'/shop','Shop'));assert.equal(f.loads(),1);assert.equal(f.calls.length,0);assert.equal(f.disabled.at(-1),true);
});
