import type { Order, FulfilmentStatus } from '../types/index.ts';

const nextStatuses: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  Unfulfilled: ['Processing', 'Cancelled'], Processing: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'], Shipped: ['Delivered'], Delivered: [], Cancelled: [],
};

export function fulfilmentError(order: Order, status: FulfilmentStatus, courier = order.courierPartner, tracking = order.trackingNumber): string | null {
  if (status !== order.fulfilmentStatus && !nextStatuses[order.fulfilmentStatus].includes(status)) {
    return `Cannot change ${order.fulfilmentStatus} to ${status}.`;
  }
  if (['Processing', 'Packed', 'Shipped', 'Delivered'].includes(status) && order.paymentStatus !== 'Paid') {
    return 'Payment must be paid before fulfilment can advance.';
  }
  if (['Shipped', 'Delivered'].includes(status) && (!courier?.trim() || !tracking?.trim())) {
    return 'Courier and tracking number are required before shipment.';
  }
  return null;
}

export function applyFulfilment(order: Order, status: FulfilmentStatus, courier?: string, tracking?: string, notes?: string): Order {
  const error = fulfilmentError(order, status, courier, tracking);
  if (error) throw new Error(error);
  const changed = status !== order.fulfilmentStatus;
  const timestamp = new Date().toISOString();
  return {
    ...order, fulfilmentStatus: status,
    courierPartner: courier?.trim() || order.courierPartner,
    trackingNumber: tracking?.trim() || order.trackingNumber,
    internalNotes: notes ?? order.internalNotes,
    timeline: changed ? [...order.timeline.map(m => ({ ...m, active: false })), {
      step: order.timeline.length + 1, title: status,
      description: status === 'Shipped' ? `Dispatched via ${courier?.trim() || order.courierPartner}` : `Recorded status: ${status}`,
      timestamp, completed: true, active: true,
    }] : order.timeline,
    latestStatusNote: changed ? `Recorded status: ${status}` : order.latestStatusNote,
    latestStatusTime: changed ? timestamp : order.latestStatusTime,
  };
}
