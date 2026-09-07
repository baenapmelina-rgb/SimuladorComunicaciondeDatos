// ============================================================
// errors.js
// Detección de errores.
// ============================================================


// ------------------------------------------------------------
// PARIDAD
// ------------------------------------------------------------

function calcularParidad(bits) {

    let unos = 0;

    for (const bit of bits) {

        if (bit === "1") {
            unos++;
        }
    }

    return unos % 2;
}


function verificarParidad(bits, paridadEsperada) {

    return calcularParidad(bits) === paridadEsperada;
}


// ------------------------------------------------------------
// CHECKSUM
// ------------------------------------------------------------

function calcularChecksum(bits) {

    let suma = 0;

    for (let i = 0; i < bits.length; i += 8) {

        const byte = bits.slice(i, i + 8);

        if (byte.length === 8) {
            suma += parseInt(byte, 2);
        }
    }

    return suma % 256;
}


function verificarChecksum(bits, checksumEsperado) {

    return calcularChecksum(bits) === checksumEsperado;
}


// ------------------------------------------------------------
// CRC
// ------------------------------------------------------------

function calcularCRC(bits) {

    const polinomio = "100000111";

    let datos = bits + "00000000";

    for (let i = 0; i <= datos.length - polinomio.length; i++) {

        if (datos[i] === "1") {

            let parte = "";

            for (let j = 0; j < polinomio.length; j++) {

                parte += datos[i + j] === polinomio[j]
                    ? "0"
                    : "1";
            }

            datos =
                datos.slice(0, i) +
                parte +
                datos.slice(i + polinomio.length);
        }
    }

    return datos.slice(-8);
}


function verificarCRC(bits, crcEsperado) {

    return calcularCRC(bits) === crcEsperado;
}


// ------------------------------------------------------------
// AGREGAR INFORMACIÓN DE ERROR A LOS PAQUETES
// ------------------------------------------------------------

function analizarErrores(paquetes) {

    return paquetes.map(paquete => {

        const crc = calcularCRC(paquete.bitsOriginales);

        const crcRecibido = calcularCRC(
            paquete.bitsRecibidos
        );

        const crcCorrecto = crc === crcRecibido;

        return {
            ...paquete,

            crc: crc,

            crcRecibido: crcRecibido,

            errorDetectado: !crcCorrecto
        };
    });
}