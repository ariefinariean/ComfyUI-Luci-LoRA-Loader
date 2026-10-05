import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {readState,makeRow,moveRow} from '../web/state.mjs';

class Element {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.className='';this.classes=new Set();this.classList={add:name=>this.classes.add(name)};}
 closest(){return this.host;}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(){}
 addEventListener(){}
 remove(){}
}
function find(root,predicate){if(predicate(root))return root;for(const child of root.children||[]){const result=find(child,predicate);if(result)return result;}}
async function mount(){
 let extension,root,widget,options;
 const node={widgets:[{name:'stack',value:'{"rows":[]}',element:new Element('textarea')}],size:[460,400],computeSize(){return [380,0];},setSize(size){this.size=size;},setDirtyCanvas(){},addDOMWidget(name,type,element,opts){root=element;root.host=new Element('div');options=opts;widget={};return widget;}};
 node.widgets[0].element.host=new Element('div');
 const source=(await readFile(new URL('../web/luci_lora.js',import.meta.url),'utf8')).replace(/^import .*;$/gm,'').replace("new URL('./luci_lora.css',import.meta.url).href","'test.css'");
 const context={document:{createElement:t=>new Element(t),head:new Element('head'),body:new Element('body')},app:{registerExtension:e=>extension=e},api:{fetchApi:async()=>({ok:true,json:async()=>({files:[]})})},readState,makeRow,moveRow,localStorage:{getItem:()=>null},crypto:globalThis.crypto,structuredClone,console,queueMicrotask};
 vm.runInNewContext(source,context);
 function Node(){}
 extension.beforeRegisterNodeDef(Node,{name:'LuciLoRALoader'});
 Node.prototype.onNodeCreated.call(node);
 await Promise.resolve();await Promise.resolve();
 return {node,widget,options,get root(){return root;}};
}
test('empty node has no phantom list or permanent stacks footer',async()=>{
 const ui=await mount();
 assert.equal(ui.node.size[0],380);
 assert.equal(ui.node.size[1],146);
 assert.equal(find(ui.root,e=>e.className==='luci-stack'),undefined);
 assert.equal(find(ui.root,e=>e.className==='luci-footer'),undefined);
 assert.ok(find(ui.root,e=>e.className==='luci-add'));
});
test('DOM hit area is bounded and backing editor cannot intercept canvas clicks',async()=>{
 const ui=await mount();
 assert.equal(ui.options.getMaxHeight(),56);
 assert.equal(ui.widget.getMaxHeight(),ui.widget.getMinHeight());
 assert.equal(ui.root.style.height,'56px');
 assert.equal(ui.root.style.maxHeight,'56px');
 assert.equal(ui.root.style.pointerEvents,'none');
 assert.equal(ui.node.widgets[0].element.style.pointerEvents,'none');
 assert.equal(ui.node.widgets[0].element.style.maxHeight,'0px');
 ui.node.onDrawForeground();
 assert.ok(ui.root.host.classes.has('luci-lora-host'));
 assert.ok(ui.node.widgets[0].element.host.classes.has('luci-lora-storage-host'));
 ui.node.widgets[0].options={multiline:true};
 assert.equal(ui.node.widgets[0].options.hidden,true);
 assert.equal(ui.node.widgets[0].hidden,true);
 assert.equal(ui.widget.computeLayoutSize().maxHeight,56);
 find(ui.root,e=>e.className==='luci-add').onclick();
 assert.equal(ui.widget.getMaxHeight(),136);
 assert.equal(ui.root.style.height,'136px');
});
test('row has separate working steppers and no ellipsis action button',async()=>{
 const ui=await mount();
 find(ui.root,e=>e.className==='luci-add').onclick();
 const row=find(ui.root,e=>e.className.startsWith('luci-row'));
 const controls=find(row,e=>e.className==='luci-controls');
 assert.equal(controls.children.length,4);
 const pair=find(row,e=>e.className==='luci-pair');
 pair.children[0].children[1].children[0].onclick();
 let state=JSON.parse(ui.node.widgets[0].value);
 assert.equal(state.rows[0].model,1.05);assert.equal(state.rows[0].clip,1);
 const nextPair=find(ui.root,e=>e.className==='luci-controls').children[2];
 nextPair.children[1].children[1].children[1].onclick();
 state=JSON.parse(ui.node.widgets[0].value);
 assert.equal(state.rows[0].clip,.95);
 assert.ok(find(ui.root,e=>e.className==='luci-strength-labels'));
 assert.equal(typeof find(ui.root,e=>e.className.startsWith('luci-row')).oncontextmenu,'function');
});
