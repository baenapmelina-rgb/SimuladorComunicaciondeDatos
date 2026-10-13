// ============================================================
// contactless.js
// Escenario ISO/IEC 14443 Tipo A (106 kbit/s).
// Cadena: bytes → bits (+paridad, +CRC_A) → codificación → forma de onda
//         → canal → decodificación → verificación.
//
// IMPORTANTE: las reglas de codificación, el valor inicial del CRC y la
// paridad impar están escritos según el conocimiento disponible del estándar.
// Verificarlos contra ISO/IEC 14443-2 y -3 (o una nota de NXP) antes de
// citarlos como definitivos.
//
// Simplificaciones declaradas: sincronización ideal del receptor y forma de
// onda a nivel de envolvente (1 = campo/subportadora presente, 0 = ausente).
// ============================================================

var MUESTRAS_POR_MITAD = 32;          // 8 ciclos de subportadora por mitad de bit
var PERIODO_BIT_US = 128 / 13.56;     // 128/fc ≈ 9,44 µs (106 kbit/s)

// ---------- 1. Bits, paridad y CRC_A ----------

// Un byte → 8 bits, el menos significativo primero (así se transmite en 14443A)
function byteABitsLSB(b) {
    const bits = [];
    for (let i = 0; i < 8; i++) bits.push((b >> i) & 1);
    return bits;
}

function bitsLSBAByte(bits) {
    let b = 0;
    for (let i = 0; i < bits.length; i++) b |= (bits[i] & 1) << i;
    return b;
}

// Bit de paridad IMPAR: la cantidad total de unos (8 datos + paridad) es impar
function paridadImpar(b) {
    let unos = 0;
    for (let i = 0; i < 8; i++) unos += (b >> i) & 1;
    return 1 - (unos % 2);
}

// CRC_A: valor inicial 0x6363, polinomio x^16 + x^12 + x^5 + 1.
// Devuelve [byteBajo, byteAlto]. Control: crcA([0x50, 0x00]) → [0x57, 0xCD]
function crcA(datos) {
    let crc = 0x6363;
    for (let b of datos) {
        b ^= crc & 0xFF;
        b = (b ^ (b << 4)) & 0xFF;
        crc = ((crc >> 8) ^ (b << 8) ^ (b << 3) ^ (b >> 4)) & 0xFFFF;
    }
    return [crc & 0xFF, (crc >> 8) & 0xFF];
}

// Trama corta: 7 bits (REQA, WUPA), sin paridad ni CRC
function armarTramaCorta(valor) {
    return byteABitsLSB(valor & 0x7F).slice(0, 7);
}

// Trama estándar: cada byte (datos + CRC_A opcional) como 8 bits + paridad opcional
function armarTrama(datos, conCrc, conParidad) {
    let bytes = [...datos];
    if (conCrc) bytes = bytes.concat(crcA(bytes));
    let bits = [];
    for (const b of bytes) {
        bits = bits.concat(byteABitsLSB(b));
        if (conParidad) bits.push(paridadImpar(b));
    }
    return bits;
}

// Verificación en el receptor → { aceptada, bytes }
function verificarTrama(bits, conCrc, conParidad) {
    const paso = conParidad ? 9 : 8;
    if (bits.length === 0 || bits.length % paso !== 0) {
        return { aceptada: false, bytes: [] };
    }
    const bytes = [];
    for (let i = 0; i < bits.length; i += paso) {
        const b = bitsLSBAByte(bits.slice(i, i + 8));
        if (conParidad && bits[i + 8] !== paridadImpar(b)) {
            return { aceptada: false, bytes };          // falla la paridad
        }
        bytes.push(b);
    }
    if (conCrc) {
        if (bytes.length < 3) return { aceptada: false, bytes };
        const esperado = crcA(bytes.slice(0, -2));
        if (esperado[0] !== bytes[bytes.length - 2] || esperado[1] !== bytes[bytes.length - 1]) {
            return { aceptada: false, bytes };          // falla el CRC_A
        }
        return { aceptada: true, bytes: bytes.slice(0, -2) };
    }
    return { aceptada: true, bytes };
}

// ---------- 2. Codificación ----------

// Lector → tarjeta: Miller modificado (símbolos X, Y, Z).
// X = pausa en la 2da mitad (bit 1). Y = sin pausa. Z = pausa al inicio.
// Inicio de comunicación = Z. Fin de comunicación = un '0' seguido de Y.
function millerCodificar(bits) {
    const simbolos = ["Z"];
    let previo = "SOC";
    for (const b of bits) {
        if (b === 1) {
            simbolos.push("X");
            previo = 1;
        } else {
            simbolos.push(previo === "SOC" || previo === 0 ? "Z" : "Y");
            previo = 0;
        }
    }
    simbolos.push(previo === "SOC" || previo === 0 ? "Z" : "Y");   // el '0' de fin
    simbolos.push("Y");
    return simbolos;
}

