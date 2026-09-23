import React, { useState, useEffect } from 'react';
import { Cpu, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Swal from 'sweetalert2';

export default function ModuloAnalisisIA({ listaMateriales = [], datosGrafico = [] }) {
  // Función auxiliar para extraer el ID correcto sin importar cómo lo llame la BD
  const obtenerIdReal = (item) => {
    if (!item) return '';
    return item.id_material || item.id || item.M_ID || item.codigo_lote || '';
  };

  const [idMaterialSeleccionado, setIdMaterialSeleccionado] = useState('');
  const [prediccion, setPrediccion] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Inicializar el ID cuando llegue la lista de materiales
  useEffect(() => {
    if (listaMateriales.length > 0 && !idMaterialSeleccionado) {
      const primerId = obtenerIdReal(listaMateriales[0]);
      if (primerId) {
        setIdMaterialSeleccionado(primerId);
      }
    }
  }, [listaMateriales, idMaterialSeleccionado]);

  const obtenerPrediccionIA = async (id) => {
    if (!id) return;
    setCargando(true);
    try {
      console.log("Consultando IA para ID:", id);
      const res = await fetch(`http://localhost:5001/api/ia/prediccion-stock/${id}`);
      if (!res.ok) throw new Error('Error al conectar con la API de IA');
      const data = await res.json();
      setPrediccion(data);
    } catch (error) {
      console.error('Error fetching IA prediction:', error);
      setPrediccion(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (idMaterialSeleccionado) {
      obtenerPrediccionIA(idMaterialSeleccionado);
    }
  }, [idMaterialSeleccionado]);

  return (
    <div className="space-y-8 p-2">
      
      {/* BARRA SUPERIOR DE CONTROL DE IA */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Cpu className="h-6 w-6 text-blue-900" />
            <span>Asistente de Predicción e Insumos</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Análisis predictivo de agotamiento balístico y logística de reabastecimiento.
          </p>
        </div>

        {/* SELECTOR DE MATERIAL ROBUSTO */}
        <div className="w-full md:w-80">
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">
            Material a Analizar
          </label>
          <select 
            value={idMaterialSeleccionado}
            onChange={(e) => {
              const nuevoId = e.target.value;
              setIdMaterialSeleccionado(nuevoId);
              obtenerPrediccionIA(nuevoId);
            }}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-900"
          >
            {listaMateriales.map((m, idx) => {
              const realId = obtenerIdReal(m);
              const nombre = m?.nombre || m?.M_ID || m?.codigo_lote || `Material ${idx + 1}`;
              const stock = m?.cantidad_disponible ?? 0;
              return (
                <option key={realId || idx} value={realId}>
                  {nombre} ({stock} disp.)
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* TARJETAS KPI DE DIAGNÓSTICO DE IA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* KPI 1: STOCK ACTUAL */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md relative">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Material Monitoreado
          </span>
          <h3 className="text-sm font-bold text-slate-900 mt-1 truncate">
            {cargando ? 'Cargando...' : prediccion?.material || 'Seleccione Material'}
          </h3>
          <p className="text-2xl font-black text-blue-950 mt-2">
            {cargando 
              ? '---' 
              : prediccion?.stock_actual !== undefined 
                ? `${prediccion.stock_actual} ${prediccion?.unidad_medida || 'm²'}` 
                : '---'}
          </p>
        </div>

        {/* KPI 2: PROYECCIÓN DE AGOTAMIENTO */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Agotamiento Proyectado
          </span>
          <h3 className="text-xs font-semibold text-slate-600 mt-1">Uso Estimado Contínuo</h3>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {cargando 
              ? '---' 
              : prediccion?.dias_restantes_estimados !== undefined 
                ? `${prediccion.dias_restantes_estimados} Días` 
                : '---'}
          </p>
        </div>

        {/* KPI 3: TIEMPO DEL PROVEEDOR */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Tiempo Proveedor
          </span>
          <h3 className="text-xs font-semibold text-slate-600 mt-1">Lead Time Despacho</h3>
          <p className="text-2xl font-black text-indigo-900 mt-2">
            {cargando 
              ? '---' 
              : prediccion?.tiempo_proveedor_dias !== undefined 
                ? `${prediccion.tiempo_proveedor_dias} Días` 
                : '---'}
          </p>
        </div>

        {/* KPI 4: RECOMPRA SUGERIDA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Lote de Recompra
          </span>
          <h3 className="text-xs font-semibold text-slate-600 mt-1">Sugerencia para 15 Días</h3>
          <p className="text-2xl font-black text-emerald-700 mt-2">
            {cargando 
              ? '---' 
              : prediccion?.sugerencia_recompra !== undefined 
                ? `${prediccion.sugerencia_recompra} ${prediccion?.unidad_medida || 'm²'}` 
                : '---'}
          </p>
        </div>

        {/* KPI 5: ESTADO / ALERTA */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-md flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Diagnóstico IA
          </span>
          <div className={`mt-2 p-2.5 rounded-lg text-center font-bold text-xs uppercase border ${
            cargando
              ? 'bg-slate-100 text-slate-500 border-slate-200'
              : prediccion?.estado_alerta?.includes('CRÍTICO') 
                ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' 
                : prediccion?.estado_alerta?.includes('ADVERTENCIA')
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {cargando ? 'Evaluando...' : prediccion?.estado_alerta || 'Sin Datos'}
          </div>
        </div>

      </div>

      {/* SECCIÓN INFERIOR: GRÁFICO Y PANEL DE RECOMENDACIONES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GRÁFICO BARRAS: TOP MATERIALES EN STOCK */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>Top Materiales en Stock</span>
            <span className="text-xs text-slate-400 font-normal">Vista General</span>
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafico} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nombre" stroke="#64748b" fontSize={10} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Bar dataKey="Stock" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PANEL TÁCTICO DE DECISIÓN */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">
              Evaluación Táctica de Reabastecimiento
            </h2>
            <div className="space-y-3 text-xs text-slate-600 font-medium">
              
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Consumo Diario Calculado:</strong> Se estima un uso continuo de <strong>{prediccion?.consumo_diario_estimado || 0} {prediccion?.unidad_medida || 'm²'}/día</strong> según la tendencia reciente del taller.
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Fecha Límite Sugerida:</strong> Realizar el pedido a más tardar el <strong>{prediccion?.fecha_limite_orden || 'Inmediato'}</strong> para evitar desabastecer la planta antes de la llegada del despacho.
                </span>
              </div>

            </div>
          </div>

          <button 
            onClick={async () => {
              if (!prediccion) return;

              // Confirmar antes de generar
              const confirm = await Swal.fire({
                icon: 'question',
                title: '¿Generar orden de compra?',
                html: `
                  <div style="text-align: left; font-size: 13px;">
                    <p style="margin-bottom: 8px;">Se creará una <strong>orden de compra pendiente</strong> para:</p>
                    <p style="font-weight: bold; color: #1e3a8a; font-size: 15px; margin: 8px 0;">
                      ${prediccion.sugerencia_recompra} ${prediccion.unidad_medida || 'unidades'} de ${prediccion.material}
                    </p>
                    <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; margin-top: 12px;">
                      <p style="margin: 4px 0;"><strong>📄 Nº de orden:</strong> automático (ORD-XXXXX)</p>
                      <p style="margin: 4px 0;"><strong>🛒 Estado:</strong> Pendiente</p>
                      <p style="margin: 4px 0;"><strong>📅 Fecha límite:</strong> ${prediccion.fecha_limite_orden || 'No definida'}</p>
                      <p style="margin: 4px 0;"><strong>⚠️ Alerta:</strong> ${prediccion.estado_alerta}</p>
                    </div>
                    <p style="margin-top: 12px; color: #64748b; font-size: 12px;">
                      También se creará un recordatorio en el calendario y podrás descargar el PDF.
                    </p>
                  </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Sí, generar orden',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#1e3a8a',
                cancelButtonColor: '#64748b',
                width: '550px'
              });

              if (!confirm.isConfirmed) return;

              // Enviar al backend
              try {
                Swal.fire({
                  title: 'Generando orden...',
                  didOpen: () => Swal.showLoading(),
                  allowOutsideClick: false
                });

                const res = await fetch('http://localhost:5000/api/compras/desde-ia', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id_material: prediccion.id_material,
                    cantidad_sugerida: prediccion.sugerencia_recompra,
                    motivo: prediccion.estado_alerta,
                    fecha_limite: prediccion.fecha_limite_orden && prediccion.fecha_limite_orden !== 'Sin historial suficiente'
                      ? prediccion.fecha_limite_orden
                      : null,
                    nivel_alerta: prediccion.estado_alerta
                  })
                });

                const data = await res.json();

                if (res.ok) {
                  // Éxito: mostrar confirmación con opciones
                  const resultado = await Swal.fire({
                    icon: 'success',
                    title: '¡Orden generada!',
                    html: `
                      <div style="text-align: left; font-size: 14px;">
                        <p style="margin-bottom: 12px;">La orden se registró correctamente:</p>
                        <div style="background: #f0fdf4; padding: 12px; border-radius: 8px; border-left: 4px solid #16a34a;">
                          <p style="margin: 4px 0;"><strong>📄 Nº de orden:</strong> 
                            <span style="font-family: monospace; color: #1e3a8a; font-weight: bold;">
                              ${data.numero_orden}
                            </span>
                          </p>
                          <p style="margin: 4px 0;"><strong>👤 Proveedor:</strong> ${data.proveedor}</p>
                          <p style="margin: 4px 0;"><strong>📦 Material:</strong> ${data.material}</p>
                          <p style="margin: 4px 0;"><strong>📊 Cantidad:</strong> ${data.cantidad} ${data.unidad || ''}</p>
                        </div>
                        <p style="margin-top: 12px; font-size: 12px; color: #64748b;">
                          Se creó un recordatorio en el calendario. La orden aparece en el módulo "Compras" con estado Pendiente.
                        </p>
                      </div>
                    `,
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: '📄 Ver PDF',
                    denyButtonText: '🛒 Ir a Compras',
                    cancelButtonText: 'Cerrar',
                    confirmButtonColor: '#1e3a8a',
                    denyButtonColor: '#10b981',
                    cancelButtonColor: '#64748b'
                  });

                  if (resultado.isConfirmed) {
                    // Abrir PDF en nueva pestaña
                    window.open(`http://localhost:5000/api/compras/${data.id_compra}/factura`, '_blank');
                  } else if (resultado.isDenied) {
                    // Ir al módulo de compras (necesitas una forma de cambiar de pestaña)
                    // Si ModuloAnalisisIA tiene una prop para cambiar de pestaña, úsala
                    if (window.cambiarPestanaACompras) {
                      window.cambiarPestanaACompras();
                    } else {
                      Swal.fire({
                        icon: 'info',
                        title: 'Ve al módulo Compras',
                        text: 'Haz click en la pestaña "Compras" en el menú superior para ver la orden.',
                        confirmButtonColor: '#1e3a8a'
                      });
                    }
                  }
                } else {
                  Swal.fire('Error', data.error || 'No se pudo generar la orden', 'error');
                }
              } catch (error) {
                Swal.fire('Error de conexión', error.message, 'error');
              }
            }}
            disabled={cargando || !prediccion}
            className="w-full mt-4 bg-blue-950 hover:bg-blue-900 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-lg text-xs shadow transition flex items-center justify-center space-x-2"
          >
            {cargando && <RefreshCw className="h-4 w-4 animate-spin" />}
            <span>Generar Orden de Compra Automática</span>
          </button>
        </div>
      </div>
    </div>
  );
}