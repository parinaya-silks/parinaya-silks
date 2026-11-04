import type {PublicCampaign} from './model.ts';
import {campaignDestination} from './model.ts';
import type {PublicBanner} from '../content/model.ts';
export const heroDestination=(banner:PublicBanner)=>{const slug=campaignDestination(banner.link);return slug?'/sale/'+slug:'/shop';};
export function heroBanners(regular:PublicBanner[],campaigns:PublicCampaign[]):PublicBanner[]{
 const live=new Set(campaigns.map(c=>c.slug));
 const saved=regular.filter(b=>{const slug=campaignDestination(b.link);return !slug||live.has(slug);});
 const linked=new Set(saved.map(b=>campaignDestination(b.link)));
 return [...saved,...campaigns.filter(c=>!linked.has(c.slug)).map(c=>({id:'campaign-'+c.slug,title:c.name,supportingText:c.description,link:'/sale/'+c.slug,showButton:!!c.ctaLabel,buttonLabel:c.ctaLabel,placement:'bottom' as const,images:c.banners}))];
}
