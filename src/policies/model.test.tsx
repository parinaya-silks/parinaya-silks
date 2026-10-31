import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {policyFromPath,policyPages,policyKeys,publicPolicy,samplePreviewEnabled,sectionAnchors} from './model.ts';
import {PolicyLayout} from './PolicyLayout.tsx';

test('policy routes, canonical labels and explicit approval preserve public wording only',()=>{
 for(const key of policyKeys){assert.equal(policyFromPath(policyPages[key].path+'?preview=policy'),key);assert.deepEqual(publicPolicy(key,{text:'PRIVATE DRAFT',heading:'PRIVATE TITLE',approved:false}),{available:false,heading:policyPages[key].title,text:''});}
 assert.equal(policyFromPath('/unknown-policy'),undefined);
 const text='First paragraph\n\n- Literal list\n<script>alert(1)</script>\nhttps://example.test/path';
 assert.deepEqual(publicPolicy('shipping',{approved:true,text,heading:'Saved heading'}),{available:true,heading:'Saved heading',text});
 assert.equal(publicPolicy('privacy',{approved:true,text:'   '}).available,false);
 assert.equal(publicPolicy('terms',{approved:true,text:'Short',heading:''}).heading,policyPages.terms.title);
});
test('local preview is explicit and impossible with production DEV false; duplicate section headings have stable distinct anchors',()=>{
 assert.equal(samplePreviewEnabled(false,'?preview=policy'),false);assert.equal(samplePreviewEnabled(true,''),false);assert.equal(samplePreviewEnabled(true,'?preview=policy'),true);assert.equal(samplePreviewEnabled(true,'?preview=anything'),false);
 const sections=[{heading:'Repeated',paragraphs:['One']},{heading:'Repeated',paragraphs:['Two']}];
 assert.deepEqual(sectionAnchors('privacy',sections).map(s=>s.id),['policy-privacy-1','policy-privacy-2']);
});
test('plain CMS content remains escaped and has no invented section index',()=>{
 const text='First\n\n- Text list\n<script>unsafe()</script>';
 const html=renderToStaticMarkup(<PolicyLayout policyKey="terms" heading="Saved heading" onNavigate={()=>{}}><article>{text}</article></PolicyLayout>);
 assert.ok(html.includes('First\n\n- Text list\n&lt;script&gt;unsafe()&lt;/script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('On this page'));assert.ok(html.includes('aria-current="page"'));assert.ok(html.includes('href="/shipping-policy"'));
});
