export const adminChangedEvent='parinaya:admin-data-changed';
export function signalAdminChange(uid:string){
 window.dispatchEvent(new CustomEvent(adminChangedEvent,{detail:uid}));
 if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('parinaya-admin:'+uid);channel.postMessage('changed');channel.close();}
}
