import { createServer } from 'node:http';
import { config } from 'dotenv';
config({path:'.env.server.local',quiet:true});
const {default:handler}=await import('../api/catalog.ts');
createServer((request,response)=>{if(request.url?.split('?')[0]==='/api/catalog')void handler(request,response);else {response.statusCode=404;response.end();}}).listen(3200,'127.0.0.1',()=>console.log('Catalog API listening at http://127.0.0.1:3200 (Vite proxies /api).'));
