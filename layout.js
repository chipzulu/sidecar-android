export function fitLayout(available,preferred,cardMode,dockOpen){
  const page=Math.max(1,Math.min(preferred,available-32));
  const side=Math.max(0,(available-page-32)/2);
  const dock=dockOpen?Math.min(280,side>=230?side:0):0;
  const left=cardMode!=='none'&&side>=150?Math.min(300,side):0;
  const rightRoom=side-(dockOpen?(dock||Math.min(280,available)):0);
  const right=cardMode==='both'&&rightRoom>=150?Math.min(300,rightRoom):0;
  return {page,dock,overlay:dockOpen&&!dock,left,right};
}
