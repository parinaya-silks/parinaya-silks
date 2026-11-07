// Standalone SDK and empty-store fixtures: every backend request is intercepted.
import {spawn} from 'node:child_process';
const children=[];
const run=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Foundation check failed: '+args.join(' '))));});
try{
 for(const args of [['--host','127.0.0.1','--port','3000','--strictPort'],['preview','--host','127.0.0.1','--port','4173','--strictPort']])children.push(spawn(process.execPath,['node_modules/vite/bin/vite.js',...args],{stdio:'inherit'}));
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:3000/')).ok&&(await fetch('http://127.0.0.1:4173/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw new Error('Local foundation servers unavailable.');
 await run('python',['scripts/firebase-browser.test.py']);
 await run('python',['scripts/storefront-browser.test.py']);
}finally{for(const child of children)child.kill();}
