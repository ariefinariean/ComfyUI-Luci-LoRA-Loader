import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePreview,defaultPreview,fetchPreview} from '../web/local_preview.mjs';
test('accepts supported local preview formats',()=>{for(const type of ['image/png','image/jpeg','image/webp'])assert.doesNotThrow(()=>validatePreview({type,size:1024}));});
test('rejects executable/vector formats and oversized images',()=>{assert.throws(()=>validatePreview({type:'image/svg+xml',size:12}));assert.throws(()=>validatePreview({type:'image/png',size:5*1024*1024+1}));});
test('default uses first permitted Civitai sample',()=>{const samples=[{url:'https://other.com/x',mature:false},{url:'https://image.civitai.com/a',mature:true},{url:'https://image.civitai.com/b',mature:false}];assert.equal(defaultPreview(samples).url,samples[2].url);assert.equal(defaultPreview(samples,true).url,samples[1].url);assert.equal(defaultPreview([]),undefined);});
test('download rejects untrusted hosts before network access',async()=>{await assert.rejects(fetchPreview('https://other.com/x'),/Untrusted/);});
