import React, { useState, useEffect } from 'react';
import { 
  Tags, PlusCircle, Trash2, Pencil, X, 
  AlertCircle, CheckCircle2, Search, Package,
  Hash, Info, Save
} from 'lucide-react';
import Swal from 'sweetalert2';

// Paleta de colores para mostrar el prefijo
const COLORES_PREFIJO = [
  'bg-blue-100 text-blue-800 border-blue-300',
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-amber-100 text-amber-800 border-amber-300',
  'bg-purple-100 text-purple-800 border-purple-300',
  'bg-rose-100 text-rose-800 border-rose-300',
  'bg-cyan-100 text-cyan-800 border-cyan-300',
  'bg-orange-100 text-orange-800 border-orange-300',
  'bg-indigo-100 text-indigo-800 border-indigo-300',
];

// ============ INPUT HELPER ============
const InputField = ({ 
  label, required, value, onChange, placeholder, 
  tipo = 'text', valido, mensajeError, esEditando, maxLength, ayuda 
}) => {
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
          maxLength={maxLength}
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
      {ayuda && !mostrarError && <p className="text-xs text-slate-500 mt-1">{ayuda}</p>}
    </div>
  );
};

export default function CategoriasModule() {
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    prefijo: '',
    descripcion: ''
  });

  // ============ CARGA ============
  const cargar = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/categorias');
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setCategorias([]);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ============ ABRIR MODAL ============
  const abrirNueva = () => {
    setCategoriaEditando(null);
    setForm({ nombre: '', prefijo: '', descripcion: '' });
    setModalAbierto(true);
  };

  const abrirEditar = (cat) => {
    setCategoriaEditando(cat);
    setForm({
      nombre: cat.nombre || '',
      prefijo: cat.prefijo || '',
      descripcion: cat.descripcion || ''
    });
    setModalAbierto(true);
  };

  // ============ VALIDACIONES ============
  // ⭐ AHORA PERMITE HASTA 15 CARACTERES (LETRAS Y NÚMEROS)
  const validar = () => ({
    nombre: form.nombre.trim().length >= 3,
    prefijo: /^[A-Z0-9]{2,15}$/.test(form.prefijo.trim().toUpperCase()),
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

    const url = categoriaEditando
      ? `http://localhost:5000/api/categorias/${categoriaEditando.id_categoria}`
      : 'http://localhost:5000/api/categorias';
    const method = categoriaEditando ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          prefijo: form.prefijo.trim().toUpperCase(),
          descripcion: form.descripcion.trim() || null
        })
      });
      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: categoriaEditando ? 'Categoría actualizada' : 'Categoría creada',
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
  const eliminar = async (cat) => {
    const r = await Swal.fire({
      title: '¿Eliminar categoría?',
      html: `
        <p style="margin-bottom: 8px;">Se eliminará <strong>${cat.nombre}</strong></p>
        <p style="color: #dc2626; font-size: 13px;">⚠️ No se puede eliminar si tiene materiales asociados.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (!r.isConfirmed) return;

    try {
      const res = await fetch(`http://localhost:5000/api/categorias/${cat.id_categoria}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Categoría eliminada',
          timer: 1200,
          showConfirmButton: false
        });
        cargar();
      } else {
        Swal.fire('No se puede eliminar', data.error, 'error');
      }
    } catch (error) {
      Swal.fire('Error de conexión', error.message, 'error');
    }
  };

  // ============ FILTROS ============
  const categoriasFiltradas = (categorias || [])
    .filter(c => c && typeof c === 'object')
    .filter(c => {
      if (!busqueda) return true;
      const t = busqueda.toLowerCase();
      return String(c.nombre ?? '').toLowerCase().includes(t)
          || String(c.prefijo ?? '').toLowerCase().includes(t);
    });

  const getColorPorIndice = (idx) => COLORES_PREFIJO[idx % COLORES_PREFIJO.length];

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-950 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center space-x-3">
            <Tags className="h-7 w-7" />
            <span>Gestión de Categorías</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Administra las categorías de materiales y sus prefijos de código
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm px-4 py-3 rounded-xl shadow transition"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* INFO */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start space-x-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800">
          <p className="font-bold mb-1">¿Cómo funcionan los prefijos?</p>
          <p>
            El <strong>prefijo</strong> (2 a 15 caracteres, letras y/o números) define el formato del código de producto. 
            Por ejemplo, con el prefijo <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold">ACE</code>, 
            los materiales de esa categoría se numerarán como <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold">ACE-0001</code>, 
            <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold ml-1">ACE-0002</code>, etc.
          </p>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow p-4 flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o prefijo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm font-medium"
        />
        <span className="text-xs font-bold text-slate-500">
          {categoriasFiltradas.length} categorías
        </span>
      </div>

      {/* GRID DE CATEGORÍAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoriasFiltradas.map((cat, idx) => (
          <div 
            key={cat.id_categoria} 
            className="bg-white rounded-2xl border border-slate-200 shadow hover:shadow-md transition overflow-hidden"
          >
            {/* Header del card */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center font-black text-xs px-1 ${getColorPorIndice(idx)}`}>
                  {cat.prefijo ? (cat.prefijo.length > 6 ? cat.prefijo.substring(0, 6) + '…' : cat.prefijo) : '?'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 leading-tight truncate">{cat.nombre}</h3>
                  <p className="text-xs font-mono text-slate-500">
                    Código: {cat.prefijo ? `${cat.prefijo}-####` : 'Sin prefijo'}
                  </p>
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div className="p-4 space-y-2">
              {cat.descripcion ? (
                <p className="text-xs text-slate-600 line-clamp-2">{cat.descripcion}</p>
              ) : (
                <p className="text-xs text-slate-400 italic">Sin descripción</p>
              )}

              {/* Total de materiales */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase flex items-center space-x-1">
                  <Package className="h-3.5 w-3.5" />
                  <span>Materiales</span>
                </span>
                <span className={`text-sm font-black px-2 py-0.5 rounded-full ${
                  (cat.total_materiales || 0) > 0 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {cat.total_materiales || 0}
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="px-4 pb-4 flex items-center justify-end space-x-1 border-t border-slate-100 pt-3">
              <button
                onClick={() => abrirEditar(cat)}
                className="text-blue-800 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                title="Editar categoría"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => eliminar(cat)}
                disabled={(cat.total_materiales || 0) > 0}
                className={`p-2 rounded-lg transition ${
                  (cat.total_materiales || 0) > 0
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                }`}
                title={
                  (cat.total_materiales || 0) > 0 
                    ? `No se puede eliminar: tiene ${cat.total_materiales} materiales`
                    : 'Eliminar categoría'
                }
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {categoriasFiltradas.length === 0 && (
          <div className="col-span-full p-10 text-center bg-white rounded-2xl border border-slate-200">
            <Tags className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay categorías registradas.</p>
            <p className="text-xs text-slate-400 mt-1">Crea la primera con el botón "Nueva Categoría".</p>
          </div>
        )}
      </div>

      {/* ============ MODAL ============ */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8">
            
            {/* Header modal */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-950 to-blue-800 rounded-t-2xl">
              <div className="flex items-center space-x-3 text-white">
                <div className="bg-white/10 p-2.5 rounded-xl">
                  <Tags className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black">
                    {categoriaEditando ? 'Editar Categoría' : 'Nueva Categoría'}
                  </h2>
                  <p className="text-blue-200 text-xs">
                    {categoriaEditando 
                      ? 'Modifica los datos de la categoría' 
                      : 'Añade una categoría con su prefijo de código'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setModalAbierto(false)} 
                className="text-white hover:bg-white/10 p-2 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={guardar} className="p-6 space-y-4">

              {/* Nombre */}
              <InputField
                label="Nombre de la Categoría"
                required
                placeholder="Ej. Aceros Balísticos"
                value={form.nombre}
                onChange={v => setForm({ ...form, nombre: v })}
                valido={v.nombre}
                mensajeError="Mínimo 3 caracteres"
                esEditando={categoriaEditando}
                maxLength={100}
              />

              {/* Prefijo */}
              <div>
                <InputField
                  label="Prefijo del Código"
                  required
                  placeholder="Ej. AMORTIGUADOR"
                  value={form.prefijo}
                  onChange={v => setForm({ 
                    ...form, 
                    // ⭐ AHORA PERMITE HASTA 15 CARACTERES (LETRAS Y NÚMEROS)
                    prefijo: v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15)
                  })}
                  valido={v.prefijo}
                  mensajeError="Debe tener 2 a 15 caracteres (letras y/o números)"
                  esEditando={categoriaEditando}
                  maxLength={15}
                  ayuda="Letras y/o números (2 a 15 caracteres)"
                />
                {form.prefijo && v.prefijo && (
                  <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Hash className="h-4 w-4 text-emerald-700" />
                      <span className="text-xs text-emerald-800 font-bold">Vista previa del código:</span>
                    </div>
                    <code className="font-mono font-black text-emerald-900 bg-white px-3 py-1 rounded border border-emerald-300 text-xs">
                      {form.prefijo}-0001
                    </code>
                  </div>
                )}
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Descripción
                </label>
                <textarea
                  rows="3"
                  placeholder="Ej. Placas metálicas de alta resistencia (Armox, Ramor)"
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:border-blue-800 focus:bg-white focus:outline-none resize-none"
                  maxLength={255}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {form.descripcion.length}/255 caracteres
                </p>
              </div>

              {/* Aviso en modo edición */}
              {categoriaEditando && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>Nota:</strong> Cambiar el prefijo NO actualiza los códigos existentes. 
                    Los materiales ya creados mantienen su código original.
                  </p>
                </div>
              )}

              {/* Botones */}
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
                  {categoriaEditando ? <Save className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                  <span>
                    {formCompleto 
                      ? (categoriaEditando ? 'Guardar Cambios' : 'Crear Categoría') 
                      : 'Completa los campos'}
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