// Tarjeta → lector: Manchester sobre subportadora (símbolos D, E, F).
// D = subportadora en la 1ra mitad (bit 1 e inicio). E = en la 2da mitad (bit 0).
// F = sin subportadora (fin de comunicación).
function manchesterCodificar(bits) {
    return ["D", ...bits.map(b => (b === 1 ? "D" : "E")), "F"];
}

// ---------- 3. Forma de onda ----------

var MITADES = { X: [1, 0], Y: [1, 1], Z: [0, 1], D: [1, 0], E: [0, 1], F: [0, 0] };

// Convierte símbolos en muestras. Con subportadora, la parte activa oscila.
function onda(simbolos, m = MUESTRAS_POR_MITAD, subportadora = false) {
    const salida = [];
    for (const s of simbolos) {
        for (const nivel of MITADES[s]) {
            for (let i = 0; i < m; i++) {
                if (!nivel) salida.push(0);
                else salida.push(subportadora ? (i % 4 < 2 ? 1 : 0) : 1);
            }
        }
    }
    return salida;
}

function promediosPorMitad(w, m) {
    const med = [];
    for (let i = 0; i + m <= w.length; i += m) {
        let s = 0;
        for (let j = 0; j < m; j++) s += w[i + j];
        med.push(s / m);
    }
    return med;
}

// ---------- 4. Decodificación ----------

// amplitud: factor de atenuación de la señal (el receptor ajusta su umbral, como un AGC ideal)
function millerDecodificar(w, m = MUESTRAS_POR_MITAD, amplitud = 1) {
    const h = promediosPorMitad(w, m).map(v => v > 0.5 * amplitud);
    const bits = [];
    for (let i = 2; i + 1 < h.length - 4; i += 2) {      // se omiten el inicio (Z) y el fin (0 + Y)
        bits.push(h[i] && !h[i + 1] ? 1 : 0);             // X=(1,0) → 1 ; Y y Z → 0
    }
    return bits;
}

function manchesterDecodificar(w, m = MUESTRAS_POR_MITAD) {
    const h = promediosPorMitad(w, m);
    const bits = [];
    for (let i = 2; i + 1 < h.length - 2; i += 2) {      // se omiten el inicio (D) y el fin (F)
        bits.push(h[i] > h[i + 1] ? 1 : 0);               // D (1ra mitad) → 1 ; E (2da mitad) → 0
    }
    return bits;
}

// ---------- 5. Canal ----------

// Nivel 1: canal binario simétrico
function canalBSC(bits, p) {
    return bits.map(b => (Math.random() < p ? 1 - b : b));
}

// Nivel 3 (opcional): atenuación por distancia, A(d) = (d0/d)^k con d0 = 1 cm y k = 3
function amplitudPorDistancia(distanciaCm, k = 3) {
    return Math.min(1, Math.pow(1 / Math.max(distanciaCm, 1), k));
}

// Nivel 2: ruido gaussiano aditivo (después de aplicar la atenuación)
function canalAWGN(w, sigma, amplitud = 1) {
    return w.map(v => v * amplitud + sigma * aleatorioGauss());
}

// ---------- 6. Transmisión completa ----------

function construirBitsTx(cfg) {
    if (cfg.tipoTrama === "corta") return armarTramaCorta(cfg.datos[0] || 0);
    return armarTrama(cfg.datos, cfg.control === "paridad+crc", cfg.control !== "ninguno");
}

function verificarRx(cfg, bitsRx) {
    if (cfg.tipoTrama === "corta") {
        return { aceptada: bitsRx.length === 7, bytes: [bitsLSBAByte(bitsRx)] };
    }
    return verificarTrama(bitsRx, cfg.control === "paridad+crc", cfg.control !== "ninguno");
}

function bytesEsperados(cfg) {
    return cfg.tipoTrama === "corta" ? [(cfg.datos[0] || 0) & 0x7F] : cfg.datos;
}

function codificadorDe(cfg) {
    return cfg.direccion === "tarjeta-lector"
        ? { codificar: manchesterCodificar, sub: true }
        : { codificar: millerCodificar, sub: false };
}

