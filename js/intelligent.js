// ============================================================
// intelligent.js
// Sistema de recomendaciones basado en reglas.
// ============================================================


// ------------------------------------------------------------
// OBTENER RECOMENDACIÓN
// ------------------------------------------------------------

function obtenerRecomendacion(
    configuracion,
    metricas
) {

    const recomendaciones = [];


    // --------------------------------------------------------
    // RUIDO
    // --------------------------------------------------------

    if (configuracion.ruido >= 30) {

        recomendaciones.push(
            "El nivel de ruido es elevado. Se recomienda utilizar FSK."
        );
    }


    // --------------------------------------------------------
    // PÉRDIDA
    // --------------------------------------------------------

    if (configuracion.perdida >= 20) {

        recomendaciones.push(
            "La pérdida de paquetes es elevada. Se recomienda utilizar paquetes más pequeños y mecanismos de retransmisión."
        );
    }


    // --------------------------------------------------------
    // BER
    // --------------------------------------------------------

    if (metricas.ber >= 0.05) {

        recomendaciones.push(
            "La tasa de error de bits es elevada. Se recomienda utilizar un método de detección de errores como CRC."
        );
    }


    // --------------------------------------------------------
    // LATENCIA
    // --------------------------------------------------------

    if (metricas.latenciaPromedio >= 150) {

        recomendaciones.push(
            "La latencia promedio es elevada. Se recomienda reducir el tamaño de los paquetes y optimizar la transmisión."
        );
    }


    // --------------------------------------------------------
    // SI TODO ESTÁ BIEN
    // --------------------------------------------------------

    if (recomendaciones.length === 0) {

        recomendaciones.push(
            "Las condiciones actuales del canal son favorables para la transmisión."
        );
    }


    return recomendaciones;
}