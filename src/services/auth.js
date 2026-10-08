export function validateCredentials({username,password,confirmation},mode){
 const errors={};
 if(!username.trim())errors.username='required';
 else if(mode==='signup'&&username.trim().length<3)errors.username='usernameShort';
 if(!password)errors.password='required';
 else if(mode==='signup'&&password.length<8)errors.password='passwordShort';
 if(mode==='signup'&&confirmation!==password)errors.confirmation='mismatch';
 return errors;
}
async function request(body){
 const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
 const result=await response.json();
 if(!response.ok)throw new Error(result.error||'La connexion a échoué.');
 return result;
}
export const authService={
 submit:({username,password,confirmation,avatar},mode)=>request({action:mode,username,password,confirmation,avatar}),
 logout:()=>request({action:'logout'}),
 async current(){const response=await fetch('/api/auth',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Compte indisponible.');return response.json()},
 async provider(name){if(!['discord','github'].includes(name))throw new Error('Unsupported provider');return {kind:'provider-unavailable',provider:name}}
};
