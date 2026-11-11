// One stack for native dialogs and the storefront's existing modal drawers.
// The body's fixed position also locks the visual viewport on iOS Safari.
type Layer={element:HTMLElement;native:boolean;dismiss?:()=>void;onClose?:()=>void;focus:HTMLElement|null;scroll:[HTMLElement,number,number,string,string,string][]};
const layers:Layer[]=[];
let restorePage:(()=>void)|undefined,touchY=0,touchX=0;
const top=()=>layers.at(-1);
function focusables(element:HTMLElement){return [...element.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>e.getClientRects().length&&!e.closest('[inert]'));}
function focusLayer(layer:Layer){(focusables(layer.element)[0]||layer.element).focus({preventScroll:true});}
function scrollable(target:EventTarget|null,delta:number){const layer=top();if(!layer||!(target instanceof Element)||!layer.element.contains(target))return false;
 for(let el:HTMLElement|null=target as HTMLElement;el&&layer.element.contains(el);el=el.parentElement){const style=getComputedStyle(el);if(/auto|scroll/.test(style.overflowY)&&el.scrollHeight>el.clientHeight+1&&((delta<0&&el.scrollTop>0)||(delta>0&&el.scrollTop+el.clientHeight<el.scrollHeight-1)))return true;}
 return false;
}
function wheel(e:WheelEvent){if(e.target instanceof Element&&top()?.element.contains(e.target)&&e.target.closest('.leaflet-container'))return;if(!top()||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;if(!scrollable(e.target,e.deltaY))e.preventDefault();}
function touchStart(e:TouchEvent){touchY=e.touches[0]?.clientY??0;touchX=e.touches[0]?.clientX??0;}
function touchMove(e:TouchEvent){if(e.target instanceof Element&&top()?.element.contains(e.target)&&e.target.closest('.leaflet-container'))return;if(e.touches.length!==1)return;const next=e.touches[0].clientY,delta=touchY-next,horizontal=e.touches[0].clientX-touchX;touchY=next;touchX=e.touches[0].clientX;if(e.target instanceof Element&&top()?.element.contains(e.target)&&e.target.closest('input[type=range]'))return;if(Math.abs(horizontal)>Math.abs(delta)&&e.target instanceof Element&&top()?.element.contains(e.target))return;if(!scrollable(e.target,delta))e.preventDefault();}
function focus(e:FocusEvent){const layer=top();if(layer&&e.target instanceof Node&&!layer.element.contains(e.target))focusLayer(layer);}
function key(e:KeyboardEvent){const layer=top();if(!layer)return;
 if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(layer.dismiss)layer.dismiss();else if(layer.native)layer.element.dispatchEvent(new Event('cancel',{cancelable:true}));return;}
 if(e.key==='Tab'){const items=focusables(layer.element),first=items[0],last=items.at(-1);if(!first){e.preventDefault();layer.element.focus();}else if(e.shiftKey&&(document.activeElement===first||!layer.element.contains(document.activeElement))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}return;}
 if(e.target instanceof Element&&layer.element.contains(e.target)&&e.target.closest('.leaflet-container'))return;
 if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)&&!(e.target instanceof Element&&e.target.closest('input,textarea,select,button,a,[contenteditable=true]'))&&!scrollable(e.target,['ArrowUp','PageUp','Home'].includes(e.key)?-1:1))e.preventDefault();
}
function freezePage(){const body=document.body,root=document.documentElement,x=scrollX,y=scrollY,style=body.getAttribute('style'),gutter=root.style.scrollbarGutter,behavior=root.style.scrollBehavior;
 if(innerWidth>root.clientWidth)root.style.scrollbarGutter='stable';
 Object.assign(body.style,{position:'fixed',top:`-${y}px`,left:`-${x}px`,width:'100%',overflow:'hidden'});
 const observer=new MutationObserver(()=>{for(const layer of [...layers].reverse())if(!layer.element.isConnected)closeModal(layer.element);});observer.observe(body,{childList:true,subtree:true});
 document.addEventListener('wheel',wheel,{passive:false,capture:true});document.addEventListener('touchstart',touchStart,{passive:true,capture:true});document.addEventListener('touchmove',touchMove,{passive:false,capture:true});document.addEventListener('keydown',key,true);document.addEventListener('focusin',focus,true);
 return ()=>{observer.disconnect();document.removeEventListener('wheel',wheel,true);document.removeEventListener('touchstart',touchStart,true);document.removeEventListener('touchmove',touchMove,true);document.removeEventListener('keydown',key,true);document.removeEventListener('focusin',focus,true);if(style===null)body.removeAttribute('style');else body.setAttribute('style',style);root.style.scrollbarGutter=gutter;root.style.scrollBehavior='auto';window.scrollTo(x,y);root.style.scrollBehavior=behavior;};
}
export function openModal(element:HTMLElement|null,options:{native?:boolean;dismiss?:()=>void}={}){if(!element||layers.some(l=>l.element===element))return;
 const parent=top();if(parent){parent.scroll=[parent.element,...parent.element.querySelectorAll<HTMLElement>('*')].filter(e=>!element.contains(e)&&e.scrollHeight>e.clientHeight&&/auto|scroll/.test(getComputedStyle(e).overflowY)).map(e=>[e,e.scrollTop,e.scrollLeft,e.style.overflow,e.style.overscrollBehavior,e.style.scrollbarGutter]);for(const [el]of parent.scroll){el.style.scrollbarGutter='stable';el.style.overflow='hidden';el.style.overscrollBehavior='none';}}
 const layer:Layer={element,native:options.native!==false,dismiss:options.dismiss,focus:document.activeElement as HTMLElement|null,scroll:[]};
 if(!layers.length)restorePage=freezePage();layers.push(layer);element.dataset.modalLayer='true';if(layer.native){layer.onClose=()=>{if(!(element as HTMLDialogElement).open)closeModal(element);};element.addEventListener('close',layer.onClose);(element as HTMLDialogElement).showModal();}
 queueMicrotask(()=>{if(top()===layer&&!element.contains(document.activeElement))focusLayer(layer);});
}
export function closeModal(element:HTMLElement|null){const index=layers.findIndex(l=>l.element===element);if(index<0)return;const [layer]=layers.splice(index,1),wasTop=index===layers.length;delete layer.element.dataset.modalLayer;if(layer.onClose)layer.element.removeEventListener('close',layer.onClose);if(layer.native)(layer.element as HTMLDialogElement).close();
 const parent=top();if(!parent){restorePage?.();restorePage=undefined;}else if(wasTop)for(const [el,y,x,overflow,overscroll,gutter]of parent.scroll){el.style.overflow=overflow;el.style.overscrollBehavior=overscroll;el.style.scrollbarGutter=gutter;el.scrollTop=y;el.scrollLeft=x;}
 if(wasTop){const target=layer.focus;if(target?.isConnected&&(!parent||parent.element.contains(target)))target.focus({preventScroll:true});else if(parent)focusLayer(parent);}
}
