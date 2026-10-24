import React from 'react';
import type {Membership,PublicCampaign} from '../../campaigns/model.ts';
import {CampaignBanner} from '../../campaigns/CampaignBanner.tsx';
import {quantity} from '../../products/model.ts';
import {couponMoney} from '../coupons/model.ts';
import {CouponDialog} from '../coupons/CouponDialog.tsx';
export function CampaignPreview({value,onClose}:{value:Membership&{campaign:PublicCampaign};onClose:()=>void}){return <CouponDialog title="Private Preview" subtitle="Administrator-only entered configuration. No publication, reservations or order actions." onClose={onClose} footer={<button className="campaign-secondary" onClick={onClose}>Close Preview</button>}><CampaignBanner campaign={value.campaign}/><p>{value.eligibleCount} publicly eligible products · {value.hiddenCount} hidden/missing · {value.outOfStock} out of stock</p><div className="campaign-preview-grid">{value.items.map(p=><article key={p.id}>{p.images[0]&&<img src={p.images[0].url} alt={p.images[0].alt}/>}<h3>{p.name}</h3><p>{couponMoney(p.pricePaise)}</p><small>{quantity(p)} available</small></article>)}</div></CouponDialog>;}
