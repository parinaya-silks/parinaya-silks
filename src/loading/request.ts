// Deadline applies even when a caller supplies an unmount/navigation signal.
export async function boundedRead<T>(work:(signal:AbortSignal)=>Promise<T>,signal?:AbortSignal,ms=15000):Promise<T>{
 const controller=new AbortController();
 const abort=()=>controller.abort(signal?.reason);
 if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
 let timer:ReturnType<typeof setTimeout>;
 const stopped=new Promise<never>((_,reject)=>{
  const fail=()=>reject(controller.signal.reason||new DOMException('Request cancelled','AbortError'));
  if(controller.signal.aborted)fail();else controller.signal.addEventListener('abort',fail,{once:true});
  timer=setTimeout(()=>controller.abort(new DOMException('Request timed out','TimeoutError')),ms);
 });
 try{return await Promise.race([stopped,work(controller.signal)]);}
 finally{clearTimeout(timer!);signal?.removeEventListener('abort',abort);}
}
