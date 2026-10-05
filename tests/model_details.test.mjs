import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modelDetails} from '../web/model_details.mjs';
class E{constructor(tag){this.tag=tag;this.children=[];}append(...x){this.children.push(...x);}replaceChildren(){this.children=[];}setAttribute(){} }
const flatten=e=>[e,...e.children.flatMap(flatten)];
test('details render remote text safely and hide mature samples',()=>{
 globalThis.document={createElement:t=>new E(t)};const root=new E('div');
 modelDetails(root,{filename:'test',modelName:'<script>bad()</script>',images:[{url:'https://image.civitai.com/test.png',mature:false,meta:{prompt:'hello'}},{url:'https://image.civitai.com/hidden.png',mature:true}]});
 const items=flatten(root);assert.equal(items.filter(e=>e.tag==='img').length,1);assert.ok(items.some(e=>e.textContent==='<script>bad()</script>'));assert.ok(items.some(e=>e.textContent==='Not provided'));assert.ok(items.some(e=>e.tag==='details'));delete globalThis.document;
});
