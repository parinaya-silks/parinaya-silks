import './locationPicker.css';
import React,{useEffect,useRef,useState} from 'react';
import {coordinates,type Coordinates} from '../shipping/distance.ts';
import type {Map,Marker} from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Explicitly opened, optional map. No geolocation or geocoder requests.
export function LocationPicker({value,onChange,disabled=false}:{value?:Coordinates;onChange:(value:Coordinates|undefined)=>void;disabled?:boolean}){
 const host=useRef<HTMLDivElement>(null),current=useRef({value,onChange,disabled});current.current={value,onChange,disabled};
 const synchronize=useRef<()=>void>(()=>{});
 const [open,setOpen]=useState(false),[error,setError]=useState(''),[latitude,setLatitude]=useState(String(value?.latitude??'')),[longitude,setLongitude]=useState(String(value?.longitude??''));
 useEffect(()=>{setLatitude(String(value?.latitude??''));setLongitude(String(value?.longitude??''));synchronize.current();},[value?.latitude,value?.longitude,disabled]);
 useEffect(()=>{
  if(!open||!host.current)return;
  let disposed=false,map:Map|undefined,marker:Marker|undefined;
  void import('leaflet').then(L=>{
   if(disposed||!host.current)return;
   const selected=current.current.value;
   map=L.map(host.current,{center:selected?[selected.latitude,selected.longitude]:[17.385,78.4867],zoom:selected?15:11,scrollWheelZoom:false});
   map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>');
   const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'}).addTo(map);
   tiles.on('tileerror',()=>{if(!disposed)setError('Map tiles could not load. You can still enter the complete address manually.');});
   synchronize.current=()=>{
    const v=current.current.value;if(!map)return;
    if(!v){if(marker){marker.remove();marker=undefined;}return;}
    if(marker)marker.setLatLng([v.latitude,v.longitude]);else{
     marker=L.marker([v.latitude,v.longitude],{draggable:!current.current.disabled,keyboard:true,title:'Selected delivery location',icon:L.divIcon({className:'delivery-map-pin',html:'<span aria-hidden="true"></span>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map);
     marker.on('dragend',()=>{if(current.current.disabled)return;const p=marker!.getLatLng();current.current.onChange({latitude:p.lat,longitude:p.lng});});
    }
    if(current.current.disabled)marker.dragging?.disable();else marker.dragging?.enable();
    if(!map.getBounds().contains([v.latitude,v.longitude]))map.panTo([v.latitude,v.longitude],{animate:false});
   };
   synchronize.current();
   map.on('click',e=>{if(!current.current.disabled){setError('');current.current.onChange({latitude:e.latlng.lat,longitude:e.latlng.lng});}});
  }).catch(()=>{if(!disposed)setError('Map could not load. Enter the complete address manually.');});
  return()=>{disposed=true;synchronize.current=()=>{};map?.remove();};
 },[open]);
 function edit(key:'latitude'|'longitude',text:string){
  if(key==='latitude')setLatitude(text);else setLongitude(text);
  const lat=key==='latitude'?text:latitude,lng=key==='longitude'?text:longitude;
  if(!lat||!lng)return;
  try{onChange(coordinates({latitude:Number(lat),longitude:Number(lng)}));setError('');}catch{setError('Enter valid latitude and longitude.');}
 }
 return <section className="delivery-map-picker">
  <button type="button" disabled={disabled} onClick={()=>setOpen(v=>!v)}>{open?'Close map':'Select location on map (optional)'}</button>
  {open&&<><p>Tap the map or drag the marker. Confirm the full postal address below. Map tiles are provided by OpenStreetMap.</p><div ref={host} role="region" aria-label="Delivery location map" style={{height:280,width:'100%',position:'relative',zIndex:0}}/><div className="delivery-map-coordinates"><label>Latitude<input type="number" step="any" disabled={disabled} value={latitude} onChange={e=>edit('latitude',e.target.value)}/></label><label>Longitude<input type="number" step="any" disabled={disabled} value={longitude} onChange={e=>edit('longitude',e.target.value)}/></label></div></>}
  {value&&<><p role="status">Selected location: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</p><button type="button" disabled={disabled} onClick={()=>{onChange(undefined);setOpen(false);}}>Remove map pin; use manual address</button></>}
  {error&&<p role="status">{error}</p>}
 </section>;
}
