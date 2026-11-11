// Documentation-only exporter. Uses existing transitive marked and host Playwright;
// no application configuration or dependency manifest changes are required.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {resolve,relative,extname,basename,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const require=createRequire(import.meta.url),{marked}=require('marked');
const root=resolve('.'),out=join(root,'Parinaya_Documents_PDF'),tmp=join(root,'.cache/documentation-export');
const walk=dir=>readdirSync(dir).flatMap(name=>{const p=join(dir,name);return statSync(p).isDirectory()?walk(p):[p];});
const sources=[...walk(join(root,'docs')).filter(p=>extname(p).toLowerCase()==='.md'),...readdirSync(root).filter(n=>extname(n).toLowerCase()==='.md').map(n=>join(root,n)),join(root,'public/fonts/Lora-OFL.txt')].sort((a,b)=>relative(root,a).localeCompare(relative(root,b)));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const name=p=>relative(root,p).replaceAll('\\','/').replace(/\.[^.]+$/,'').replaceAll('/','__')+'.pdf';
const exports=new Map(sources.map(p=>[p,name(p)]));
const style=`@page{size:A4;margin:19mm 15mm 19mm}*{box-sizing:border-box}html{font-family:Arial,'Segoe UI','Nirmala UI',sans-serif;color:#242124;font-size:10px}body{margin:0;line-height:1.5}h1{font-size:25px;line-height:1.2;color:#780d24;margin:10px 0 18px;border-bottom:2px solid #b78b48;padding-bottom:12px}h2{font-size:16px;color:#780d24;margin:23px 0 9px}h3{font-size:12px;margin:16px 0 7px}h1,h2,h3,h4{break-after:avoid}p,li{orphans:3;widows:3}p{margin:8px 0}a{color:#780d24;text-decoration:underline;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:8.4px;table-layout:fixed;margin:12px 0}th,td{border:1px solid #d5ccd0;padding:6px;vertical-align:top;overflow-wrap:anywhere;word-break:normal}thead{display:table-header-group}th{background:#f1e7ea;text-align:left}tr{break-inside:avoid}pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-all;background:#f5f3f3;border:1px solid #ddd;padding:10px;font:8.1px/1.5 Consolas,monospace;tab-size:2}code{font-family:Consolas,monospace;font-size:.93em;overflow-wrap:anywhere}blockquote{border-left:3px solid #b78b48;background:#faf4f5;margin:12px 0;padding:5px 12px}blockquote p{margin:5px 0}ul,ol{padding-left:21px}li{margin:4px 0}img{max-width:100%;height:auto}hr{border:0;border-top:1px solid #ddd;margin:18px 0}.source{font-size:9px;color:#655b60}.doc-label{letter-spacing:1.5px;text-transform:uppercase;color:#87622d;font-size:9px}input[type=checkbox]{width:10px;height:10px}`;
const renderer={link(...args){const token=typeof args[0]==='object'?args[0]:{href:args[0],title:args[1],text:args[2]};const {href,text,tokens}=token;let target=href;try{if(href&&!/^(?:[a-z][\w+.-]*:|#)/i.test(href)){const path=resolve(currentDir,decodeURIComponent(href.split('#')[0]));target=exports.has(path)?pathToFileURL(join(out,exports.get(path))).href:pathToFileURL(path).href;}}catch{}const label=tokens?this.parser.parseInline(tokens):text||esc(href||'Link');return `<a href="${esc(target||'')}">${label}</a>`;}};
let currentDir=root;marked.use({gfm:true,renderer});
mkdirSync(out,{recursive:true});mkdirSync(tmp,{recursive:true});
const records=[];
for(const source of sources){
 const text=readFileSync(source,'utf8').replaceAll('\u2011','-').replaceAll('\u2013','-').replaceAll('\u2014','-');
 currentDir=resolve(source,'..');
 const title=(text.match(/^#\s+(.+)$/m)?.[1]||basename(source)).replace(/[*`]/g,'');
 const body=extname(source)==='.txt'?`<h1>${esc(title)}</h1><pre>${esc(text)}</pre>`:marked.parse(text);
 const pdf=exports.get(source),html=join(tmp,pdf+'.html');
 writeFileSync(html,`<!doctype html><meta charset="utf-8"><title>${esc(title)}</title><style>${style}</style><div class="doc-label">Parinaya Sarees | Project documentation</div><p class="source">Source: ${esc(relative(root,source))} | Export: 11 November 2026</p>${body}`);
 records.push({source:relative(root,source).replaceAll('\\','/'),title,pdf,html,path:join(out,pdf)});
}
const rows=records.map((r,i)=>`<tr><td style="width:5%">${i+1}</td><td><a href="${esc(pathToFileURL(r.path).href)}">${esc(r.title)}</a><br><code>${esc(r.pdf)}</code></td><td>${esc(r.source)}</td></tr>`).join('');
const index={source:'Generated export index',title:'Parinaya Sarees - Documentation PDF Index',pdf:'00_Documentation_Index.pdf',path:join(out,'00_Documentation_Index.pdf'),html:join(tmp,'index.html')};
writeFileSync(index.html,`<!doctype html><meta charset="utf-8"><title>${esc(index.title)}</title><style>${style}</style><h1>${esc(index.title)}</h1><p>Exported 11 November 2026. ${records.length} source documents, one PDF each, plus this index. Current shipping: distance delivery disabled by default; saved flat shipping active. Start with the current documentation index and Active flat shipping guide. Dated audit/design records remain historical.</p><p>Every Markdown file in docs/ and the project root is included. The font licence is included as relevant ownership documentation. Source code, environment files, patches, robots configuration, dependency/generated artifacts and the historical Firestore rules source dump are excluded. Links to exported documents target their sibling PDFs; other links retain the original reference.</p><table><thead><tr><th style="width:5%">#</th><th style="width:52%">Document and PDF</th><th style="width:43%">Original source</th></tr></thead><tbody>${rows}</tbody></table>`);
records.unshift(index);writeFileSync(join(tmp,'manifest.json'),JSON.stringify({outputFolder:out,records},null,2));
const result=spawnSync('python',['scripts/export-documentation-pdf.py',join(tmp,'manifest.json')],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
console.log(JSON.stringify({documents:sources.length,pdfs:records.length,folder:out}));
