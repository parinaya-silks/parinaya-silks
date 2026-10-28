// Arrival hints control motion only. An owned server read always controls success.
const arrivals = new Set<string>();
export function markPlacementArrival(uid:string,id:string) { arrivals.add(uid+':'+id); }
export function consumePlacementArrival(uid:string,id:string) { const key=uid+':'+id;const fresh=arrivals.has(key);arrivals.delete(key);return fresh; }
