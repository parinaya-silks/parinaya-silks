import type {KeyboardEvent} from 'react';
export function trapDialogFocus(event:KeyboardEvent<HTMLDialogElement>){
 if(event.key!=='Tab')return;
 const elements=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(element=>element.getClientRects().length>0),first=elements[0],last=elements.at(-1);
 if(!first){event.preventDefault();event.currentTarget.focus();return;}
 if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
}
