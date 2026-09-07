// ============================================================
// channel.js
// Simulación del canal de comunicación.
// ============================================================


// ------------------------------------------------------------
// GENERAR NÚMERO ALEATORIO
// ------------------------------------------------------------

function numeroAleatorio() {

    return Math.random() * 100;
}


// ------------------------------------------------------------
// ALTERAR BITS POR RUIDO
// ------------------------------------------------------------

function aplicarRuido(bits, porcentajeRuido) {

    let resultado = "";

    let bitsAlterados = 0;

    for (const bit of bits) {

        if (numeroAleatorio() < porcentajeRuido) {

            resultado += bit === "0" ? "1" : "0";

            bitsAlterados++;

        } else {

            resultado += bit;
        }
    }

    return {
        bits: resultado,
        bitsAlterados: bitsAlterados
    };
}


// ------------------------------------------------------------
// SIMULAR CANAL
// ------------------------------------------------------------

function simularCanal(paquetes, configuracion) {

    const resultado = [];

    for (const paqueteOriginal of paquetes) {

        const paquete = {
            ...paqueteOriginal
        };

        // ----------------------------------------------------
        // PÉRDIDA DE PAQUETE
        // ----------------------------------------------------

        if (numeroAleatorio() < configuracion.perdida) {

            paquete.estado = "perdido";

            paquete.bitsRecibidos = "";

            resultado.push(paquete);

            continue;
        }


        // ----------------------------------------------------
        // RUIDO
        // ----------------------------------------------------

        const ruido = aplicarRuido(
            paquete.bitsOriginales,
            configuracion.ruido
        );

        paquete.bitsRecibidos = ruido.bits;

        paquete.error = ruido.bitsAlterados > 0;

        paquete.bitsAlterados = ruido.bitsAlterados;


        if (paquete.error) {

            paquete.estado = "error";

        } else {

            paquete.estado = "recibido";
        }


        // ----------------------------------------------------
        // LATENCIA
        // ----------------------------------------------------

        const variacion = Math.random() * 20 - 10;

        paquete.latencia = Math.max(
            0,
            configuracion.latencia + variacion
        );


        resultado.push(paquete);
    }

    return resultado;
}