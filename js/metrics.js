// ============================================================
// metrics.js
// Cálculo de métricas de la transmisión.
// ============================================================


// ------------------------------------------------------------
// CALCULAR MÉTRICAS
// ------------------------------------------------------------

function calcularMetricas(
    paquetesOriginales,
    paquetesRecibidos
) {

    const enviados = paquetesOriginales.length;

    const recibidos = paquetesRecibidos.filter(
        paquete => paquete.estado === "recibido"
    ).length;

    const perdidos = paquetesRecibidos.filter(
        paquete => paquete.estado === "perdido"
    ).length;

    const errores = paquetesRecibidos.filter(
        paquete => paquete.errorDetectado === true
    ).length;


    // --------------------------------------------------------
    // BITS
    // --------------------------------------------------------

    const bitsEnviados =
        paquetesOriginales.reduce(
            (total, paquete) =>
                total + paquete.bitsOriginales.length,
            0
        );


    const bitsErroneos =
        paquetesRecibidos.reduce(
            (total, paquete) =>
                total + (paquete.bitsAlterados || 0),
            0
        );


    // --------------------------------------------------------
    // BER
    // --------------------------------------------------------

    const ber =
        bitsEnviados > 0
            ? bitsErroneos / bitsEnviados
            : 0;


    // --------------------------------------------------------
    // PORCENTAJE DE PÉRDIDA
    // --------------------------------------------------------

    const porcentajePerdida =
        enviados > 0
            ? (perdidos / enviados) * 100
            : 0;


    // --------------------------------------------------------
    // LATENCIA
    // --------------------------------------------------------

    const paquetesConLatencia =
        paquetesRecibidos.filter(
            paquete =>
                paquete.estado !== "perdido"
        );


    const latenciaPromedio =
        paquetesConLatencia.length > 0
            ? paquetesConLatencia.reduce(
                (total, paquete) =>
                    total + paquete.latencia,
                0
            ) / paquetesConLatencia.length
            : 0;


    // --------------------------------------------------------
    // EFICIENCIA
    // --------------------------------------------------------

    const eficiencia =
        enviados > 0
            ? (recibidos / enviados) * 100
            : 0;


    return {

        enviados,

        recibidos,

        perdidos,

        errores,

        bitsEnviados,

        bitsErroneos,

        ber,

        porcentajePerdida,

        latenciaPromedio,

        eficiencia
    };
}