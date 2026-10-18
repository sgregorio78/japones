/* JavaScript = la LÓGICA. Este archivo tiene 10 partes:
   1. Datos y configuración   2. Utilidades   3-6. Los 4 tipos de ejercicio
   7. Dictado   8. Canciones   9. Configuración   10. Arranque */
"use strict"; // modo estricto: avisa de errores tontos

// ================= 1. DATOS =================
// Todos los ejercicios están en el archivo ejemplos.js (la lista EJEMPLOS), que se carga
// antes que este archivo (ver index.html). Para añadir, cambiar o borrar ejercicios,
// edita ejemplos.js y recarga la página: aquí no se guarda nada en el navegador.
const datos = EJEMPLOS;

// Adivina el tema de una tarjeta buscando su palabra en los ejercicios de unir.
// Si hay varias coincidencias (como かえる), elige la que tenga la misma traducción.
function temaDe(t) {
  const base = t.anverso.replace(/\s*\(.*\)\s*$/, ""); // quita "(animal)" y similares
  const candidatos = [];
  datos.unir.forEach((u) => u.pares.forEach((p) => {
    if (p[0] === base) candidatos.push({ tema: u.titulo, es: p[1] });
  }));
  const mejor = candidatos.find((c) => t.reverso.includes(c.es)) || candidatos[0];
  return mejor ? mejor.tema : "Sin tema";
}
// Si una tarjeta no tiene "tema" en ejemplos.js, se le asigna uno automáticamente
datos.tarjetas.forEach((t) => { if (!t.tema) t.tema = temaDe(t); });

// ----- Configuración -----
// Valores iniciales. Para añadir un ajuste nuevo: ponlo aquí, úsalo donde haga falta
// y añade su control en la sección 9 (verConfiguracion).
const CONFIG_INICIAL = {
  test: {
    repetirFallos: true, // ¿se repiten las preguntas falladas?
    minEspera: 2,        // mínimo de preguntas que pasan antes de repetirla
    maxEspera: 4         // máximo (se elige un número al azar entre los dos, ambos incluidos)
  },
  dictado: {             // mismos ajustes, pero independientes de los del test
    repetirFallos: true,
    minEspera: 2,
    maxEspera: 4
  }
};
let config = cargarConfig();
// A diferencia de los ejercicios, la configuración sí se guarda en el navegador (localStorage)
function cargarConfig() {
  const c = structuredClone(CONFIG_INICIAL);
  try {
    const guardada = JSON.parse(localStorage.getItem("japones-config"));
    // Para cada bloque (test, dictado...) lo guardado manda sobre lo inicial
    if (guardada) for (const clave in c) Object.assign(c[clave], guardada[clave]);
  } catch (e) { /* si no se puede leer, se usan los valores iniciales */ }
  return c;
}
function guardarConfig() {
  try { localStorage.setItem("japones-config", JSON.stringify(config)); } catch (e) { /* sin almacenamiento */ }
}

// ================= 2. UTILIDADES =================
const app = document.querySelector("#app");
const $ = (selector) => app.querySelector(selector); // atajo para buscar dentro de #app

