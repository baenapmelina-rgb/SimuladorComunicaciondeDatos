// ============================================================
// main.js
// Coordinador principal de la aplicación.
// ============================================================
 
const $ = id => document.getElementById(id);
 
document.addEventListener("DOMContentLoaded", () => {
 
    // Pestañas
    $("tabGenerico").addEventListener("click", () => cambiarModo("generico"));
    $("tabContactless").addEventListener("click", () => cambiarModo("contactless"));
 
    // Modo genérico
    $("btnSimular").addEventListener("click", iniciarSimulacion);
 
    // Modo contactless
    $("btnContactless").addEventListener("click", simularContactless);
    $("btnComparar").addEventListener("click", compararControlesUI);
    $("cPreset").addEventListener("change", aplicarPreset);
    $("cCanal").addEventListener("change", actualizarCamposCanal);
    $("btnAnalizarCaptura").addEventListener("click", analizarCaptura);
    $("btnArmarSelect").addEventListener("click", armarSelectDesdeCaptura);
 
    actualizarCamposCanal();
});
 
function cambiarModo(modo) {
    const gen = modo === "generico";
    $("modoGenerico").classList.toggle("oculto", !gen);
    $("modoContactless").classList.toggle("oculto", gen);
    $("tabGenerico").classList.toggle("activa", gen);
    $("tabContactless").classList.toggle("activa", !gen);
}
 
// ============================================================
// MODO GENÉRICO
// ============================================================
 
function iniciarSimulacion() {
    try {
        const mensaje = $("mensaje").value.trim();
        const tamañoPaquete = Number($("tamañoPaquete").value);
        const perdida = Number($("perdida").value);
        const ruido = Number($("ruido").value);
        const latencia = Number($("latencia").value);
        const modulacion = $("modulacion").value;
        const control = $("control").value;
 
        if (!mensaje) {
            alert("Ingresá un mensaje para comenzar la simulación.");
            return;
        }
        if (!Number.isInteger(tamañoPaquete) || tamañoPaquete <= 0 ||
            perdida < 0 || perdida > 100 || ruido < 0 || ruido > 100 || latencia < 0) {
            alert("Revisá los valores de configuración.");
            return;
        }
 
        const configuracion = { tamañoPaquete, perdida, ruido, latencia, modulacion, control };
 
        const bits = textoABits(mensaje);
        const paquetes = crearPaquetes(bits, tamañoPaquete);
 
        // Señal modulada de los primeros bits (visualización)
        dibujarModulacion($("canvasModulacion"), bits.slice(0, 16), modulacion);
 
        // Canal: modulación → ruido → demodulación
        let recibidos = simularCanal(paquetes, configuracion);
 
        // Receptor: verificación de integridad
        recibidos = analizarErrores(recibidos, control);
 
        const mensajeRecibido = reconstruirMensaje(recibidos);
        const metricas = calcularMetricas(paquetes, recibidos);
        const comparacion = compararModulaciones(ruido);
        const recomendaciones = obtenerRecomendacion(configuracion, metricas, comparacion);
 
        actualizarInterfaz(mensaje, mensajeRecibido, recibidos, metricas, recomendaciones);
 
    } catch (error) {
        console.error(error);
        alert("Ocurrió un error durante la simulación: " + error.message);
    }
}
 
