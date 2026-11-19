export const workflowPath='Book/StorySidecar.json';
export function workflowConfig(bytes){
 if(!bytes)return {tabletTextEditing:true};
 const value=JSON.parse(new TextDecoder().decode(bytes));
 if(!value||typeof value!=='object'||Array.isArray(value)||('tabletTextEditing'in value&&typeof value.tabletTextEditing!=='boolean'))throw Error('StorySidecar.json has an invalid tabletTextEditing setting.');
 return {...value,tabletTextEditing:value.tabletTextEditing!==false};
}
export function tabletTextAllowed(book){return workflowConfig(book?.files?.find(f=>f.path===workflowPath)?.bytes).tabletTextEditing;}
