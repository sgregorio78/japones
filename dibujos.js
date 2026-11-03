// DIBUJOS ALEATORIOS (para la pestaña "Dibujos")
//
// Cada dibujo es un SVG (un dibujo hecho con texto) que se compone con piezas sencillas:
// animales, personas y objetos. Como se generan con código, cada vez sale una escena distinta,
// y la pregunta y su respuesta correcta se calculan a la vez, sin tener que escribirlas a mano.
//
// Hay dos tipos de ejercicio:
//   "cuantos": ¿Cuántos gatos hay?  -> hay que elegir el contador correcto (さんびき, ふたり, みっつ...)
//   "donde":   ¿Dónde está el gato respecto a la caja? -> hay que elegir la posición (はこの うえに...)
//
// Todo va dentro de una función que se ejecuta al momento, para que sus nombres no choquen con
// los de app.js. Solo se "publica" generarDibujos, al final.
const generarDibujos = (() => {
  const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  // n elementos distintos al azar de una lista, sin contar los de "excluir" (mezclar está en app.js)
  const varios = (lista, n, excluir = []) => mezclar(lista.filter((x) => !excluir.includes(x))).slice(0, n);
  const si = (probabilidad) => Math.random() < probabilidad;
  const OSCURO = "#3A2E1F";

  // ---------- Piezas ----------
  // Cada pieza se dibuja con el origen (0,0) en sus "pies" y crece hacia arriba (y negativa).
  // alto = altura aproximada en unidades del dibujo; colores = variantes entre las que se elige.
  const PIEZAS = {
    gato: { es: "gato", plural: "gatos", g: "m", contador: "animales", alto: 47, colores: ["#E8A33D", "#8F98A3", "#55524D"],
      dibujo: (c) => `<g transform="translate(-6,0)"><path d="M16 -6 C 30 -6 30 -26 22 -30" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><ellipse cx="0" cy="-10" rx="18" ry="11" fill="${c}"/><polygon points="-15,-34 -13,-47 -6,-37" fill="${c}"/><polygon points="-6,-37 1,-47 3,-34" fill="${c}"/><circle cx="-6" cy="-28" r="11" fill="${c}"/><circle cx="-10" cy="-29" r="1.6" fill="${OSCURO}"/><circle cx="-3" cy="-29" r="1.6" fill="${OSCURO}"/><polygon points="-8,-24 -5,-24 -6.5,-22" fill="#C0504D"/></g>` },
    perro: { es: "perro", plural: "perros", g: "m", contador: "animales", alto: 40, colores: ["#A9743F", "#C9A66B", "#7D7D7D"],
      dibujo: (c) => `<path d="M17 -14 L 28 -26" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/><ellipse cx="0" cy="-14" rx="20" ry="11" fill="${c}"/><rect x="-14" y="-6" width="6" height="6" rx="2" fill="${c}"/><rect x="8" y="-6" width="6" height="6" rx="2" fill="${c}"/><circle cx="-15" cy="-28" r="11" fill="${c}"/><ellipse cx="-24" cy="-23" rx="7" ry="5" fill="#EBD9BC"/><ellipse cx="-8" cy="-31" rx="4" ry="8" fill="#5E3B1E"/><circle cx="-17" cy="-30" r="1.6" fill="${OSCURO}"/><circle cx="-29" cy="-24" r="2.2" fill="${OSCURO}"/>` },
    persona: { es: "persona", plural: "personas", g: "f", contador: "personas", alto: 49, colores: ["#4A7FB5", "#5FA34B", "#C0504D", "#8E6BB5", "#E0A030"],
      dibujo: (c) => `<rect x="-7" y="-14" width="6" height="14" fill="#3F4A63"/><rect x="1" y="-14" width="6" height="14" fill="#3F4A63"/><rect x="-13" y="-32" width="5" height="15" rx="2.5" fill="${c}"/><rect x="8" y="-32" width="5" height="15" rx="2.5" fill="${c}"/><rect x="-9" y="-33" width="18" height="21" rx="4" fill="${c}"/><circle cx="0" cy="-41" r="8" fill="#F2C9A0"/>` },
    pelota: { es: "pelota", plural: "pelotas", g: "f", contador: "cosas", alto: 34, colores: ["#D85A5A", "#4A7FB5", "#E0A030"],
      dibujo: (c) => `<circle cx="0" cy="-17" r="17" fill="${c}"/><path d="M-17 -17 Q 0 -7 17 -17" fill="none" stroke="#FFFFFF" stroke-width="3"/>` },
    manzana: { es: "manzana", plural: "manzanas", g: "f", contador: "cosas", alto: 40, colores: ["#D6453D", "#7FB04A"],
      dibujo: (c) => `<circle cx="-6" cy="-16" r="13" fill="${c}"/><circle cx="6" cy="-16" r="13" fill="${c}"/><rect x="-1.5" y="-38" width="3" height="9" rx="1.5" fill="#6B4A2B"/><polygon points="2,-34 12,-40 10,-31" fill="#5FA34B"/>` },
    libro: { es: "libro", plural: "libros", g: "m", contador: "cosas", alto: 28, colores: [["#4A7FB5", "#35608A"], ["#5FA34B", "#44782F"], ["#C0504D", "#8F3836"], ["#8E6BB5", "#684A8C"]],
      dibujo: (c) => `<rect x="-17" y="-28" width="34" height="28" rx="2" fill="${c[0]}"/><rect x="-17" y="-28" width="6" height="28" rx="2" fill="${c[1]}"/><rect x="-6" y="-20" width="16" height="3" fill="#E8EEF5"/><rect x="-6" y="-13" width="11" height="3" fill="#E8EEF5"/>` }
  };
  // Tamaño con el que se dibuja cada pieza al contar (el perro es más ancho y necesita ir más pequeño)
  const ESCALAS = { gato: 1.1, perro: 0.95, libro: 1.2 };
  Object.keys(PIEZAS).forEach((k) => { PIEZAS[k].escala = ESCALAS[k] || 1.15; });
  const PARA_CONTAR = ["gato", "perro", "persona", "pelota", "manzana", "libro"];
  const PARA_POSICION = ["gato", "perro", "pelota"];

  // Contadores del 1 al 10 (los mismos que usa el generador de frases)
  const CONT = {
    cosas: ["ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ", "とお"],
    personas: ["ひとり", "ふたり", "さんにん", "よにん", "ごにん", "ろくにん", "ななにん", "はちにん", "きゅうにん", "じゅうにん"],
    animales: ["いっぴき", "にひき", "さんびき", "よんひき", "ごひき", "ろっぴき", "ななひき", "はっぴき", "きゅうひき", "じゅっぴき"]
  };

  // Envuelve el contenido en un dibujo de 380 x 210 con fondo claro.
  // El aria-label no dice la respuesta; solo avisa a lectores de pantalla de que hay un dibujo.
  const envolver = (contenido) => `<svg viewBox="0 0 380 210" width="100%" role="img" aria-label="Dibujo para responder la pregunta"><rect width="380" height="210" rx="8" fill="#FAF7F0"/>${contenido}</svg>`;
  const pieza = (p, color, x, y, escala) => `<g transform="translate(${x},${y}) scale(${escala})">${p.dibujo(color)}</g>`;

  // ---------- ¿Cuántos hay? ----------
  function escenaContar(p, color, n) {
    // Hasta 5 en una fila; si hay más, en dos filas
    const filas = n <= 5 ? [n] : [Math.ceil(n / 2), Math.floor(n / 2)];
    const bases = filas.length === 1 ? [128] : [96, 168];
    let s = "";
    filas.forEach((cuantos, f) => {
      const x0 = 190 - ((cuantos - 1) * 68) / 2;
      for (let j = 0; j < cuantos; j++) {
        const x = x0 + j * 68;
        s += `<ellipse cx="${x}" cy="${bases[f] + 3}" rx="22" ry="4" fill="#E4DFD2"/>` + pieza(p, color, x, bases[f], p.escala);
      }
    });
    return envolver(s);
  }

  function preguntaContar() {
    const clave = azar(PARA_CONTAR), p = PIEZAS[clave];
    const color = azar(p.colores), n = aleatorio(1, 10);
    const tipo = p.contador, correcta = CONT[tipo][n - 1];
    // Respuestas incorrectas: el mismo número con otro contador (para practicar cuál usar),
    // y dos números cercanos con el contador correcto
    const otroTipo = azar(Object.keys(CONT).filter((t) => t !== tipo));
    const cercanos = varios([n - 3, n - 2, n - 1, n + 1, n + 2, n + 3].filter((k) => k >= 1 && k <= 10), 2);
    const incorrectas = [CONT[otroTipo][n - 1], ...cercanos.map((k) => CONT[tipo][k - 1])];
    return { clave: `cuantos|${clave}|${n}`, svg: escenaContar(p, color, n),
      pregunta: `¿Cuánt${p.g === "m" ? "os" : "as"} ${p.plural} hay?`, correcta, incorrectas };
  }

  // ---------- ¿Dónde está? ----------
  // x0, x1 = extremos del objeto; top = altura de su parte de arriba; cx = centro.
  // escArriba / escBajo = tamaño del objeto encima / debajo (en la silla hay poco hueco).
  // svg = cómo se dibuja el objeto. Posiciones: うえ encima, した debajo, なか dentro,
  // まえ delante, うしろ detrás, よこ al lado. Solo se usan las que se pueden dibujar con claridad.
  const REFS = {
    caja: { jp: "はこ", es: "caja", g: "f", x0: 141, x1: 239, top: 108, cx: 190, escArriba: 1, escBajo: 1, pos: ["うえ", "なか", "よこ", "まえ", "うしろ"],
      svg: '<rect x="145" y="116" width="90" height="54" rx="3" fill="#C9A66B"/><rect x="185" y="116" width="10" height="20" fill="#DDBF86"/><rect x="141" y="108" width="98" height="10" rx="2" fill="#B38F55"/>' },
    escritorio: { jp: "つくえ", es: "escritorio", g: "m", x0: 100, x1: 280, top: 108, cx: 190, escArriba: 1, escBajo: 1, pos: ["うえ", "よこ", "まえ", "うしろ"],
      svg: '<rect x="108" y="120" width="164" height="50" fill="#9A7050"/><rect x="118" y="128" width="64" height="18" rx="2" fill="#B28A66"/><rect x="198" y="128" width="64" height="18" rx="2" fill="#B28A66"/><rect x="100" y="108" width="180" height="12" rx="3" fill="#B98F68"/>' },
    mesa: { jp: "テーブル", es: "mesa", g: "f", x0: 100, x1: 280, top: 112, cx: 190, escArriba: 1, escBajo: 0.95, pos: ["うえ", "した", "よこ", "まえ"],
      svg: '<rect x="115" y="122" width="9" height="48" fill="#8A6246"/><rect x="256" y="122" width="9" height="48" fill="#8A6246"/><rect x="100" y="112" width="180" height="10" rx="3" fill="#A0785A"/>' },
    silla: { jp: "いす", es: "silla", g: "f", x0: 150, x1: 210, top: 126, cx: 185, escArriba: 0.8, escBajo: 0.62, pos: ["うえ", "した", "よこ", "まえ"],
      svg: '<rect x="152" y="136" width="8" height="34" fill="#6B8A5B"/><rect x="200" y="136" width="8" height="34" fill="#6B8A5B"/><rect x="150" y="86" width="9" height="50" rx="2" fill="#6B8A5B"/><rect x="150" y="126" width="60" height="10" rx="2" fill="#7C9A6B"/>' },
    cama: { jp: "ベッド", es: "cama", g: "f", x0: 94, x1: 282, top: 124, cx: 225, escArriba: 1, escBajo: 1, pos: ["うえ", "よこ", "まえ", "うしろ"],
      svg: '<rect x="104" y="160" width="8" height="10" fill="#7A5C3E"/><rect x="266" y="160" width="8" height="10" fill="#7A5C3E"/><rect x="100" y="148" width="180" height="12" fill="#7A5C3E"/><rect x="100" y="124" width="180" height="26" rx="4" fill="#8FB0D8"/><rect x="94" y="96" width="10" height="64" rx="3" fill="#7A5C3E"/><ellipse cx="128" cy="122" rx="18" ry="6" fill="#F4F1E8"/>' }
  };
  const TODAS_POSICIONES = ["うえ", "した", "なか", "まえ", "うしろ", "よこ"];
  const SUELO = '<rect y="170" width="380" height="40" fill="#F0EADB"/><line x1="0" y1="170" x2="380" y2="170" stroke="#DDD4BF" stroke-width="1"/>';

  function escenaDonde(p, color, r, pos) {
    let antes = "", despues = ""; // antes = detrás del objeto; despues = delante del objeto
    switch (pos) {
      case "うえ": despues = pieza(p, color, r.cx, r.top, r.escArriba); break;                 // encima, apoyado arriba
      case "なか": antes = pieza(p, color, r.cx, r.top + 22, 1); break;                          // dentro: el objeto tapa su parte baja
      case "した": antes = pieza(p, color, r.cx, 170, r.escBajo); break;                         // debajo, entre las patas
      case "よこ": despues = pieza(p, color, si(0.5) ? r.x1 + 52 : r.x0 - 52, 170, 1); break;    // a un lado, en el suelo
      case "まえ": despues = pieza(p, color, r.cx + azar([-25, 25]), 198, 1.1); break;           // delante: más grande y más abajo
      case "うしろ": antes = pieza(p, color, r.cx + azar([-30, 30]), r.top + p.alto * 1.1 * 0.45, 1.1); break; // detrás: medio tapado (se ve más de la mitad)
    }
    return envolver(SUELO + antes + r.svg + despues);
  }

  function preguntaDonde() {
    const clave = azar(PARA_POSICION), p = PIEZAS[clave];
    const ref = azar(Object.keys(REFS)), r = REFS[ref];
    const pos = azar(r.pos), color = azar(p.colores);
    const frase = (posicion) => `${r.jp}の ${posicion}に`; // por ejemplo: はこの うえに
    return { clave: `donde|${clave}|${ref}|${pos}`, svg: escenaDonde(p, color, r, pos),
      pregunta: `¿Dónde está ${p.g === "m" ? "el" : "la"} ${p.es} respecto a ${r.g === "m" ? "el" : "la"} ${r.es}?`,
      correcta: frase(pos), incorrectas: varios(TODAS_POSICIONES, 3, [pos]).map(frase) };
  }

  // ---------- Lo único que se "publica" ----------
  // tipo: "cuantos", "donde" o "mezcla" (cada pregunta, de uno de los dos tipos al azar)
  return function generarDibujos(cantidad, tipo = "mezcla") {
    const lista = [], vistas = new Set();
    let intentos = 0;
    while (lista.length < cantidad && intentos < cantidad * 40) { // el límite evita un bucle infinito
      intentos++;
      const pregunta = (tipo === "cuantos" || (tipo === "mezcla" && si(0.5))) ? preguntaContar() : preguntaDonde();
      if (vistas.has(pregunta.clave)) continue; // sin preguntas repetidas
      vistas.add(pregunta.clave);
      lista.push(pregunta);
    }
    return lista;
  };
})();