// Evita que lo que escribes se interprete como HTML (seguridad básica)
function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
// Baraja una lista (algoritmo Fisher-Yates) sin modificar la original
function mezclar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// Número entero al azar entre min y max, ambos incluidos
function aleatorio(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function vacio() {
  app.innerHTML = `<p class="aviso">Aún no hay ejercicios de este tipo. Añade alguno en el archivo ejemplos.js.</p>`;
}
// ----- Sesión de práctica (para los ejercicios de unir y de huecos) -----
// Al entrar en una sección se crea una "sesión": un orden aleatorio de los ejercicios y
// una anotación de cuáles has terminado y cómo ("ok" = todo bien, "mal" = con fallos).
// Vive solo en memoria: al cambiar de sección o recargar la página se empieza de cero.
const sesion = {};
function nuevaSesion(tipo) {
  sesion[tipo] = { orden: mezclar(datos[tipo].map((_, i) => i)), resultado: {} };
}
const MARCAS = { ok: "✅ ", mal: "❌ " };

// Barra con botón anterior, desplegable y botón siguiente.
// "pos" es la posición dentro del orden aleatorio; "nombre" da el texto de cada opción.
function barraHtml(tipo, nombre, pos) {
  const s = sesion[tipo];
  const opciones = s.orden.map((idx, p) => {
    const estado = s.resultado[idx] || "";
    const texto = nombre(datos[tipo][idx], idx);
    return `<option value="${p}" class="${estado}" data-nombre="${esc(texto)}" ${p === pos ? "selected" : ""}>${MARCAS[estado] || ""}${esc(texto)}</option>`;
  }).join("");
  return `<div class="barra">
    <button id="prev" aria-label="Ejercicio anterior">←</button>
    <select id="sel" aria-label="Elegir ejercicio">${opciones}</select>
    <button id="next" aria-label="Ejercicio siguiente">→</button></div>`;
}
// Conecta la barra: "ver" es la función que dibuja un ejercicio a partir de su posición
function conectarBarra(tipo, pos, ver) {
  const n = sesion[tipo].orden.length;
  $("#sel").onchange = (e) => ver(Number(e.target.value));
  $("#prev").onclick = () => ver((pos - 1 + n) % n); // al llegar al principio, salta al final
  $("#next").onclick = () => ver((pos + 1) % n);     // al llegar al final, vuelve al principio
}
// Anota el resultado y actualiza la opción del desplegable sin recargar el ejercicio
function anotarResultado(tipo, pos, estado) {
  const s = sesion[tipo];
  s.resultado[s.orden[pos]] = estado;
  const opcion = $("#sel").options[pos];
  opcion.className = estado;
  opcion.textContent = MARCAS[estado] + opcion.dataset.nombre;
}

// ================= 3. TIPO 1: TEST (pregunta y varias respuestas) =================
// Si está activado en Configuración, una pregunta fallada se repite tras un número al azar
// de preguntas (entre el mínimo y el máximo configurados) y así hasta que la aciertes.
// "grupo" puede ser "todo", "50", "100" (preguntas al azar) o el nombre de un tema.
function verTest(grupo = "todo") {
  if (!datos.test.length) return vacio();
  const { repetirFallos, minEspera, maxEspera } = config.test; // ajustes de la sección Configuración
  const temas = listaDeTemas(datos.test);
  if (!["todo", "50", "100"].includes(grupo) && !temas.includes(grupo)) grupo = "todo";
  const delTema = (q) => q.tema || "Sin tema";
  const baraja = mezclar(datos.test); // todas las preguntas, en orden aleatorio
  // Cola de preguntas del grupo elegido: aquí se van metiendo las falladas
  const lista = (grupo === "50" || grupo === "100") ? baraja.slice(0, Number(grupo))
    : grupo === "todo" ? baraja : baraja.filter((q) => delTema(q) === grupo);
  const total = lista.length; // se calcula ahora, antes de añadir repeticiones

  // Desplegable de grupos. Las opciones de 50 y 100 solo salen si hay más preguntas que eso.
  const opcion = (valor, texto) => `<option value="${esc(valor)}" ${valor === grupo ? "selected" : ""}>${esc(texto)}</option>`;
  const selector = () => `<select id="grupo" aria-label="Grupo de preguntas">
    ${opcion("todo", `Todas (${datos.test.length})`)}
    ${datos.test.length > 50 ? opcion("50", "50 preguntas al azar") : ""}
    ${datos.test.length > 100 ? opcion("100", "100 preguntas al azar") : ""}
    ${temas.map((t) => opcion(t, `${t} (${datos.test.filter((q) => delTema(q) === t).length})`)).join("")}</select>`;
  const conectarGrupo = () => { $("#grupo").onchange = (e) => verTest(e.target.value); }; // cambia de grupo y empieza de nuevo
  const vistas = new Set();          // preguntas que ya has contestado al menos una vez
  let i = 0, puntos = 0, repasos = 0; // posición actual, aciertos a la primera, repeticiones

  function mostrar() {
    // Si ya no quedan preguntas en la cola, enseñamos el resultado
    if (i >= lista.length) {
      app.innerHTML = `${selector()}<h2>Resultado</h2>
        <p class="grande">${puntos} / ${total}</p>
        <p class="aviso">Aciertos a la primera.${repetirFallos ? ` Veces que se ha repetido una pregunta por fallarla: ${repasos}.` : ""}</p>
        <button id="rep">Repetir test</button>`;
      conectarGrupo();
      $("#rep").onclick = () => verTest(grupo);
      return;
    }
    const p = lista[i];
    const esRepaso = vistas.has(p); // true si es una pregunta que ya habías fallado
    const opciones = mezclar([p.correcta, ...p.incorrectas]); // "..." = desplegar la lista
    app.innerHTML = `
      ${selector()}
      <p class="prog">${esRepaso ? "Repaso de una pregunta fallada" : `Pregunta ${vistas.size + 1} de ${total}`}</p>
      <h2>${esc(p.pregunta)}</h2>
      <div class="opciones">${opciones.map((o) => `<button class="op">${esc(o)}</button>`).join("")}</div>
      <p id="fb" class="fb"></p>
      <button id="sig" hidden>Siguiente</button>`;

    conectarGrupo();
    app.querySelectorAll(".op").forEach((boton) => {
      boton.onclick = () => {
        const acierto = boton.textContent === p.correcta;
        // La puntuación solo cuenta el primer intento de cada pregunta
        if (!esRepaso) {
          vistas.add(p);
          if (acierto) puntos++;
        }
        // Bloqueamos todos los botones y coloreamos la solución
        app.querySelectorAll(".op").forEach((b) => {
          b.disabled = true;
          if (b.textContent === p.correcta) b.classList.add("ok");
        });
        if (acierto) {
          $("#fb").textContent = "¡Correcto!";
        } else {
          boton.classList.add("mal");
          if (repetirFallos) {
            // Cuántas preguntas pasan antes de repetirla: es una sorpresa, no se le dice al usuario
            const espera = aleatorio(minEspera, maxEspera);
            // splice(posición, 0, p) mete p en la cola sin borrar nada
            // (si la posición pasa del final, la añade al final)
            lista.splice(i + 1 + espera, 0, p);
            repasos++;
          }
          $("#fb").textContent = `Incorrecto. Esta pregunta ${repetirFallos ? "se repetirá" : "no se repetirá"}.`;
        }
        $("#sig").hidden = false;
      };
    });
    $("#sig").onclick = () => { i++; mostrar(); };
  }
  mostrar();
}

// ================= 4. TIPO 2: TARJETAS DE ESTUDIO =================
// Cada tarjeta tiene un "tema": los mismos nombres que los ejercicios de unir.
// Devuelve los temas que aparecen en una lista (tarjetas, preguntas...), en el orden
// de los ejercicios de unir. Sirve para las tarjetas y para el test.
function listaDeTemas(items) {
  const usados = new Set(items.map((t) => t.tema || "Sin tema"));
  const temas = datos.unir.map((u) => u.titulo).filter((t) => usados.has(t));
  usados.forEach((t) => { if (!temas.includes(t)) temas.push(t); }); // temas propios
  return temas;
}

function verTarjetas(tema = "todo") { // "todo" = repasar todas las tarjetas
  if (!datos.tarjetas.length) return vacio();
  const temas = listaDeTemas(datos.tarjetas);
  if (tema !== "todo" && !temas.includes(tema)) tema = "todo";
  const delTema = (t) => (t.tema || "Sin tema");
  const lista = mezclar(datos.tarjetas.filter((t) => tema === "todo" || delTema(t) === tema));
  let i = 0, girada = false;

  function mostrar() {
    const t = lista[i];
    const opciones = temas.map((nombre) => {
      const cuantas = datos.tarjetas.filter((x) => delTema(x) === nombre).length;
      return `<option value="${esc(nombre)}" ${nombre === tema ? "selected" : ""}>${esc(nombre)} (${cuantas})</option>`;
    }).join("");
    app.innerHTML = `
      <select id="tema" aria-label="Tema de las tarjetas">
        <option value="todo" ${tema === "todo" ? "selected" : ""}>Todo (${datos.tarjetas.length})</option>${opciones}</select>
      <p class="prog">Tarjeta ${i + 1} de ${lista.length} · toca la tarjeta para girarla</p>
      <button class="tarjeta ${girada ? "reverso" : ""}">${esc(girada ? t.reverso : t.anverso)}</button>
      <div class="fila"><button id="ant">← Anterior</button><button id="sig">Siguiente →</button></div>`;
    $("#tema").onchange = (e) => verTarjetas(e.target.value); // cambia de tema y vuelve a barajar
    $(".tarjeta").onclick = () => { girada = !girada; mostrar(); }; // clic = girar
    // El operador % hace que al llegar al final vuelva al principio
    $("#ant").onclick = () => { i = (i - 1 + lista.length) % lista.length; girada = false; mostrar(); };
    $("#sig").onclick = () => { i = (i + 1) % lista.length; girada = false; mostrar(); };
  }
  mostrar();
}

// ================= 5. TIPO 3: UNIR RESPUESTAS =================
// Duración de la animación en milisegundos (0 si el sistema pide "reducir movimiento")
const DURACION = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600;

// Baja palabras al "montón" de resueltas, con animación. Se usa la técnica FLIP:
//   F (First)  = anotar dónde está cada botón ANTES
//   L (Last)   = cambiar el orden real en el HTML y ver dónde queda DESPUÉS
//   I (Invert) = con transform, devolver cada botón visualmente a su sitio de antes
//   P (Play)   = quitar el transform con una transición: el botón se desliza a su nuevo sitio
// "movimientos" es una lista de [columna, [botones que bajan]]; "clase" es "ok" o "mal".
function bajarPalabras(movimientos, clase, alTerminar) {
  const todos = [...app.querySelectorAll(".item")];
  const antes = new Map(todos.map((b) => [b, b.getBoundingClientRect().top])); // F

  movimientos.forEach(([columna, botones]) => {
    // El montón de resueltas empieza en la primera ya resuelta (las nuevas van ENCIMA).
    // Si no hay ninguna (null), insertBefore coloca el botón al final.
    const primeraResuelta = columna.querySelector(".resuelto");
    botones.forEach((b) => {
      columna.insertBefore(b, primeraResuelta); // L
      b.disabled = true;
      b.classList.remove("sel");
      b.classList.add("resuelto", "moviendo", clase);
    });
  });

  todos.forEach((b) => { // I
    const desplazamiento = antes.get(b) - b.getBoundingClientRect().top;
    if (!desplazamiento) return;
    b.style.transition = "none";
    b.style.transform = `translateY(${desplazamiento}px)`;
  });
  void app.offsetHeight; // obliga al navegador a "fijar" la posición de partida
  todos.forEach((b) => { // P
    b.style.transition = `transform ${DURACION}ms ease`;
    b.style.transform = "";
  });

  // Cuando termina la animación: limpiar, mostrar las palabras que acaban de bajar y avisar
  setTimeout(() => {
    todos.forEach((b) => { b.style.transition = ""; b.classList.remove("moviendo"); });
    movimientos[0][1][0].scrollIntoView({ behavior: DURACION ? "smooth" : "auto", block: "center" });
    alTerminar();
  }, DURACION + 50);
}

function verUnir(pos = 0) {
  if (!datos.unir.length) return vacio();
  const ej = datos.unir[sesion.unir.orden[pos]];
  const total = ej.pares.length;
  // Cada elemento recuerda el número de su pareja (i): así sabemos si encajan
  const izq = ej.pares.map((p, i) => ({ t: p[0], i }));
  const der = mezclar(ej.pares.map((p, i) => ({ t: p[1], i })));
  const boton = (x, lado) => `<button class="item ${lado}" data-i="${x.i}">${esc(x.t)}</button>`;

  app.innerHTML = `
    ${barraHtml("unir", (e) => e.titulo, pos)}
    <h2>Une cada pareja</h2>
    <div class="marcador"><span id="marc">Aciertos: 0 de ${total}</span></div>
    <div class="columnas"><div id="col-izq">${izq.map((x) => boton(x, "izq")).join("")}</div>
    <div id="col-der">${der.map((x) => boton(x, "der")).join("")}</div></div>`;
  conectarBarra("unir", pos, verUnir);

  const colIzq = $("#col-izq"), colDer = $("#col-der");
  let elegido = null;   // botón de la izquierda seleccionado
  let ocupado = false;  // true mientras hay una animación en marcha (ignora clics)
  let aciertos = 0, resueltas = 0;

  function alTerminar() {
    ocupado = false;
    if (resueltas === total) {
      anotarResultado("unir", pos, aciertos === total ? "ok" : "mal");
      $("#marc").innerHTML = `¡Terminado! Has acertado ${aciertos} de ${total}. <button id="rep">Repetir</button>`;
      $("#rep").onclick = () => verUnir(pos);
    }
  }

  app.querySelectorAll(".item").forEach((b) => {
    b.onclick = () => {
      if (ocupado || b.disabled) return;
      if (b.classList.contains("izq")) {
        app.querySelectorAll(".izq").forEach((x) => x.classList.remove("sel"));
        b.classList.add("sel");
        elegido = b;
        return;
      }
      if (!elegido) return; // hay que elegir primero una palabra de la izquierda
      ocupado = true;
      const a = elegido.dataset.i, c = b.dataset.i;
      if (a === c) { // acierto: bajan las dos palabras, en verde
        aciertos++; resueltas++;
        bajarPalabras([[colIzq, [elegido]], [colDer, [b]]], "ok", alTerminar);
      } else {       // fallo: bajan las dos elegidas y sus parejas verdaderas, en rojo
        resueltas += 2;
        const parejaDeLaIzq = colDer.querySelector(`.der[data-i="${a}"]`);
        const parejaDeLaDer = colIzq.querySelector(`.izq[data-i="${c}"]`);
        // Orden elegido para que cada pareja correcta quede en la misma fila
        bajarPalabras([[colIzq, [elegido, parejaDeLaDer]], [colDer, [parejaDeLaIzq, b]]], "mal", alTerminar);
      }
      elegido = null;
      $("#marc").textContent = `Aciertos: ${aciertos} de ${total}`;
    };
  });
}

// ================= 6. TIPO 4: COMPLETAR HUECOS (arrastrar palabras) =================
function verHuecos(pos = 0) {
  if (!datos.huecos.length) return vacio();
  const ej = datos.huecos[sesion.huecos.orden[pos]];

  // split con paréntesis conserva los trozos "[...]": "私は[水]を" -> ["私は", "[水]", "を"]
  const trozos = ej.frase.split(/(\[.+?\])/);
  const respuestas = [];
  const fraseHtml = trozos.map((t) => {
    if (t.startsWith("[") && t.endsWith("]")) {
      const r = t.slice(1, -1);
      respuestas.push(r);
      return `<span class="hueco" data-resp="${esc(r)}"></span>`; // hueco vacío
    }
    return esc(t);
  }).join("");
  // Banco de palabras = respuestas correctas + distractores, mezcladas
  const palabras = mezclar([...respuestas, ...ej.extras]);

  app.innerHTML = `
    ${barraHtml("huecos", (e, i) => e.traduccion || "Ejercicio " + (i + 1), pos)}
    <h2>Traduce la frase: arrastra cada palabra a su hueco</h2>
    <div class="frase">${fraseHtml}</div>
    <div class="banco">${palabras.map((p) => `<span class="palabra" draggable="true">${esc(p)}</span>`).join("")}</div>
    <div class="fila"><button id="comp">Comprobar</button><button id="reint">Reintentar</button></div>
    <p id="fb" class="fb"></p>`;
  conectarBarra("huecos", pos, verHuecos);

  const banco = $(".banco");
  let arrastrada = null; // palabra que se está arrastrando
  let elegida = null;    // palabra elegida con un clic (útil en el móvil, donde arrastrar falla)

  // Poner una palabra en un hueco; si ya había otra, vuelve al banco
  function colocar(hueco, palabra) {
    if (hueco.firstElementChild) banco.appendChild(hueco.firstElementChild);
    hueco.appendChild(palabra);
    palabra.classList.remove("sel");
    elegida = null;
  }

  app.querySelectorAll(".palabra").forEach((p) => {
    p.ondragstart = () => { arrastrada = p; };
    p.onclick = () => {
      if (p.parentElement !== banco) { banco.appendChild(p); return; } // en un hueco: devolver
      if (elegida) elegida.classList.remove("sel");
      elegida = p; p.classList.add("sel");
    };
  });

  app.querySelectorAll(".hueco").forEach((h) => {
    // dragover debe cancelarse con preventDefault, si no el navegador no permite soltar
    h.ondragover = (e) => { e.preventDefault(); h.classList.add("sobre"); };
    h.ondragleave = () => h.classList.remove("sobre");
    h.ondrop = (e) => {
      e.preventDefault();
      h.classList.remove("sobre");
      if (arrastrada) colocar(h, arrastrada);
    };
    h.onclick = () => { if (elegida) colocar(h, elegida); }; // alternativa por clic
  });
  // Soltar en el banco también devuelve la palabra
  banco.ondragover = (e) => e.preventDefault();
  banco.ondrop = () => { if (arrastrada) banco.appendChild(arrastrada); };

  let comprobado = false; // solo cuenta la primera comprobación de cada intento
  $("#comp").onclick = () => {
    let bien = 0;
    app.querySelectorAll(".hueco").forEach((h) => {
      const ok = h.firstElementChild && h.firstElementChild.textContent === h.dataset.resp;
      h.classList.remove("ok", "mal");
      h.classList.add(ok ? "ok" : "mal");
      if (ok) bien++;
    });
    if (!comprobado) {
      comprobado = true;
      anotarResultado("huecos", pos, bien === respuestas.length ? "ok" : "mal");
    }
    $("#fb").textContent = `${bien} de ${respuestas.length} huecos correctos.`;
  };
  $("#reint").onclick = () => verHuecos(pos);
}

// ================= 7. DICTADO (escribe lo que oyes) =================
// Usa la síntesis de voz del navegador (Web Speech API): speechSynthesis lee un texto en voz alta.
// No hace falta instalar nada ni conectarse a ningún servicio. La voz japonesa depende de tu dispositivo.
function hablar(texto, lento) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel(); // corta lo que estuviera sonando
  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "ja-JP";
  voz.rate = lento ? 0.6 : 0.9; // 1 = velocidad normal
  speechSynthesis.speak(voz);
}
// Para comparar solo las letras: quita espacios y signos y unifica caracteres parecidos
const limpiar = (t) => t.normalize("NFKC").replace(/[\s、。,.!?！？・「」]/g, "");