function decodificarOnda(cfg, w, amplitud) {
    return cfg.direccion === "tarjeta-lector"
        ? manchesterDecodificar(w, MUESTRAS_POR_MITAD)
        : millerDecodificar(w, MUESTRAS_POR_MITAD, amplitud);
}

// Pasa una onda ya generada por el canal elegido y devuelve los bits recibidos
function pasarPorCanal(cfg, bitsTx, ondaTx, conOnda = true) {
    const { codificar, sub } = codificadorDe(cfg);
    if (cfg.canal === "ideal") {
        return { bitsRx: decodificarOnda(cfg, ondaTx, 1), ondaRx: ondaTx, amplitud: 1 };
    }
    if (cfg.canal === "bsc") {
        const bitsRx = canalBSC(bitsTx, cfg.p);
        const ondaRx = conOnda ? onda(codificar(bitsRx), MUESTRAS_POR_MITAD, sub) : null;
        return { bitsRx, ondaRx, amplitud: 1 };
    }
    const amplitud = amplitudPorDistancia(cfg.distancia);
    const ondaRx = canalAWGN(ondaTx, cfg.sigma, amplitud);
    return { bitsRx: decodificarOnda(cfg, ondaRx, amplitud), ondaRx, amplitud };
}

// Una transmisión, con todo el detalle para mostrarlo
function transmitirTrama(cfg) {
    const { codificar, sub } = codificadorDe(cfg);
    const bitsTx = construirBitsTx(cfg);
    const simbolosTx = codificar(bitsTx);
    const ondaTx = onda(simbolosTx, MUESTRAS_POR_MITAD, sub);
    const { bitsRx, ondaRx, amplitud } = pasarPorCanal(cfg, bitsTx, ondaTx, true);
    const simbolosRx = codificar(bitsRx);
    const v = verificarRx(cfg, bitsRx);
    const esperados = bytesEsperados(cfg);
    const iguales = v.bytes.length === esperados.length && v.bytes.every((b, i) => b === esperados[i]);
    const crc = cfg.tipoTrama === "estandar" ? crcA(cfg.datos) : null;
    return {
        bitsTx, bitsRx, simbolosTx, simbolosRx, ondaTx, ondaRx, amplitud,
        aceptada: v.aceptada,
        bytesRx: v.bytes,
        erroresBits: contarDiferencias(bitsTx.join(""), bitsRx.join("")),
        errorNoDetectado: v.aceptada && !iguales,
        tiempoUs: simbolosTx.length * PERIODO_BIT_US,
        crc
    };
}

// Muchas transmisiones para obtener estadísticas (BER, aceptación, errores no detectados)
function ejecutarExperimento(cfg, repeticiones) {
    const { codificar, sub } = codificadorDe(cfg);
    const bitsTx = construirBitsTx(cfg);
    const ondaTx = cfg.canal === "bsc" ? null : onda(codificar(bitsTx), MUESTRAS_POR_MITAD, sub);
    const esperados = bytesEsperados(cfg);

    let bitsErroneos = 0, tramasConError = 0, aceptadas = 0, noDetectadas = 0;
    for (let i = 0; i < repeticiones; i++) {
        const { bitsRx } = pasarPorCanal(cfg, bitsTx, ondaTx, false);
        const dif = contarDiferencias(bitsTx.join(""), bitsRx.join(""));
        bitsErroneos += dif;
        if (dif > 0) tramasConError++;
        const v = verificarRx(cfg, bitsRx);
        if (v.aceptada) {
            aceptadas++;
            const iguales = v.bytes.length === esperados.length && v.bytes.every((b, j) => b === esperados[j]);
            if (!iguales) noDetectadas++;
        }
    }
    const bitsTotales = bitsTx.length * repeticiones;
    const bitsUtiles = cfg.tipoTrama === "corta" ? 7 : cfg.datos.length * 8;
    return {
        repeticiones,
        bitsPorTrama: bitsTx.length,
        ber: bitsErroneos / bitsTotales,
        bitsErroneos,
        tramasConError,
        aceptadas,
        rechazadas: repeticiones - aceptadas,
        noDetectadas,
        eficiencia: (bitsUtiles / bitsTx.length) * 100,
        probSinErroresTeorica: cfg.canal === "bsc" ? Math.pow(1 - cfg.p, bitsTx.length) : null
    };
}

// Compara las tres configuraciones de control sobre el mismo canal
function compararControles(cfg, repeticiones) {
    const filas = [];
    for (const control of ["ninguno", "paridad", "paridad+crc"]) {
        filas.push({ control, ...ejecutarExperimento({ ...cfg, control }, repeticiones) });
    }
    return filas;
}