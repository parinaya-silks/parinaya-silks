import {spawnSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {blankContent} from '../src/content/model.ts';
import {emptyProduct} from '../src/products/model.ts';
import {build} from 'esbuild';
await mkdir('.cache/ga4',{recursive:true});
const product={...emptyProduct(),id:'p'.repeat(20),name:'Local cotton saree',slug:'local-cotton-saree',categoryName:'Cotton Sarees',categoryId:'c'.repeat(20),status:'Published',pricePaise:100000,revision:1,createdAt:1700000000000,updatedAt:1700000000000,inventory:{mode:'simple',quantity:2},images:[],coverMediaId:''};
await writeFile('.cache/ga4/fixtures.json',JSON.stringify({content:{...blankContent(),featuredCategories:[],featuredProducts:[]},product}));
for(const deployment of ['production','preview']){
 const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build','--outDir','.cache/ga4/'+deployment],{env:{...process.env,VERCEL_ENV:deployment,VITE_GA_MEASUREMENT_ID:'G-R785L2F0K0'},encoding:'utf8'});
 if(result.status!==0){process.stderr.write(result.stderr);process.exit(result.status??1);}
 console.log('Built isolated '+deployment+' analytics fixture.');
}
await build({stdin:{contents:`import React,{StrictMode} from 'react';import {createRoot} from 'react-dom/client';import {Seo} from './src/content/Seo.tsx';const root=createRoot(document.getElementById('root'));window.probeRender=()=>root.render(<StrictMode><Seo path={location.pathname+location.search}/></StrictMode>);window.probeRender();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'browser',outfile:'.cache/ga4/production/strict.js',define:{'process.env.NODE_ENV':'"development"','import.meta.env':JSON.stringify({PROD:true,MODE:'production',VITE_DEPLOYMENT_ENV:'production',VITE_GA_MEASUREMENT_ID:'G-R785L2F0K0'})}});
const result=spawnSync('python',['scripts/ga4-browser.test.py'],{stdio:'inherit'});process.exitCode=result.status??1;
