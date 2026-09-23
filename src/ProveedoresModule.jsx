import React, { useState, useEffect } from 'react';
import { 
  Truck, PlusCircle, Trash2, Pencil, X, 
  AlertCircle, CheckCircle2, Search, Package,
  Phone, Mail, MapPin, User, FileText,
  ShoppingCart, Eye, Download    
} from 'lucide-react';
import Swal from 'sweetalert2';

// ============ INPUT HELPER (Movido fuera para evitar pérdida de foco) ============
const InputField = ({ label, required, value, onChange, placeholder, tipo = 'text', valido, mensajeError, esEditando }) => {
  const [tocado, setTocado] = useState(!!esEditando);
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

export default function ProveedoresModule() {
  const [proveedorCompras, setProveedorCompras] = useState(null);
  const [comprasProveedor, setComprasProveedor] = useState([]);
  const [cargandoCompras, setCargandoCompras] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [materiales, setMateriales] = useState([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [proveedorEditando, setProveedorEditando] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [busquedaMaterial, setBusquedaMaterial] = useState('');

  const [form, setForm] = useState({
    nombre: '', rif: '', telefono: '', email: '',
    direccion: '', persona_contacto: '', notas: '',
    materiales: []
  });

  // ============ CARGA ============
  const cargar = async () => {
    try {
      const [rp, rm] = await Promise.all([
        fetch('http://localhost:5000/api/proveedores').then(r => r.json()),
        fetch('http://localhost:5000/api/materiales').then(r => r.json()),
      ]);
      setProveedores(Array.isArray(rp) ? rp : []);
      setMateriales(Array.isArray(rm) ? rm : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ============ ABRIR MODAL ============
  const abrirNuevo = () => {
    setProveedorEditando(null);
    setForm({
      nombre: '', rif: '', telefono: '', email: '',
      direccion: '', persona_contacto: '', notas: '',
      materiales: []
    });
    setModalAbierto(true);
  };

  const abrirEditar = (p) => {
    setProveedorEditando(p);
    setForm({
      nombre: p.nombre || '',
      rif: p.rif || '',
      telefono: p.telefono || '',
      email: p.email || '',
      direccion: p.direccion || '',
      persona_contacto: p.persona_contacto || '',
      notas: p.notas || '',
      materiales: (p.materiales || []).map(m => ({
        id_material: m.id_material,
        precio_unitario: m.precio_unitario || ''
      }))
    });
    setModalAbierto(true);
  };

  const verComprasProveedor = async (proveedor) => {
    setProveedorCompras(proveedor);
    setComprasProveedor([]);
    setCargandoCompras(true);
    try {
      const res = await fetch(`http://localhost:5000/api/compras/proveedor/${proveedor.id_proveedor}`);
      const data = await res.json();
      setComprasProveedor(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar compras:', error);
      Swal.fire('Error', 'No se pudieron cargar las compras del proveedor', 'error');
    } finally {
      setCargandoCompras(false);
    }
  };

  const cerrarComprasModal = () => {
    setProveedorCompras(null);
    setComprasProveedor([]);
  };

  // ============ VALIDACIONES ============
  const validar = () => ({
    nombre: form.nombre.trim().length >= 3,
    rif: form.rif.trim().length >= 6,
    telefono: form.telefono.trim().length >= 7,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    direccion: form.direccion.trim().length >= 5,
    persona_contacto: form.persona_contacto.trim().length >= 3,
    materiales: form.materiales.length > 0,
  });

  const v = validar();
  const formCompleto = Object.values(v).every(Boolean);

  // ============ MATERIALES: AGREGAR / QUITAR ============
  const toggleMaterial = (idMaterial) => {
    const existe = form.materiales.find(m => m.id_material === idMaterial);
    if (existe) {
      setForm({
        ...form,
        materiales: form.materiales.filter(m => m.id_material !== idMaterial)
      });
    } else {
      setForm({
        ...form,
        materiales: [...form.materiales, { id_material: idMaterial, precio_unitario: '' }]
      });
    }
  };

  const actualizarPrecio = (idMaterial, precio) => {
    setForm({
      ...form,
      materiales: form.materiales.map(m =>
        m.id_material === idMaterial ? { ...m, precio_unitario: precio } : m
      )
    });
  };

  // ============ GUARDAR ============
  const guardar = async (e) => {
    e.preventDefault();
    if (!formCompleto) {
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Completa todos los campos obligatorios y selecciona al menos un material.',
        confirmButtonColor: '#1e3a8a'
      });
      return;
    }

    const url = proveedorEditando
      ? `http://localhost:5000/api/proveedores/${proveedorEditando.id_proveedor}`
      : 'http://localhost:5000/api/proveedores';
    const method = proveedorEditando ? 'PUT' : 'POST';

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
          title: proveedorEditando ? 'Proveedor actualizado' : 'Proveedor registrado',
          timer: 1500,
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
      title: '¿Eliminar proveedor?',
      text: 'Se eliminará también su relación con materiales.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar'
    });
    if (!r.isConfirmed) return;
    await fetch(`http://localhost:5000/api/proveedores/${id}`, { method: 'DELETE' });
    cargar();
  };

  // ============ FILTROS ============
  const proveedoresFiltrados = (proveedores || []).filter(p => {
    if (!p || typeof p !== 'object') return false;
    const term = busqueda.toLowerCase();
    const nombre = String(p.nombre ?? '').toLowerCase();
    const rif = String(p.rif ?? '').toLowerCase();
    return nombre.includes(term) || rif.includes(term);
  });

  const materialesDisponibles = (materiales || [])
    .filter(m => m && typeof m === 'object' && m.id_material)
    .filter(m => {
      if (!busquedaMaterial) return true;
      const term = busquedaMaterial.toLowerCase();
      return String(m.nombre ?? '').toLowerCase().includes(term)
          || String(m.codigo_producto ?? '').toLowerCase().includes(term);
    });

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-950 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center space-x-3">
            <Truck className="h-7 w-7" />
            <span>Gestión de Proveedores</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Administra tu cartera de proveedores y los materiales que suministran
          </p>
        </div>
        <button
          onClick={abrirNuevo}
          className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm px-4 py-3 rounded-xl shadow transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nuevo Proveedor</span>
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow p-4 flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o RIF..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
        />
        <span className="text-xs font-bold text-slate-500">
          {proveedoresFiltrados.length} proveedores
        </span>
      </div>

      {/* GRID DE PROVEEDORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proveedoresFiltrados.map((p) => (
          <div key={p.id_proveedor} className="bg-white rounded-2xl border border-slate-200 shadow hover:shadow-md transition overflow-hidden">
            
            <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-xl bg-blue-900 text-white flex items-center justify-center font-black">
                  {String(p.nombre ?? 'P').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 leading-tight">{p.nombre}</h3>
                  <p className="text-xs font-mono text-slate-500">{p.rif || 'Sin RIF'}</p>
                </div>
              </div>
              {!p.activo && (
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">INACTIVO</span>
              )}
            </div>

            <div className="p-4 space-y-1.5 text-xs text-slate-600">
              {p.persona_contacto && (
                <div className="flex items-center space-x-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>{p.persona_contacto}</span>
                </div>
              )}
              {p.telefono && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  <span>{p.telefono}</span>
                </div>
              )}
              {p.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span className="truncate">{p.email}</span>
                </div>
              )}
              {p.direccion && (
                <div className="flex items-start space-x-2">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                  <span className="line-clamp-2">{p.direccion}</span>
                </div>
              )}
            </div>

            <div className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center space-x-1">
                  <Package className="h-3.5 w-3.5" />
                  <span>Materiales ({p.materiales?.length || 0})</span>
                </span>
              </div>
              {p.materiales && p.materiales.length > 0 ? (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {p.materiales.map((m) => (
                    <div key={m.id_material} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                      <span className="font-medium text-slate-700 truncate">{m.nombre}</span>
                      {m.precio_unitario && (
                        <span className="text-emerald-700 font-bold">${m.precio_unitario}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Sin materiales asignados</p>
              )}
            </div>

            <div className="px-4 pb-4 flex items-center justify-between border-t border-slate-100 pt-3">
              {/* Info de compras */}
              <button
                onClick={() => verComprasProveedor(p)}
                className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs px-3 py-1.5 rounded-lg transition"
                title="Ver historial de compras"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>
                  {p.total_compras || 0} {p.total_compras === 1 ? 'compra' : 'compras'}
                </span>
              </button>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => abrirEditar(p)}
                  className="text-blue-800 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => eliminar(p.id_proveedor)}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {proveedoresFiltrados.length === 0 && (
          <div className="col-span-full p-10 text-center bg-white rounded-2xl border border-slate-200">
            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay proveedores registrados aún.</p>
            <p className="text-xs text-slate-400 mt-1">Crea el primero con el botón "Nuevo Proveedor".</p>
          </div>
        )}
      </div>

      {/* ============ MODAL DE PROVEEDOR ============ */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-950 to-blue-800 rounded-t-2xl">
              <div className="flex items-center space-x-3 text-white">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <Truck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    {proveedorEditando ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
                  </h2>
                  <p className="text-blue-200 text-xs">
                    {proveedorEditando ? 'Actualiza los datos y materiales' : 'Añade proveedores con sus materiales'}
                  </p>
                </div>
              </div>
              <button onClick={() => setModalAbierto(false)} className="text-white hover:bg-white/10 p-2 rounded-lg transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={guardar} className="p-6 max-h-[75vh] overflow-y-auto">
              
              <h3 className="text-sm font-black text-blue-900 uppercase tracking-wide mb-3 flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Datos del Proveedor</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <InputField label="Nombre / Razón Social" required placeholder="Ej. Aceros Industriales C.A." value={form.nombre} onChange={v => setForm({...form, nombre: v})} valido={v.nombre} mensajeError="Mínimo 3 caracteres" esEditando={proveedorEditando} />
                <InputField label="RIF" required placeholder="Ej. J-12345678-9" value={form.rif} onChange={v => setForm({...form, rif: v.toUpperCase()})} valido={v.rif} mensajeError="Mínimo 6 caracteres" esEditando={proveedorEditando} />
                <InputField label="Persona de Contacto" required placeholder="Ej. Juan Pérez" value={form.persona_contacto} onChange={v => setForm({...form, persona_contacto: v})} valido={v.persona_contacto} mensajeError="Mínimo 3 caracteres" esEditando={proveedorEditando} />
                <InputField label="Teléfono" required placeholder="Ej. +58 412 1234567" value={form.telefono} onChange={v => setForm({...form, telefono: v})} valido={v.telefono} mensajeError="Teléfono inválido" esEditando={proveedorEditando} />
                <InputField label="Email" required tipo="email" placeholder="Ej. ventas@proveedor.com" value={form.email} onChange={v => setForm({...form, email: v})} valido={v.email} mensajeError="Email inválido" esEditando={proveedorEditando} />
                <InputField label="Dirección" required placeholder="Ej. Av. Industrial, Galpón 5" value={form.direccion} onChange={v => setForm({...form, direccion: v})} valido={v.direccion} mensajeError="Dirección muy corta" esEditando={proveedorEditando} />
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Notas</label>
                  <textarea
                    rows="2"
                    placeholder="Observaciones, condiciones de pago, etc."
                    value={form.notas}
                    onChange={(e) => setForm({...form, notas: e.target.value})}
                    className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-wide flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Materiales que Suministra</span>
                  </h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    v.materiales ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {form.materiales.length} seleccionados
                  </span>
                </div>

                <div className="relative mb-3">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar material por nombre o código..."
                    value={busquedaMaterial}
                    onChange={(e) => setBusquedaMaterial(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border-2 border-slate-200 bg-slate-50 rounded-lg text-sm focus:border-blue-800 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="border-2 border-slate-200 rounded-lg max-h-72 overflow-y-auto">
                  {materialesDisponibles.length === 0 ? (
                    <p className="p-6 text-center text-sm text-slate-400 italic">
                      No hay materiales disponibles
                    </p>
                  ) : (
                    materialesDisponibles.map((m) => {
                      const seleccionado = form.materiales.find(x => x.id_material === m.id_material);
                      const precio = seleccionado?.precio_unitario || '';

                      return (
                        <div
                          key={m.id_material}
                          className={`flex items-center space-x-3 p-3 border-b border-slate-100 last:border-b-0 transition ${
                            seleccionado ? 'bg-emerald-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!seleccionado}
                            onChange={() => toggleMaterial(m.id_material)}
                            className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-slate-900 truncate">{m.nombre}</p>
                            <p className="text-xs text-slate-500 font-mono">
                              {m.codigo_producto || m.codigo_lote || '—'} · {m.unidad_medida || 'UNID'}
                            </p>
                          </div>
                          {seleccionado && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-500">$</span>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Precio"
                                value={precio}
                                onChange={(e) => actualizarPrecio(m.id_material, e.target.value)}
                                className="w-24 border-2 border-emerald-300 rounded-lg px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {!v.materiales && (
                  <p className="text-xs text-red-600 font-medium mt-2 flex items-center space-x-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Debes seleccionar al menos un material</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 mt-6">
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
                      ? (proveedorEditando ? 'Guardar Cambios' : 'Registrar Proveedor')
                      : 'Completa los campos obligatorios'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL DE COMPRAS DEL PROVEEDOR ============ */}
      {proveedorCompras && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-950 to-blue-800 rounded-t-2xl">
              <div className="flex items-center space-x-3 text-white">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    Compras de {proveedorCompras.nombre}
                  </h2>
                  <p className="text-blue-200 text-xs">
                    {proveedorCompras.rif && `RIF: ${proveedorCompras.rif} · `}
                    {comprasProveedor.length} factura{comprasProveedor.length !== 1 ? 's' : ''} registrada{comprasProveedor.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={cerrarComprasModal} 
                className="text-white hover:bg-white/10 p-2 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumen */}
            {!cargandoCompras && comprasProveedor.length > 0 && (
              <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-200 bg-slate-50">
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">Total Facturas</p>
                  <p className="text-2xl font-black text-blue-950">
                    {comprasProveedor.length}
                  </p>
                </div>
                <div className="text-center border-l border-r border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase">Monto Total</p>
                  <p className="text-2xl font-black text-emerald-700">
                    ${comprasProveedor.reduce((s, c) => s + Number(c.total || 0), 0).toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-500 uppercase">Materiales</p>
                  <p className="text-2xl font-black text-indigo-700">
                    {comprasProveedor.reduce((s, c) => s + (c.detalles?.length || 0), 0)}
                  </p>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {cargandoCompras ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-900 border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-slate-500 mt-3 text-sm font-medium">Cargando compras...</p>
                </div>
              ) : comprasProveedor.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
                  <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">Este proveedor no tiene compras registradas</p>
                  <p className="text-xs text-slate-400 mt-1">Registra una compra desde la pestaña "Compras"</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comprasProveedor.map((c) => (
                    <div key={c.id_compra} className="border-2 border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition">
                      {/* Cabecera de factura */}
                      <div className="p-4 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center space-x-3">
                          <div className="bg-blue-900 text-white p-2 rounded-lg">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
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
                            <p className="text-xs text-slate-500 mt-1">
                              {c.fecha_compra ? String(c.fecha_compra).substring(0, 10) : '—'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <p className="text-xs text-slate-500 font-bold uppercase">Total</p>
                            <p className="text-lg font-black text-emerald-700">
                              ${Number(c.total).toFixed(2)}
                            </p>
                          </div>
                          <button
                            onClick={() => window.open(`http://localhost:5000/api/compras/${c.id_compra}/factura`, '_blank')}
                            className="text-emerald-700 hover:text-emerald-500 hover:bg-emerald-50 p-2 rounded-lg transition"
                            title="Ver factura"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <a
                            href={`http://localhost:5000/api/compras/${c.id_compra}/factura`}
                            download={`Factura_${c.numero_factura}.pdf`}
                            className="text-indigo-700 hover:text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition inline-flex"
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>

                      {/* Materiales de la factura */}
                      {c.detalles && c.detalles.length > 0 && (
                        <table className="w-full text-sm">
                          <thead className="bg-white text-xs font-bold uppercase text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="p-2 text-left">Material</th>
                              <th className="p-2 text-right">Cantidad</th>
                              <th className="p-2 text-right">P. Unit.</th>
                              <th className="p-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {c.detalles.map((d) => (
                              <tr key={d.id_detalle} className="hover:bg-slate-50">
                                <td className="p-2 font-bold text-slate-900">{d.material}</td>
                                <td className="p-2 text-right">
                                  {d.cantidad} <span className="text-xs text-slate-500">{d.unidad_medida || ''}</span>
                                </td>
                                <td className="p-2 text-right font-mono">${Number(d.precio_unitario).toFixed(2)}</td>
                                <td className="p-2 text-right font-bold text-emerald-700">
                                  ${Number(d.subtotal).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={cerrarComprasModal}
                className="px-6 py-2.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}