// ============================================================
// errors.js
// Detección de errores: paridad, checksum y CRC-8.
// El receptor recalcula la redundancia sobre lo que RECIBIÓ y la
// compara con la que RECIBIÓ (no usa los datos originales).
// ============================================================

// PARIDAD (par): devuelve 0 o 1
function calcularParidad(bits) {
    let unos = 0;
    for (const bit of bits) {
        if (bit === "1") unos++;
    }
    return unos % 2;
}

// CHECKSUM: suma de bytes módulo 256 (el último byte incompleto se completa con ceros)
function calcularChecksum(bits) {
    let suma = 0;
    for (let i = 0; i < bits.length; i += 8) {
        const byte = bits.slice(i, i + 8).padEnd(8, "0");
        suma += parseInt(byte, 2);
    }
    return suma % 256;
}

// CRC-8 (polinomio x^8 + x^2 + x + 1)
function calcularCRC(bits) {
    const polinomio = "100000111";
    let datos = bits + "00000000";
    for (let i = 0; i <= datos.length - polinomio.length; i++) {
        if (datos[i] === "1") {
            let parte = "";
            for (let j = 0; j < polinomio.length; j++) {
                parte += datos[i + j] === polinomio[j] ? "0" : "1";
            }
            datos = datos.slice(0, i) + parte + datos.slice(i + polinomio.length);
        }
    }
    return datos.slice(-8);
}

// Cantidad de bits de redundancia que agrega cada método
const REDUNDANCIA = { ninguno: 0, paridad: 1, checksum: 8, crc: 8 };

// TRANSMISOR: agrega la redundancia al final de los datos
function proteger(bits, modo) {
    switch (modo) {
        case "paridad":  return bits + String(calcularParidad(bits));
        case "checksum": return bits + calcularChecksum(bits).toString(2).padStart(8, "0");
        case "crc":      return bits + calcularCRC(bits);
        default:         return bits;
    }
}

// RECEPTOR: separa datos y redundancia, recalcula y compara
function verificar(bitsRecibidos, modo, cantidadDatos) {
    if (modo === "ninguno") {
        return { ok: true, datos: bitsRecibidos };
    }
    const datos = bitsRecibidos.slice(0, cantidadDatos);
    const recibida = bitsRecibidos.slice(cantidadDatos);
    let ok;
    switch (modo) {
        case "paridad":
            ok = String(calcularParidad(datos)) === recibida;
            break;
        case "checksum":
            ok = calcularChecksum(datos).toString(2).padStart(8, "0") === recibida;
            break;
        case "crc":
            ok = calcularCRC(datos) === recibida;
            break;
        default:
            ok = true;
    }
    return { ok, datos };
}

// ANALIZAR PAQUETES RECIBIDOS
// Estados finales: "perdido", "rechazado" (error detectado),
// "correcto" y "error no detectado" (llegó corrupto y se aceptó).
function analizarErrores(paquetes, modoControl) {
    return paquetes.map(paquete => {
        if (paquete.estado === "perdido") {
            return { ...paquete, aceptado: false, errorDetectado: false, errorNoDetectado: false };
        }
        const v = verificar(paquete.bitsRecibidos, modoControl, paquete.bitsOriginales.length);
        const corrupto = v.datos !== paquete.bitsOriginales;
        let estado;
        if (!v.ok) estado = "rechazado";
        else if (corrupto) estado = "error no detectado";
        else estado = "correcto";
        return {
            ...paquete,
            estado,
            datosEntregados: v.datos,
            aceptado: v.ok,
            errorDetectado: !v.ok,
            errorNoDetectado: v.ok && corrupto
        };
    });
}