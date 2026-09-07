// ============================================================
// packets.js
// Gestión de mensajes, bits y paquetes.
// ============================================================


// ------------------------------------------------------------
// TEXTO → BITS
// ------------------------------------------------------------

function textoABits(texto) {

    const encoder = new TextEncoder();
    const bytes = encoder.encode(texto);

    let bits = "";

    for (const byte of bytes) {
        bits += byte.toString(2).padStart(8, "0");
    }

    return bits;
}


// ------------------------------------------------------------
// BITS → TEXTO
// ------------------------------------------------------------

function bitsATexto(bits) {

    if (!bits || bits.length === 0) {
        return "";
    }

    const bytes = [];

    for (let i = 0; i < bits.length; i += 8) {

        const byteBits = bits.slice(i, i + 8);

        if (byteBits.length < 8) {
            break;
        }

        bytes.push(parseInt(byteBits, 2));
    }

    const decoder = new TextDecoder();

    return decoder.decode(new Uint8Array(bytes));
}


// ------------------------------------------------------------
// CREAR PAQUETES
// ------------------------------------------------------------

function crearPaquetes(bits, tamañoPaquete) {

    const paquetes = [];

    if (!bits || bits.length === 0) {
        return paquetes;
    }

    if (tamañoPaquete <= 0) {
        throw new Error("El tamaño del paquete debe ser mayor que cero.");
    }

    for (let i = 0; i < bits.length; i += tamañoPaquete) {

        const datos = bits.slice(i, i + tamañoPaquete);

        const paquete = {

            id: i / tamañoPaquete + 1,

            secuencia: i / tamañoPaquete + 1,

            datos: datos,

            tamaño: datos.length,

            estado: "pendiente",

            error: false,

            bitsOriginales: datos,

            bitsRecibidos: datos,

            retransmisiones: 0,

            latencia: 0

        };

        paquetes.push(paquete);
    }

    return paquetes;
}


// ------------------------------------------------------------
// ORDENAR PAQUETES
// ------------------------------------------------------------

function ordenarPaquetes(paquetes) {

    return [...paquetes].sort(
        (a, b) => a.secuencia - b.secuencia
    );
}


// ------------------------------------------------------------
// RECONSTRUIR BITS
// ------------------------------------------------------------

function reconstruirBits(paquetes) {

    const paquetesOrdenados = ordenarPaquetes(paquetes);

    return paquetesOrdenados
        .filter(paquete => paquete.estado !== "perdido")
        .map(paquete => paquete.bitsRecibidos)
        .join("");
}


// ------------------------------------------------------------
// RECONSTRUIR MENSAJE
// ------------------------------------------------------------

function reconstruirMensaje(paquetes) {

    const bits = reconstruirBits(paquetes);

    return bitsATexto(bits);
}