function verDictado(grupo = "20") { // "20" = 20 palabras al azar, "todo" o el nombre de un tema
  // Palabras de los ejercicios de unir, sin repetir
  const todas = [], yaEsta = new Set();
  datos.unir.forEach((u) => u.pares.forEach(([jp, es]) => {
    if (!yaEsta.has(jp)) { yaEsta.add(jp); todas.push({ jp, es, tema: u.titulo }); }
  }));
  if (!todas.length) return vacio();
  const { repetirFallos, minEspera, maxEspera } = config.dictado; // ajustes de la sección Configuración
  const temas = listaDeTemas(todas);
  if (!["20", "todo"].includes(grupo) && !temas.includes(grupo)) grupo = "20";
  const baraja = mezclar(todas);
  const lista = grupo === "20" ? baraja.slice(0, 20)
    : grupo === "todo" ? baraja : baraja.filter((x) => x.tema === grupo);
  const total = lista.length;
  const vistas = new Set(); // palabras ya intentadas; las falladas se repiten según la configuración
  let i = 0, puntos = 0, repasos = 0;

  const opcion = (valor, texto) => `<option value="${esc(valor)}" ${valor === grupo ? "selected" : ""}>${esc(texto)}</option>`;
  const selector = () => `<select id="grupo" aria-label="Grupo de palabras">
    ${opcion("20", "20 palabras al azar")}${opcion("todo", `Todas (${todas.length})`)}
    ${temas.map((t) => opcion(t, `${t} (${todas.filter((x) => x.tema === t).length})`)).join("")}</select>`;
  // Aviso si el dispositivo no puede leer en voz alta o no tiene voz japonesa
  const voces = "speechSynthesis" in window ? speechSynthesis.getVoices() : [];
  const aviso = !("speechSynthesis" in window) ? "Tu navegador no puede leer en voz alta."
    : (voces.length && !voces.some((v) => v.lang.toLowerCase().replace("_", "-").startsWith("ja")))
      ? "Tu dispositivo no parece tener una voz japonesa instalada; puede sonar con acento extraño." : "";

  function mostrar() {
    if (i >= lista.length) {
      app.innerHTML = `${selector()}<h2>Resultado</h2><p class="grande">${puntos} / ${total}</p>
        <p class="aviso">Aciertos a la primera.${repetirFallos ? ` Veces que se ha repetido una palabra por fallarla: ${repasos}.` : ""}</p>
        <button id="rep">Repetir</button>`;
      $("#grupo").onchange = (e) => verDictado(e.target.value);
      $("#rep").onclick = () => verDictado(grupo);
      return;
    }
    const p = lista[i];
    const esRepaso = vistas.has(p);
    app.innerHTML = `
      ${selector()}
      <p class="prog">${esRepaso ? "Repaso de una palabra fallada" : `Palabra ${vistas.size + 1} de ${total}`}</p>
      ${aviso ? `<p class="aviso">${esc(aviso)}</p>` : ""}
      <div class="fila"><button id="oir">🔊 Escuchar</button><button id="lento">🐢 Más lento</button></div>
      <input id="resp" class="entrada" lang="ja" autocomplete="off" autocapitalize="off" spellcheck="false"
        placeholder="Escribe lo que oyes (hiragana o katakana)" aria-label="Lo que oyes">
      <div class="fila"><button id="comp">Comprobar</button><button id="sig" hidden>Siguiente</button></div>
      <p id="fb" class="fb"></p>`;
    $("#grupo").onchange = (e) => verDictado(e.target.value);
    $("#oir").onclick = () => hablar(p.jp, false);
    $("#lento").onclick = () => hablar(p.jp, true);

    const entrada = $("#resp");
    let hecho = false; // true cuando ya has comprobado esta palabra
    function comprobar() {
      if (!limpiar(entrada.value)) return; // no hace nada si está vacío
      hecho = true;
      const acierto = limpiar(entrada.value) === limpiar(p.jp);
      if (!esRepaso) { vistas.add(p); if (acierto) puntos++; } // solo cuenta el primer intento
      entrada.readOnly = true;
      entrada.classList.add(acierto ? "ok" : "mal");
      if (acierto) {
        $("#fb").textContent = `¡Correcto! ${p.jp} = ${p.es}`;
      } else {
        if (repetirFallos) {
          // La palabra vuelve a salir tras un número de palabras al azar (sorpresa: no se le dice)
          lista.splice(i + 1 + aleatorio(minEspera, maxEspera), 0, p);
          repasos++;
        }
        $("#fb").textContent = `Incorrecto. Era: ${p.jp} (${p.es}). Esta palabra ${repetirFallos ? "se repetirá" : "no se repetirá"}.`;
      }
      $("#comp").hidden = true;
      $("#sig").hidden = false;
    }
    const siguiente = () => { i++; mostrar(); };
    $("#comp").onclick = comprobar;
    $("#sig").onclick = siguiente;
    // Intro comprueba o pasa a la siguiente. isComposing: no actuar mientras se está
    // confirmando una conversión del teclado japonés (que también usa Intro).
    entrada.onkeydown = (e) => {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); hecho ? siguiente() : comprobar(); }
    };
    entrada.focus();
    hablar(p.jp, false); // lee la palabra al aparecer (si el navegador lo permite)
  }
  mostrar();
}

