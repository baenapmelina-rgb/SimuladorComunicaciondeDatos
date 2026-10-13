// ============================================================
// waveform.js
// Dibujo de señales en <canvas>.
// ============================================================

function prepararCanvas(canvas, anchoCss, altoCss) {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = anchoCss + "px";
    canvas.style.height = altoCss + "px";
    canvas.width = anchoCss * dpr;
    canvas.height = altoCss * dpr;
    const ctx = canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, anchoCss, altoCss);
    return ctx;
}

// Onda de envolvente (contactless): cada símbolo ocupa 2 mitades de bit
function dibujarOndaDigital(canvas, muestras, simbolos, color) {
    const pxPorSimbolo = 28;
    const ancho = Math.max(simbolos.length * pxPorSimbolo + 40, 320);
    const alto = 120;
    const ctx = prepararCanvas(canvas, ancho, alto);
    if (!ctx) return;

    const x0 = 20;
    const anchoUtil = simbolos.length * pxPorSimbolo;

    // Líneas verticales y etiquetas de símbolo
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "#475569";
    simbolos.forEach((s, i) => {
        const x = x0 + i * pxPorSimbolo;
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x, alto - 8);
        ctx.stroke();
        ctx.fillText(s, x + pxPorSimbolo / 2, 14);
    });

    // Señal
    const yDe = v => {
        const c = Math.max(-0.5, Math.min(1.5, v));
        return (alto - 14) - ((c + 0.5) / 2) * (alto - 44);
    };
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    muestras.forEach((v, i) => {
        const x = x0 + (i / muestras.length) * anchoUtil;
        if (i === 0) ctx.moveTo(x, yDe(v));
        else ctx.lineTo(x, yDe(v));
    });
    ctx.stroke();
}

// Modulación genérica (ASK / FSK / PSK) para los primeros bits del mensaje
function dibujarModulacion(canvas, bits, tipo) {
    const porBit = 40;
    const pxPorBit = 48;
    const ancho = Math.max(bits.length * pxPorBit + 40, 320);
    const alto = 130;
    const ctx = prepararCanvas(canvas, ancho, alto);
    if (!ctx) return;

    const x0 = 20;
    const yc = 78, amp = 36;

    ctx.font = "13px Arial";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#e2e8f0";
    ctx.fillStyle = "#475569";
    for (let i = 0; i < bits.length; i++) {
        const x = x0 + i * pxPorBit;
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x, alto - 6);
        ctx.stroke();
        ctx.fillText(bits[i], x + pxPorBit / 2, 15);
    }

    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let primero = true;
    for (let i = 0; i < bits.length; i++) {
        const uno = bits[i] === "1";
        for (let j = 0; j < porBit; j++) {
            const t = j / porBit;                 // 0..1 dentro del bit
            let v;
            if (tipo === "ASK")      v = (uno ? 1 : 0) * Math.sin(2 * Math.PI * 3 * t);
            else if (tipo === "FSK") v = Math.sin(2 * Math.PI * (uno ? 5 : 2) * t);
            else                     v = Math.sin(2 * Math.PI * 3 * t + (uno ? 0 : Math.PI));
            const x = x0 + (i + t) * pxPorBit;
            const y = yc - v * amp;
            if (primero) { ctx.moveTo(x, y); primero = false; }
            else ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
}