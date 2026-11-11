// Server-only opt-in. Absent, malformed and false values keep distance delivery inactive.
// A future owner-approved release must explicitly opt in after provider/configuration acceptance.
export const DISTANCE_DELIVERY_ENABLED = false;
export function distanceDeliveryEnabled(env:NodeJS.ProcessEnv=process.env):boolean {
 return env.DISTANCE_DELIVERY_ENABLED===undefined?DISTANCE_DELIVERY_ENABLED:env.DISTANCE_DELIVERY_ENABLED==='true';
}
