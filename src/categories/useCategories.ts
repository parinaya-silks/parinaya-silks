import { useEffect, useState } from 'react';
import { watchCategories, type CategoryState } from './repository.ts';

export function useCategories(admin = false) {
  const [state, setState] = useState<CategoryState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => watchCategories(admin, setState), [admin, attempt]);
  return { state, retry: () => { setState({ status: 'loading' }); setAttempt(value => value + 1); } };
}
