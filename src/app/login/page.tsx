import Link from 'next/link';
import AccountLogin from '@/components/account-login';
import LoginBackdrop from '@/components/login-backdrop';
import './login.css';

export default function Login() {
  return (
    <main className="cf-gate login-stage">
      <LoginBackdrop />
      <div className="login-column">
        <Link href="/" className="cf-brand login-brand">
          <span className="cf-logo">C</span>CareFlow
        </Link>
        <h1 className="login-sr">Sign in to CareFlow</h1>
        <p className="login-lede">Every home. Every record. One clear weekly review.</p>
        <AccountLogin />
        <p className="login-credit">Developed by OASISWEB&amp;AI</p>
      </div>
    </main>
  );
}
