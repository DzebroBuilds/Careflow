import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthStorage, authStorageKey as key, rememberDuration } from '../src/lib/auth-storage.ts';

function store() {
  const values = new Map();
  return {getItem:k=>values.get(k)??null, setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k)};
}
function session(id='verified', aal='aal2', token='first') {
  return JSON.stringify({access_token:`header.${btoa(JSON.stringify({session_id:id,aal}))}.signature`,refresh_token:token});
}
test('shared browsers do not retain sessions after the tab closes',()=>{
  const device=store();const tab=store();const storage=createAuthStorage(tab,device);
  storage.setItem(key,session());
  assert.equal(device.getItem(key),null);
  assert.equal(createAuthStorage(store(),device).getItem(key),null);
});
test('remembered MFA session survives browser restart; token refresh does not extend 30 days',()=>{
  let time=1000;const device=store();const storage=createAuthStorage(store(),device,()=>time);
  storage.setItem(key,session());storage.remember();const deadline=1000+rememberDuration;
  time+=100000;const reopened=createAuthStorage(store(),device,()=>time);
  assert.equal(reopened.getItem(key),session());
  reopened.setItem(key,session('verified','aal2','rotated'));reopened.remember();
  assert.equal(reopened.expiresAt(),deadline);
  time=deadline-1;assert.equal(reopened.getItem(key),session('verified','aal2','rotated'));
  time=deadline;assert.equal(reopened.getItem(key),null);assert.equal(device.getItem(key),null);
  reopened.setItem(key,session('verified','aal2','late-refresh'));
  assert.equal(reopened.getItem(key),null);assert.equal(reopened.expiresAt(),deadline);
});
test('fresh password sign-in cannot inherit trusted status, and sign-out clears persistence',()=>{
  const device=store();const tab=store();const storage=createAuthStorage(tab,device);
  storage.setItem(key,session());storage.remember();
  storage.setItem(key,session('different','aal1'));
  assert.equal(storage.expiresAt(),undefined);assert.equal(device.getItem(key),null);
  assert.throws(()=>storage.remember());
  storage.setItem(key,session('different'));storage.remember();storage.removeItem(key);
  assert.equal(createAuthStorage(store(),device).getItem(key),null);
  assert.equal(storage.expiresAt(),undefined);
});
test('unverified or malformed sessions cannot be remembered and blocked storage retains tab session',()=>{
  const tab=store();const device=store();const storage=createAuthStorage(tab,device);
  storage.setItem(key,'bad');assert.throws(()=>storage.remember());
  storage.setItem(key,session('one','aal1'));assert.throws(()=>storage.remember());
  storage.setItem(key,session());device.setItem=()=>{throw new Error('Storage blocked');};
  assert.throws(()=>storage.remember());assert.equal(tab.getItem(key),session());
});
