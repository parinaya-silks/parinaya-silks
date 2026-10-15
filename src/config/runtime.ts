// The current repository contains a local prototype, not a live commerce adapter.
// Demo output must be requested explicitly for a build: vite build --mode demo.
export const demoEnabled = import.meta.env?.DEV === true || import.meta.env?.MODE === 'demo';
