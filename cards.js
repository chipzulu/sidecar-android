export function mountCards(snapshot,columns,preference){
  const choices=snapshot.files.filter(f=>/^Book\/Cards\/.+\.(md|png|jpe?g|webp)$/i.test(f.path));const urls=[];
  for(const [side,host] of Object.entries(columns)){
    host.replaceChildren();
    for(let n=0;n<2;n++){
      const card=document.createElement('section');card.className='reference-card';const select=document.createElement('select');select.setAttribute('aria-label',`${side} card ${n+1}`);
      select.add(new Option('Choose a card…',''));for(const f of choices)select.add(new Option(f.path.slice('Book/Cards/'.length),f.path));
      const content=document.createElement('div');content.className='card-scroll';card.append(select,content);host.append(card);
      const key=`card:${snapshot.repository}:${side}:${n}`;select.value=preference(key)||'';
      function show(){content.replaceChildren();const file=choices.find(f=>f.path===select.value);if(!file)return;
        if(/\.md$/i.test(file.path)){const text=new TextDecoder().decode(file.bytes);for(const block of text.split(/\r?\n\s*\r?\n/)){const heading=block.match(/^(#{1,6})\s+(.+)$/);const p=document.createElement(heading?'h3':'p');p.textContent=heading?heading[2]:block;content.append(p);}}
        else{const image=document.createElement('img');image.alt=file.path.split('/').at(-1);image.src=URL.createObjectURL(new Blob([file.bytes],{type:/\.png$/i.test(file.path)?'image/png':/\.webp$/i.test(file.path)?'image/webp':'image/jpeg'}));urls.push(image.src);content.append(image);}}
      select.onchange=()=>{preference(key,select.value);show();};show();
    }
  }
  return ()=>urls.forEach(url=>URL.revokeObjectURL(url));
}
