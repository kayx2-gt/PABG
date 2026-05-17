import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (error: any) {
      alert(error.message || "Failed to sign in with Google");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 style={{ color: 'var(--primary)', fontSize: '32px', marginBottom: '10px' }}>PABG - PANDORA'S BOX OF GAMES ADMIN</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '14px' }}>Please sign in to access the dashboard</p>
        <button onClick={handleLogin} className="google-btn">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
          Sign in with Google
        </button>
      </div>
      <style>{`
        .login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          background-color: var(--bg);
        }
        .login-box {
          background: var(--surface);
          padding: 60px 40px;
          border-radius: 30px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
          border: 1px solid var(--border);
          width: 100%;
          max-width: 400px;
        }
        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          padding: 16px;
          background: white;
          color: #000;
          border: none;
          border-radius: 16px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .google-btn:hover { transform: scale(1.02); }
        .google-btn img { width: 20px; }
      `}</style>
    </div>
  );
};

export default Login;