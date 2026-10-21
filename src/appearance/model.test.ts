import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAppearance} from './model.ts';
test('login appearance accepts only scoped image references and bounded focal points, never client URLs or private settings',()=>{
  const image={mediaId:'a'.repeat(32),alt:'Owner portrait',focalX:40,focalY:20};
  assert.deepEqual(validateAppearance({desktop:image,mobile:null}),{desktop:image,mobile:null});
  for(const invalid of [{desktop:{...image,url:'https://evil.test'},mobile:null},{desktop:{...image,focalY:101},mobile:null},{desktop:{...image,alt:'x'.repeat(201)},mobile:null},{desktop:{...image,mediaId:'product'},mobile:null},{desktop:null,mobile:null,secret:'private'}])assert.throws(()=>validateAppearance(invalid));
});
