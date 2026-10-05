import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readState,makeRow,moveRow} from '../web/state.mjs';
test('workflow state round-trips both strengths and trigger selections',()=>{const row={...makeRow('test'),model:.9,clip:.4,selected:['word']};assert.deepEqual(readState(JSON.stringify({rows:[row],cache:'none'})),{rows:[row],cache:'none'});});
test('missing filename is preserved',()=>assert.equal(readState(JSON.stringify({rows:[makeRow('missing')]})).rows[0].name,'missing'));
test('moving one row does not lose another',()=>{const a=makeRow('a'),b=makeRow('b');assert.deepEqual(moveRow([a,b],a.id,1),[b,a]);assert.deepEqual(moveRow([a,b],a.id,-1),[a,b]);});
test('invalid saved data recovers to empty state',()=>assert.deepEqual(readState('bad'),{rows:[],cache:'last'}));
