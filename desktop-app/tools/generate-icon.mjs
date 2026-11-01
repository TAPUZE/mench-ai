import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

// A plain geometric M. Keep the editable SVG and Windows icon reproducible
// without a drawing application, external image service, or font dependency.
const polygon=[[56,190],[56,66],[85,66],[128,127],[171,66],[200,66],[200,190],[170,190],[170,117],[128,176],[86,117],[86,190]];
const background=[66,100,83],foreground=[244,247,241],sizes=[16,20,24,32,40,48,64,128,256];
const output=new URL('../desktop/assets/',import.meta.url);
await fs.mkdir(output,{recursive:true});
const points=polygon.map(point=>point.join(',')).join(' ');
await fs.writeFile(new URL('mench.svg',output),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="48" fill="#426453"/><polygon points="${points}" fill="#f4f7f1"/></svg>\n`);
function inside(x,y){
    let result=false;
    for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const [xi,yi]=polygon[i],[xj,yj]=polygon[j];
        if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)result=!result;
    }
    return result;
}
function bitmap(size){
    const stride=Math.ceil(size/32)*4,mask=Buffer.alloc(stride*size),pixels=Buffer.alloc(size*size*4),header=Buffer.alloc(40),samples=4;
    header.writeUInt32LE(40,0);header.writeInt32LE(size,4);header.writeInt32LE(size*2,8);header.writeUInt16LE(1,12);header.writeUInt16LE(32,14);header.writeUInt32LE(pixels.length+mask.length,20);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
        const total=[0,0,0];let alpha=0;
        for(let sy=0;sy<samples;sy++)for(let sx=0;sx<samples;sx++){
            const px=(x+(sx+.5)/samples)*256/size,py=(y+(sy+.5)/samples)*256/size;
            const dx=Math.max(48-px,0,px-208),dy=Math.max(48-py,0,py-208);
            if(dx*dx+dy*dy>48*48)continue;
            alpha++;const color=inside(px,py)?foreground:background;
            for(let channel=0;channel<3;channel++)total[channel]+=color[channel];
        }
        const offset=((size-1-y)*size+x)*4;
        for(let channel=0;channel<3;channel++)pixels[offset+2-channel]=alpha?Math.round(total[channel]/alpha):0;
        pixels[offset+3]=Math.round(alpha*255/(samples*samples));
        if(!alpha)mask[(size-1-y)*stride+(x>>3)]|=0x80>>(x&7);
    }
    return Buffer.concat([header,pixels,mask]);
}
const entries=sizes.map(bitmap),directory=Buffer.alloc(6+16*sizes.length);
directory.writeUInt16LE(1,2);directory.writeUInt16LE(sizes.length,4);
let offset=directory.length;
for(let index=0;index<sizes.length;index++){
    const entry=6+16*index;directory[entry]=directory[entry+1]=sizes[index]===256?0:sizes[index];
    directory.writeUInt16LE(1,entry+4);directory.writeUInt16LE(32,entry+6);
    directory.writeUInt32LE(entries[index].length,entry+8);directory.writeUInt32LE(offset,entry+12);offset+=entries[index].length;
}
await fs.writeFile(new URL('mench.ico',output),Buffer.concat([directory,...entries]));
console.log('Generated '+fileURLToPath(new URL('mench.ico',output)));
