import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, PlusCircle, Trash2, X, 
  AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Bell, BellOff, AlertTriangle, Check, Calendar, RefreshCw
} from 'lucide-react';
import Swal from 'sweetalert2';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const CATEGORIAS = [
  { valor: 'cita', label: 'Cita', emoji: '📅', color: 'blue' },
  { valor: 'reunion', label: 'Reunión', emoji: '👥', color: 'purple' },
  { valor: 'entrega', label: 'Entrega', emoji: '📦', color: 'amber' },
  { valor: 'recordatorio', label: 'Recordatorio', emoji: '🔔', color: 'cyan' },
  { valor: 'tarea', label: 'Tarea', emoji: '✅', color: 'emerald' },
  { valor: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧', color: 'orange' },
  { valor: 'pago', label: 'Pago', emoji: '💰', color: 'green' },
  { valor: 'otro', label: 'Otro', emoji: '📌', color: 'slate' },
];

const PRIORIDADES = [
  { valor: 'baja', label: 'Baja', color: 'slate' },
  { valor: 'media', label: 'Media', color: 'blue' },
  { valor: 'alta', label: 'Alta', color: 'amber' },
  { valor: 'urgente', label: 'Urgente', color: 'red' },
];

const COLOR_MAP = {
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
  green: 'bg-green-100 text-green-800 border-green-300',
  slate: 'bg-slate-100 text-slate-700 border-slate-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

// ============ INPUT HELPER ============
const InputField = ({ label, required, value, onChange, placeholder, tipo = 'text', valido, mensajeError, eventoEditando }) => {
  const [tocado, setTocado] = useState(!!eventoEditando);
  const mostrarError = tocado && required && !valido && value !== '';
  const mostrarOk = tocado && valido && value !== '';

  return (
    <div>
      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <input
          type={tipo}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTocado(true)}
          className={`w-full border-2 rounded-lg p-3 pr-10 text-sm font-medium transition focus:outline-none ${
            mostrarError ? 'border-red-300 bg-red-50 focus:border-red-500'
              : mostrarOk ? 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-500'
              : 'border-slate-200 bg-slate-50 focus:border-blue-800 focus:bg-white'
          }`}
        />
        {mostrarError && <AlertCircle className="h-5 w-5 text-red-500 absolute right-3 top-1/2 -translate-y-1/2" />}
        {mostrarOk && <CheckCircle2 className="h-5 w-5 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />}
      </div>
      {mostrarError && <p className="text-xs text-red-600 font-medium mt-1">{mensajeError}</p>}
    </div>
  );
};

// ============ SOLICITAR PERMISO (fuera del componente) ============
const solicitarPermisoNotificaciones = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permiso = await Notification.requestPermission();
  return permiso === 'granted';
};

export default function CalendarioModule() {
  const hoy = new Date();
  const [fechaActual, setFechaActual] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [eventos, setEventos] = useState([]);
  const [proximos, setProximos] = useState({ vencidos: [], hoy: [], proximos: [], total_pendientes: 0 });
  const [estadisticas, setEstadisticas] = useState(null);
  const [aniosDisponibles, setAniosDisponibles] = useState([hoy.getFullYear()]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [fechaPasadaConfirmada, setFechaPasadaConfirmada] = useState(false);
  
  const [notificacionesSilenciadas, setNotificacionesSilenciadas] = useState(() => {
    return localStorage.getItem('vsafe_notif_silenciadas') === 'true';
  });

  const [permisoNotif, setPermisoNotif] = useState(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'unsupported'
  );

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    hora_fin: '',
    categoria: 'recordatorio',
    prioridad: 'media',
    recordatorio_dias: 1,
  });

  // ============ CARGA ============
  const cargar = async () => {
    try {
      const anio = fechaActual.getFullYear();
      const mes = fechaActual.getMonth() + 1;
      const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(anio, mes, 0).getDate();
      const ultimoDiaStr = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

      const [re, rpr, rest, ran] = await Promise.all([
        fetch(`http://localhost:5000/api/calendario?desde=${primerDia}&hasta=${ultimoDiaStr}`).then(r => r.json()),
        fetch('http://localhost:5000/api/calendario/proximos').then(r => r.json()),
        fetch('http://localhost:5000/api/calendario/estadisticas').then(r => r.json()),
        fetch('http://localhost:5000/api/calendario/anios').then(r => r.json()),
      ]);

      setEventos(Array.isArray(re) ? re : []);
      setProximos(rpr || { vencidos: [], hoy: [], proximos: [], total_pendientes: 0 });
      setEstadisticas(rest);
      if (ran && Array.isArray(ran.anios)) {
        setAniosDisponibles(ran.anios);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { cargar(); }, [fechaActual]);

  // ============ NAVEGACIÓN ============
  const mesAnterior = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
  const mesSiguiente = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1));
  const irHoy = () => setFechaActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1));

  const cambiarAnio = (nuevoAnio) => setFechaActual(new Date(Number(nuevoAnio), fechaActual.getMonth(), 1));
  const cambiarMes = (nuevoMes) => setFechaActual(new Date(fechaActual.getFullYear(), Number(nuevoMes), 1));

  // ============ VALIDAR FECHA PASADA ============
  const esFechaPasada = (fechaStr) => {
    if (!fechaStr) return false;
    const hoyLimpio = new Date();
    hoyLimpio.setHours(0, 0, 0, 0);
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha < hoyLimpio;
  };

  const manejarCambioFecha = async (nuevaFecha) => {
    setForm({ ...form, fecha: nuevaFecha });
    setFechaPasadaConfirmada(false);

    if (esFechaPasada(nuevaFecha)) {
      const fechaFormateada = new Date(nuevaFecha + 'T00:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });

      const resultado = await Swal.fire({
        icon: 'warning',
        title: '⚠️ Fecha en el pasado',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 12px;">La fecha seleccionada es:</p>
            <p style="font-weight: bold; color: #1e3a8a; font-size: 16px; margin: 8px 0;">
              ${fechaFormateada}
            </p>
            <p style="margin-top: 12px; color: #64748b; font-size: 13px;">
              Esta fecha ya pasó. Si continúas, el evento se marcará automáticamente como <strong>vencido</strong>.
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cambiar fecha',
        confirmButtonColor: '#1e3a8a',
        cancelButtonColor: '#64748b'
      });

      if (resultado.isConfirmed) {
        setFechaPasadaConfirmada(true);
      } else {
        setForm({ ...form, fecha: '' });
      }
    } else {
      setFechaPasadaConfirmada(true);
    }
  };

  // ============ MODAL ============
  const abrirNuevo = (fecha = null) => {
    setEventoEditando(null);
    setFechaPasadaConfirmada(false);
    const fechaInicial = fecha || new Date().toISOString().split('T')[0];
    setForm({
      titulo: '',
      descripcion: '',
      fecha: fechaInicial,
      hora: '',
      hora_fin: '',
      categoria: 'recordatorio',
      prioridad: 'media',
      recordatorio_dias: 1,
    });
    if (fecha && esFechaPasada(fecha)) {
      setFechaPasadaConfirmada(false);
    } else {
      setFechaPasadaConfirmada(true);
    }
    setModalAbierto(true);
  };

  const abrirEditar = (ev) => {
    setEventoEditando(ev);
    setFechaPasadaConfirmada(true);
    setForm({
      titulo: ev.titulo || '',
      descripcion: ev.descripcion || '',
      fecha: ev.fecha ? String(ev.fecha).substring(0, 10) : '',
      hora: ev.hora || '',
      hora_fin: ev.hora_fin || '',
      categoria: ev.categoria || 'recordatorio',
      prioridad: ev.prioridad || 'media',
      recordatorio_dias: ev.recordatorio_dias || 1,
    });
    setModalAbierto(true);
  };

  // ============ MANEJAR CLICK EN BOTÓN DE NOTIFICACIONES ============
  const handleClickNotificaciones = async () => {
    // Caso 1: No tiene permiso → pedirlo
    if (!('Notification' in window) || Notification.permission === 'default') {
      const ok = await solicitarPermisoNotificaciones();
      setPermisoNotif('Notification' in window ? Notification.permission : 'unsupported');
      
      if (ok) {
        setNotificacionesSilenciadas(false);
        localStorage.setItem('vsafe_notif_silenciadas', 'false');
        // ⭐ Notificar al App.js
        window.dispatchEvent(new CustomEvent('vsafe-notif-changed', { 
          detail: { silenciado: false } 
        }));
        
        Swal.fire({
          icon: 'success',
          title: '¡Notificaciones activadas!',
          text: 'Te avisaremos cuando se acerquen tus eventos.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Notificaciones bloqueadas',
          html: 'Debes habilitarlas manualmente en:<br><strong>Configuración del navegador → Privacidad → Notificaciones</strong>',
          confirmButtonColor: '#1e3a8a'
        });
      }
      return;
    }

    // Caso 2: Permiso denegado
    if (Notification.permission === 'denied') {
      Swal.fire({
        icon: 'error',
        title: '🔕 Notificaciones bloqueadas',
        html: `
          <div style="text-align: left; font-size: 13px;">
            <p style="margin-bottom: 12px;">El navegador bloqueó las notificaciones. Para activarlas:</p>
            <div style="margin-bottom: 10px; padding: 10px; background: #f1f5f9; border-radius: 8px;">
              <p style="font-weight: bold; color: #1e3a8a;">🌐 Chrome / Edge</p>
              <p>1. Click en el <strong>candado</strong> al lado de la URL</p>
              <p>2. <strong>Notificaciones → Permitir</strong></p>
            </div>
            <div style="padding: 10px; background: #f1f5f9; border-radius: 8px;">
              <p style="font-weight: bold; color: #1e3a8a;">🦊 Firefox</p>
              <p>1. Click en el <strong>escudo</strong> al lado de la URL</p>
              <p>2. <strong>Permisos → Notificaciones</strong></p>
            </div>
            <p style="margin-top: 12px; color: #64748b; font-size: 12px;">
              Después de activarlas, recarga la página (Ctrl+Shift+R).
            </p>
          </div>
        `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#1e3a8a',
        width: '500px'
      });
      return;
    }

    // Caso 3: Permiso concedido → alternar silencio
    const nuevoEstado = !notificacionesSilenciadas;
    setNotificacionesSilenciadas(nuevoEstado);
    localStorage.setItem('vsafe_notif_silenciadas', String(nuevoEstado));
    // ⭐ Notificar al App.js
    window.dispatchEvent(new CustomEvent('vsafe-notif-changed', { 
      detail: { silenciado: nuevoEstado } 
    }));

    Swal.fire({
      icon: nuevoEstado ? 'info' : 'success',
      title: nuevoEstado ? '🔕 Notificaciones silenciadas' : '🔔 Notificaciones activadas',
      text: nuevoEstado 
        ? 'No recibirás avisos hasta que las vuelvas a activar.' 
        : 'Volverás a recibir avisos de tus eventos.',
      timer: 2000,
      showConfirmButton: false,
      position: 'center'
    });
  };

  // ============ VALIDACIONES ============
  const validar = () => ({
    titulo: form.titulo.trim().length >= 3,
    fecha: form.fecha !== '' && (!esFechaPasada(form.fecha) || fechaPasadaConfirmada),
  });
  const v = validar();
  const formCompleto = Object.values(v).every(Boolean);

  // ============ GUARDAR ============
  const guardar = async (e) => {
    e.preventDefault();
    if (!formCompleto) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Formulario incompleto', 
        text: form.fecha && esFechaPasada(form.fecha) && !fechaPasadaConfirmada
          ? 'Debes confirmar la fecha en el pasado para continuar.'
          : 'Título y fecha son obligatorios.', 
        confirmButtonColor: '#1e3a8a' 
      });
      return;
    }

    const url = eventoEditando
      ? `http://localhost:5000/api/calendario/${eventoEditando.id_evento}`
      : 'http://localhost:5000/api/calendario';
    const method = eventoEditando ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          confirmar_pasado: fechaPasadaConfirmada
        })
      });
      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: eventoEditando ? 'Evento actualizado' : 'Evento creado',
          timer: 1200,
          showConfirmButton: false
        });
        setModalAbierto(false);
        cargar();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar', 'error');
      }
    } catch (error) {
      Swal.fire('Error de conexión', error.message, 'error');
    }
  };

  // ============ ELIMINAR ============
  const eliminar = async (id, e) => {
    e?.stopPropagation();
    const r = await Swal.fire({
      title: '¿Eliminar evento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar'
    });
    if (!r.isConfirmed) return;
    await fetch(`http://localhost:5000/api/calendario/${id}`, { method: 'DELETE' });
    cargar();
  };

  // ============ TOGGLE COMPLETADO ============
  const toggleCompletado = async (id, e) => {
    e?.stopPropagation();
    await fetch(`http://localhost:5000/api/calendario/${id}/toggle`, { method: 'PATCH' });
    cargar();
  };

  // ============ UTILIDADES ============
  const anio = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const primerDiaMes = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const hoyStr = hoy.toISOString().split('T')[0];

  const celdas = [];
  for (let i = 0; i < primerDiaMes; i++) celdas.push({ vacio: true, key: `v-${i}` });
  for (let d = 1; d <= diasEnMes; d++) {
    const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const eventosDelDia = eventos
      .filter(e => String(e.fecha).substring(0, 10) === fechaStr)
      .filter(e => filtroCategoria === 'todas' || e.categoria === filtroCategoria);
    celdas.push({
      dia: d,
      fecha: fechaStr,
      eventos: eventosDelDia,
      esHoy: fechaStr === hoyStr,
      key: `d-${d}`
    });
  }

  const getCategoria = (cat) => CATEGORIAS.find(c => c.valor === cat) || CATEGORIAS[3];
  const getPrioridad = (pri) => PRIORIDADES.find(p => p.valor === pri) || PRIORIDADES[1];

  const eventosDiaSeleccionado = diaSeleccionado
    ? eventos.filter(e => String(e.fecha).substring(0, 10) === diaSeleccionado)
    : [];

  const fechaEsPasadaYNoConfirmada = form.fecha && esFechaPasada(form.fecha) && !fechaPasadaConfirmada;

  const notifSoportadas = typeof window !== 'undefined' && 'Notification' in window;
  const notifPermiso = notifSoportadas ? Notification.permission : 'unsupported';

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-950 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center space-x-3">
            <CalendarIcon className="h-7 w-7" />
            <span>Agenda y Calendario</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Organiza tus citas, tareas, reuniones y pendientes del trabajo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={handleClickNotificaciones}
            className={`flex items-center space-x-2 font-bold text-sm px-4 py-3 rounded-xl shadow transition ${
              !notifSoportadas || notifPermiso === 'denied'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : notifPermiso === 'default'
                  ? 'bg-amber-400 hover:bg-amber-500 text-blue-950'
                  : notificacionesSilenciadas
                    ? 'bg-slate-500 hover:bg-slate-600 text-white'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
            title={
              !notifSoportadas 
                ? 'Tu navegador no soporta notificaciones'
                : notifPermiso === 'denied'
                  ? 'Notificaciones bloqueadas — click para ver cómo activarlas'
                  : notifPermiso === 'default'
                    ? 'Activar notificaciones'
                    : notificacionesSilenciadas
                      ? 'Avisos silenciados — click para activar'
                      : 'Avisos activos — click para silenciar'
            }
          >
            {!notifSoportadas ? (
              <>
                <AlertCircle className="h-4 w-4" />
                <span>No disponible</span>
              </>
            ) : notifPermiso === 'denied' ? (
              <>
                <BellOff className="h-4 w-4" />
                <span>Bloqueadas</span>
              </>
            ) : notifPermiso === 'default' ? (
              <>
                <Bell className="h-4 w-4" />
                <span>Activar Avisos</span>
              </>
            ) : notificacionesSilenciadas ? (
              <>
                <BellOff className="h-4 w-4" />
                <span>Avisos Silenciados</span>
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                <span>Avisos Activos</span>
              </>
            )}
          </button>

          <button
            onClick={() => abrirNuevo()}
            className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm px-4 py-3 rounded-xl shadow transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nuevo Evento</span>
          </button>
        </div>
      </div>

      {/* ALERTAS */}
      {proximos.total_pendientes > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {proximos.vencidos.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-800 text-sm">
                  {proximos.vencidos.length} evento{proximos.vencidos.length > 1 ? 's' : ''} vencido{proximos.vencidos.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 mt-1">Requieren atención</p>
              </div>
            </div>
          )}
          {proximos.hoy.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex items-start space-x-3">
              <Bell className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-bold text-amber-800 text-sm">
                  {proximos.hoy.length} evento{proximos.hoy.length > 1 ? 's' : ''} HOY
                </p>
                <p className="text-xs text-amber-600 mt-1">Revisa tu agenda</p>
              </div>
            </div>
          )}
          {proximos.proximos.length > 0 && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 flex items-start space-x-3">
              <Clock className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-blue-800 text-sm">
                  {proximos.proximos.length} próximo{proximos.proximos.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-600 mt-1">En los siguientes días</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ESTADÍSTICAS */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Total</p>
            <p className="text-2xl font-black text-blue-950 mt-1">{estadisticas.total || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Hoy</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{estadisticas.hoy || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Pendientes</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{estadisticas.pendientes || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Vencidos</p>
            <p className="text-2xl font-black text-red-600 mt-1">{estadisticas.vencidos || 0}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow p-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Completados</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{estadisticas.completados || 0}</p>
          </div>
        </div>
      )}

      {/* FILTRO CATEGORÍA */}
      <div className="bg-white rounded-xl border border-slate-200 shadow p-3 flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroCategoria('todas')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filtroCategoria === 'todas' 
              ? 'bg-blue-900 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Todas
        </button>
        {CATEGORIAS.map(c => (
          <button
            key={c.valor}
            onClick={() => setFiltroCategoria(c.valor)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filtroCategoria === c.valor
                ? 'bg-blue-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CALENDARIO */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow overflow-hidden">
          
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-2">
              <button onClick={mesAnterior} className="p-2 hover:bg-slate-200 rounded-lg transition">
                <ChevronLeft className="h-5 w-5 text-slate-700" />
              </button>
              <button onClick={mesSiguiente} className="p-2 hover:bg-slate-200 rounded-lg transition">
                <ChevronRight className="h-5 w-5 text-slate-700" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={mes}
                onChange={(e) => cambiarMes(e.target.value)}
                className="px-3 py-1.5 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-blue-800 focus:outline-none bg-white"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>

              <select
                value={anio}
                onChange={(e) => cambiarAnio(e.target.value)}
                className="px-3 py-1.5 border-2 border-slate-200 rounded-lg text-sm font-bold text-slate-700 focus:border-blue-800 focus:outline-none bg-white"
              >
                {aniosDisponibles.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
                {Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - 2 + i)
                  .filter(a => !aniosDisponibles.includes(a))
                  .map(a => <option key={`x-${a}`} value={a}>{a}</option>)
                }
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button 
                onClick={irHoy}
                className="px-3 py-1.5 text-xs font-bold bg-blue-900 text-white rounded-lg hover:bg-blue-800 transition"
              >
                Hoy
              </button>

              <button
                onClick={cargar}
                className="text-sm font-bold text-blue-900 hover:text-blue-700 flex items-center space-x-1 border border-slate-300 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 transition"
                title="Refrescar desde el servidor"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="p-2 text-center text-xs font-black text-slate-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {celdas.map((c) => {
              if (c.vacio) {
                return <div key={c.key} className="aspect-square bg-slate-50 border border-slate-100" />;
              }
              return (
                <div
                  key={c.key}
                  onClick={() => {
                    if (c.eventos.length === 0) {
                      abrirNuevo(c.fecha);
                    } else {
                      setDiaSeleccionado(diaSeleccionado === c.fecha ? null : c.fecha);
                    }
                  }}
                  className={`aspect-square border border-slate-100 p-1 cursor-pointer transition relative ${
                    c.esHoy ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : 'hover:bg-slate-50'
                  } ${diaSeleccionado === c.fecha ? 'bg-blue-100 ring-2 ring-blue-500 ring-inset' : ''}`}
                >
                  <div className={`text-xs font-black mb-0.5 ${c.esHoy ? 'text-blue-900' : 'text-slate-600'}`}>
                    {c.dia}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    {c.eventos.slice(0, 2).map((ev) => {
                      const cat = getCategoria(ev.categoria);
                      return (
                        <div
                          key={ev.id_evento}
                          className={`text-[9px] font-bold px-1 py-0.5 rounded border truncate ${
                            ev.completado ? 'line-through opacity-60' : ''
                          } ${COLOR_MAP[cat.color]}`}
                          title={ev.titulo}
                        >
                          {cat.emoji} {ev.titulo}
                        </div>
                      );
                    })}
                    {c.eventos.length > 2 && (
                      <div className="text-[9px] font-bold text-slate-500 pl-1">
                        +{c.eventos.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL LATERAL */}
        <div className="space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-900" />
                <span className="text-sm">
                  {diaSeleccionado 
                    ? new Date(diaSeleccionado + 'T00:00:00').toLocaleDateString('es-ES', { 
                        weekday: 'long', day: 'numeric', month: 'short' 
                      })
                    : 'Próximos Eventos'}
                </span>
              </h3>
              {diaSeleccionado && (
                <button
                  onClick={() => setDiaSeleccionado(null)}
                  className="text-xs font-bold text-blue-900 hover:text-blue-700"
                >
                  Ver todos
                </button>
              )}
            </div>

            <div className="max-h-[500px] overflow-y-auto p-3 space-y-2">
              {(diaSeleccionado 
                ? eventosDiaSeleccionado
                : [...proximos.hoy, ...proximos.proximos, ...proximos.vencidos].slice(0, 20)
              ).length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-medium">
                    {diaSeleccionado ? 'Sin eventos este día' : 'Sin eventos próximos'}
                  </p>
                </div>
              ) : (
                (diaSeleccionado 
                  ? eventosDiaSeleccionado
                  : [...proximos.hoy, ...proximos.proximos, ...proximos.vencidos].slice(0, 20)
                ).map(ev => {
                  const cat = getCategoria(ev.categoria);
                  const pri = getPrioridad(ev.prioridad);
                  const fechaEv = String(ev.fecha).substring(0, 10);
                  const esVencido = fechaEv < hoyStr && !ev.completado;

                  return (
                    <div
                      key={ev.id_evento}
                      className={`p-3 rounded-xl border-2 transition cursor-pointer hover:shadow ${
                        ev.completado ? 'bg-slate-50 opacity-60' : 'bg-white'
                      } ${esVencido ? 'border-red-200' : 'border-slate-200'}`}
                      onClick={() => abrirEditar(ev)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1.5 mb-1">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${COLOR_MAP[cat.color]}`}>
                              {cat.emoji} {cat.label}
                            </span>
                            {ev.prioridad !== 'media' && (
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${COLOR_MAP[pri.color]}`}>
                                {pri.label}
                              </span>
                            )}
                          </div>
                          <p className={`font-bold text-sm text-slate-900 ${ev.completado ? 'line-through' : ''}`}>
                            {ev.titulo}
                          </p>
                          {ev.descripcion && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ev.descripcion}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-500">
                            <span className="font-mono">
                              {fechaEv === hoyStr 
                                ? '⏰ Hoy' 
                                : new Date(fechaEv + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </span>
                            {ev.hora && (
                              <span className="font-mono">
                                {String(ev.hora).substring(0, 5)}
                                {ev.hora_fin && ` - ${String(ev.hora_fin).substring(0, 5)}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => toggleCompletado(ev.id_evento, e)}
                            className={`p-1.5 rounded-lg transition ${
                              ev.completado 
                                ? 'text-emerald-700 hover:bg-emerald-50' 
                                : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={ev.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => eliminar(ev.id_evento, e)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ MODAL EVENTO ============ */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-950 to-blue-800 rounded-t-2xl">
              <div className="flex items-center space-x-3 text-white">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <CalendarIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    {eventoEditando ? 'Editar Evento' : 'Nuevo Evento'}
                  </h2>
                  <p className="text-blue-200 text-xs">
                    {eventoEditando ? 'Modifica los detalles del evento' : 'Agenda un nuevo evento, tarea o cita'}
                  </p>
                </div>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-white hover:bg-white/10 p-2 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardar} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <InputField
                label="Título"
                required
                placeholder="Ej. Reunión con proveedor, Entregar pedido #42, etc."
                value={form.titulo}
                onChange={v => setForm({...form, titulo: v})}
                valido={v.titulo}
                mensajeError="Mínimo 3 caracteres"
                eventoEditando={eventoEditando}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({...form, categoria: e.target.value})}
                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none"
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c.valor} value={c.valor}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Prioridad
                  </label>
                  <select
                    value={form.prioridad}
                    onChange={(e) => setForm({...form, prioridad: e.target.value})}
                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none"
                  >
                    {PRIORIDADES.map(p => (
                      <option key={p.valor} value={p.valor}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField
                  label="Fecha"
                  required
                  tipo="date"
                  value={form.fecha}
                  onChange={manejarCambioFecha}
                  valido={v.fecha}
                  mensajeError="Fecha obligatoria"
                  eventoEditando={eventoEditando}
                />
                <InputField
                  label="Hora inicio"
                  tipo="time"
                  value={form.hora}
                  onChange={v => setForm({...form, hora: v})}
                  valido={true}
                  eventoEditando={eventoEditando}
                />
                <InputField
                  label="Hora fin"
                  tipo="time"
                  value={form.hora_fin}
                  onChange={v => setForm({...form, hora_fin: v})}
                  valido={true}
                  eventoEditando={eventoEditando}
                />
              </div>

              {form.fecha && esFechaPasada(form.fecha) && (
                <div className={`p-3 rounded-xl border-2 flex items-start space-x-2 ${
                  fechaPasadaConfirmada 
                    ? 'bg-amber-50 border-amber-300' 
                    : 'bg-red-50 border-red-300'
                }`}>
                  <AlertCircle className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    fechaPasadaConfirmada ? 'text-amber-600' : 'text-red-600'
                  }`} />
                  <p className={`text-xs font-medium ${
                    fechaPasadaConfirmada ? 'text-amber-800' : 'text-red-800'
                  }`}>
                    {fechaPasadaConfirmada 
                      ? '⚠️ Este evento quedará registrado en una fecha pasada y se marcará como vencido.'
                      : '⚠️ La fecha seleccionada ya pasó. Confirma para continuar.'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Descripción / Notas
                </label>
                <textarea
                  rows="3"
                  placeholder="Detalles, personas involucradas, ubicación..."
                  value={form.descripcion}
                  onChange={(e) => setForm({...form, descripcion: e.target.value})}
                  className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  🔔 Avisar cuántos días antes
                </label>
                <select
                  value={form.recordatorio_dias}
                  onChange={(e) => setForm({...form, recordatorio_dias: e.target.value})}
                  className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none"
                >
                  <option value="0">El mismo día</option>
                  <option value="1">1 día antes</option>
                  <option value="2">2 días antes</option>
                  <option value="3">3 días antes</option>
                  <option value="7">1 semana antes</option>
                  <option value="14">2 semanas antes</option>
                  <option value="30">1 mes antes</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formCompleto}
                  className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center space-x-2 transition ${
                    formCompleto
                      ? 'bg-blue-900 hover:bg-blue-800 text-white shadow-md cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>
                    {formCompleto
                      ? (eventoEditando ? 'Guardar Cambios' : 'Crear Evento')
                      : (fechaEsPasadaYNoConfirmada
                          ? 'Confirma la fecha para continuar'
                          : 'Completa los campos obligatorios')
                    }
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}