import { useEffect, useState } from 'react';
import { watchCategories, type CategoryState } from './repository.ts';

export function useCategories(admin = false) {
  const [state, setState] = useState<CategoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => watchCategories(admin, next=>setState(previous=>!admin&&previous.status==='ready'&&next.status!=='ready'?{...previous,stale:true}:next)), [admin, attempt]);
  useEffect(()=>{if(admin)return;const refresh=()=>setAttempt(n=>n+1);window.addEventListener('online',refresh);return()=>window.removeEventListener('online',refresh);},[admin]);
  return { state, retry: () => { setState(previous=>!admin&&previous.status==='ready'?{...previous,stale:true}:{status:'loading'}); setAttempt(value => value + 1); } };
}
