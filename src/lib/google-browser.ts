import { googleConfig } from './google-config';
import { googleScopes, type GoogleService } from './google-workspace';
type TokenResponse={access_token?:string;expires_in?:number;scope?:string;error?:string};
type PickerResult={action:string;docs?:{id:string;name:string;mimeType:string}[]};
type PickerBuilder={setDeveloperKey(key:string):PickerBuilder;setAppId(id:string):PickerBuilder;setOAuthToken(token:string):PickerBuilder;setOrigin(origin:string):PickerBuilder;addView(view:unknown):PickerBuilder;setCallback(callback:(data:PickerResult)=>void):PickerBuilder;build():{setVisible(visible:boolean):void}};
type GoogleSDK={accounts:{oauth2:{initTokenClient(options:{client_id:string;scope:string;include_granted_scopes:boolean;callback:(response:TokenResponse)=>void;error_callback:()=>void}):{requestAccessToken(options:{prompt:string}):void};revoke(token:string,callback:(result:{successful:boolean})=>void):void}};picker?:{View:new(id:string)=>{setMimeTypes(types:string):unknown};ViewId:{DOCS:string};PickerBuilder:new()=>PickerBuilder;Action:{PICKED:string;CANCEL:string}}};
declare global {interface Window {google?:GoogleSDK;gapi?:{load(name:string,options:{callback:()=>void;onerror:()=>void;timeout:number;ontimeout:()=>void}):void}}}
const scripts=new Map<string,Promise<void>>();
export function prepareGoogle(){return loadScript('https://accounts.google.com/gsi/client');}
function loadScript(src:string){if(scripts.has(src))return scripts.get(src)!;const task=new Promise<void>((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.async=true;el.onload=()=>resolve();el.onerror=()=>{scripts.delete(src);el.remove();reject(new Error('Google could not load. Check your connection and try again.'));};document.head.appendChild(el);});scripts.set(src,task);return task;}
export function authorizeGoogle(service:GoogleService){
 return new Promise<{accessToken:string;expires:number;scope:string}>((resolve,reject)=>{
  if(!googleConfig.clientId||!window.google?.accounts) return reject(new Error('Finish Google setup, then prepare the connection first.'));
  const client=window.google.accounts.oauth2.initTokenClient({client_id:googleConfig.clientId,scope:`openid email ${googleScopes[service]}`,include_granted_scopes:false,callback:response=>{
   if(response.error||!response.access_token||!response.scope?.split(' ').includes(googleScopes[service]))return reject(new Error('The requested permission was not granted. Nothing was connected.'));
   resolve({accessToken:response.access_token,expires:Date.now()+(Number(response.expires_in)||3600)*1000-30000,scope:response.scope});
  },error_callback:()=>reject(new Error('Google sign-in was closed or blocked. Allow the popup and try again.'))});
  client.requestAccessToken({prompt:'select_account'});
 });
}
export async function chooseGoogleFile(accessToken:string){
 if(!googleConfig.pickerApiKey||!googleConfig.projectNumber)throw new Error('Google Picker needs the restricted browser API key and project number.');
 await loadScript('https://apis.google.com/js/api.js');
 await new Promise<void>((resolve,reject)=>window.gapi!.load('picker',{callback:resolve,onerror:()=>reject(new Error('Google Picker could not load.')),timeout:15000,ontimeout:()=>reject(new Error('Google Picker timed out.'))}));
 const picker=window.google!.picker!;
 return new Promise<{id:string;name:string;mimeType:string}|null>(resolve=>{
  const view=new picker.View(picker.ViewId.DOCS).setMimeTypes('application/vnd.google-apps.document,application/vnd.google-apps.spreadsheet,application/pdf');
  new picker.PickerBuilder().setDeveloperKey(googleConfig.pickerApiKey).setAppId(googleConfig.projectNumber).setOAuthToken(accessToken).setOrigin(window.location.origin).addView(view).setCallback(data=>{if(data.action===picker.Action.PICKED)resolve(data.docs?.[0]||null);else if(data.action===picker.Action.CANCEL)resolve(null);}).build().setVisible(true);
 });
}
