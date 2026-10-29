import React,{useEffect,useState} from 'react';
import type {PublicAbout} from './model.ts';
export function AboutCopy({value,preview=false,founderOnly=false}:{value:PublicAbout;preview?:boolean;founderOnly?:boolean}){
 const photo=value.founder?.photo,[failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[photo?.url]);
 const image=photo&&!failed&&(preview&&photo.url.startsWith('blob:')||/^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/upload\/[^\s?#]+$/.test(photo.url));
 return <article className="about-copy">{!founderOnly&&<><header><h1>{value.heading}</h1>{value.intro&&<p className="about-intro">{value.intro}</p>}</header><section>{value.storyHeading&&<h2>{value.storyHeading}</h2>}<p>{value.story}</p></section></>}{value.founder&&<section className="about-founder">{image&&<img src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} onError={()=>setFailed(true)} style={{objectPosition:`${photo.focalX}% ${photo.focalY}%`}}/>}<div><h2>{value.founder.name}</h2>{value.founder.role&&<p className="about-role">{value.founder.role}</p>}{value.founder.bio&&<p>{value.founder.bio}</p>}</div></section>}</article>;
}
