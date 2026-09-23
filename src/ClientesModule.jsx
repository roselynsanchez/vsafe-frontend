import React, { useState, useEffect } from 'react';
import { Users, PlusCircle, Trash2, Edit3, Car, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Swal from 'sweetalert2';

// ============ HELPER INPUT ============
const InputField = ({ label, required, value, onChange, placeholder, tipo = 'text', valido, mensajeError }) => {
  const [tocado, setTocado] = useState(false);
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
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTocado(true)}
          className={`w-full border-2 rounded-lg p-3 pr-10 text-sm font-medium transition-all focus:outline-none ${
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

export default function ClientesModule() {
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [mostrarFormCliente, setMostrarFormCliente] = useState(false);
  const [mostrarFormVehiculo, setMostrarFormVehiculo] = useState(false);

  // Estados para los Modales de Edición
  const [modalEditCliente, setModalEditCliente] = useState(false);
  const [modalEditVehiculo, setModalEditVehiculo] = useState(false);

  const [formCliente, setFormCliente] = useState({
    nombre: '', cedula_rif: '', telefono: '', email: '', direccion: ''
  });
  
  const [formVehiculo, setFormVehiculo] = useState({
    vin_chasis: '', marca_modelo: '', placa: '', cliente: '', tipo_servicio: 'Blindaje', estado_proceso: 'Ingresado'
  });

  // Datos específicos que se están editando actualmente
  const [clienteEditando, setClienteEditando] = useState(null);
  const [vehiculoEditando, setVehiculoEditando] = useState(null);

  // ============ VALIDACIONES ============
  const validarCliente = (datos) => ({
    nombre: datos?.nombre?.trim().length >= 3,
    cedula_rif: datos?.cedula_rif?.trim().length >= 6,
    telefono: datos?.telefono?.trim().length >= 7,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos?.email || ''),
    direccion: datos?.direccion?.trim().length >= 5,
  });

  const validarVehiculo = (datos) => ({
    vin_chasis: datos?.vin_chasis?.trim().length >= 5, // Relajado a 5 caracteres para evitar bloqueos por VINs cortos
    marca_modelo: datos?.marca_modelo?.trim().length >= 3,
    placa: datos?.placa?.trim().length >= 2,   
    cliente: String(datos?.cliente || '').trim() !== '',
    tipo_servicio: String(datos?.tipo_servicio || '').trim() !== '',
    estado_proceso: String(datos?.estado_proceso || '').trim() !== '',
  });

  const vClienteNuevo = validarCliente(formCliente);
  const clienteNuevoCompleto = Object.values(vClienteNuevo).every(Boolean);

  const vVehiculoNuevo = validarVehiculo(formVehiculo);
  const vehiculoNuevoCompleto = Object.values(vVehiculoNuevo).every(Boolean);

  const vClienteEdit = clienteEditando ? validarCliente(clienteEditando) : {};
  const clienteEditCompleto = Object.values(vClienteEdit).every(Boolean);

  const vVehiculoEdit = vehiculoEditando ? validarVehiculo(vehiculoEditando) : {};
  const vehiculoEditCompleto = Object.values(vVehiculoEdit).every(Boolean);

  // ============ CARGA DE DATOS ============
  const cargar = async () => {
    try {
      const [rc, rv] = await Promise.all([
        fetch('http://localhost:5000/api/clientes').then(r => r.json()),
        fetch('http://localhost:5000/api/vehiculos').then(r => r.json()),
      ]);
      setClientes(Array.isArray(rc) ? rc : []);
      setVehiculos(Array.isArray(rv) ? rv : []);
    } catch (e) { console.error("Error cargando datos:", e); }
  };

  useEffect(() => { cargar(); }, []);

  // ============ CREAR ============
  const crearCliente = async (e) => {
    e.preventDefault();
    if (!clienteNuevoCompleto) return;
    try {
      const res = await fetch('http://localhost:5000/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCliente)
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Cliente registrado', timer: 1500, showConfirmButton: false });
        setFormCliente({ nombre: '', cedula_rif: '', telefono: '', email: '', direccion: '' });
        setMostrarFormCliente(false);
        cargar();
      }
    } catch (err) { console.error(err); }
  };

  const crearVehiculo = async (e) => {
    e.preventDefault();
    if (!vehiculoNuevoCompleto) return;
    try {
      const res = await fetch('http://localhost:5000/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formVehiculo)
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Vehículo registrado', timer: 1500, showConfirmButton: false });
        setFormVehiculo({ vin_chasis: '', marca_modelo: '', placa: '', cliente: '', tipo_servicio: 'Blindaje', estado_proceso: 'Ingresado' });
        setMostrarFormVehiculo(false);
        cargar();
      }
    } catch (err) { console.error(err); }
  };

  // ============ ACTUALIZAR (EDITAR) ============
  const actualizarClienteSubmit = async (e) => {
    e.preventDefault();
    if (!clienteEditCompleto) return;
    try {
      const res = await fetch(`http://localhost:5000/api/clientes/${clienteEditando.id_cliente}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clienteEditando)
      });
      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Cliente actualizado', timer: 1500, showConfirmButton: false });
        setModalEditCliente(false);
        setClienteEditando(null);
        cargar();
      }
    } catch (err) { console.error(err); }
  };

  const actualizarVehiculoSubmit = async (e) => {
    e.preventDefault();
    if (!vehiculoEditCompleto) return;
    
    try {
      let idVehiculo = vehiculoEditando.id_vehiculo || vehiculoEditando.id;
      // Limpiamos el ID por seguridad si tuviera ":"
      if (typeof idVehiculo === 'string' && idVehiculo.includes(':')) {
        idVehiculo = idVehiculo.split(':')[0];
      }

      const url = `http://localhost:5000/api/vehiculos/${idVehiculo}`;
      console.log("URL corregida para PUT:", url);

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehiculoEditando)
      });

      if (res.ok) {
        Swal.fire({ icon: 'success', title: 'Vehículo actualizado con éxito', timer: 1500, showConfirmButton: false });
        setModalEditVehiculo(false);
        setVehiculoEditando(null);
        cargar();
      } else {
        const errorData = await res.json().catch(() => ({}));
        Swal.fire({ icon: 'error', title: 'Error al actualizar', text: errorData.message || 'No se pudo guardar en el servidor.' });
      }
    } catch (err) {
      console.error("Error en petición PUT:", err);
      Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'No se pudo conectar con el servidor backend.' });
    }
  };

  // ============ ABRIR MODAL EDICIÓN ============
  const abrirEdicionCliente = (c) => {
    setClienteEditando({ ...c });
    setModalEditCliente(true);
  };

  const abrirEdicionVehiculo = (v) => {
    // Nos aseguramos de extraer únicamente el identificador numérico limpio
    let idReal = v.id_vehiculo || v.id;
    if (typeof idReal === 'string' && idReal.includes(':')) {
      idReal = idReal.split(':')[0]; // Por si viene como "10:1"
    }

    setVehiculoEditando({ 
      ...v,
      id_vehiculo: idReal,
      tipo_servicio: v.tipo_servicio || 'Blindaje', 
      estado_proceso: v.estado_proceso || 'Ingresado'
    });
    setModalEditVehiculo(true);
  };

  // ============ ELIMINAR ============
  const eliminarCliente = async (id) => {
    const r = await Swal.fire({ title: '¿Eliminar cliente?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Sí, eliminar' });
    if (!r.isConfirmed) return;
    await fetch(`http://localhost:5000/api/clientes/${id}`, { method: 'DELETE' });
    cargar();
  };

  const eliminarVehiculo = async (id) => {
    const r = await Swal.fire({ title: '¿Eliminar vehículo?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#dc2626', confirmButtonText: 'Sí, eliminar' });
    if (!r.isConfirmed) return;
    await fetch(`http://localhost:5000/api/vehiculos/${id}`, { method: 'DELETE' });
    cargar();
  };

  return (
    <div className="space-y-8 relative">

      {/* ============ HEADER ============ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-blue-950 to-blue-800 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center space-x-3">
            <Users className="h-7 w-7" />
            <span>Gestión de Clientes y Vehículos</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Administra tu cartera de clientes y los vehículos blindados en proceso
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => { setMostrarFormCliente(!mostrarFormCliente); setMostrarFormVehiculo(false); }}
            className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm px-4 py-3 rounded-xl shadow transition"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nuevo Cliente</span>
          </button>
          <button
            onClick={() => { setMostrarFormVehiculo(!mostrarFormVehiculo); setMostrarFormCliente(false); }}
            className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-4 py-3 rounded-xl shadow transition"
          >
            <Car className="h-4 w-4" />
            <span>Nuevo Vehículo</span>
          </button>
        </div>
      </div>

      {/* ============ FORMULARIO NUEVO CLIENTE ============ */}
      {mostrarFormCliente && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-900" />
              <span>Registrar Nuevo Cliente</span>
            </h2>
          </div>
          <form onSubmit={crearCliente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nombre Completo" required placeholder="Ej. Juan Pérez" value={formCliente.nombre} onChange={v => setFormCliente({...formCliente, nombre: v})} valido={vClienteNuevo.nombre} mensajeError="Mínimo 3 caracteres" />
            <InputField label="Cédula / RIF" required placeholder="Ej. V-12345678" value={formCliente.cedula_rif} onChange={v => setFormCliente({...formCliente, cedula_rif: v})} valido={vClienteNuevo.cedula_rif} mensajeError="Cédula o RIF inválido" />
            <InputField label="Teléfono" required placeholder="Ej. +58 412 1234567" value={formCliente.telefono} onChange={v => setFormCliente({...formCliente, telefono: v})} valido={vClienteNuevo.telefono} mensajeError="Teléfono inválido" />
            <InputField label="Email" required tipo="email" placeholder="Ej. cliente@empresa.com" value={formCliente.email} onChange={v => setFormCliente({...formCliente, email: v})} valido={vClienteNuevo.email} mensajeError="Email inválido" />
            <div className="md:col-span-2">
              <InputField label="Dirección" required placeholder="Ej. Av. Principal..." value={formCliente.direccion} onChange={v => setFormCliente({...formCliente, direccion: v})} valido={vClienteNuevo.direccion} mensajeError="Dirección muy corta" />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => setMostrarFormCliente(false)} className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-700">Cancelar</button>
              <button type="submit" disabled={!clienteNuevoCompleto} className={`px-6 py-3 rounded-xl font-bold text-sm ${clienteNuevoCompleto ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-400'}`}>Guardar Cliente</button>
            </div>
          </form>
        </div>
      )}

      {/* ============ FORMULARIO NUEVO VEHICULO ============ */}
      {mostrarFormVehiculo && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <Car className="h-5 w-5 text-emerald-700" />
              <span>Registrar Nuevo Vehículo</span>
            </h2>
          </div>
          <form onSubmit={crearVehiculo} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="VIN / Chasis" required placeholder="Ej. 8X9AB123456789001" value={formVehiculo.vin_chasis} onChange={v => setFormVehiculo({...formVehiculo, vin_chasis: v})} valido={vVehiculoNuevo.vin_chasis} mensajeError="Mínimo 5 caracteres" />
            <InputField label="Marca y Modelo" required placeholder="Ej. Toyota Prado" value={formVehiculo.marca_modelo} onChange={v => setFormVehiculo({...formVehiculo, marca_modelo: v})} valido={vVehiculoNuevo.marca_modelo} mensajeError="Mínimo 3 caracteres" />
            <InputField label="Placa" required placeholder="Ej. AB123CD" value={formVehiculo.placa} onChange={v => setFormVehiculo({...formVehiculo, placa: v.toUpperCase()})} valido={vVehiculoNuevo.placa} mensajeError="Placa corta" />
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Cliente <span className="text-red-500">*</span></label>
              <select value={formVehiculo.cliente} onChange={e => setFormVehiculo({...formVehiculo, cliente: e.target.value})} className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:outline-none focus:border-emerald-700">
                <option value="">Seleccione cliente...</option>
                {clientes.map(c => <option key={c.id_cliente} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Tipo de Servicio <span className="text-red-500">*</span></label>
              <select 
                value={formVehiculo.tipo_servicio} 
                onChange={e => setFormVehiculo({...formVehiculo, tipo_servicio: e.target.value})} 
                className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:outline-none focus:border-emerald-700"
              >
                <option value="Blindaje">Blindaje</option>
                <option value="Reparación">Reparación</option>
              </select>
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
              <button type="button" onClick={() => setMostrarFormVehiculo(false)} className="px-6 py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-700">Cancelar</button>
              <button type="submit" disabled={!vehiculoNuevoCompleto} className={`px-6 py-3 rounded-xl font-bold text-sm ${vehiculoNuevoCompleto ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-400'}`}>Guardar Vehículo</button>
            </div>
          </form>
        </div>
      )}

      {/* ============ TABLA CLIENTES ============ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-900" />
            <span>Clientes Registrados</span>
          </h2>
        </div>
        <table className="w-full text-sm text-left">
          <thead className="bg-white text-xs uppercase font-bold text-slate-500 border-b">
            <tr>
              <th className="p-4">Cliente</th>
              <th className="p-4">Cédula/RIF</th>
              <th className="p-4">Contacto</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientes.map(c => (
              <tr key={c.id_cliente} className="hover:bg-slate-50">
                <td className="p-4 font-bold text-slate-900">{c.nombre}</td>
                <td className="p-4 font-mono text-xs">{c.cedula_rif}</td>
                <td className="p-4 text-xs">{c.telefono} / {c.email}</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => abrirEdicionCliente(c)} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition" title="Editar">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => eliminarCliente(c.id_cliente)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ============ TARJETAS VEHICULOS ============ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Car className="h-5 w-5 text-emerald-700" />
            <span>Vehículos Registrados</span>
          </h2>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          {vehiculos.map(v => (
            <div key={v.id_vehiculo || v.id} className="p-5 border-2 border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-slate-900">{v.marca_modelo}</h3>
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${v.tipo_servicio === 'Reparación' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'}`}>
                    {v.tipo_servicio || 'Blindaje'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">VIN: {v.vin_chasis}</p>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">Placa: {v.placa}</p>
                <p className="text-xs text-blue-900 mt-1 font-semibold">Cliente: {v.cliente}</p>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-emerald-800">{v.estado_proceso}</span>
                <div className="flex space-x-1">
                  <button onClick={() => abrirEdicionVehiculo(v)} className="text-blue-600 p-1.5 rounded hover:bg-blue-100" title="Editar">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button onClick={() => eliminarVehiculo(v.id_vehiculo || v.id)} className="text-red-500 p-1.5 rounded hover:bg-red-100" title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ MODAL EMERGENTE: EDITAR CLIENTE ============ */}
      {modalEditCliente && clienteEditando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-5 bg-blue-950 text-white">
              <h2 className="font-bold text-lg flex items-center space-x-2">
                <Edit3 className="h-5 w-5" />
                <span>Editar Cliente: {clienteEditando.nombre}</span>
              </h2>
              <button onClick={() => setModalEditCliente(false)} className="text-slate-300 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={actualizarClienteSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Nombre Completo" required value={clienteEditando.nombre} onChange={v => setClienteEditando({...clienteEditando, nombre: v})} valido={vClienteEdit.nombre} mensajeError="Mínimo 3 caracteres" />
              <InputField label="Cédula / RIF" required value={clienteEditando.cedula_rif} onChange={v => setClienteEditando({...clienteEditando, cedula_rif: v})} valido={vClienteEdit.cedula_rif} mensajeError="Inválido" />
              <InputField label="Teléfono" required value={clienteEditando.telefono} onChange={v => setClienteEditando({...clienteEditando, telefono: v})} valido={vClienteEdit.telefono} mensajeError="Inválido" />
              <InputField label="Email" required tipo="email" value={clienteEditando.email} onChange={v => setClienteEditando({...clienteEditando, email: v})} valido={vClienteEdit.email} mensajeError="Inválido" />
              <div className="md:col-span-2">
                <InputField label="Dirección" required value={clienteEditando.direccion} onChange={v => setClienteEditando({...clienteEditando, direccion: v})} valido={vClienteEdit.direccion} mensajeError="Muy corta" />
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setModalEditCliente(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700">Cancelar</button>
                <button type="submit" disabled={!clienteEditCompleto} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${clienteEditCompleto ? 'bg-blue-900 text-white' : 'bg-slate-200 text-slate-400'}`}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ MODAL EMERGENTE: EDITAR VEHICULO ============ */}
      {modalEditVehiculo && vehiculoEditando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between p-5 bg-emerald-800 text-white">
              <h2 className="font-bold text-lg flex items-center space-x-2">
                <Edit3 className="h-5 w-5" />
                <span>Editar Vehículo: {vehiculoEditando.marca_modelo}</span>
              </h2>
              <button onClick={() => setModalEditVehiculo(false)} className="text-slate-300 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={actualizarVehiculoSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="VIN / Chasis" required value={vehiculoEditando.vin_chasis} onChange={v => setVehiculoEditando({...vehiculoEditando, vin_chasis: v})} valido={vVehiculoEdit.vin_chasis} mensajeError="Mínimo 5 caracteres" />
              <InputField label="Marca y Modelo" required value={vehiculoEditando.marca_modelo} onChange={v => setVehiculoEditando({...vehiculoEditando, marca_modelo: v})} valido={vVehiculoEdit.marca_modelo} mensajeError="Mínimo 3 caracteres" />
              <InputField label="Placa" required value={vehiculoEditando.placa} onChange={v => setVehiculoEditando({...vehiculoEditando, placa: v.toUpperCase()})} valido={vVehiculoEdit.placa} mensajeError="Placa corta" />
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Cliente <span className="text-red-500">*</span></label>
                <select value={vehiculoEditando.cliente} onChange={e => setVehiculoEditando({...vehiculoEditando, cliente: e.target.value})} className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:outline-none focus:border-emerald-700">
                  <option value="">Seleccione cliente...</option>
                  {clientes.map(c => <option key={c.id_cliente} value={c.nombre}>{c.nombre}</option>)}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Tipo de Servicio <span className="text-red-500">*</span></label>
                <select 
                  value={vehiculoEditando.tipo_servicio || 'Blindaje'} 
                  onChange={e => setVehiculoEditando({...vehiculoEditando, tipo_servicio: e.target.value})} 
                  className="w-full border-2 border-slate-200 bg-slate-50 rounded-lg p-3 text-sm font-medium focus:outline-none focus:border-emerald-700"
                >
                  <option value="Blindaje">Blindaje</option>
                  <option value="Reparación">Reparación</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Estado del Proceso</label>
                <div className="grid grid-cols-4 gap-2">
                  {['Ingresado', 'En Desarmado', 'En Instalación', 'Finalizado'].map(estado => (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => setVehiculoEditando({...vehiculoEditando, estado_proceso: estado})}
                      className={`py-2 px-2 rounded-lg font-bold text-xs border-2 transition ${vehiculoEditando.estado_proceso === estado ? 'bg-blue-900 text-white border-blue-900' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      {estado}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2 flex justify-end space-x-3 pt-4 border-t">
                <button type="button" onClick={() => setModalEditVehiculo(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition">Cancelar</button>
                <button type="submit" disabled={!vehiculoEditCompleto} className={`px-5 py-2.5 rounded-xl font-bold text-sm ${vehiculoEditCompleto ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'bg-slate-200 text-slate-400'} transition`}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}