// ================= 8. CANCIONES (no es un ejercicio: es una sección de lectura) =================
// Las letras están en canciones.js (la lista CANCIONES). Cada verso se muestra en japonés
// y, al tocarlo, aparece su traducción debajo.
function verCanciones(n = 0) {
  if (!CANCIONES.length) return vacio();
  const c = CANCIONES[n];
  const opciones = CANCIONES.map((x, i) =>
    `<option value="${i}" ${i === n ? "selected" : ""}>${esc(x.titulo)} · ${esc(x.artista)}</option>`).join("");
  // Un verso vacío (jp: "") es un separador entre estrofas
  const versos = c.letra.map((l) => l.jp
    ? `<button class="verso" aria-expanded="false"><span class="jp">${esc(l.jp)}</span><span class="es">${esc(l.es || "")}</span></button>`
    : `<div class="separador"></div>`).join("");

  app.innerHTML = `
    <select id="cancion" aria-label="Canción">${opciones}</select>
    ${c.nota ? `<p class="aviso">${esc(c.nota)}</p>` : ""}
    ${c.letra.length
      ? `<div class="fila"><button id="todo">Mostrar / ocultar todas las traducciones</button></div><div class="letra">${versos}</div>`
      : `<p class="aviso">Todavía no hay letra. Añádela en canciones.js (las instrucciones están al principio del archivo).</p>`}`;

  $("#cancion").onchange = (e) => verCanciones(Number(e.target.value));
  const botones = app.querySelectorAll(".verso");
  botones.forEach((b) => {
    b.onclick = () => { // toca un verso: muestra u oculta su traducción
      b.classList.toggle("abierto");
      b.setAttribute("aria-expanded", b.classList.contains("abierto"));
    };
  });
  if ($("#todo")) $("#todo").onclick = () => {
    const algunoCerrado = [...botones].some((b) => !b.classList.contains("abierto"));
    botones.forEach((b) => {
      b.classList.toggle("abierto", algunoCerrado);
      b.setAttribute("aria-expanded", algunoCerrado);
    });
  };
}

