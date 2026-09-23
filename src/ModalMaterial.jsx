import React, { useState, useEffect } from 'react';
import { Package, PlusCircle, AlertCircle, CheckCircle2, X, Save, Sparkles, Info, Mail, Edit3, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';

const NIVELES_BALISTICOS = [
  'NIJ II-A', 'NIJ II', 'NIJ III-A', 'NIJ III', 'NIJ IV',
  'CEN 1063 BR2', 'CEN 1063 BR4', 'CEN 1063 BR6', 'N/A'
];

const UNIDADES = ['m2', 'm²', 'kg', 'unidades', 'litros', 'metros', 'rollos', 'N/A'];

// InputField movido fuera para evitar re-mount en cada tecleo
const InputField = ({ label, required, value, onChange, placeholder, tipo = 'text', valido, mensajeError, min, step, esEdicion }) => {
  const [tocado, setTocado] = useState(!!esEdicion);
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
          min={min}
          step={step}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTocado(true)}
          className={`w-full border-2 rounded-lg p-3 pr-10 text-sm font-medium transition focus:outline-none ${
            mostrarError
              ? 'border-red-300 bg-red-50 focus:border-red-500'
              : mostrarOk
                ? 'border-emerald-300 bg-emerald-50/30 focus:border-emerald-500'
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

export default function ModalMaterial({ materialEditar, onClose, onGuardado }) {
  const [categorias, setCategorias] = useState([]);
  const [codigoAutogenerado, setCodigoAutogenerado] = useState('');
  const [cargandoCodigo, setCargandoCodigo] = useState(false);
  const [modoManual, setModoManual] = useState(false);

  const [form, setForm] = useState({
    codigo_producto: '',
    codigo_lote: '',
    id_categoria: '',
    nombre: '',
    descripcion: '',
    nivel_balistico: '',
    cantidad_disponible: 0,
    stock_minimo: 15,
    email_alerta: '',
    email_alerta_2: '',
    email_alerta_3: '',
    unidad_medida: 'm2',
    fecha_ingreso: new Date().toISOString().split('T')[0],
    tiempo_proveedor_dias: 3
  });

  const esEdicion = !!materialEditar;

  // ============ CARGAR CATEGORÍAS Y DATOS INICIALES ============
  useEffect(() => {
    fetch('http://localhost:5000/api/categorias')
      .then(r => r.json())
      .then(d => setCategorias(Array.isArray(d) ? d : []))
      .catch(() => setCategorias([]));

    if (materialEditar) {
      setForm({
        codigo_producto: materialEditar.codigo_producto || '',
        codigo_lote: materialEditar.codigo_lote || '',
        id_categoria: materialEditar.id_categoria || '',
        nombre: materialEditar.nombre || '',
        descripcion: materialEditar.descripcion || '',
        nivel_balistico: materialEditar.nivel_balistico || '',
        cantidad_disponible: materialEditar.cantidad_disponible ?? 0,
        stock_minimo: materialEditar.stock_minimo ?? 15,
        email_alerta: materialEditar.email_alerta || '',
        email_alerta_2: materialEditar.email_alerta_2 || '',
        email_alerta_3: materialEditar.email_alerta_3 || '',
        unidad_medida: materialEditar.unidad_medida || 'm2',
        fecha_ingreso: materialEditar.fecha_ingreso 
          ? materialEditar.fecha_ingreso.substring(0, 10) 
          : new Date().toISOString().split('T')[0],
        tiempo_proveedor_dias: materialEditar.tiempo_proveedor_dias || 3
      });
      setCodigoAutogenerado(materialEditar.codigo_producto || '');
      setModoManual(false);
    } else {
      setModoManual(false);
    }
  }, [materialEditar]);

  // ============ AUTOGENERAR CÓDIGO AL CAMBIAR CATEGORÍA ============
  const autogenerarCodigo = async (idCategoria) => {
    if (esEdicion) return;
    if (!idCategoria) {
      setCodigoAutogenerado('');
      setForm(prev => ({ ...prev, codigo_producto: '', codigo_lote: '' }));
      return;
    }

    setCargandoCodigo(true);
    try {
      const categoria = categorias.find(c => String(c.id_categoria) === String(idCategoria));
      if (!categoria || !categoria.prefijo) {
        setCodigoAutogenerado('');
        setForm(prev => ({ ...prev, codigo_producto: '', codigo_lote: '' }));
        return;
      }

      const res = await fetch('http://localhost:5000/api/materiales');
      const mats = await res.json();
      const lista = Array.isArray(mats) ? mats : [];

      const prefijo = categoria.prefijo.toUpperCase();
      const numeros = lista
        .filter(m => m.codigo_producto && m.codigo_producto.toUpperCase().startsWith(`${prefijo}-`))
        .map(m => {
          const partes = m.codigo_producto.split('-');
          const num = parseInt(partes[1], 10);
          return isNaN(num) ? 0 : num;
        });

      const siguiente = numeros.length > 0 ? Math.max(...numeros) + 1 : 1;
      const nuevoCodigo = `${prefijo}-${String(siguiente).padStart(4, '0')}`;

      setCodigoAutogenerado(nuevoCodigo);
      setModoManual(false);
      setForm(prev => ({ 
        ...prev, 
        codigo_producto: nuevoCodigo,
        codigo_lote: nuevoCodigo
      }));

    } catch (error) {
      console.error('Error autogenerando código:', error);
    } finally {
      setCargandoCodigo(false);
    }
  };

  const manejarCambioCategoria = (idCategoria) => {
    setForm(prev => ({ ...prev, id_categoria: idCategoria }));
    autogenerarCodigo(idCategoria);
  };

  // ============ CAMBIO MANUAL DE CÓDIGO ============
  const manejarCambioCodigoProducto = (valor) => {
    if (esEdicion) return;
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
    setForm(prev => ({ ...prev, codigo_producto: limpio }));
    
    if (limpio !== codigoAutogenerado) {
      setModoManual(true);
    }
  };

  const manejarCambioCodigoLote = (valor) => {
    if (esEdicion) return;
    const limpio = valor.toUpperCase().replace(/[^A-Z0-9\-_]/g, '');
    setForm(prev => ({ ...prev, codigo_lote: limpio }));
    
    if (limpio !== form.codigo_producto) {
      setModoManual(true);
    }
  };

  // ============ VOLVER A MODO AUTO ============
  const volverAAuto = async () => {
    if (!form.id_categoria) {
      Swal.fire({
        icon: 'info',
        title: 'Selecciona una categoría',
        text: 'Para autogenerar el código necesitas elegir una categoría primero.',
        confirmButtonColor: '#1e3a8a'
      });
      return;
    }
    await autogenerarCodigo(form.id_categoria);
  };

  // ============ VALIDACIONES ============
  const validar = () => ({
    codigo_producto: form.codigo_producto.trim().length >= 3,
    codigo_lote: form.codigo_lote.trim().length >= 3,
    id_categoria: form.id_categoria !== '',
    nombre: form.nombre.trim().length >= 3,
    nivel_balistico: form.nivel_balistico.trim() !== '',
    cantidad_disponible: true,
    stock_minimo: form.stock_minimo !== '' && parseFloat(form.stock_minimo) >= 0,
    email_alerta: form.email_alerta === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_alerta),
    email_alerta_2: form.email_alerta_2 === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_alerta_2),
    email_alerta_3: form.email_alerta_3 === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_alerta_3),
    unidad_medida: form.unidad_medida.trim() !== '',
    tiempo_proveedor_dias: 
      form.tiempo_proveedor_dias === 'N/A' 
        || parseInt(form.tiempo_proveedor_dias) > 0,
    descripcion: form.descripcion === '' || form.descripcion.trim().length >= 5
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
        text: 'Completa los campos obligatorios correctamente.', 
        confirmButtonColor: '#1e3a8a' 
      });
      return;
    }

    try {
      const url = esEdicion 
        ? `http://localhost:5000/api/materiales/${materialEditar.id_material}`
        : 'http://localhost:5000/api/materiales';
      const method = esEdicion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (res.ok) {
        Swal.fire({ 
          icon: 'success', 
          title: esEdicion ? 'Material actualizado' : 'Material registrado',
          html: !esEdicion && data.codigo_generado 
            ? `<p style="color: #64748b; font-size: 14px;">Código asignado: <strong style="color: #1e3a8a; font-family: monospace;">${data.codigo_generado}</strong></p>
               <p style="color: #64748b; font-size: 12px; margin-top: 10px;">💡 Para sumar stock, usa <strong>"Registrar Movimiento"</strong></p>`
            : null,
          timer: 2000, 
          showConfirmButton: false 
        });
        onGuardado();
        onClose();
      } else {
        Swal.fire('Error', data.error || 'No se pudo guardar', 'error');
      }
    } catch (error) {
      Swal.fire('Error de conexión', error.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-950 to-blue-800 rounded-t-2xl">
          <div className="flex items-center space-x-3 text-white">
            <div className="bg-white/10 p-2.5 rounded-xl">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black">
                {esEdicion ? '✏️ Editar Material' : '➕ Registrar Material Nuevo'}
              </h2>
              <p className="text-blue-200 text-xs">
                {esEdicion 
                  ? 'Actualiza los datos del material'
                  : 'El código se autogenera o lo escribes manual'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-lg transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Aviso informativo (solo al crear nuevo) */}
        {!esEdicion && (
          <div className="px-6 pt-4">
            <div className="p-3 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-bold">Puedes autogenerar el código o escribirlo manualmente.</p>
                <p className="mt-1">
                  Elige una categoría para <strong>autogenerar</strong>, o escribe tu propio código. 
                  Si el material <strong>ya existe</strong>, usa <strong>"Registrar Movimiento" → Entrada</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={guardar} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">

          {/* Categoría */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              value={form.id_categoria}
              onChange={(e) => manejarCambioCategoria(e.target.value)}
              className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none"
            >
              <option value="">Seleccione una categoría...</option>
              {categorias.map(c => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nombre} {c.prefijo ? `(${c.prefijo})` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              La categoría determina el prefijo del código del producto
            </p>
          </div>

          {/* Código Producto */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                Código Producto <span className="text-red-500">*</span>
                {!esEdicion && !modoManual && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                {!esEdicion && modoManual && <Edit3 className="h-3.5 w-3.5 text-blue-600" />}
              </span>
              {!esEdicion && modoManual && form.id_categoria && (
                <button
                  type="button"
                  onClick={volverAAuto}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center space-x-1"
                  title="Volver a generar automáticamente"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>AUTO</span>
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.codigo_producto}
                onChange={(e) => manejarCambioCodigoProducto(e.target.value)}
                readOnly={esEdicion}
                placeholder={cargandoCodigo ? 'Generando...' : 'Ej. ACE-0001'}
                className={`w-full border-2 rounded-lg p-3 pr-20 font-mono font-bold tracking-wider focus:outline-none transition ${
                  esEdicion
                    ? 'border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed'
                    : cargandoCodigo
                      ? 'border-slate-200 bg-slate-100 text-slate-400'
                      : modoManual
                        ? 'border-blue-400 bg-blue-50 text-blue-900 focus:border-blue-600'
                        : form.codigo_producto
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-800 focus:bg-white'
                }`}
              />
              
              {esEdicion && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black bg-slate-500 text-white px-2 py-1 rounded">
                  FIJO
                </span>
              )}
              {!esEdicion && form.codigo_producto && !cargandoCodigo && !modoManual && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black bg-emerald-600 text-white px-2 py-1 rounded">
                  AUTO
                </span>
              )}
              {!esEdicion && modoManual && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded">
                  MANUAL
                </span>
              )}
            </div>
            {!esEdicion && (
              <p className={`text-xs font-medium mt-1 ${
                v.codigo_producto 
                  ? (modoManual ? 'text-blue-700' : 'text-emerald-700')
                  : 'text-slate-500'
              }`}>
                {!v.codigo_producto 
                  ? 'Mínimo 3 caracteres'
                  : modoManual 
                    ? '✏️ Editado manualmente — puedes cambiarlo' 
                    : '✨ Generado automáticamente — puedes editarlo'
                }
              </p>
            )}
          </div>

          {/* Código Lote */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center justify-between">
              <span className="flex items-center space-x-1">
                Código de Lote <span className="text-red-500">*</span>
                {!esEdicion && !modoManual && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                {!esEdicion && modoManual && <Edit3 className="h-3.5 w-3.5 text-blue-600" />}
              </span>
              {!esEdicion && modoManual && form.codigo_producto && form.codigo_lote !== form.codigo_producto && (
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, codigo_lote: prev.codigo_producto }))}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                  title="Copiar del código producto"
                >
                  = usar C.P.
                </button>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.codigo_lote}
                onChange={(e) => manejarCambioCodigoLote(e.target.value)}
                readOnly={esEdicion}
                placeholder="Ej. ACE-0001"
                className={`w-full border-2 rounded-lg p-3 pr-20 font-mono font-bold tracking-wider focus:outline-none transition ${
                  esEdicion
                    ? 'border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed'
                    : modoManual
                      ? 'border-blue-400 bg-blue-50 text-blue-900 focus:border-blue-600'
                      : form.codigo_lote
                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-800 focus:border-blue-800 focus:bg-white'
                }`}
              />
              
              {esEdicion && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black bg-slate-500 text-white px-2 py-1 rounded">
                  FIJO
                </span>
              )}
              {!esEdicion && form.codigo_lote && !modoManual && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black bg-blue-700 text-white px-2 py-1 rounded">
                  AUTO
                </span>
              )}
              {!esEdicion && modoManual && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded">
                  MANUAL
                </span>
              )}
            </div>
            {!esEdicion && (
              <p className="text-xs font-medium mt-1 text-slate-500">
                {!v.codigo_lote 
                  ? 'Mínimo 3 caracteres'
                  : 'Normalmente coincide con el Código Producto'
                }
              </p>
            )}
          </div>

          {/* Nombre del Material */}
          <div className="md:col-span-2">
            <InputField 
              label="Nombre del Material" 
              required 
              placeholder="Ej. Acero Armox 500T 4mm" 
              value={form.nombre} 
              onChange={v => setForm(prev => ({...prev, nombre: v}))} 
              valido={v.nombre} 
              mensajeError="Mínimo 3 caracteres"
              esEdicion={esEdicion}
            />
          </div>

          {/* Descripción */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Descripción
            </label>
            <textarea
              rows="2"
              placeholder="Ej. Plancha de acero balístico para blindaje automotriz nivel NIJ III-A"
              value={form.descripcion}
              onChange={(e) => setForm(prev => ({...prev, descripcion: e.target.value}))}
              className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none resize-none"
            />
          </div>

          {/* Nivel Balístico */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Nivel Balístico <span className="text-red-500">*</span>
            </label>
            <select
              value={form.nivel_balistico}
              onChange={(e) => setForm(prev => ({...prev, nivel_balistico: e.target.value}))}
              className={`w-full border-2 rounded-lg p-3 text-sm font-medium focus:outline-none ${
                v.nivel_balistico ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 focus:border-blue-800'
              }`}
            >
              <option value="">Seleccione nivel...</option>
              {NIVELES_BALISTICOS.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          {/* Stock Inicial */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Stock Inicial <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.cantidad_disponible}
              onChange={(e) => setForm(prev => ({...prev, cantidad_disponible: e.target.value}))}
              className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              💡 Deja en <strong>0</strong> si aún no tienes stock.
            </p>
          </div>

          {/* Stock Mínimo */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Stock Mínimo (alerta) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="15"
              value={form.stock_minimo}
              onChange={(e) => setForm(prev => ({ ...prev, stock_minimo: e.target.value }))}
              className={`w-full border-2 rounded-lg p-3 text-sm font-medium focus:outline-none ${
                v.stock_minimo ? 'border-emerald-300 bg-emerald-50/30' : 'border-red-300 bg-red-50'
              }`}
            />
            <p className="text-xs text-amber-600 font-medium mt-1">
              ⚠️ Se enviará un correo cuando el stock baje de este valor
            </p>
          </div>

          {/* ============ 3 CORREOS DE ALERTA (SIN AUTOCOMPLETADO CRUZADO) ============ */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5 flex items-center space-x-1">
              <Mail className="h-3.5 w-3.5" />
              <span>Correos para alertas <span className="text-slate-400 font-normal">(todos opcionales)</span></span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Correo 1 - Principal */}
              <div>
                <div className="relative">
                  <input
                    type="email"
                    name="email_alerta_principal"
                    autoComplete="new-password"
                    placeholder="correo1@vsafe.com"
                    value={form.email_alerta}
                    onChange={(e) => setForm(prev => ({ ...prev, email_alerta: e.target.value }))}
                    className={`w-full border-2 rounded-lg p-3 pr-10 text-sm font-medium focus:outline-none ${
                      v.email_alerta ? 'border-slate-200 bg-slate-50 focus:border-blue-800 focus:bg-white' : 'border-red-300 bg-red-50'
                    }`}
                  />
                  {form.email_alerta && v.email_alerta && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">
                  📧 Principal
                </p>
              </div>

              {/* Correo 2 - Secundario */}
              <div>
                <div className="relative">
                  <input
                    type="email"
                    name="email_alerta_secundario"
                    autoComplete="new-password"
                    placeholder="correo2@vsafe.com"
                    value={form.email_alerta_2}
                    onChange={(e) => setForm(prev => ({ ...prev, email_alerta_2: e.target.value }))}
                    className={`w-full border-2 rounded-lg p-3 pr-10 text-sm font-medium focus:outline-none ${
                      v.email_alerta_2 ? 'border-slate-200 bg-slate-50 focus:border-blue-800 focus:bg-white' : 'border-red-300 bg-red-50'
                    }`}
                  />
                  {form.email_alerta_2 && v.email_alerta_2 && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">
                  📧 Secundario
                </p>
              </div>

              {/* Correo 3 - Opcional */}
              <div>
                <div className="relative">
                  <input
                    type="email"
                    name="email_alerta_opcional"
                    autoComplete="new-password"
                    placeholder="correo3@vsafe.com"
                    value={form.email_alerta_3}
                    onChange={(e) => setForm(prev => ({ ...prev, email_alerta_3: e.target.value }))}
                    className={`w-full border-2 rounded-lg p-3 pr-10 text-sm font-medium focus:outline-none ${
                      v.email_alerta_3 ? 'border-slate-200 bg-slate-50 focus:border-blue-800 focus:bg-white' : 'border-red-300 bg-red-50'
                    }`}
                  />
                  {form.email_alerta_3 && v.email_alerta_3 && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase">
                  📧 Opcional (3ro)
                </p>
              </div>
            </div>

            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 Puedes usar 1, 2 o los 3 correos. Los que dejes vacíos no se usarán. 
                Si dejas todos vacíos, se usará el correo general del sistema.
              </p>
            </div>
          </div>

          {/* Tiempo Proveedor */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Tiempo Proveedor (días) <span className="text-red-500">*</span>
            </label>
            <select
              value={form.tiempo_proveedor_dias}
              onChange={(e) => setForm(prev => ({ ...prev, tiempo_proveedor_dias: e.target.value }))}
              className={`w-full border-2 rounded-lg p-3 text-sm font-medium focus:outline-none ${
                v.tiempo_proveedor_dias 
                  ? 'border-emerald-300 bg-emerald-50/30' 
                  : 'border-slate-200 bg-slate-50 focus:border-blue-800'
              }`}
            >
              <option value="N/A">❓ N/A — No se conoce</option>
              <option value="1">1 día</option>
              <option value="2">2 días</option>
              <option value="3">3 días</option>
              <option value="5">5 días</option>
              <option value="7">1 semana</option>
              <option value="14">2 semanas</option>
              <option value="21">3 semanas</option>
              <option value="30">1 mes</option>
              <option value="45">1 mes y medio</option>
              <option value="60">2 meses</option>
            </select>
            {form.tiempo_proveedor_dias === 'N/A' && (
              <p className="text-xs text-amber-600 font-medium mt-1">
                ⚠️ Se usará 3 días por defecto para IA
              </p>
            )}
          </div>

          {/* Unidad de Medida */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
              Unidad de Medida <span className="text-red-500">*</span>
            </label>
            <select
              value={form.unidad_medida}
              onChange={(e) => setForm(prev => ({...prev, unidad_medida: e.target.value}))}
              className={`w-full border-2 rounded-lg p-3 text-sm font-medium focus:outline-none ${
                v.unidad_medida ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 focus:border-blue-800'
              }`}
            >
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>

          {/* Fecha de Ingreso */}
          <InputField 
            label="Fecha de Ingreso" 
            tipo="date"
            value={form.fecha_ingreso} 
            onChange={v => setForm(prev => ({...prev, fecha_ingreso: v}))} 
            valido={true} 
            required={false}
            esEdicion={esEdicion}
          />

          {/* Botones */}
          <div className="md:col-span-2 flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button 
              type="button" 
              onClick={onClose} 
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
              {esEdicion ? <Save className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
              <span>
                {formCompleto 
                  ? (esEdicion ? 'Guardar Cambios' : 'Registrar Material') 
                  : 'Completa los campos obligatorios'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}