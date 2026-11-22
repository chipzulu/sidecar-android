// Pure text operations shared by the conversion frame and its regression tests.
export const writerText=state=>state.edit?.text??state.accepted.map(unit=>unit.text).join('\n\n');
export function targetFor(state){const text=writerText(state),c=state.caret;return {start:Math.max(0,Math.min(text.length,c?.start??text.length)),end:Math.max(0,Math.min(text.length,c?.end??text.length)),append:!c};}
export function changedText(state,text,caret){return {...state,...(state.edit?{edit:{...state.edit,text}}:{accepted:text?[{id:state.accepted[0]?.id||crypto.randomUUID(),text}]:[]}),caret,pending:state.pending?{...state.pending,stale:true}:null};}
export function replaceText(state,insert,{backspace=false}={}){const text=writerText(state),t=targetFor(state);let {start,end}=t;if(backspace&&start===end&&start>0)start-=Array.from(text.slice(0,start)).at(-1).length;return changedText(state,text.slice(0,start)+insert+text.slice(end),{start:start+insert.length,end:start+insert.length});}
export function acceptText(state){const pending=state.pending;if(!pending||pending.stale)throw Error('Convert the handwriting again before accepting.');const text=writerText(state),t=pending.target||{...targetFor(state),base:text};if(t.base!==text)throw Error('The text changed. Convert again before accepting.');
 const insert=(t.append&&text?'\n\n':'')+pending.text;
 if(t.append&&!state.edit)return {...state,accepted:[...state.accepted,{id:pending.id,text:pending.text}],pending:null,caret:null};
 const next=changedText(state,text.slice(0,t.start)+insert+text.slice(t.end),t.append?null:{start:t.start+insert.length,end:t.start+insert.length});return {...next,pending:null};
}
