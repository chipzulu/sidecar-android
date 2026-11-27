/** Counts complete payload files in Sidecar's stored ZIP, skipping the first (manifest) entry. */
export class ReceivedFileCount {
 constructor(){
   this.header=new Uint8Array(30);
   this.used=0;this.remaining=0;this.entries=0;this.finished=false;
 }
 get files(){return Math.max(0,this.entries-1);}
 push(bytes){
   let offset=0;
   while(offset<bytes.length&&!this.finished){
     if(this.remaining){
       const taken=Math.min(this.remaining,bytes.length-offset);
       this.remaining-=taken;offset+=taken;
       if(!this.remaining)this.entries++;
       continue;
     }
     const n=Math.min(30-this.used,bytes.length-offset);
     this.header.set(bytes.subarray(offset,offset+n),this.used);this.used+=n;offset+=n;
     if(this.used<30)continue;
     const view=new DataView(this.header.buffer);
     if(view.getUint32(0,true)!==0x04034b50){this.finished=true;break;}
     this.remaining=view.getUint16(26,true)+view.getUint16(28,true)+view.getUint32(18,true);
     this.used=0;if(!this.remaining)this.entries++;
   }
 }
}
