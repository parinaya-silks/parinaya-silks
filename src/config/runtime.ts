// Browsing is always available. Simulations require an explicit local demo server;
// even a build made with --mode demo cannot enable simulated transactions.
export const demoEnabled = import.meta.env?.DEV === true && import.meta.env?.MODE === 'demo';
