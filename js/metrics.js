// ============================================================
// metrics.js
// Cálculo de métricas de la transmisión (modo genérico).
// ============================================================

function calcularMetricas(paquetesOriginales, paquetesRecibidos) {

    const enviados = paquetesOriginales.length;

    const perdidos    = paquetesRecibidos.filter(p => p.estado === "perdido").length;
    const rechazados  = paquetesRecibidos.filter(p => p.estado === "rechazado").length;
    const noDetectados = paquetesRecibidos.filter(p => p.estado === "error no detectado").length;
    const correctos   = paquetesRecibidos.filter(p => p.estado === "correcto").length;

    // BITS
    const bitsUtiles = paquetesOriginales.reduce((t, p) => t + p.bitsOriginales.length, 0);
    const bitsTransmitidos = paquetesRecibidos.reduce((t, p) => t + p.bitsTransmitidos.length, 0);

    const llegados = paquetesRecibidos.filter(p => p.estado !== "perdido");
    const bitsLlegados = llegados.reduce((t, p) => t + p.bitsTransmitidos.length, 0);
    const bitsErroneos = llegados.reduce((t, p) => t + p.bitsAlterados, 0);

    // BER: bits erróneos / bits que llegaron al receptor
    const ber = bitsLlegados > 0 ? bitsErroneos / bitsLlegados : 0;

    // Tasa de entrega correcta: paquetes correctos / paquetes enviados
    const tasaEntrega = enviados > 0 ? (correctos / enviados) * 100 : 0;

    // Eficiencia de trama: bits útiles / bits transmitidos (costo de la redundancia)
    const eficiencia = bitsTransmitidos > 0 ? (bitsUtiles / bitsTransmitidos) * 100 : 0;

    // LATENCIA
    const conLatencia = llegados;
    const latenciaPromedio = conLatencia.length > 0
        ? conLatencia.reduce((t, p) => t + p.latencia, 0) / conLatencia.length
        : 0;

    return {
        enviados, correctos, perdidos, rechazados, noDetectados,
        bitsUtiles, bitsTransmitidos, bitsErroneos,
        ber, tasaEntrega, eficiencia, latenciaPromedio
    };
}