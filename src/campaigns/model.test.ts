import test from 'node:test';
import assert from 'node:assert/strict';
import {blankCampaign,validateCampaign,campaignStatus,campaignTransition,campaignSlug,campaignDestination} from './model.ts';
import {safeLink} from '../orders/model.ts';
import {safeCustomerReturn} from '../customer/policy.ts';
import {safeAdminDestination} from '../admin/accessPolicy.ts';
const input={...blankCampaign(),name:'Diwali Silks',slug:'diwali-silks'};
test('campaign schema bounds membership, preserves inactive selections and cannot carry price overrides',()=>{
 const valid=validateCampaign({...input,productIds:['a'.repeat(20)],categoryIds:['c'.repeat(20)]});assert.equal(valid.productIds.length,1);assert.equal(valid.categoryIds.length,1);
 for(const change of [{pricePaise:1},{discountPercent:20},{productIds:Array(101).fill('a'.repeat(20))},{categoryIds:Array(11).fill('c'.repeat(20))},{startsAt:20,endsAt:20},{displayOrder:-1},{slug:'../draft'}])assert.throws(()=>validateCampaign({...input,...change}));assert.equal(campaignSlug(' Diwali & Silk Edit '),'diwali-silk-edit');
});
test('server state model has exact schedule boundaries and irreversible terminal intent',()=>{
 const c={...input,intent:'published' as const,startsAt:100,endsAt:200};assert.equal(campaignStatus(c,99),'Scheduled');assert.equal(campaignStatus(c,100),'Live');assert.equal(campaignStatus(c,200),'Ended');assert.equal(campaignStatus({...c,intent:'paused'},150),'Paused');assert.equal(campaignStatus({...c,intent:'draft'},150),'Draft');assert.equal(campaignStatus({...c,intent:'archived'},150),'Archived');assert.equal(campaignTransition('ended','published'),false);assert.equal(campaignTransition('archived','draft'),false);assert.equal(campaignTransition('published','paused'),true);
});
test('campaign links use existing safe navigation without accepting arbitrary paths or preview flags',()=>{
 assert.equal(campaignDestination('https://parinayasilks.vercel.app/sale/diwali-silks?source=home'),'diwali-silks');assert.equal(campaignDestination('https://other.example/sale/diwali-silks'),null);
 assert.equal(safeLink('/sale/diwali-silks',true),'/sale/diwali-silks');assert.equal(safeCustomerReturn('/sale/diwali-silks'),'/sale/diwali-silks');assert.equal(safeAdminDestination('/admin/marketing/edit/'+'a'.repeat(32)),'/admin/marketing/edit/'+'a'.repeat(32));for(const path of ['/sale/../admin','/sale/foo?preview=true','//example.test/sale/foo'])assert.throws(()=>safeLink(path,true));
});
