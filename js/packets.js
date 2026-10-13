// ============================================================
// packets.js
// Gestión de mensajes, bits y paquetes.
// ============================================================

// TEXTO → BITS (modo genérico: bit más significativo primero)
function textoABits(texto) {
    const bytes = new TextEncoder().encode(texto);
    let bits = "";
    for (const byte of bytes) {
        bits += byte.toString(2).padStart(8, "0");
    }
    return bits;
}

// BITS → TEXTO
function bitsATexto(bits) {
    if (!bits || bits.length === 0) return "";
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(parseInt(bits.slice(i, i + 8), 2));
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
}

// CREAR PAQUETES
function crearPaquetes(bits, tamañoPaquete) {
    const paquetes = [];
    if (!bits || bits.length === 0) return paquetes;
    if (tamañoPaquete <= 0) {
        throw new Error("El tamaño del paquete debe ser mayor que cero.");
    }
    for (let i = 0; i < bits.length; i += tamañoPaquete) {
        const datos = bits.slice(i, i + tamañoPaquete);
        paquetes.push({
            id: i / tamañoPaquete + 1,
            secuencia: i / tamañoPaquete + 1,
            datos: datos,
            tamaño: datos.length,
            estado: "pendiente",
            error: false,
            bitsOriginales: datos,
            bitsTransmitidos: datos,   // datos + redundancia (se completa en el canal)
            bitsRecibidos: datos,
            bitsAlterados: 0,
            datosEntregados: datos,    // datos tras quitar la redundancia
            aceptado: false,
            errorDetectado: false,
            errorNoDetectado: false,
            retransmisiones: 0,
            latencia: 0
        });
    }
    return paquetes;
}

// ORDENAR PAQUETES
function ordenarPaquetes(paquetes) {
    return [...paquetes].sort((a, b) => a.secuencia - b.secuencia);
}

// RECONSTRUIR BITS
// Los paquetes perdidos o rechazados se rellenan con ceros para conservar la
// alineación del resto del mensaje.
function reconstruirBits(paquetes) {
    return ordenarPaquetes(paquetes)
        .map(p => p.aceptado
            ? p.datosEntregados
            : "0".repeat(p.bitsOriginales.length))
        .join("");
}

// RECONSTRUIR MENSAJE
// Los caracteres nulos (paquetes faltantes) se muestran como "·".
function reconstruirMensaje(paquetes) {
    return bitsATexto(reconstruirBits(paquetes)).replace(/\u0000/g, "·");
}