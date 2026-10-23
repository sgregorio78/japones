// GENERADOR DE FRASES ALEATORIAS (para la pestaña "Ordenar aleatorio")
//
// Cómo funciona:
//  1. Hay LISTAS DE VOCABULARIO clasificadas: animales y personas (ANIMADOS, que usan います),
//     cosas y plantas (INANIMADOS, que usan あります), lugares, días, comidas...
//  2. Hay PLANTILLAS: cada una es una función que elige palabras al azar y construye a la vez
//     la frase en español y la frase en japonés (como lista de palabras sueltas).
//  3. generarFrases(n) llama a plantillas al azar hasta tener n frases distintas.
// Las frases pueden no tener sentido ("Hay un elefante dentro de la nevera"), pero la gramática
// siempre es correcta: la clasificación en animado / inanimado decide います o あります.
//
// Todo va dentro de una función que se ejecuta al momento, para que sus nombres internos
// no choquen con los de app.js. Solo se "publica" generarFrases, al final.
const generarFrases = (() => {
  // ---------- Herramientas ----------
  const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];
  // n elementos distintos al azar de una lista, sin contar los de "excluir"
  const varios = (lista, n, excluir = []) => mezclar(lista.filter((x) => !excluir.includes(x))).slice(0, n);
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const si = (probabilidad) => Math.random() < probabilidad;

  // ---------- Español: artículos, plurales y números ----------
  const un = (n) => (n.g === "f" ? "una " : "un ") + n.es;
  const ningun = (n) => (n.g === "f" ? "ninguna " : "ningún ") + n.es;
  const de = (n) => (n.g === "f" ? "de la " : "del ") + n.es; // "de la mesa" / "del escritorio"
  function autoPlural(p) {
    if (/[aeiouáéíóú]$/.test(p)) return p + "s";
    if (p.endsWith("z")) return p.slice(0, -1) + "ces"; // pez -> peces, lápiz -> lápices
    return p + "es";
  }
  const plural = (n) => n.pl || autoPlural(n.es); // n.pl = plural irregular, si lo hay
  const UNI = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const ESP = ["diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve"];
  const VEINTE = ["veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
  const DEC = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  function numES(n) { // de 1 a 99
    if (n < 10) return UNI[n];
    if (n < 20) return ESP[n - 10];
    if (n < 30) return VEINTE[n - 20];
    const d = Math.floor(n / 10), u = n % 10;
    return u ? `${DEC[d]} y ${UNI[u]}` : DEC[d];
  }
  // Delante de un sustantivo masculino, "uno" pierde la o: un yen, veintiún yenes
  const apocope = (t) => t.replace(/uno$/, "un").replace(/veintiun$/, "veintiún");

  // ---------- Vocabulario ----------
  // Sustantivos: [japonés, español, género (m/f), plural irregular (opcional)]
  const nombres = (lista) => lista.map(([jp, es, g, pl]) => ({ jp, es, g, pl }));
  const ANIMALES = nombres([
    ["ねこ", "gato", "m"], ["いぬ", "perro", "m"], ["さかな", "pez", "m", "peces"], ["うさぎ", "conejo", "m"],
    ["さる", "mono", "m"], ["ぶた", "cerdo", "m"], ["へび", "serpiente", "f"], ["かえる", "rana", "f"],
    ["かめ", "tortuga", "f"], ["くま", "oso", "m"], ["とら", "tigre", "m"], ["ひつじ", "oveja", "f"],
    ["ねずみ", "ratón", "m", "ratones"], ["うま", "caballo", "m"], ["うし", "vaca", "f"],
    ["ぞう", "elefante", "m"], ["ライオン", "león", "m", "leones"], ["とり", "pájaro", "m"]
  ]);
  // Estos animales no se cuentan con ひき (los grandes y las aves tienen otros contadores)
  const SIN_HIKI = ["うま", "うし", "ぞう", "ライオン", "とり"];
  const ANIMALES_HIKI = ANIMALES.filter((a) => !SIN_HIKI.includes(a.jp));
  const PERSONAS = nombres([
    ["がくせい", "estudiante", "m"], ["せんせい", "profesor", "m"], ["いしゃ", "médico", "m"],
    ["かんごし", "enfermero", "m"], ["ともだち", "amigo", "m"], ["おとこのこ", "niño", "m"],
    ["おんなのこ", "niña", "f"], ["ひと", "persona", "f"], ["おじいさん", "abuelo", "m"],
    ["おばあさん", "abuela", "f"], ["あかちゃん", "bebé", "m"]
  ]);
  // Cosas y plantas: en japonés no son "seres vivos con movimiento", así que usan あります
  const COSAS = nombres([
    ["ほん", "libro", "m"], ["ノート", "cuaderno", "m"], ["えんぴつ", "lápiz", "m"], ["ケーキ", "pastel", "m"],
    ["りんご", "manzana", "f"], ["みかん", "mandarina", "f"], ["たまご", "huevo", "m"], ["コップ", "vaso", "m"],
    ["かさ", "paraguas", "m", "paraguas"], ["とけい", "reloj", "m"], ["ペン", "bolígrafo", "m"],
    ["パソコン", "ordenador", "m"], ["スマホ", "móvil", "m"], ["くるま", "coche", "m"], ["かぎ", "llave", "f"],
    ["き", "árbol", "m"], ["はな", "flor", "f"], ["くさ", "hierba", "f"]
  ]);
  const ANIMADOS = [...ANIMALES, ...PERSONAS];

  // Lugares: [japonés, "en el ..."]
  const LUGARES = [
    ["にわ", "en el jardín"], ["こうえん", "en el parque"], ["へや", "en la habitación"], ["いえ", "en la casa"],
    ["がっこう", "en la escuela"], ["きょうしつ", "en la clase"], ["えき", "en la estación"], ["みせ", "en la tienda"],
    ["びょういん", "en el hospital"], ["ぎんこう", "en el banco"], ["としょかん", "en la biblioteca"],
    ["レストラン", "en el restaurante"], ["ホテル", "en el hotel"], ["うみ", "en el mar"], ["やま", "en la montaña"]
  ].map(([jp, en]) => ({ jp, en }));
  // Referencias para "encima de la mesa", "dentro de la mochila"...
  // tipo: s = tiene superficie (うえ, した), c = es un contenedor (なか), f = tiene frente (まえ, うしろ, よこ)
  const REFERENCIAS = [
    ["つくえ", "escritorio", "m", "sf"], ["いす", "silla", "f", "sf"], ["ベッド", "cama", "f", "sf"],
    ["テーブル", "mesa", "f", "sf"], ["たな", "estantería", "f", "sf"], ["はこ", "caja", "f", "sc"],
    ["かばん", "mochila", "f", "c"], ["へや", "habitación", "f", "c"], ["いえ", "casa", "f", "cf"],
    ["れいぞうこ", "nevera", "f", "c"], ["ドア", "puerta", "f", "f"], ["テレビ", "televisión", "f", "f"]
  ].map(([jp, es, g, tipo]) => ({ jp, es, g, tipo }));
  const POSICIONES = [
    ["うえ", "encima", "s"], ["した", "debajo", "s"], ["なか", "dentro", "c"],
    ["まえ", "delante", "f"], ["うしろ", "detrás", "f"], ["よこ", "al lado", "f"]
  ].map(([jp, es, tipo]) => ({ jp, es, tipo }));

  const DIAS = [["げつようび", "lunes"], ["かようび", "martes"], ["すいようび", "miércoles"], ["もくようび", "jueves"],
    ["きんようび", "viernes"], ["どようび", "sábado"], ["にちようび", "domingo"]].map(([jp, es]) => ({ jp, es }));
  // [japonés, español, ¿es pasado?]
  const DEICTICOS = [["きょう", "Hoy", false], ["あした", "Mañana", false], ["あさって", "Pasado mañana", false],
    ["きのう", "Ayer", true], ["おととい", "Anteayer", true]].map(([jp, es, pasado]) => ({ jp, es, pasado }));
  const SUJETOS = [{ jp: "わたし", es: "Soy", f: false }, { jp: "かれ", es: "Él es", f: false }, { jp: "かのじょ", es: "Ella es", f: true }];
  const PROFESIONES = [["がくせい", "estudiante", "estudiante"], ["せんせい", "profesor", "profesora"], ["いしゃ", "médico", "médica"],
    ["かんごし", "enfermero", "enfermera"], ["べんごし", "abogado", "abogada"], ["コック", "cocinero", "cocinera"],
    ["パイロット", "piloto", "piloto"], ["エンジニア", "ingeniero", "ingeniera"], ["けいさつかん", "policía", "policía"]];
  const DEMOSTRATIVOS = [["これ", "Esto"], ["それ", "Eso"], ["あれ", "Aquello"]];
  const COMIDAS = [["パン", "pan"], ["たまご", "huevos"], ["チーズ", "queso"], ["ごはん", "arroz"], ["やさい", "verduras"],
    ["にく", "carne"], ["さかな", "pescado"], ["サラダ", "ensalada"], ["りんご", "manzanas"], ["みかん", "mandarinas"],
    ["ケーキ", "pastel"], ["バナナ", "plátanos"]].map(([jp, es]) => ({ jp, es }));
  const BEBIDAS = [["みず", "agua"], ["おちゃ", "té"], ["コーヒー", "café"], ["ジュース", "zumo"], ["ミルク", "leche"]]
    .map(([jp, es]) => ({ jp, es }));
  // Contadores del 1 al 10
  const CONT = {
    cosas: ["ひとつ", "ふたつ", "みっつ", "よっつ", "いつつ", "むっつ", "ななつ", "やっつ", "ここのつ", "とお"],
    personas: ["ひとり", "ふたり", "さんにん", "よにん", "ごにん", "ろくにん", "ななにん", "はちにん", "きゅうにん", "じゅうにん"],
    animales: ["いっぴき", "にひき", "さんびき", "よんひき", "ごひき", "ろっぴき", "ななひき", "はっぴき", "きゅうひき", "じゅっぴき"]
  };
  const DIG = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

  // ---------- Piezas para construir frases ----------
  // Verbo de existencia: い-ます (seres vivos) o あり-ます (cosas y plantas), en 4 formas
  const vb = (animado, pasado, negativo) =>
    (animado ? "い" : "あり") + (negativo ? (pasado ? "ませんでした" : "ません") : (pasado ? "ました" : "ます"));
  // Dos formas "incorrectas" del verbo para usarlas como intrusos
  const vbIntrusos = (a, p, n) => [vb(!a, p, n), si(0.5) ? vb(a, !p, n) : vb(a, p, !n)];

  // Un lugar ("en el jardín") o una posición relativa ("encima de la mesa"), al azar.
  // "excluir" evita que el lugar sea la misma palabra que el sujeto de la frase.
  function ubicacion(excluir = []) {
    if (si(0.5)) {
      const lugares = LUGARES.filter((l) => !excluir.includes(l.jp));
      const l = azar(lugares);
      return { jp: [l.jp, "に"], es: l.en, intruso: azar(lugares.filter((x) => x !== l)).jp };
    }
    const pos = azar(POSICIONES);
    const r = azar(REFERENCIAS.filter((x) => x.tipo.includes(pos.tipo) && !excluir.includes(x.jp)));
    const intruso = si(0.5) ? azar(POSICIONES.filter((p) => p !== pos)).jp
      : azar(REFERENCIAS.filter((x) => x !== r && !excluir.includes(x.jp))).jp;
    return { jp: [r.jp, "の", pos.jp, "に"], es: `${pos.es} ${de(r)}`, intruso };
  }

  // En japonés se puede decir "にわに ねこが います" o "ねこが にわに います".
  // Devuelve la frase principal y las otras ordenes que también se aceptan como correctas.
  // "sujetos" es una lista de variantes equivalentes (por ejemplo, con A y B intercambiados).
  function ordenes(lugar, sujetos, verbo) {
    const todas = [];
    sujetos.forEach((s) => { todas.push([...lugar, ...s, ...verbo]); todas.push([...s, ...lugar, ...verbo]); });
    return { frase: todas[0], otras: todas.slice(1) };
  }

  // Monta el ejercicio final: quita intrusos repetidos o que ya estén en la frase
  function crear(es, frase, candidatos, otras = []) {
    const intrusos = [];
    candidatos.forEach((c) => { if (!frase.includes(c) && !intrusos.includes(c)) intrusos.push(c); });
    return { es: cap(es) + ".", frase, intrusos: intrusos.slice(0, 6), otras };
  }

  // ---------- Plantillas ----------
  function fecha() { // "Mañana es jueves." / "Ayer fue lunes."
    const d = azar(DEICTICOS), dia = azar(DIAS);
    return crear(`${d.es} ${d.pasado ? "fue" : "es"} ${dia.es}`,
      [d.jp, "は", dia.jp, d.pasado ? "でした" : "です"],
      [...varios(DIAS.map((x) => x.jp), 2, [dia.jp]), ...varios(DEICTICOS.map((x) => x.jp), 1, [d.jp]),
        d.pasado ? "です" : "でした", ...varios(["を", "に", "で"], 2)]);
  }
  function profesion() { // "Soy médico." / "Ella es abogada."
    const s = azar(SUJETOS), p = azar(PROFESIONES);
    return crear(`${s.es} ${p[s.f ? 2 : 1]}`, [s.jp, "は", p[0], "です"],
      [...varios(SUJETOS.map((x) => x.jp), 1, [s.jp]), ...varios(PROFESIONES.map((x) => x[0]), 2, [p[0]]), ...varios(["を", "に", "で"], 2)]);
  }
  function demostrativo() { // "Esto es un libro."
    const d = azar(DEMOSTRATIVOS), c = azar(COSAS);
    return crear(`${d[1]} es ${un(c)}`, [d[0], "は", c.jp, "です"], // d = [japonés, español]
      [...varios(DEMOSTRATIVOS.map((x) => x[0]), 1, [d[0]]), ...varios(COSAS.map((x) => x.jp), 2, [c.jp]), ...varios(["を", "で", "に"], 2)]);
  }
  function existencia() { // "Hay un gato en el jardín." / "Había un libro encima de la mesa."
    const animado = si(0.5), pasado = si(0.4);
    const pool = animado ? ANIMADOS : COSAS;
    const n = azar(pool), u = ubicacion([n.jp]);
    const { frase, otras } = ordenes(u.jp, [[n.jp, "が"]], [vb(animado, pasado, false)]);
    return crear(`${pasado ? "Había" : "Hay"} ${un(n)} ${u.es}`, frase,
      [azar(pool.filter((x) => x !== n)).jp, u.intruso, ...vbIntrusos(animado, pasado, false), ...varios(["を", "で", "と"], 2)], otras);
  }
  function negativa() { // "No hay ningún libro encima de la mesa."
    const animado = si(0.5), pasado = si(0.4);
    const pool = animado ? ANIMADOS : COSAS;
    const n = azar(pool), u = ubicacion([n.jp]);
    // Con la negación se acepta tanto は como が
    const { frase, otras } = ordenes(u.jp, [[n.jp, "は"], [n.jp, "が"]], [vb(animado, pasado, true)]);
    return crear(`No ${pasado ? "había" : "hay"} ${ningun(n)} ${u.es}`, frase,
      // が va el primero: tiene que estar entre las palabras para poder formar la variante con が
      ["が", azar(pool.filter((x) => x !== n)).jp, u.intruso, ...vbIntrusos(animado, pasado, true), ...varios(["を", "で"], 1)], otras);
  }
  function contador() { // "Hay tres gatos en el jardín."
    const tipo = azar(["cosas", "personas", "animales"]);
    const pool = tipo === "cosas" ? COSAS : tipo === "personas" ? PERSONAS : ANIMALES_HIKI;
    const animado = tipo !== "cosas", pasado = si(0.4);
    const n = azar(pool), cant = aleatorio(1, 10), u = ubicacion([n.jp]);
    const cont = CONT[tipo][cant - 1];
    const { frase, otras } = ordenes(u.jp, [[n.jp, "が", cont]], [vb(animado, pasado, false)]);
    const cuantos = cant === 1 ? un(n) : `${numES(cant)} ${plural(n)}`;
    return crear(`${pasado ? "Había" : "Hay"} ${cuantos} ${u.es}`, frase,
      [azar(pool.filter((x) => x !== n)).jp, ...varios(CONT[tipo], 2, [cont]), vb(!animado, pasado, false), u.intruso], otras);
  }
  function enumeracion() { // "Hay un perro y un elefante encima de la cama."
    const animado = si(0.5), pasado = si(0.4);
    const pool = animado ? ANIMADOS : COSAS; // los dos del mismo tipo: así sirve el mismo verbo
    const [a, b] = varios(pool, 2);
    const conj = azar(["と", "や"]); // と = lista completa; や = ejemplos entre otros
    const u = ubicacion([a.jp, b.jp]);
    const { frase, otras } = ordenes(u.jp, [[a.jp, conj, b.jp, "が"], [b.jp, conj, a.jp, "が"]], [vb(animado, pasado, false)]);
    const hay = pasado ? "Había" : "Hay";
    const inicio = conj === "や" ? `${hay}, por ejemplo,` : hay;
    return crear(`${inicio} ${un(a)} y ${un(b)} ${u.es}`, frase,
      [azar(pool.filter((x) => x !== a && x !== b)).jp, conj === "と" ? "や" : "と", vb(!animado, pasado, false), u.intruso, ...varios(["を", "で"], 2)], otras);
  }
  function comida() { // "Como pan y huevos." / "Bebí agua y té."
    const bebe = si(0.5), pasado = si(0.4);
    const pool = bebe ? BEBIDAS : COMIDAS;
    const [a, b] = varios(pool, 2);
    const forma = pasado ? "ました" : "ます";
    const es = bebe ? (pasado ? "Bebí" : "Bebo") : (pasado ? "Comí" : "Como");
    const principal = ["わたし", "は", a.jp, "と", b.jp, "を", (bebe ? "のみ" : "たべ") + forma];
    const otra = ["わたし", "は", b.jp, "と", a.jp, "を", (bebe ? "のみ" : "たべ") + forma]; // A y B intercambiados
    return crear(`${es} ${a.es} y ${b.es}`, principal,
      [azar((bebe ? COMIDAS : BEBIDAS)).jp, azar(pool.filter((x) => x !== a && x !== b)).jp,
        (bebe ? "たべ" : "のみ") + forma, ...varios(["が", "に", "で"], 2)], [otra]);
  }
  function precio() { // "Son setenta y seis yenes."
    const n = aleatorio(1, 99), d = Math.floor(n / 10), u = n % 10;
    const frase = [];
    if (d >= 2) frase.push(DIG[d]);
    if (d >= 1) frase.push("じゅう");
    if (u === 4) frase.push("よえん"); // 4 yenes es irregular: よえん (no よんえん)
    else { if (u) frase.push(DIG[u]); frase.push("えん"); }
    frase.push("です");
    return crear(n === 1 ? "Es un yen" : `Son ${apocope(numES(n))} yenes`, frase,
      [...varios(DIG.slice(1), 2, frase), u === 4 ? "よんえん" : "ひゃく", d === 0 ? "じゅう" : "を"]);
  }

  const PLANTILLAS = [fecha, profesion, demostrativo, existencia, negativa, contador, enumeracion, comida, precio];

  // ---------- Lo único que se "publica" ----------
  return function generarFrases(cantidad) {
    const lista = [], vistas = new Set();
    let intentos = 0;
    // Se descartan las frases repetidas; el límite de intentos evita un bucle infinito
    while (lista.length < cantidad && intentos < cantidad * 40) {
      intentos++;
      const ejercicio = azar(PLANTILLAS)();
      if (vistas.has(ejercicio.es)) continue;
      vistas.add(ejercicio.es);
      lista.push(ejercicio);
    }
    return lista;
  };
})();
