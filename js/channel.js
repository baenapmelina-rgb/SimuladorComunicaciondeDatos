// ============================================================
// channel.js
// Simulación del canal de comunicación.
// ============================================================
 
function numeroAleatorio() {
    return Math.random() * 100;
}
 
// Ruido gaussiano N(0,1) (Box-Muller)
function aleatorioGauss() {
    let u = 0;
    while (u === 0) u = Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
 
// Cantidad de posiciones distintas entre dos cadenas de bits
function contarDiferencias(a, b) {
    const n = Math.min(a.length, b.length);
    let d = Math.abs(a.length - b.length);
    for (let i = 0; i < n; i++) {
        if (a[i] !== b[i]) d++;
    }
    return d;
}
 
// Nivel 1 del modelo de canal: canal binario simétrico.
// Cada bit se invierte con probabilidad porcentajeRuido (%).
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
    return { bits: resultado, bitsAlterados };
}
 
// Nivel 2: ruido gaussiano aditivo sobre los valores de la señal modulada.
function agregarRuidoSimbolos(simbolos, sigma) {
    return simbolos.map(s => s.map(v => v + sigma * aleatorioGauss()));
}
 
// SIMULAR CANAL (modo genérico)
// Cadena: datos + redundancia → modulación → ruido gaussiano → demodulación.
// "ruido" (%) se interpreta como la desviación estándar del ruido
// relativa a la amplitud de la señal (100 % → sigma = 1).
function simularCanal(paquetes, configuracion) {
    const resultado = [];
    const sigma = configuracion.ruido / 100;
 
    for (const paqueteOriginal of paquetes) {
        const paquete = { ...paqueteOriginal };
 
        paquete.bitsTransmitidos = proteger(paquete.bitsOriginales, configuracion.control);
 
        // PÉRDIDA DE PAQUETE
        if (numeroAleatorio() < configuracion.perdida) {
            paquete.estado = "perdido";
            paquete.bitsRecibidos = "";
            paquete.bitsAlterados = 0;
            paquete.latencia = 0;
            resultado.push(paquete);
            continue;
        }
 
        // MODULACIÓN + RUIDO + DEMODULACIÓN
        const simbolos = modular(paquete.bitsTransmitidos, configuracion.modulacion);
        const ruidosos = agregarRuidoSimbolos(simbolos, sigma);
        paquete.bitsRecibidos = demodular(ruidosos, configuracion.modulacion);
 
        paquete.bitsAlterados = contarDiferencias(paquete.bitsTransmitidos, paquete.bitsRecibidos);
        paquete.error = paquete.bitsAlterados > 0;
        paquete.estado = "recibido";
 
        // LATENCIA
        const variacion = Math.random() * 20 - 10;
        paquete.latencia = Math.max(0, configuracion.latencia + variacion);
 
        resultado.push(paquete);
    }
    return resultado;
}