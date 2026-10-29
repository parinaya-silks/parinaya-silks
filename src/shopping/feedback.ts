export type ShoppingNotice={id:number;uid:string;message:string;error:boolean;destination?:'/bag'|'/wishlist';retryKey?:string};
export function shoppingFeedback(action:unknown,enabled:unknown,outcome:string){
 if(action==='wishlist:set')return enabled===false?{message:'Removed from Wishlist.'}:{message:outcome==='already'?'Already saved to Wishlist':'Saved to Wishlist',destination:'/wishlist' as const};
 if(action==='bag:remove')return {message:'Removed from Bag.'};
 if(action==='bag:add')return {message:outcome==='already'?'Already in Bag':'Added to Bag',destination:'/bag' as const};
 return {message:'Quantity updated.'};
}
export function successDeadline(done:()=>void,delay=4000,clock=()=>performance.now(),schedule=(fn:()=>void,ms:number)=>setTimeout(fn,ms),cancel=(id:ReturnType<typeof setTimeout>)=>clearTimeout(id)){
 let remaining=delay,start=clock(),timer:ReturnType<typeof setTimeout>|undefined,disposed=false;const reasons=new Set<string>();
 const stop=()=>{if(timer!==undefined){cancel(timer);timer=undefined;remaining=Math.max(0,remaining-(clock()-start));}};
 const arm=()=>{if(disposed||reasons.size||timer!==undefined)return;start=clock();timer=schedule(()=>{timer=undefined;if(!disposed){disposed=true;done();}},remaining);};
 arm();return {pause(reason:string){if(disposed)return;stop();reasons.add(reason);},resume(reason:string){reasons.delete(reason);arm();},dispose(){disposed=true;stop();}};
}