function actualizarInterfaz(mensaje, mensajeRecibido, paquetes, metricas, recomendaciones) {
 
    $("mensajeEmisor").textContent = mensaje;
    $("mensajeReceptor").textContent = mensajeRecibido;
 
    const tabla = $("tablaPaquetes");
    tabla.innerHTML = "";
    paquetes.forEach(p => {
        const fila = document.createElement("tr");
        fila.innerHTML = `
            <td>${p.id}</td>
            <td>${p.secuencia}</td>
            <td class="mono">${p.bitsRecibidos || "-"}</td>
            <td>${p.bitsOriginales.length}</td>
            <td>${p.estado}</td>
            <td>${p.errorDetectado ? "Sí" : "No"}</td>
            <td>${p.bitsAlterados}</td>
            <td>${p.estado === "perdido" ? "-" : p.latencia.toFixed(2) + " ms"}</td>`;
        tabla.appendChild(fila);
    });
 
    $("mEnviados").textContent = metricas.enviados;
    $("mCorrectos").textContent = metricas.correctos;
    $("mPerdidos").textContent = metricas.perdidos;
    $("mRechazados").textContent = metricas.rechazados;
    $("mNoDetectados").textContent = metricas.noDetectados;
    $("mBer").textContent = metricas.ber.toFixed(4);
    $("mLatencia").textContent = metricas.latenciaPromedio.toFixed(2) + " ms";
    $("mTasaEntrega").textContent = metricas.tasaEntrega.toFixed(2) + " %";
    $("mEficiencia").textContent = metricas.eficiencia.toFixed(2) + " %";
 
    const contenedor = $("recomendacion");
    contenedor.innerHTML = "";
    recomendaciones.forEach(r => {
        const el = document.createElement("div");
        el.classList.add("recomendacion-item");
        el.textContent = "• " + r;
        contenedor.appendChild(el);
    });
}
 
// ============================================================
// MODO CONTACTLESS (ISO/IEC 14443 Tipo A)
// ============================================================
 
const PRESETS = {
    reqa:    { hex: "26",    tipo: "corta",    control: "ninguno",     dir: "lector-tarjeta" },
    wupa:    { hex: "52",    tipo: "corta",    control: "ninguno",     dir: "lector-tarjeta" },
    anticol: { hex: "93 20", tipo: "estandar", control: "paridad",     dir: "lector-tarjeta" },
    hlta:    { hex: "50 00", tipo: "estandar", control: "paridad+crc", dir: "lector-tarjeta" },
    atqa:    { hex: "04 00", tipo: "estandar", control: "paridad",     dir: "tarjeta-lector" }
};
 
function aplicarPreset() {
    const p = PRESETS[$("cPreset").value];
    if (!p) return;
    $("cDatos").value = p.hex;
    $("cTipoTrama").value = p.tipo;
    $("cControl").value = p.control;
    $("cDireccion").value = p.dir;
}
 
function actualizarCamposCanal() {
    const canal = $("cCanal").value;
    $("campoP").classList.toggle("oculto", canal !== "bsc");
    $("campoSigma").classList.toggle("oculto", canal !== "awgn");
    $("campoDistancia").classList.toggle("oculto", canal !== "awgn");
}
 
function leerHex(texto) {
    const partes = texto.trim().split(/[\s,]+/).filter(Boolean);
    if (partes.length === 0) throw new Error("Ingresá al menos un byte en hexadecimal.");
    return partes.map(p => {
        if (!/^[0-9a-fA-F]{1,2}$/.test(p)) throw new Error("Byte hexadecimal inválido: " + p);
        return parseInt(p, 16);
    });
}
 
function hex(bytes) {
    return bytes.map(b => b.toString(16).toUpperCase().padStart(2, "0")).join(" ");
}
 
function leerConfigContactless() {
    const datos = leerHex($("cDatos").value);
    const tipoTrama = $("cTipoTrama").value;
    if (tipoTrama === "estandar" && $("cControl").value === "paridad+crc" && datos.length < 1) {
        throw new Error("La trama necesita datos.");
    }
    const cfg = {
        datos,
        tipoTrama,
        control: tipoTrama === "corta" ? "ninguno" : $("cControl").value,
        direccion: $("cDireccion").value,
        canal: $("cCanal").value,
        p: Number($("cP").value) / 100,
        sigma: Number($("cSigma").value),
        distancia: Number($("cDistancia").value)
    };
    if (cfg.p < 0 || cfg.p > 1 || cfg.sigma < 0 || cfg.distancia < 1) {
        throw new Error("Revisá los parámetros del canal.");
    }
    return cfg;
}
 
