// Frontend-only boundary. Replace these responses with real server auth/OAuth later.
// Credentials are never persisted, logged or sent by this demo adapter.
export function validateCredentials({username,password,confirmation},mode){
 const errors={};
 if(!username.trim())errors.username='required';
 else if(mode==='signup'&&username.trim().length<3)errors.username='usernameShort';
 if(!password)errors.password='required';
 else if(mode==='signup'&&password.length<8)errors.password='passwordShort';
 if(mode==='signup'&&confirmation!==password)errors.confirmation='mismatch';
 return errors;
}
export const authService={
 async submitDemo(){return {authenticated:false,kind:'demo'}},
 async provider(name){if(!['discord','github'].includes(name))throw new Error('Unsupported provider');return {authenticated:false,kind:'provider-unavailable',provider:name}}
};
