// ============================================================
// intelligent.js
// Recomendaciones basadas en reglas y en MEDICIONES de la propia
// simulación (compara las tres modulaciones bajo el mismo ruido).
// ============================================================

// BER medido de una modulación con un nivel de ruido dado
function berModulacion(tipo, sigma, cantidadBits = 4000) {
    let bits = "";
    for (let i = 0; i < cantidadBits; i++) {
        bits += Math.random() < 0.5 ? "1" : "0";
    }
    const rx = demodular(agregarRuidoSimbolos(modular(bits, tipo), sigma), tipo);
    return contarDiferencias(bits, rx) / cantidadBits;
}

// Devuelve { ASK: ber, FSK: ber, PSK: ber }
function compararModulaciones(ruido) {
    const sigma = ruido / 100;
    const resultado = {};
    for (const tipo of ["ASK", "FSK", "PSK"]) {
        resultado[tipo] = berModulacion(tipo, sigma);
    }
    return resultado;
}

function obtenerRecomendacion(configuracion, metricas, comparacion) {

    const recomendaciones = [];

    // MODULACIÓN (basada en la comparación medida)
    const ordenadas = Object.entries(comparacion).sort((a, b) => a[1] - b[1]);
    const mejor = ordenadas[0][0];
    const detalle = ordenadas
        .map(([tipo, ber]) => `${tipo} ${(ber * 100).toFixed(2)} %`)
        .join(", ");

    if (comparacion[mejor] === 0 && comparacion[configuracion.modulacion] === 0) {
        recomendaciones.push(
            `Con este ruido las tres modulaciones transmiten sin errores medibles (BER medido: ${detalle}).`
        );
    } else if (configuracion.modulacion !== mejor &&
               comparacion[configuracion.modulacion] > comparacion[mejor]) {
        recomendaciones.push(
            `Con este nivel de ruido, ${mejor} obtuvo el menor BER medido (${detalle}). Considerá usar ${mejor} en lugar de ${configuracion.modulacion}.`
        );
    } else {
        recomendaciones.push(
            `La modulación elegida (${configuracion.modulacion}) es de las de menor BER medido con este ruido (${detalle}).`
        );
    }

    // CONTROL DE ERRORES
    if (metricas.noDetectados > 0) {
        recomendaciones.push(
            `${metricas.noDetectados} paquete(s) llegaron con errores y fueron aceptados. Probá un método más fuerte (CRC) o paquetes más cortos.`
        );
    } else if (metricas.ber >= 0.05 && configuracion.control === "ninguno") {
        recomendaciones.push(
            "La tasa de error de bits es elevada y no hay control de errores. Se recomienda utilizar CRC."
        );
    }

    // PÉRDIDA
    if (configuracion.perdida >= 20) {
        recomendaciones.push(
            "La pérdida de paquetes es elevada. Se recomiendan mecanismos de retransmisión."
        );
    }

    // LATENCIA
    if (metricas.latenciaPromedio >= 150) {
        recomendaciones.push(
            "La latencia promedio es elevada. Se recomienda reducir el tamaño de los paquetes y optimizar la transmisión."
        );
    }

    // EFICIENCIA
    if (metricas.eficiencia > 0 && metricas.eficiencia < 70) {
        recomendaciones.push(
            `La redundancia consume bastante capacidad (eficiencia de trama ${metricas.eficiencia.toFixed(1)} %). Paquetes más largos reducen ese costo, pero son más vulnerables al ruido.`
        );
    }

    if (metricas.rechazados > 0) {
        recomendaciones.push(
            `${metricas.rechazados} paquete(s) fueron rechazados al detectarse errores: el control de integridad cumplió su función.`
        );
    }

    return recomendaciones;
}