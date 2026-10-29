// Only split explicit headings from the existing compatibility copy.
// Arbitrary CMS paragraphs remain intact; this is not a content migration.
export function aboutSections(story:string,heading:string){
 const sections:{heading:string;text:string}[]=[];
 let title=heading,lines:string[]=[];
 for(const line of story.replaceAll('\r\n','\n').split('\n')){
  if(['Our Collection','Your Shopping Experience'].includes(line.trim())){
   if(lines.join('\n').trim())sections.push({heading:title,text:lines.join('\n').trim()});
   title=line.trim();lines=[];
  }else lines.push(line);
 }
 if(lines.join('\n').trim())sections.push({heading:title,text:lines.join('\n').trim()});
 return sections;
}
