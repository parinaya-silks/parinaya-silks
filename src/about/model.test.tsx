import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fallbackAbout,storedAbout,validateAbout,aboutInput,publicAbout} from './model.ts';
import {AboutCopy} from './AboutCopy.tsx';
test('About compatibility is explicit, founder is absent and minimum fields validate',()=>{const value=storedAbout();assert.equal(value.heading,'About Parinaya Silks');assert.equal(value.showFounder,false);assert.equal(publicAbout(value).founder,null);for(const patch of [{heading:''},{story:''},{showFounder:'true'},{showFounder:true,founderName:''},{unexpected:'x'},{intro:null},{story:'x'.repeat(12001)}])assert.throws(()=>validateAbout({...aboutInput(value),...patch}));assert.doesNotThrow(()=>validateAbout({...aboutInput(value),showFounder:true,founderName:'Owner'}));});
test('About plain Unicode paragraphs are escaped and hidden founder data never projects',()=>{const value={...fallbackAbout(),story:'తెలుగు\n\n<script>bad()</script>',founderName:'PRIVATE',founderRole:'PRIVATE',founderBio:'PRIVATE'};assert.ok(!JSON.stringify(publicAbout(value)).includes('PRIVATE'));const html=renderToStaticMarkup(<AboutCopy value={publicAbout(value)}/>);assert.ok(html.includes('తెలుగు\n\n&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(renderToStaticMarkup(<AboutCopy value={publicAbout({...value,showFounder:true})}/>).includes('PRIVATE'));});
test('About photo input rejects arbitrary URLs and strips server metadata from save requests',()=>{const base=aboutInput(fallbackAbout());assert.throws(()=>validateAbout({...base,photo:{url:'https://evil.test/x'}}));const input={mediaId:'a'.repeat(32),alt:'Owner',focalX:50,focalY:50};assert.deepEqual(validateAbout({...base,photo:input}).photo,input);const p=publicAbout({...fallbackAbout(),showFounder:true,founderName:'Owner',photo:{...input,url:'https://res.cloudinary.com/fixture/image/upload/a.jpg',width:600,height:750}});assert.ok(!JSON.stringify(p).includes('mediaId'));});

// Editorial grouping must never infer or rewrite business content.
import {aboutSections} from './story.ts';
test('About editorial sections retain arbitrary CMS text and recognize compatibility headings only',()=>{
 assert.deepEqual(aboutSections('First\n\nSecond <script>x</script>','Story'),[{heading:'Story',text:'First\n\nSecond <script>x</script>'}]);
 const legacy=publicAbout(fallbackAbout());const parts=aboutSections(legacy.story,legacy.storyHeading);assert.equal(parts.length,3);assert.deepEqual(parts.map(p=>p.heading),['About the Store','Our Collection','Your Shopping Experience']);
 assert.deepEqual(aboutSections('Short story',''),[{heading:'',text:'Short story'}]);
 assert.deepEqual(aboutSections('',''),[]);
 const hidden=publicAbout({...fallbackAbout(),founderName:'HIDDEN',photo:{mediaId:'private',url:'https://res.cloudinary.com/fixture/image/upload/private.jpg',alt:'HIDDEN',width:600,height:750,focalX:50,focalY:50}});
 const html=renderToStaticMarkup(<AboutCopy value={hidden} founderOnly/>);assert.ok(!html.includes('HIDDEN')&&!html.includes('private.jpg')&&!html.includes('<h1'));
});