// ================= 9. CONFIGURACIÓN =================
// Cada cambio se guarda al momento (no hay botón "Guardar").
// Para un ajuste nuevo: añádelo a CONFIG_INICIAL (sección 1), úsalo donde haga falta
// y añade aquí su control.
function verConfiguracion() {
  // Bloque con los ajustes de repetición de un ejercicio. "clave" es el nombre en config.
  const bloque = (clave, titulo, singular, plural) => {
    const c = config[clave];
    const desactivado = c.repetirFallos ? "" : "disabled";
    return `<fieldset>
      <legend>${titulo}</legend>
      <label class="ajuste"><span>Repetir las ${plural} que falle</span>
        <input type="checkbox" id="${clave}-repetir" ${c.repetirFallos ? "checked" : ""}></label>
      <label class="ajuste"><span>Mínimo de ${plural} de espera</span>
        <input type="number" id="${clave}-min" min="0" max="50" value="${c.minEspera}" ${desactivado}></label>
      <label class="ajuste"><span>Máximo de ${plural} de espera</span>
        <input type="number" id="${clave}-max" min="0" max="50" value="${c.maxEspera}" ${desactivado}></label>
      <p class="aviso">Al fallar, la ${singular} vuelve a salir tras un número de ${plural} elegido al azar
        entre el mínimo y el máximo (ambos incluidos). La app solo avisa de si se repetirá, no de cuándo.</p>
    </fieldset>`;
  };

  app.innerHTML = `
    <h2>Configuración</h2>
    ${bloque("test", "Test: preguntas falladas", "pregunta", "preguntas")}
    ${bloque("dictado", "Dictado: palabras falladas", "palabra", "palabras")}
    <div class="fila"><button id="restaurar">Restaurar valores iniciales</button><span id="msg" class="fb"></span></div>`;

  // Conecta los tres campos de un bloque con su parte de config
  function conectar(clave) {
    const c = config[clave];
    const repetir = $(`#${clave}-repetir`), min = $(`#${clave}-min`), max = $(`#${clave}-max`);
    function aplicar(cambiado) {
      // Lee los números, los limita a 0-50 y evita que el mínimo supere al máximo
      const leer = (campo, antes) => {
        const n = parseInt(campo.value, 10);
        return Number.isNaN(n) ? antes : Math.min(50, Math.max(0, n));
      };
      let a = leer(min, c.minEspera), b = leer(max, c.maxEspera);
      if (a > b) { if (cambiado === min) b = a; else a = b; } // se ajusta el campo que no has tocado
      min.value = a; max.value = b;
      min.disabled = max.disabled = !repetir.checked;
      c.repetirFallos = repetir.checked; c.minEspera = a; c.maxEspera = b;
      guardarConfig();
      $("#msg").textContent = "Guardado ✓";
    }
    [repetir, min, max].forEach((campo) => { campo.onchange = () => aplicar(campo); });
  }
  conectar("test");
  conectar("dictado");
  $("#restaurar").onclick = () => { config = structuredClone(CONFIG_INICIAL); guardarConfig(); verConfiguracion(); };
}

// ================= 10. ARRANQUE Y MENÚ =================
const secciones = { test: verTest, tarjetas: verTarjetas, unir: () => { nuevaSesion("unir"); verUnir(0); },
  huecos: () => { nuevaSesion("huecos"); verHuecos(0); }, dictado: () => verDictado(), canciones: () => verCanciones(0), configuracion: verConfiguracion };

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.remove("activo"));
    b.classList.add("activo");
    secciones[b.dataset.sec](); // ejecuta la función de la sección pulsada
  };
});

verTest(); // sección inicial
