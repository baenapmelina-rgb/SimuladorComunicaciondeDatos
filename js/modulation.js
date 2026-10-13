// ============================================================
// modulation.js
// Modelo de modulación digital en banda base (un símbolo por bit).
// Cada símbolo es un arreglo con el valor que "ve" el receptor
// después del filtro adaptado:
//   ASK: un valor (1 = portadora presente, 0 = ausente)
//   PSK: un valor (+1 / -1, fase 0 o 180°)
//   FSK: dos valores (energía en la frecuencia de "0" y en la de "1")
// El ruido se agrega a esos valores (ver channel.js).
// ============================================================

function modular(bits, tipo) {
    const simbolos = [];
    for (const bit of bits) {
        const uno = bit === "1";
        switch (tipo) {
            case "ASK": simbolos.push([uno ? 1 : 0]);          break;
            case "PSK": simbolos.push([uno ? 1 : -1]);         break;
            case "FSK": simbolos.push(uno ? [0, 1] : [1, 0]);  break;
            default:
                throw new Error("Tipo de modulación no soportado.");
        }
    }
    return simbolos;
}

function demodular(simbolos, tipo) {
    let bits = "";
    for (const s of simbolos) {
        let uno;
        switch (tipo) {
            case "ASK": uno = s[0] > 0.5;   break;   // umbral al medio
            case "PSK": uno = s[0] > 0;     break;   // signo
            case "FSK": uno = s[1] > s[0];  break;   // gana la rama con más energía
            default:
                throw new Error("Tipo de modulación no soportado.");
        }
        bits += uno ? "1" : "0";
    }
    return bits;
}