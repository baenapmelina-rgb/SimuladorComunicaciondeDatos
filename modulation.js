// ============================================================
// modulation.js
// Simulación matemática de modulación digital.
// ============================================================


// ------------------------------------------------------------
// ASK
// ------------------------------------------------------------

function modularASK(bits) {

    const señal = [];

    for (const bit of bits) {

        if (bit === "1") {

            señal.push(1);

        } else {

            señal.push(0.3);
        }
    }

    return señal;
}


// ------------------------------------------------------------
// FSK
// ------------------------------------------------------------

function modularFSK(bits) {

    const señal = [];

    for (const bit of bits) {

        if (bit === "1") {

            señal.push(2);

        } else {

            señal.push(1);
        }
    }

    return señal;
}


// ------------------------------------------------------------
// PSK
// ------------------------------------------------------------

function modularPSK(bits) {

    const señal = [];

    for (const bit of bits) {

        if (bit === "1") {

            señal.push(1);

        } else {

            señal.push(-1);
        }
    }

    return señal;
}


// ------------------------------------------------------------
// FUNCIÓN GENERAL
// ------------------------------------------------------------

function modular(bits, tipo) {

    switch (tipo) {

        case "ASK":
            return modularASK(bits);

        case "FSK":
            return modularFSK(bits);

        case "PSK":
            return modularPSK(bits);

        default:
            throw new Error(
                "Tipo de modulación no soportado."
            );
    }
}