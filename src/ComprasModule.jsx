import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, PlusCircle, Trash2, Pencil, X, 
  AlertCircle, CheckCircle2, Search, FileText,
  TrendingUp, Package, DollarSign, Download, Eye, Plus
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function ComprasModule() {
  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [compraEditando, setCompraEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [compraExpandida, setCompraExpandida] = useState(null);

  const [form, setForm] = useState({
    id_proveedor: '',
    numero_factura: '',
    fecha_compra: new Date().toISOString().split('T')[0],
    notas: '',
    estado: 'recibida',
    materiales: []  // [{ id_material, cantidad, precio_unitario }]
  });

  // ============ CARGA ============
  const cargar = async () => {
    try {
      const [rc, rp, rm, re] = await Promise.all([
        fetch('http://localhost:5000/api/compras').then(r => r.json()),
        fetch('http://localhost:5000/api/proveedores').then(r => r.json()),
        fetch('http://localhost:5000/api/materiales').then(r => r.json()),
        fetch('http://localhost:5000/api/compras/estadisticas').then(r => r.json()),
      ]);
      setCompras(Array.isArray(rc) ? rc : []);
      setProveedores(Array.isArray(rp) ? rp : []);
      setMateriales(Array.isArray(rm) ? rm : []);
      setEstadisticas(re);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ============ ABRIR MODAL ============
  const abrirNueva = () => {
    setCompraEditando(null);
    setForm({
      id_proveedor: '',
      numero_factura: '',
      fecha_compra: new Date().toISOString().split('T')[0],
      notas: '',
      estado: 'recibida',
      materiales: [crearLineaVacia()]
    });
    setModalAbierto(true);
  };

  const abrirEditar = (c) => {
    setCompraEditando(c);
    setForm({
      id_proveedor: String(c.id_proveedor),
      numero_factura: c.numero_factura || '',
      fecha_compra: c.fecha_compra ? String(c.fecha_compra).substring(0, 10) : '',
      notas: c.notas || '',
      estado: c.estado || 'recibida',
      materiales: (c.detalles || []).map(d => ({
        id_material: String(d.id_material),
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario
      }))
    });
    setModalAbierto(true);
  };

  const crearLineaVacia = () => ({
    id_material: '',
    cantidad: '',
    precio_unitario: ''
  });

  // ============ MANEJO DE MATERIALES ============
  const agregarLineaMaterial = () => {
    setForm({
      ...form,
      materiales: [...form.materiales, crearLineaVacia()]
    });
  };

  const eliminarLineaMaterial = (index) => {
    if (form.materiales.length <= 1) {
      Swal.fire('Aviso', 'Debe haber al menos un material en la factura', 'info');
      return;
    }
    setForm({
      ...form,
      materiales: form.materiales.filter((_, i) => i !== index)
    });
  };

  const actualizarLinea = (index, campo, valor) => {
    const nuevos = [...form.materiales];
    nuevos[index] = { ...nuevos[index], [campo]: valor };
    setForm({ ...form, materiales: nuevos });
  };

  // ============ VALIDACIONES ============
  const validar = () => {
    const materialesValidos = form.materiales.every(m => 
      m.id_material && 
      m.cantidad !== '' && parseFloat(m.cantidad) > 0 &&
      m.precio_unitario !== '' && parseFloat(m.precio_unitario) > 0
    );

    return {
      id_proveedor: String(form.id_proveedor).trim() !== '',
      numero_factura: form.numero_factura.trim().length >= 3,
      fecha_compra: form.fecha_compra !== '',
      materiales: form.materiales.length > 0 && materialesValidos
    };
  };

  const v = validar();
  const formCompleto = Object.values(v).every(Boolean);

  const totalFactura = form.materiales.reduce((sum, m) => {
    const c = parseFloat(m.cantidad) || 0;
    const p = parseFloat(m.precio_unitario) || 0;
    return sum + (c * p);
  }, 0);

  // ============ GUARDAR ============
  const guardar = async (e) => {
    e.preventDefault();
    if (!formCompleto) {
      Swal.fire({ 
        icon: 'warning', 
        title: 'Formulario incompleto', 
        text: 'Completa todos los campos y verifica que cada material tenga cantidad y precio válidos.', 
        confirmButtonColor: '#1e3a8a' 
      });
      return;
    }

    const url = compraEditando
      ? `http://localhost:5000/api/compras/${compraEditando.id_compra}`
      : 'http://localhost:5000/api/compras';
    const method = compraEditando ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: compraEditando ? 'Compra actualizada' : 'Compra registrada',
          text: data.stock_actualizado ? 'El stock fue actualizado automáticamente.' : '',
          timer: 1800,
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
  const eliminar = async (id) => {
    const r = await Swal.fire({
      title: '¿Eliminar factura?',
      text: 'El stock de TODOS los materiales será revertido.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar'
    });
    if (!r.isConfirmed) return;
    await fetch(`http://localhost:5000/api/compras/${id}`, { method: 'DELETE' });
    cargar();
  };

  // ============ FILTROS ============
  const comprasFiltradas = (compras || []).filter(c => {
    if (!c || typeof c !== 'object') return false;
    const term = busqueda.toLowerCase();
    return String(c.proveedor ?? '').toLowerCase().includes(term)
        || String(c.numero_factura ?? '').toLowerCase().includes(term);
  });

  // ============ INPUT HELPER ============
  const InputField = ({ label, required, value, onChange, placeholder, tipo = 'text', valido, mensajeError, step, min }) => {
    const [tocado, setTocado] = useState(!!compraEditando);
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
            step={step}
            min={min}
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

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-950 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center space-x-3">
            <ShoppingCart className="h-7 w-7" />
            <span>Registro de Compras</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Facturas con múltiples materiales — actualización automática de stock
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm px-4 py-3 rounded-xl shadow transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Registrar Compra</span>
        </button>
      </div>

      {/* ESTADÍSTICAS */}
      {estadisticas && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Facturas</span>
              <FileText className="h-4 w-4 text-blue-900" />
            </div>
            <p className="text-3xl font-black text-blue-950 mt-2">
              {estadisticas.totales?.total_compras ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Monto Total</span>
              <DollarSign className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="text-3xl font-black text-emerald-700 mt-2">
              ${Number(estadisticas.totales?.monto_total ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Unidades</span>
              <Package className="h-4 w-4 text-indigo-700" />
            </div>
            <p className="text-3xl font-black text-indigo-700 mt-2">
              {Number(estadisticas.totales?.unidades_totales ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase">Proveedores</span>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-3xl font-black text-amber-600 mt-2">
              {estadisticas.totales?.proveedores_activos ?? 0}
            </p>
          </div>
        </div>
      )}

      {/* BUSCADOR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow p-4 flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por proveedor o número de factura..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
        />
        <span className="text-xs font-bold text-slate-500">{comprasFiltradas.length} facturas</span>
      </div>

      {/* LISTA DE COMPRAS (con detalles expandibles) */}
      <div className="space-y-3">
        {comprasFiltradas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow p-12 text-center">
            <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay compras registradas aún.</p>
            <p className="text-xs text-slate-400 mt-1">Registra la primera con el botón "Registrar Compra".</p>
          </div>
        ) : (
          comprasFiltradas.map((c) => {
            const expandida = compraExpandida === c.id_compra;
            const detalles = c.detalles || [];

            return (
              <div key={c.id_compra} className="bg-white rounded-2xl border border-slate-200 shadow overflow-hidden transition">
                
                {/* Cabecera de la factura */}
                <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="bg-blue-900 text-white p-2.5 rounded-xl flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <span className="font-mono text-sm font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                          {c.numero_factura}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          c.estado === 'recibida' ? 'bg-emerald-100 text-emerald-800' :
                          c.estado === 'pendiente' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {String(c.estado).toUpperCase()}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 mt-1">{c.proveedor}</p>
                      <p className="text-xs text-slate-500">
                        {c.fecha_compra ? String(c.fecha_compra).substring(0, 10) : '—'} 
                        {' · '}
                        {c.total_materiales} material{c.total_materiales > 1 ? 'es' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
                      <p className="text-xl font-black text-emerald-700">
                        ${Number(c.total).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 pl-3 border-l border-slate-200">
                      <button
                        onClick={() => setCompraExpandida(expandida ? null : c.id_compra)}
                        className="text-slate-600 hover:text-blue-900 hover:bg-slate-100 p-2 rounded-lg transition"
                        title={expandida ? 'Ocultar materiales' : 'Ver materiales'}
                      >
                        {expandida ? '▲' : '▼'}
                      </button>
                      <button
                        onClick={() => window.open(`http://localhost:5000/api/compras/${c.id_compra}/factura`, '_blank')}
                        className="text-emerald-700 hover:text-emerald-500 hover:bg-emerald-50 p-2 rounded-lg transition"
                        title="Ver factura PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={`http://localhost:5000/api/compras/${c.id_compra}/factura`}
                        download={`Factura_${c.numero_factura}.pdf`}
                        className="text-indigo-700 hover:text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition inline-flex"
                        title="Descargar factura"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => abrirEditar(c)}
                        className="text-blue-800 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(c.id_compra)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalles expandibles */}
                {expandida && (
                  <div className="bg-slate-50 p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">
                      Materiales en esta factura
                    </p>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 text-xs font-bold uppercase text-slate-600">
                          <tr>
                            <th className="p-2 text-left">Material</th>
                            <th className="p-2 text-right">Cantidad</th>
                            <th className="p-2 text-right">P. Unit.</th>
                            <th className="p-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detalles.map((d) => (
                            <tr key={d.id_detalle} className="hover:bg-slate-50">
                              <td className="p-2">
                                <div className="font-bold text-slate-900">{d.material}</div>
                                {d.codigo_producto && (
                                  <div className="text-xs font-mono text-slate-500">{d.codigo_producto}</div>
                                )}
                              </td>
                              <td className="p-2 text-right font-bold">
                                {d.cantidad} <span className="text-xs text-slate-500">{d.unidad_medida || ''}</span>
                              </td>
                              <td className="p-2 text-right font-mono">
                                ${Number(d.precio_unitario).toFixed(2)}
                              </td>
                              <td className="p-2 text-right font-bold text-emerald-700">
                                ${Number(d.subtotal).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {c.notas && (
                      <p className="text-xs text-slate-500 mt-3">
                        <strong>Notas:</strong> {c.notas}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ============ MODAL ============ */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-950 to-blue-800 rounded-t-2xl">
              <div className="flex items-center space-x-3 text-white">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    {compraEditando ? `Editar Factura ${compraEditando.numero_factura}` : 'Registrar Nueva Factura'}
                  </h2>
                  <p className="text-blue-200 text-xs">
                    Puedes agregar varios materiales en la misma factura
                  </p>
                </div>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-white hover:bg-white/10 p-2 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardar} className="p-6 max-h-[75vh] overflow-y-auto">
              
              {/* SECCIÓN 1: Datos de la factura */}
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-3 flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Datos de la Factura</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Proveedor <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.id_proveedor}
                    onChange={(e) => setForm({...form, id_proveedor: e.target.value})}
                    className={`w-full border-2 rounded-lg p-3 text-sm font-medium focus:outline-none ${
                      v.id_proveedor ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 bg-slate-50 focus:border-blue-800'
                    }`}
                  >
                    <option value="">Seleccione proveedor...</option>
                    {proveedores.map(p => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre} {p.rif ? `(${p.rif})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <InputField
                  label="Número de Factura"
                  required
                  placeholder="Ej. FAC-2026-001"
                  value={form.numero_factura}
                  onChange={v => setForm({...form, numero_factura: v.toUpperCase()})}
                  valido={v.numero_factura}
                  mensajeError="Mínimo 3 caracteres"
                />

                <InputField
                  label="Fecha de Compra"
                  required
                  tipo="date"
                  value={form.fecha_compra}
                  onChange={v => setForm({...form, fecha_compra: v})}
                  valido={v.fecha_compra}
                  mensajeError="Fecha obligatoria"
                />

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                    Estado <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.estado}
                    onChange={(e) => setForm({...form, estado: e.target.value})}
                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none"
                  >
                    <option value="recibida">✅ Recibida (suma stock)</option>
                    <option value="pendiente">⏳ Pendiente (no suma stock)</option>
                    <option value="cancelada">❌ Cancelada</option>
                  </select>
                </div>
              </div>

              {/* SECCIÓN 2: Materiales */}
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-wide flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Materiales de la Factura</span>
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    v.materiales ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {form.materiales.length} material{form.materiales.length !== 1 ? 'es' : ''}
                  </span>
                </div>

                {/* Lista de líneas */}
                <div className="space-y-3">
                  {form.materiales.map((linea, index) => {
                    const subtotal = 
                      (parseFloat(linea.cantidad) || 0) * (parseFloat(linea.precio_unitario) || 0);
                    const materialSeleccionado = materiales.find(m => 
                      String(m.id_material) === String(linea.id_material)
                    );

                    return (
                      <div key={index} className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-500 uppercase">
                            Material #{index + 1}
                          </span>
                          {form.materiales.length > 1 && (
                            <button
                              type="button"
                              onClick={() => eliminarLineaMaterial(index)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100 p-1 rounded transition"
                              title="Quitar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                          {/* Material */}
                          <div className="md:col-span-5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              Material *
                            </label>
                            <select
                              value={linea.id_material}
                              onChange={(e) => actualizarLinea(index, 'id_material', e.target.value)}
                              className="w-full border-2 border-slate-200 bg-white rounded-lg p-2.5 text-sm font-medium focus:border-blue-800 focus:outline-none"
                            >
                              <option value="">Seleccione...</option>
                              {materiales.map(m => (
                                <option key={m.id_material} value={m.id_material}>
                                  {m.nombre} {m.codigo_producto ? `(${m.codigo_producto})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Cantidad */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              Cant. *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0"
                              value={linea.cantidad}
                              onChange={(e) => actualizarLinea(index, 'cantidad', e.target.value)}
                              className="w-full border-2 border-slate-200 bg-white rounded-lg p-2.5 text-sm font-medium focus:border-blue-800 focus:outline-none"
                            />
                          </div>

                          {/* Precio */}
                          <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              Precio *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              placeholder="0"
                              value={linea.precio_unitario}
                              onChange={(e) => actualizarLinea(index, 'precio_unitario', e.target.value)}
                              className="w-full border-2 border-slate-200 bg-white rounded-lg p-2.5 text-sm font-medium focus:border-blue-800 focus:outline-none"
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="md:col-span-3">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                              Subtotal
                            </label>
                            <div className="border-2 border-emerald-200 bg-emerald-50 rounded-lg p-2.5 flex items-center justify-end">
                              <span className="font-black text-emerald-700">
                                ${subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {materialSeleccionado && (
                          <p className="text-[10px] text-slate-500 mt-2">
                            Stock actual: <strong>{materialSeleccionado.cantidad_disponible ?? 0}</strong> {materialSeleccionado.unidad_medida || ''}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Botón agregar material */}
                <button
                  type="button"
                  onClick={agregarLineaMaterial}
                  className="w-full mt-3 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-800 font-bold text-sm py-3 rounded-xl transition flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar otro material a la factura</span>
                </button>
              </div>

              {/* Notas */}
              <div className="mt-6">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Notas
                </label>
                <textarea
                  rows="2"
                  placeholder="Condiciones de pago, observaciones, etc."
                  value={form.notas}
                  onChange={(e) => setForm({...form, notas: e.target.value})}
                  className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              {/* Total general */}
              <div className="mt-6 bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-5 flex items-center justify-between">
                <div className="text-white">
                  <p className="text-xs font-bold uppercase tracking-wide opacity-80">
                    Total de la Factura
                  </p>
                  <p className="text-xs opacity-60 mt-0.5">
                    {form.materiales.length} material{form.materiales.length !== 1 ? 'es' : ''} incluido{form.materiales.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-white text-3xl font-black">
                  ${totalFactura.toFixed(2)}
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Cancelar
                </button>
                {compraEditando && (
                  <button
                    type="button"
                    onClick={() => window.open(`http://localhost:5000/api/compras/${compraEditando.id_compra}/factura`, '_blank')}
                    className="px-6 py-3 rounded-xl font-bold text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition flex items-center space-x-2"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver Factura</span>
                  </button>
                )}
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
                      ? (compraEditando ? 'Guardar Cambios' : 'Registrar Factura')
                      : 'Completa los campos obligatorios'}
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