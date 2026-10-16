import React from 'react';

export function FeatureNotice({ children }: { children: React.ReactNode }) {
  return <p role="note" className="my-4 rounded-lg border border-[#B88A44]/40 bg-[#F4EEE5] p-4 text-sm text-[#5F5552]">{children}</p>;
}

export function FeatureUnavailable({ title, children, onNavigate }: { title: string; children: React.ReactNode; onNavigate: (path: string) => void }) {
  return <section className="max-w-xl mx-auto px-5 py-10 space-y-4">
    <h1 className="font-serif text-2xl text-[#780D24]">{title}</h1>
    <FeatureNotice>{children}</FeatureNotice>
    <button className="min-h-12 px-5 rounded-lg bg-[#780D24] text-white" onClick={() => onNavigate('/shop')}>Continue browsing</button>
  </section>;
}
