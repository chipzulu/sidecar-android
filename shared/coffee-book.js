import {lines} from './coffee-lines.js';

export const coffeeBook = {id:'sidecar:coffee', title:'A Cup for the Author'};
const paymentUrl = ''; // Set the author's public Ko-fi URL before enabling payments.
const key = 'sidecar-coffee-v1';
const read = () => JSON.parse(localStorage.getItem(key) || '{}');
const save = changes => localStorage.setItem(key, JSON.stringify({...read(), ...changes}));
export function coffeeOrder(books, anchor) {
  const state = read();
  if (Date.now() < (state.until || 0)) return books;
  const at = Math.max(0, books.findIndex(book => book.id === anchor));
  return [...books.slice(0,at), coffeeBook, ...books.slice(at)];
}
export function coffeeFirst() {return !read().later && !(Date.now() < (read().until || 0));}

export function mountCoffee(redraw) {
  const dialog = document.getElementById('coffee-dialog');
  const humour = document.getElementById('coffee-humour');
  let line = '';
  function launchLine() {
    if (!read().salty || Date.now() < (read().until || 0)) return '';
    if (line) return line;
    let {deck,last} = read();
    if (!Array.isArray(deck) || !deck.length) {
      deck = lines.map((_, index) => index);
      for (let i=deck.length-1;i>0;i--) {
        const j=Math.floor(Math.random()*(i+1));
        [deck[i],deck[j]]=[deck[j],deck[i]];
      }
      if(deck.at(-1)===last) [deck[0],deck[deck.length-1]]=[deck.at(-1),deck[0]];
    }
    const next=deck.pop();
    save({deck,last:next});
    line=lines[next];
    return line;
  }
  humour.checked=!!read().salty;
  humour.onchange=()=>{save({salty:humour.checked});redraw(false);};
  document.getElementById('coffee-later').onclick=()=>{save({later:true});dialog.close();redraw(true);};
  document.getElementById('coffee-supported').onclick=()=>{
    const anniversary=new Date();
    anniversary.setFullYear(anniversary.getFullYear()+1);
    save({until:anniversary.getTime(),later:false});dialog.close();redraw(true);
  };
  const link=document.getElementById('coffee-pay');
  if(paymentUrl){link.href=paymentUrl;link.hidden=false;document.getElementById('coffee-pending').hidden=true;}
  return {
    show(){dialog.showModal();},
    cover(host){
      const img=new Image();img.src=new URL('./coffee-cover.jpg',import.meta.url);img.alt='A Cup for the Author by C.P.Helweg';
      host.replaceChildren(img);
      const joke=launchLine();
      if(joke){const strip=document.createElement('span');strip.className='coffee-slip';strip.textContent=joke;host.append(strip);}
    }
  };
}

