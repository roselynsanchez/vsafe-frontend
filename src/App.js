import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, RefreshCw, FileText, PlusCircle, Upload, Users, Cpu, Search,
  ArrowDownLeft, ArrowUpRight, History, Pencil, LogOut, Truck, ShoppingCart, 
  CalendarDays, Bell, X, AlertTriangle, Tags, Trash2
} from 'lucide-react';
import Swal from 'sweetalert2';
import logoVsafe from './logo_vsafe.png';
import ClientesModule from './ClientesModule';
import './App.css';
import ModalMaterial from './ModalMaterial';
import ModuloAnalisisIA from './ModuloAnalisisIA';
import Login from './Login';
import ProveedoresModule from './ProveedoresModule';
import ComprasModule from './ComprasModule';
import CalendarioModule from './CalendarioModule';
import CategoriasModule from './CategoriasModule';

function AppInterno({ usuario, onLogout }) {
  const [busquedaMovimiento, setBusquedaMovimiento] = useState('');
  const [pestanaActiva, setPestanaActiva] = useState('inventario');
  const [materiales, setMateriales] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [cargandoExcel, setCargandoExcel] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalMaterialAbierto, setModalMaterialAbierto] = useState(false);
  const [materialEditando, setMaterialEditando] = useState(null);

  // ============ ESTADOS DE NOTIFICACIONES GLOBALES ============
  const [bannerEvento, setBannerEvento] = useState(null);
  const [notificacionesSilenciadas, setNotificacionesSilenciadas] = useState(() => {
    return localStorage.getItem('vsafe_notif_silenciadas') === 'true';
  });

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    id_material: '',
    tipo_movimiento: 'SALIDA',
    cantidad: '',
    motivo_o_vehiculo: '',
    operario: '',
    numero_requisicion: ''
  });

  // ============ FUNCIONES DE API ============

  const obtenerMateriales = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/materiales');
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setMateriales(lista);
      if (lista.length > 0 && !form.id_material) {
        setForm(prev => ({ ...prev, id_material: lista[0].id_material || '1' }));
      }
    } catch (error) {
      console.error("Error al obtener materiales:", error);
      setMateriales([]);
    }
  };

  const obtenerMovimientos = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/trazabilidad/movimientos');
      const data = await res.json();
      setMovimientos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error obteniendo historial de movimientos:", error);
    }
  };

  const obtenerProximaRequisicion = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/trazabilidad/proxima-requisicion');
      const data = await res.json();
      return data.numero_requisicion;
    } catch (error) {
      console.error('Error al obtener próxima requisición:', error);
      const anio = new Date().getFullYear();
      return `REQ-${anio}-0001`;
    }
  };

  const obtenerPrediccionIA = async () => {
    setCargando(true);
    try {
      await fetch('http://localhost:5001/api/ia/prediccion-stock/1');
    } catch (error) {
      console.error("Error conectando con la IA:", error);
    } finally {
      setCargando(false);
    }
  };

  // ============ ELIMINAR MATERIAL ============
  const eliminarMaterial = async (material) => {
    if (!material) return;

    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar material?',
      html: `
        <div style="text-align: left;">
          <p>Se eliminará permanentemente:</p>
          <p style="font-weight: bold; color: #1e3a8a; margin: 8px 0;">
            ${material.nombre}
          </p>
          <p style="color: #64748b; font-size: 13px;">
            Código: <strong style="font-family: monospace;">${material.codigo_producto || 'N/A'}</strong>
          </p>
          <p style="color: #dc2626; font-size: 13px; margin-top: 12px;">
            ⚠️ Esta acción no se puede deshacer.
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#64748b'
    });

    if (!confirmacion.isConfirmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/materiales/${material.id_material}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Material eliminado',
          text: 'El material fue eliminado correctamente.',
          timer: 1500,
          showConfirmButton: false
        });

        obtenerMateriales();
        obtenerPrediccionIA();
      } else {
        if (data.error && data.error.includes('movimientos')) {
          Swal.fire({
            icon: 'error',
            title: 'No se puede eliminar',
            html: `
              <div style="text-align: left;">
                <p>${data.error}</p>
                <p style="color: #64748b; font-size: 13px; margin-top: 12px;">
                  💡 Este material tiene movimientos en el historial. 
                  Para conservar la trazabilidad, no se puede eliminar.
                </p>
              </div>
            `,
            confirmButtonColor: '#1e3a8a'
          });
        } else {
          Swal.fire('Error', data.error || 'No se pudo eliminar', 'error');
        }
      }
    } catch (error) {
      Swal.fire('Error de conexión', error.message, 'error');
    }
  };

  // ============ EXPONER FUNCIÓN GLOBAL PARA CAMBIAR A COMPRAS ============
  useEffect(() => {
    window.cambiarPestanaACompras = () => setPestanaActiva('compras');
    return () => { delete window.cambiarPestanaACompras; };
  }, []);

  // ============ ESCUCHAR CAMBIOS DE SILENCIO DESDE EL CALENDARIO ============
  useEffect(() => {
    const handler = (e) => {
      setNotificacionesSilenciadas(e.detail.silenciado);
    };
    window.addEventListener('vsafe-notif-changed', handler);
    return () => window.removeEventListener('vsafe-notif-changed', handler);
  }, []);

  // ============ EFECTO INICIAL ============
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    obtenerMateriales();
    obtenerMovimientos();
    obtenerPrediccionIA();

    const inicializar = async () => {
      if (form.tipo_movimiento === 'SALIDA' && !form.numero_requisicion) {
        const nueva = await obtenerProximaRequisicion();
        setForm(prev => ({ ...prev, numero_requisicion: nueva }));
      }
    };
    inicializar();
  }, []);

  // ============ SISTEMA GLOBAL DE NOTIFICACIONES ============
  useEffect(() => {
    if (notificacionesSilenciadas) return;

    const chequearEventos = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/calendario/proximos');
        const data = await res.json();
        if (!data) return;

        const notificados = JSON.parse(localStorage.getItem('vsafe_notificados') || '[]');

        const ahora = new Date();
        const hoyStr = ahora.toISOString().split('T')[0];
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

        const todosEventos = [
          ...(data.hoy || []),
          ...(data.proximos || []),
          ...(data.vencidos || [])
        ];

        const eventosUnicos = Array.from(
          new Map(todosEventos.map(e => [e.id_evento, e])).values()
        );

        for (const ev of eventosUnicos) {
          if (ev.completado) continue;
          if (notificados.includes(ev.id_evento)) continue;

          const fechaEv = String(ev.fecha).substring(0, 10);
          const hoyFecha = new Date();
          hoyFecha.setHours(0, 0, 0, 0);
          const fechaEvento = new Date(fechaEv + 'T00:00:00');
          const diffDias = Math.round((fechaEvento - hoyFecha) / (1000 * 60 * 60 * 24));
          const recordatorio = parseInt(ev.recordatorio_dias, 10) || 1;

          let debeNotificar = false;
          let titulo = '';
          let horaTexto = '';

          if (fechaEv === hoyStr && ev.hora) {
            const [horaEv, minEv] = String(ev.hora).split(':').map(Number);
            const minutosEvento = horaEv * 60 + minEv;
            const minutosFaltantes = minutosEvento - minutosActuales;

            if (minutosFaltantes <= 15 && minutosFaltantes >= -2) {
              debeNotificar = true;
              titulo = minutosFaltantes > 0
                ? `⏰ Evento en ${minutosFaltantes} min`
                : '⏰ Evento AHORA';
              horaTexto = String(ev.hora).substring(0, 5);
            }
          } else if (fechaEv === hoyStr && !ev.hora) {
            debeNotificar = true;
            titulo = '📅 Evento para HOY';
          } else if (diffDias === recordatorio && diffDias > 0) {
            debeNotificar = true;
            titulo = `🔔 Evento en ${diffDias} día${diffDias > 1 ? 's' : ''}`;
          }

          if (debeNotificar) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(titulo, {
                body: ev.titulo + (horaTexto ? ` — ${horaTexto}` : ''),
                icon: '/logo192.png',
                tag: `evento-${ev.id_evento}`,
                requireInteraction: false
              });
            }

            setBannerEvento({ ev, titulo, horaTexto });

            const nuevosNotificados = [...notificados, ev.id_evento];
            localStorage.setItem('vsafe_notificados', JSON.stringify(nuevosNotificados));

            break;
          }
        }

        const idsVigentes = eventosUnicos
          .filter(e => {
            const fecha = new Date(String(e.fecha).substring(0, 10) + 'T00:00:00');
            const diff = (new Date() - fecha) / (1000 * 60 * 60 * 24);
            return diff < 7;
          })
          .map(e => e.id_evento);

        const notificadosLimpios = notificados.filter(id => idsVigentes.includes(id));
        if (notificadosLimpios.length !== notificados.length) {
          localStorage.setItem('vsafe_notificados', JSON.stringify(notificadosLimpios));
        }

      } catch (error) {
        console.error('Error en chequeo de eventos:', error);
      }
    };

    const timerInicial = setTimeout(chequearEventos, 2000);
    const intervalo = setInterval(chequearEventos, 60000);

    return () => {
      clearTimeout(timerInicial);
      clearInterval(intervalo);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificacionesSilenciadas]);

  const listaMateriales = Array.isArray(materiales) ? materiales : [];

  // ============ REGISTRAR MOVIMIENTO ============
  const handleSubmitMovimiento = async (e) => {
    e.preventDefault();

    if (!form.cantidad || !form.operario || !form.id_material) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos Incompletos',
        text: 'Por favor complete todos los campos obligatorios.',
        confirmButtonColor: '#1e3a8a'
      });
      return;
    }

    if (form.tipo_movimiento === 'SALIDA' && !form.numero_requisicion.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Falta Nº de Requisición',
        text: 'Las salidas requieren un número de requisición para autorizar el retiro del material.',
        confirmButtonColor: '#1e3a8a'
      });
      return;
    }

    const materialSeleccionado = listaMateriales.find(
      (m) => String(m.id_material) === String(form.id_material)
    );

    const cantidadSolicitada = parseFloat(form.cantidad);
    const stockDisponible = materialSeleccionado ? parseFloat(materialSeleccionado.cantidad_disponible || 0) : 0;
    const unidadMedida = materialSeleccionado?.unidad_medida === 'N/A' 
      ? 'unidades' 
      : (materialSeleccionado?.unidad_medida || 'unidades');

    if (form.tipo_movimiento === 'SALIDA') {
      if (stockDisponible <= 0) {
        Swal.fire({
          icon: 'error',
          title: 'Sin Stock Disponible',
          text: `El material "${materialSeleccionado?.nombre || 'seleccionado'}" actualmente tiene ${stockDisponible} ${unidadMedida} disponibles en almacén.`,
          confirmButtonColor: '#1e3a8a'
        });
        return;
      }

      if (cantidadSolicitada > stockDisponible) {
        Swal.fire({
          icon: 'warning',
          title: 'Stock Insuficiente',
          text: `Intentas retirar ${cantidadSolicitada} ${unidadMedida}, pero solo hay ${stockDisponible} ${unidadMedida} disponibles en almacén.`,
          confirmButtonColor: '#1e3a8a'
        });
        return;
      }
    }

    try {
      const res = await fetch('http://localhost:5000/api/trazabilidad/movimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Registro Exitoso!',
          text: `Se ha registrado la ${form.tipo_movimiento} de mercancía correctamente.`,
          timer: 2500,
          showConfirmButton: false,
          timerProgressBar: true
        });

        const tipoActual = form.tipo_movimiento;
        setForm({ 
          ...form, 
          cantidad: '', 
          motivo_o_vehiculo: '', 
          operario: '',
          numero_requisicion: ''
        });

        obtenerMateriales();
        obtenerMovimientos();
        obtenerPrediccionIA();

        if (tipoActual === 'SALIDA') {
          setTimeout(async () => {
            const nueva = await obtenerProximaRequisicion();
            setForm(prev => ({ ...prev, numero_requisicion: nueva }));
          }, 300);
        }
      } else {
        const errData = await res.json();
        Swal.fire({
          icon: 'error',
          title: 'Error al procesar',
          text: errData.error || 'No se pudo registrar el movimiento.',
          confirmButtonColor: '#1e3a8a'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Ocurrió un fallo al intentar conectar con el servidor backend.',
        confirmButtonColor: '#1e3a8a'
      });
    }
  };

  // ============ CAMBIAR TIPO DE MOVIMIENTO ============
  const cambiarTipoMovimiento = async (tipo) => {
    if (tipo === 'ENTRADA') {
      setForm({ ...form, tipo_movimiento: 'ENTRADA', numero_requisicion: '' });
    } else {
      const nueva = await obtenerProximaRequisicion();
      setForm({ ...form, tipo_movimiento: 'SALIDA', numero_requisicion: nueva });
    }
  };

  // ============ SUBIR EXCEL ============
  const handleSubirExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('archivoExcel', file);

    setCargandoExcel(true);
    try {
      const res = await fetch('http://localhost:5000/api/excel/cargar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: '¡Carga Exitosa!',
          text: data.mensaje || 'Archivo procesado correctamente.',
          confirmButtonColor: '#1e3a8a'
        });
        obtenerMateriales();
        obtenerMovimientos();
        obtenerPrediccionIA();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error en archivo',
          text: data.error || 'No se pudo procesar el Excel.',
          confirmButtonColor: '#1e3a8a'
        });
      }
    } catch (error) {
      console.error("Error al subir el Excel:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Ocurrió un error al cargar el archivo Excel.',
        confirmButtonColor: '#1e3a8a'
      });
    } finally {
      setCargandoExcel(false);
      e.target.value = '';
    }
  };

  // ============ FILTROS ============
  const materialesFiltrados = (Array.isArray(listaMateriales) ? listaMateriales : [])
    .filter(item => item && typeof item === 'object')
    .filter(item => {
      const termino = (busqueda || '').toLowerCase();
      const nombre = String(item?.nombre ?? item?.M_ID ?? item?.codigo_lote ?? '').toLowerCase();
      const lote = String(item?.codigo_lote ?? item?.id_material ?? '').toLowerCase();
      return nombre.includes(termino) || lote.includes(termino);
    });

  const movimientosFiltrados = (Array.isArray(movimientos) ? movimientos : [])
    .filter(m => m && typeof m === 'object')
    .filter(m => {
      if (!busquedaMovimiento) return true;
      const t = busquedaMovimiento.toLowerCase();
      return String(m.numero_requisicion ?? '').toLowerCase().includes(t)
          || String(m.material ?? '').toLowerCase().includes(t)
          || String(m.operario ?? '').toLowerCase().includes(t)
          || String(m.detalle ?? '').toLowerCase().includes(t);
    });

  const datosGrafico = (Array.isArray(listaMateriales) ? listaMateriales : [])
    .filter(m => m && typeof m === 'object' && parseFloat(m?.cantidad_disponible) > 0)
    .sort((a, b) => 
      parseFloat(b?.cantidad_disponible ?? 0) - parseFloat(a?.cantidad_disponible ?? 0)
    )
    .slice(0, 12)
    .map(m => {
      const nombreValido = String(m?.nombre ?? m?.M_ID ?? 'Material');
      return {
        nombre: nombreValido.length > 12 
          ? `${nombreValido.substring(0, 12)}...` 
          : nombreValido,
        Stock: parseFloat(m?.cantidad_disponible ?? 0)
      };
    });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-6 md:p-8">

      {/* ============ BANNER FLOTANTE DE EVENTO PRÓXIMO ============ */}
      {bannerEvento && !notificacionesSilenciadas && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md animate-slide-in">
          <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white rounded-2xl shadow-2xl border-l-4 border-amber-400 p-4 flex items-start space-x-3">
            <div className="bg-amber-400 p-2 rounded-xl flex-shrink-0">
              <Bell className="h-5 w-5 text-blue-950 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm uppercase tracking-wide text-amber-300">
                {bannerEvento.titulo}
              </p>
              <p className="font-bold text-base mt-1 truncate">
                {bannerEvento.ev.titulo}
              </p>
              {bannerEvento.ev.descripcion && (
                <p className="text-xs text-blue-200 mt-1 line-clamp-2">
                  {bannerEvento.ev.descripcion}
                </p>
              )}
              <div className="flex items-center space-x-3 mt-2 text-xs text-blue-200">
                <span>
                  📅 {new Date(String(bannerEvento.ev.fecha).substring(0, 10) + 'T00:00:00').toLocaleDateString('es-ES', { 
                    day: '2-digit', month: 'short' 
                  })}
                </span>
                {bannerEvento.ev.hora && (
                  <span>🕐 {String(bannerEvento.ev.hora).substring(0, 5)}</span>
                )}
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <button
                  onClick={() => {
                    setPestanaActiva('calendario');
                    setBannerEvento(null);
                  }}
                  className="bg-white text-blue-900 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                >
                  Ver calendario
                </button>
                <button
                  onClick={() => setBannerEvento(null)}
                  className="text-blue-200 hover:text-white font-bold text-xs px-3 py-1.5 rounded-lg transition"
                >
                  Descartar
                </button>
              </div>
            </div>
            <button 
              onClick={() => setBannerEvento(null)}
              className="text-blue-200 hover:text-white p-1 rounded-lg transition flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl shadow-md border-l-8 border-blue-900 mb-6 gap-4">
        <div className="flex items-center space-x-6">
          <div className="bg-slate-900 p-2.5 rounded-2xl shadow-lg border-2 border-slate-700 flex items-center justify-center">
            <img 
              src={logoVsafe} 
              alt="Logo VSAFE BLINDAJES" 
              className="h-16 w-auto object-contain rounded-xl"
              onError={(e) => { e.target.style.display = 'none'; }} 
            />
          </div>

          <div>
            <h1 className="text-3xl font-black text-blue-950 tracking-wide">
              VSAFE BLINDAJES S.A.
            </h1>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Sistema de Gestión, Trazabilidad e Inteligencia Balística
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleSubirExcel} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />

          <button 
            onClick={() => { setMaterialEditando(null); setModalMaterialAbierto(true); }}
            className="flex items-center space-x-2 bg-blue-800 hover:bg-blue-700 text-white font-bold text-sm px-4 py-3 rounded-xl shadow transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nuevo Material</span>
          </button>

          <button 
            onClick={() => fileInputRef.current && fileInputRef.current.click()} 
            disabled={cargandoExcel}
            className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold text-sm px-4 py-3 rounded-xl shadow transition"
          >
            <Upload className={`h-4 w-4 ${cargandoExcel ? 'animate-bounce' : ''}`} />
            <span>{cargandoExcel ? 'Cargando...' : 'Cargar Excel'}</span>
          </button>

          <button 
            onClick={() => {
              const reporte = document.getElementById('reporte-imprimible');
              if (reporte) {
                reporte.style.display = 'block';
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    reporte.style.display = 'none';
                  }, 100);
                }, 100);
              }
            }} 
            className="flex items-center space-x-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm px-4 py-3 rounded-xl shadow transition"
          >
            <FileText className="h-4 w-4" />
            <span>Imprimir Reporte</span>
          </button>
        </div>

        <div className="flex items-center space-x-3 md:pl-4 md:border-l-2 border-slate-200">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900">{usuario?.nombre_completo}</p>
            <p className="text-xs text-slate-500 uppercase">{usuario?.rol}</p>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-3 rounded-xl shadow transition"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Navegación por pestañas */}
      <nav className="flex bg-white rounded-xl shadow-md overflow-hidden mb-8 border border-slate-200 overflow-x-auto">
        <button
          onClick={() => setPestanaActiva('inventario')}
          className={`flex-1 min-w-[150px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'inventario'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Package className="h-5 w-5" />
          <span>Gestión e Inventario</span>
        </button>

        <button
          onClick={() => setPestanaActiva('movimientos')}
          className={`flex-1 min-w-[180px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'movimientos'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <History className="h-5 w-5" />
          <span>Historial de Entradas/Salidas</span>
        </button>

        <button
          onClick={() => setPestanaActiva('analisis')}
          className={`flex-1 min-w-[130px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'analisis'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Cpu className="h-5 w-5" />
          <span>Análisis IA</span>
        </button>

        <button
          onClick={() => setPestanaActiva('clientes')}
          className={`flex-1 min-w-[120px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'clientes'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-5 w-5" />
          <span>Clientes</span>
        </button>

        <button
          onClick={() => setPestanaActiva('proveedores')}
          className={`flex-1 min-w-[140px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'proveedores'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Truck className="h-5 w-5" />
          <span>Proveedores</span>
        </button>

        <button
          onClick={() => setPestanaActiva('compras')}
          className={`flex-1 min-w-[130px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'compras'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="h-5 w-5" />
          <span>Compras</span>
        </button>

        <button
          onClick={() => setPestanaActiva('calendario')}
          className={`flex-1 min-w-[130px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'calendario'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span>Agenda</span>
        </button>

        <button
          onClick={() => setPestanaActiva('categorias')}
          className={`flex-1 min-w-[130px] flex items-center justify-center space-x-2 py-4 font-bold text-sm transition-all ${
            pestanaActiva === 'categorias'
              ? 'bg-blue-900 text-white border-b-4 border-amber-400'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Tags className="h-5 w-5" />
          <span>Categorías</span>
        </button>
      </nav>

      {/* ============ REPORTE IMPRIMIBLE ============ */}
      <div id="reporte-imprimible" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #1e3a8a', paddingBottom: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <img src={logoVsafe} alt="VSAFE" style={{ height: '70px', width: 'auto' }} />
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                VSAFE BLINDAJES S.A.
              </h1>
              <p style={{ fontSize: '11px', color: '#475569', margin: 0 }}>
                Sistema de Gestión, Trazabilidad e Inteligencia Balística
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>REPORTE DE INVENTARIO</p>
            <p style={{ margin: 0 }}>Fecha: {new Date().toLocaleDateString('es-ES')}</p>
            <p style={{ margin: 0 }}>Hora: {new Date().toLocaleTimeString('es-ES')}</p>
          </div>
        </div>

        <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '10px' }}>
          ESTADO ACTUAL DEL ALMACÉN ({materialesFiltrados.length} materiales)
        </h2>

        <table>
          <thead>
            <tr>
              <th style={{ width: '50px' }}>ID</th>
              <th>Código Producto</th>
              <th>Código Lote</th>
              <th>Material / Descripción</th>
              <th style={{ width: '85px' }}>Nivel Bal.</th>
              <th style={{ width: '70px' }}>Stock</th>
              <th style={{ width: '55px' }}>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {materialesFiltrados.map((m, i) => (
              <tr key={m?.id_material || i}>
                <td>{m?.id_material || i + 1}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                  {m?.codigo_producto || 'N/A'}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '9px' }}>
                  {m?.codigo_lote || 'N/A'}
                </td>
                <td>
                  <div style={{ fontWeight: 'bold' }}>{m?.nombre || 'Sin nombre'}</div>
                  {m?.descripcion && (
                    <div style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic' }}>
                      {m.descripcion}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>{m?.nivel_balistico || 'N/A'}</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  {m?.cantidad_disponible ?? 0}
                </td>
                <td style={{ textAlign: 'center' }}>{m?.unidad_medida || 'UNID'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '30px', paddingTop: '15px', borderTop: '1px solid #cbd5e1', fontSize: '10px', color: '#64748b', textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Documento generado automáticamente por el Sistema VSAFE</p>
          <p style={{ margin: 0 }}>VSAFE BLINDAJES S.A. - Todos los derechos reservados</p>
        </div>
      </div>

      {/* PESTAÑA 1: INVENTARIO & REGISTRO */}
      {pestanaActiva === 'inventario' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md h-fit">
            <div className="flex items-center space-x-2 mb-4 border-b border-slate-200 pb-3">
              <PlusCircle className="h-6 w-6 text-blue-900" />
              <h2 className="text-xl font-bold text-slate-900">
                {form.tipo_movimiento === 'ENTRADA' ? '📥 Registrar Entrada' : '📤 Registrar Salida'}
              </h2>
            </div>

            <p className="text-xs text-slate-500 mb-4 -mt-2">
              {form.tipo_movimiento === 'ENTRADA' 
                ? 'Suma stock al material (compra, devolución, ajuste)'
                : 'Resta stock del material (consumo, uso en vehículo, ajuste)'}
            </p>
            
            <form onSubmit={handleSubmitMovimiento} className="space-y-4 text-sm font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Tipo de Operación</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cambiarTipoMovimiento('ENTRADA')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 border transition ${
                      form.tipo_movimiento === 'ENTRADA'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>Entrada (Compra)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cambiarTipoMovimiento('SALIDA')}
                    className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center space-x-1 border transition ${
                      form.tipo_movimiento === 'SALIDA'
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>Salida (Consumo)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Material / Insumo <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  {listaMateriales.length === 0 
                    ? '⚠️ No hay materiales en el sistema. Primero da de alta uno con "Nuevo Material".'
                    : `${listaMateriales.length} materiales disponibles`}
                </p>
                <select 
                  value={form.id_material}
                  onChange={(e) => setForm({ ...form, id_material: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none"
                >
                  {(Array.isArray(listaMateriales) ? listaMateriales : [])
                    .filter(m => m && typeof m === 'object' && m.id_material)
                    .map((m) => (
                      <option key={m.id_material} value={m.id_material}>
                        {String(m.nombre ?? m.codigo_lote ?? 'Material')} ({m.cantidad_disponible ?? 0} dispon.)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ej. 10.00"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nº de Requisición {form.tipo_movimiento === 'SALIDA' && <span className="text-red-500">*</span>}
                </label>
                <input 
                  type="text" 
                  placeholder={form.tipo_movimiento === 'SALIDA' ? "Generando..." : "No aplica para entradas"}
                  value={form.numero_requisicion}
                  readOnly
                  className={`w-full border rounded-lg p-3 font-mono font-bold tracking-wider focus:outline-none cursor-not-allowed ${
                    form.tipo_movimiento === 'SALIDA' 
                      ? 'text-blue-900 bg-blue-50 border-blue-300'
                      : 'text-slate-400 bg-slate-100 border-slate-200'
                  }`}
                />
                {form.tipo_movimiento === 'SALIDA' && form.numero_requisicion && (
                  <p className="text-xs text-blue-700 font-medium mt-1">
                    ✅ Generado automáticamente · Único para esta salida
                  </p>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Detalle / Vehículo / Motivo</label>
                <input 
                  type="text" 
                  placeholder={form.tipo_movimiento === 'SALIDA' ? "Ej. Toyota Prado - VIN 8X9AB..." : "Ej. Compra Proveedor #402"}
                  value={form.motivo_o_vehiculo}
                  onChange={(e) => setForm({ ...form, motivo_o_vehiculo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Operario Responsable <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Ej. Carlos Pérez"
                  value={form.operario}
                  onChange={(e) => setForm({ ...form, operario: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-900 font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none"
                />
              </div>

              <button 
                type="submit" 
                className={`w-full font-bold text-base p-3.5 rounded-lg shadow transition mt-4 text-white ${
                  form.tipo_movimiento === 'ENTRADA' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-blue-900 hover:bg-blue-800'
                }`}
              >
                Guardar {form.tipo_movimiento}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Estado del Almacén</h2>
              
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar material..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-800 w-60"
                  />
                </div>

                <button 
                  onClick={() => { obtenerPrediccionIA(); obtenerMateriales(); obtenerMovimientos(); }}
                  className="text-sm font-bold text-blue-900 hover:text-blue-700 flex items-center space-x-1 border border-slate-300 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
                >
                  <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline">Sincronizar</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-200 text-slate-600 font-bold uppercase text-xs">
                  <tr>
                    <th className="p-3">Material / Insumo</th>
                    <th className="p-3">Lote / ID</th>
                    <th className="p-3">Nivel Balístico</th>
                    <th className="p-3">Stock Actual</th>
                    <th className="p-3">Unidad</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {materialesFiltrados.length > 0 ? (
                    materialesFiltrados.map((item, index) => {
                      if (!item) return null;
                      return (
                        <tr key={item.id_material ?? index} className="hover:bg-slate-50 font-medium">
                          <td className="p-3 font-bold text-slate-900">
                            {String(item.nombre ?? item.codigo_lote ?? 'Sin Descripción')}
                          </td>
                          <td className="p-3 text-blue-900 font-mono font-bold">
                            {String(item.codigo_lote ?? item.id_material ?? 'N/A')}
                          </td>
                          <td className="p-3">
                            <span className="bg-slate-100 border border-slate-300 px-2.5 py-1 rounded text-slate-700 font-bold text-xs">
                              {String(item.nivel_balistico ?? 'N/A')}
                            </span>
                          </td>
                          <td className="p-3 text-base font-black text-slate-900">
                            {item.cantidad_disponible ?? '0.00'}
                          </td>
                          <td className="p-3 text-slate-600 font-bold">
                            {item.unidad_medida === 'N/A' 
                              ? <span className="text-slate-400 italic text-xs">N/A</span>
                              : String(item.unidad_medida ?? 'UNID')}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-1">
                              <button
                                onClick={() => { setMaterialEditando(item); setModalMaterialAbierto(true); }}
                                className="text-blue-800 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition"
                                title="Editar material"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => eliminarMaterial(item)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition"
                                title="Eliminar material"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-6 text-center text-slate-500 font-medium">
                        No hay materiales para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* PESTAÑA 2: HISTORIAL DE MOVIMIENTOS */}
      {pestanaActiva === 'movimientos' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6 border-b border-slate-200 pb-4">
            <div className="flex items-center space-x-2">
              <History className="h-6 w-6 text-blue-900" />
              <h2 className="text-xl font-bold text-slate-900">Historial de Entradas y Salidas</h2>
            </div>
            
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-initial">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por requisición, material u operario..."
                  value={busquedaMovimiento}
                  onChange={(e) => setBusquedaMovimiento(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-800 w-full md:w-80"
                />
              </div>
              <button 
                onClick={obtenerMovimientos}
                className="text-sm font-bold text-blue-900 hover:text-blue-700 flex items-center space-x-1 border border-slate-300 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 border-b-2 border-slate-200 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Nº Requisición</th>
                  <th className="p-3">Material</th>
                  <th className="p-3">Cantidad</th>
                  <th className="p-3">Detalle / Vehículo</th>
                  <th className="p-3">Operario</th>
                  <th className="p-3">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {movimientosFiltrados.length > 0 ? (
                  movimientosFiltrados.map((m, index) => (
                    <tr key={m.id || index} className="hover:bg-slate-50 font-medium">
                      <td className="p-3">
                        {m.tipo === 'ENTRADA' ? (
                          <span className="inline-flex items-center space-x-1 bg-emerald-100 border border-emerald-300 text-emerald-800 px-2.5 py-1 rounded-full font-bold text-xs">
                            <ArrowDownLeft className="h-3 w-3" />
                            <span>ENTRADA</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 bg-red-100 border border-red-300 text-red-800 px-2.5 py-1 rounded-full font-bold text-xs">
                            <ArrowUpRight className="h-3 w-3" />
                            <span>SALIDA</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {m.numero_requisicion ? (
                          <span className="bg-blue-100 text-blue-800 font-mono font-bold text-xs px-2 py-1 rounded">
                            {m.numero_requisicion}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{m.material}</td>
                      <td className={`p-3 font-black text-base ${m.tipo === 'ENTRADA' ? 'text-emerald-700' : 'text-red-700'}`}>
                        {m.tipo === 'ENTRADA' ? `+${m.cantidad}` : `-${m.cantidad}`}
                      </td>
                      <td className="p-3 text-slate-600">{m.detalle || 'N/A'}</td>
                      <td className="p-3 font-semibold text-slate-800">{m.operario || 'Sistema'}</td>
                      <td className="p-3 text-xs text-slate-500 font-mono">
                        {m.fecha ? new Date(m.fecha).toLocaleString() : 'Reciente'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-6 text-center text-slate-500 font-medium">
                      {busquedaMovimiento
                        ? 'No se encontraron movimientos con ese criterio de búsqueda.'
                        : 'No hay registros de movimientos aún. Registra una entrada o salida desde la pestaña de inventario.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: ANÁLISIS IA */}
      {pestanaActiva === 'analisis' && (
        <ModuloAnalisisIA 
          listaMateriales={listaMateriales} 
          datosGrafico={datosGrafico} 
        />
      )}

      {/* PESTAÑA 4: CLIENTES */}
      {pestanaActiva === 'clientes' && (
        <ClientesModule />
      )}

      {/* PESTAÑA 5: PROVEEDORES */}
      {pestanaActiva === 'proveedores' && (
        <ProveedoresModule />
      )}

      {/* PESTAÑA 6: COMPRAS */}
      {pestanaActiva === 'compras' && (
        <ComprasModule />
      )}

      {/* PESTAÑA 7: AGENDA */}
      {pestanaActiva === 'calendario' && (
        <CalendarioModule />
      )}

      {/* PESTAÑA 8: CATEGORÍAS */}
      {pestanaActiva === 'categorias' && (
        <CategoriasModule />
      )}

      {/* MODAL DE MATERIAL */}
      {modalMaterialAbierto && (
        <ModalMaterial 
          materialEditar={materialEditando}
          onClose={() => { setModalMaterialAbierto(false); setMaterialEditando(null); }}
          onGuardado={() => { obtenerMateriales(); obtenerPrediccionIA(); }}
        />
      )}

    </div>
  );
}

function App() {
  const [usuario, setUsuario] = useState(() => {
    const u = localStorage.getItem('vsafe_usuario');
    return u ? JSON.parse(u) : null;
  });

  const handleLogout = () => {
    Swal.fire({
      title: '¿Cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    }).then((r) => {
      if (r.isConfirmed) {
        localStorage.removeItem('vsafe_token');
        localStorage.removeItem('vsafe_usuario');
        setUsuario(null);
      }
    });
  };

  if (!usuario) {
    return <Login onLogin={setUsuario} />;
  }

  return <AppInterno usuario={usuario} onLogout={handleLogout} />;
}

export default App;