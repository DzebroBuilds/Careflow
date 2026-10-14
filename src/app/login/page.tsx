import Link from 'next/link';
import AccountLogin from '@/components/account-login';
export default function Login(){return <main className="cf-gate"><div><Link href="/" className="cf-brand" style={{marginBottom:24}}><span className="cf-logo">C</span>CareFlow</Link><AccountLogin/><p style={{fontSize:12,textAlign:'center',marginTop:24,color:'#718177'}}>Developed by OASISWEB&amp;AI</p></div></main>;}