// Cadena de bits con los errores resaltados
function bitsHTML(tx, rx, paso, resaltar) {
    let html = "";
    for (let i = 0; i < rx.length; i++) {
        if (paso && i > 0 && i % paso === 0) html += " ";
        const malo = resaltar && tx[i] !== rx[i];
        html += malo ? `<span class="bit-error">${rx[i]}</span>` : rx[i];
    }
    return html;
}
 
function simularContactless() {
    try {
        const cfg = leerConfigContactless();
        const repeticiones = Math.max(1, Math.min(20000, Number($("cRepeticiones").value) || 1));
 
        const r = transmitirTrama(cfg);
        const paso = cfg.tipoTrama === "estandar" ? (cfg.control === "ninguno" ? 8 : 9) : 0;
 
        // Detalle de una transmisión
        $("cBitsTx").innerHTML = bitsHTML(r.bitsTx, r.bitsTx, paso, false);
        $("cBitsRx").innerHTML = bitsHTML(r.bitsTx, r.bitsRx, paso, true);
        $("cBytes").textContent = r.bytesRx.length ? hex(r.bytesRx) : "—";
        $("cCrc").textContent = r.crc
            ? "CRC_A de " + hex(cfg.datos) + " = " + hex(r.crc)
            : "No aplica (trama corta)";
        $("cEstado").textContent = !r.aceptada
            ? "Trama rechazada (error detectado)"
            : r.errorNoDetectado
                ? "Aceptada con errores (no detectados)"
                : "Trama aceptada";
        $("cEstado").className = !r.aceptada ? "estado-mal" : r.errorNoDetectado ? "estado-alerta" : "estado-bien";
        $("cTiempo").textContent = r.tiempoUs.toFixed(1) + " µs en el aire a 106 kbit/s (bit ≈ " + PERIODO_BIT_US.toFixed(2) + " µs)";
        $("cErroresBits").textContent = r.erroresBits;
 
        const nombreCod = cfg.direccion === "lector-tarjeta" ? "Miller modificado (ASK 100 %)" : "Manchester sobre subportadora";
        $("cTituloOnda").textContent = "Señal transmitida: " + nombreCod;
        dibujarOndaDigital($("canvasTx"), r.ondaTx, r.simbolosTx, "#2563eb");
        $("cTituloOndaRx").textContent = cfg.canal === "ideal"
            ? "Señal recibida (canal ideal: igual a la transmitida)"
            : "Señal recibida (después del canal)";
        dibujarOndaDigital($("canvasRx"), r.ondaRx, r.simbolosRx, "#0f766e");
 
        // Estadísticas con muchas repeticiones
        const e = ejecutarExperimento(cfg, repeticiones);
        $("cmRepeticiones").textContent = e.repeticiones;
        $("cmBitsTrama").textContent = e.bitsPorTrama;
        $("cmBer").textContent = e.ber.toFixed(5);
        $("cmAceptadas").textContent = (e.aceptadas / e.repeticiones * 100).toFixed(2) + " %";
        $("cmRechazadas").textContent = (e.rechazadas / e.repeticiones * 100).toFixed(2) + " %";
        $("cmNoDetectadas").textContent = e.noDetectadas;
        $("cmEficiencia").textContent = e.eficiencia.toFixed(1) + " %";
        $("cmTeorica").textContent = e.probSinErroresTeorica === null
            ? "—"
            : (e.probSinErroresTeorica * 100).toFixed(2) + " % (teórico) vs " +
              ((e.repeticiones - e.tramasConError) / e.repeticiones * 100).toFixed(2) + " % (simulado)";
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}
 
function compararControlesUI() {
    try {
        const cfg = leerConfigContactless();
        if (cfg.tipoTrama === "corta") {
            alert("La comparación aplica a tramas estándar (las tramas cortas no llevan paridad ni CRC).");
            return;
        }
        const repeticiones = Math.max(1, Math.min(5000, Number($("cRepeticiones").value) || 1));
        const filas = compararControles(cfg, repeticiones);
        const nombres = { "ninguno": "Sin control", "paridad": "Solo paridad", "paridad+crc": "Paridad + CRC_A" };
        const tbody = $("tablaComparacion");
        tbody.innerHTML = "";
        filas.forEach(f => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${nombres[f.control]}</td>
                <td>${f.bitsPorTrama}</td>
                <td>${f.eficiencia.toFixed(1)} %</td>
                <td>${f.ber.toFixed(5)}</td>
                <td>${(f.aceptadas / f.repeticiones * 100).toFixed(2)} %</td>
                <td>${(f.rechazadas / f.repeticiones * 100).toFixed(2)} %</td>
                <td>${f.noDetectadas}</td>`;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}
 
// ============================================================
// CAPTURAS REALES (hardware)
// Formato esperado (salida del Arduino): evento,datos,tiempo_us
// ============================================================
 
let ultimoUID = null;
 
function analizarCaptura() {
    const lineas = $("capturaTexto").value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const filas = [];
    for (const l of lineas) {
        if (l.toLowerCase().startsWith("evento")) continue;
        const partes = l.split(",");
        if (partes.length < 2) continue;
        filas.push({ evento: partes[0].trim(), datos: (partes[1] || "").trim(), t: Number(partes[2]) });
    }
    if (filas.length === 0) {
        $("capturaResumen").textContent = "No se encontraron líneas válidas. Pegá la salida del Monitor Serie (evento,datos,tiempo_us).";
        return;
    }
 
    const grupos = {};
    filas.forEach(f => {
        if (!Number.isNaN(f.t) && f.t > 0) (grupos[f.evento] = grupos[f.evento] || []).push(f.t);
    });
 
    let html = `<p>${filas.length} líneas leídas.</p><table><thead><tr><th>Evento</th><th>Muestras</th><th>Mín (µs)</th><th>Prom (µs)</th><th>Máx (µs)</th></tr></thead><tbody>`;
    for (const [ev, ts] of Object.entries(grupos)) {
        const prom = ts.reduce((a, b) => a + b, 0) / ts.length;
        html += `<tr><td>${ev}</td><td>${ts.length}</td><td>${Math.min(...ts)}</td><td>${prom.toFixed(0)}</td><td>${Math.max(...ts)}</td></tr>`;
    }
    html += "</tbody></table><p class=\"nota\">Los tiempos incluyen la ejecución del código del Arduino y de la librería, por lo que son aproximados y mayores que los del aire.</p>";
 
    const uids = filas.filter(f => f.evento === "UID");
    ultimoUID = null;
    if (uids.length) {
        const bytes = uids[uids.length - 1].datos.split(/\s+/).filter(Boolean).map(h => parseInt(h, 16));
        if (bytes.length === 4 && bytes.every(b => !Number.isNaN(b))) {
            ultimoUID = bytes;
            html += `<p>Último UID capturado: <strong class="mono">${hex(bytes)}</strong></p>`;
        } else {
            html += `<p class="nota">Se encontró un UID de ${bytes.length} bytes: el armado automático de SELECT solo está implementado para UID de 4 bytes.</p>`;
        }
    }
    $("capturaResumen").innerHTML = html;
    $("btnArmarSelect").disabled = ultimoUID === null;
}
 
// SELECT (nivel de cascada 1) = 93 70 + UID(4) + BCC, con paridad y CRC_A
function armarSelectDesdeCaptura() {
    if (!ultimoUID) return;
    const bcc = ultimoUID.reduce((a, b) => a ^ b, 0);
    const trama = [0x93, 0x70, ...ultimoUID, bcc];
    $("cPreset").value = "custom";
    $("cDatos").value = hex(trama);
    $("cTipoTrama").value = "estandar";
    $("cControl").value = "paridad+crc";
    $("cDireccion").value = "lector-tarjeta";
    simularContactless();
    $("modoContactless").scrollIntoView({ behavior: "smooth" });
}