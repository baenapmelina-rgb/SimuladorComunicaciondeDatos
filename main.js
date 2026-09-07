// ============================================================
// main.js
// Coordinador principal de la aplicación.
// ============================================================


document.addEventListener(
    "DOMContentLoaded",
    () => {

        const boton =
            document.getElementById("btnSimular");

        boton.addEventListener(
            "click",
            iniciarSimulacion
        );
    }
);


// ============================================================
// INICIAR SIMULACIÓN
// ============================================================

function iniciarSimulacion() {

    try {

        // ----------------------------------------------------
        // OBTENER DATOS DE LA INTERFAZ
        // ----------------------------------------------------

        const mensaje =
            document
                .getElementById("mensaje")
                .value
                .trim();


        const tamañoPaquete =
            Number(
                document
                    .getElementById("tamañoPaquete")
                    .value
            );


        const perdida =
            Number(
                document
                    .getElementById("perdida")
                    .value
            );


        const ruido =
            Number(
                document
                    .getElementById("ruido")
                    .value
            );


        const latencia =
            Number(
                document
                    .getElementById("latencia")
                    .value
            );


        const tipoModulacion =
            document
                .getElementById("modulacion")
                .value;


        // ----------------------------------------------------
        // VALIDACIONES
        // ----------------------------------------------------

        if (!mensaje) {

            alert(
                "Ingresá un mensaje para comenzar la simulación."
            );

            return;
        }


        if (
            tamañoPaquete <= 0 ||
            perdida < 0 ||
            perdida > 100 ||
            ruido < 0 ||
            ruido > 100 ||
            latencia < 0
        ) {

            alert(
                "Revisá los valores de configuración."
            );

            return;
        }


        // ----------------------------------------------------
        // CONFIGURACIÓN
        // ----------------------------------------------------

        const configuracion = {

            tamañoPaquete,

            perdida,

            ruido,

            latencia,

            modulacion: tipoModulacion
        };


        // ----------------------------------------------------
        // TEXTO → BITS
        // ----------------------------------------------------

        const bits =
            textoABits(mensaje);


        // ----------------------------------------------------
        // CREAR PAQUETES
        // ----------------------------------------------------

        const paquetes =
            crearPaquetes(
                bits,
                tamañoPaquete
            );


        // ----------------------------------------------------
        // SIMULAR MODULACIÓN
        // ----------------------------------------------------

        const señal =
            modular(
                bits,
                tipoModulacion
            );


        console.log(
            "Señal modulada:",
            señal
        );


        // ----------------------------------------------------
        // TRANSMITIR POR EL CANAL
        // ----------------------------------------------------

        let paquetesRecibidos =
            simularCanal(
                paquetes,
                configuracion
            );


        // ----------------------------------------------------
        // ANALIZAR ERRORES
        // ----------------------------------------------------

        paquetesRecibidos =
            analizarErrores(
                paquetesRecibidos
            );


        // ----------------------------------------------------
        // RECONSTRUIR MENSAJE
        // ----------------------------------------------------

        const mensajeRecibido =
            reconstruirMensaje(
                paquetesRecibidos
            );


        // ----------------------------------------------------
        // MÉTRICAS
        // ----------------------------------------------------

        const metricas =
            calcularMetricas(
                paquetes,
                paquetesRecibidos
            );


        // ----------------------------------------------------
        // RECOMENDACIONES
        // ----------------------------------------------------

        const recomendaciones =
            obtenerRecomendacion(
                configuracion,
                metricas
            );


        // ----------------------------------------------------
        // ACTUALIZAR INTERFAZ
        // ----------------------------------------------------

        actualizarInterfaz(
            mensaje,
            mensajeRecibido,
            paquetesRecibidos,
            metricas,
            recomendaciones
        );

    }

    catch (error) {

        console.error(error);

        alert(
            "Ocurrió un error durante la simulación: " +
            error.message
        );
    }
}


// ============================================================
// ACTUALIZAR INTERFAZ
// ============================================================

function actualizarInterfaz(
    mensaje,
    mensajeRecibido,
    paquetes,
    metricas,
    recomendaciones
) {

    // --------------------------------------------------------
    // MENSAJES
    // --------------------------------------------------------

    document
        .getElementById("mensajeEmisor")
        .textContent = mensaje;


    document
        .getElementById("mensajeReceptor")
        .textContent = mensajeRecibido;


    // --------------------------------------------------------
    // TABLA
    // --------------------------------------------------------

    const tabla =
        document.getElementById(
            "tablaPaquetes"
        );


    tabla.innerHTML = "";


    paquetes.forEach(
        paquete => {

            const fila =
                document.createElement("tr");


            const estado =
                paquete.estado;


            const error =
                paquete.errorDetectado
                    ? "Sí"
                    : "No";


            fila.innerHTML = `

                <td>
                    ${paquete.id}
                </td>

                <td>
                    ${paquete.secuencia}
                </td>

                <td>
                    ${paquete.bitsRecibidos || "-"}
                </td>

                <td>
                    ${paquete.tamaño}
                </td>

                <td>
                    ${estado}
                </td>

                <td>
                    ${error}
                </td>

                <td>
                    ${paquete.latencia
                        ? paquete.latencia.toFixed(2)
                        : "-"
                    } ms
                </td>

            `;


            tabla.appendChild(fila);
        }
    );


    // --------------------------------------------------------
    // MÉTRICAS
    // --------------------------------------------------------

    document
        .getElementById("mEnviados")
        .textContent =
            metricas.enviados;


    document
        .getElementById("mRecibidos")
        .textContent =
            metricas.recibidos;


    document
        .getElementById("mPerdidos")
        .textContent =
            metricas.perdidos;


    document
        .getElementById("mErrores")
        .textContent =
            metricas.errores;


    document
        .getElementById("mBer")
        .textContent =
            metricas.ber.toFixed(4);


    document
        .getElementById("mLatencia")
        .textContent =
            metricas.latenciaPromedio.toFixed(2)
            + " ms";


    document
        .getElementById("mEficiencia")
        .textContent =
            metricas.eficiencia.toFixed(2)
            + " %";


    // --------------------------------------------------------
    // RECOMENDACIONES
    // --------------------------------------------------------

    const contenedor =
        document.getElementById(
            "recomendacion"
        );


    contenedor.innerHTML = "";


    recomendaciones.forEach(
        recomendacion => {

            const elemento =
                document.createElement("div");

            elemento.classList.add(
                "recomendacion-item"
            );

            elemento.textContent =
                "• " + recomendacion;

            contenedor.appendChild(
                elemento
            );
        }
    );
}