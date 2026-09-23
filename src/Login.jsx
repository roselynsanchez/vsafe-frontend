import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import logoVsafe from './logo_vsafe.png';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Ingresa usuario y contraseña');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setCargando(false);
        return;
      }

      // Guardar token + usuario
      localStorage.setItem('vsafe_token', data.token);
      localStorage.setItem('vsafe_usuario', JSON.stringify(data.usuario));

      Swal.fire({
        icon: 'success',
        title: `¡Bienvenido, ${data.usuario.nombre_completo}!`,
        timer: 1500,
        showConfirmButton: false,
        timerProgressBar: true
      });

      setTimeout(() => {
        onLogin(data.usuario);
      }, 800);

    } catch (err) {
      setError('No se pudo conectar con el servidor');
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{
           background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)'
         }}>
      
      {/* Patrón decorativo de fondo */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: `radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%),
                          radial-gradient(circle at 80% 80%, #fbbf24 0%, transparent 50%)`
      }} />

      {/* Círculos decorativos */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl opacity-10 animate-pulse" />

      {/* Tarjeta de login */}
      <div className="relative z-10 w-full max-w-md">
        
        {/* Header con logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-slate-900 p-4 rounded-3xl shadow-2xl border-2 border-blue-800 mb-4">
            <img 
              src={logoVsafe} 
              alt="VSAFE" 
              className="h-20 w-auto object-contain rounded-2xl"
              onError={(e) => { e.target.src = '/logo192.png'; }}
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            VSAFE BLINDAJES S.A.
          </h1>
          <p className="text-blue-200 text-sm mt-1 font-medium">
            Sistema de Gestión, Trazabilidad e Inteligencia Balística
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-t-4 border-amber-400">
          
          <div className="flex items-center justify-center space-x-2 mb-6">
            <ShieldCheck className="h-5 w-5 text-blue-900" />
            <h2 className="text-lg font-bold text-slate-900">Iniciar Sesión</h2>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Usuario */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <User className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 bg-slate-50 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-800 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={verPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3.5 border-2 border-slate-200 bg-slate-50 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-800 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword(!verPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-900 transition"
                >
                  {verPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-blue-950 to-blue-800 hover:from-blue-900 hover:to-blue-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-black py-4 rounded-xl text-sm shadow-lg transition-all hover:shadow-xl mt-6"
            >
              {cargando ? 'Verificando...' : 'INGRESAR AL SISTEMA'}
            </button>

          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              ¿No tienes acceso? Contacta al administrador del sistema
            </p>
          </div>

        </div>

        {/* Footer corporativo */}
        <p className="text-center text-xs text-blue-200 mt-6 font-medium">
          © {new Date().getFullYear()} VSAFE BLINDAJES S.A. — Todos los derechos reservados
        </p>

      </div>
    </div>
  );
}