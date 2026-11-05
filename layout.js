export function fitLayout(available,preferred,cardMode,dockOpen){
  const page=Math.max(1,Math.min(preferred,available-32));
  let spare=Math.max(0,available-page-32),dock=0;
  if(dockOpen&&spare>=230){dock=Math.min(280,spare);spare-=dock;}
  const wanted=cardMode==='both'?2:cardMode==='left'?1:0;
  const count=Math.min(wanted,Math.floor(spare/150));
  const card=count?Math.min(300,spare/count):0;
  return {page,dock,overlay:dockOpen&&!dock,left:count?card:0,right:count===2?card:0};
}
