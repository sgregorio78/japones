/* JavaScript = la LÓGICA. Este archivo tiene 6 partes:
   1. Datos   2. Utilidades   3-6. Los 4 tipos de ejercicio   7. Sección Crear   8. Arranque */
"use strict"; // modo estricto: avisa de errores tontos

// ================= 1. DATOS =================
// Los ejercicios de ejemplo (EJEMPLOS) están en el archivo ejemplos.js,
// que se carga antes que este archivo (ver index.html).

let datos; // aquí viven los ejercicios mientras usas la app

// localStorage guarda texto en tu navegador (no se pierde al cerrar la página).
// JSON.stringify convierte los datos a texto; JSON.parse hace lo contrario.
function cargar() {
  try { datos = JSON.parse(localStorage.getItem("japones")); } catch (e) { datos = null; }
  if (!datos) datos = structuredClone(EJEMPLOS); // si no hay nada guardado, usa los ejemplos
}
function guardar() {
  try { localStorage.setItem("japones", JSON.stringify(datos)); } catch (e) { /* sin almacenamiento */ }
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
function vacio() {
  app.innerHTML = `<p class="aviso">Aún no hay ejercicios de este tipo. Añade alguno en la sección «Crear».</p>`;
}
// Desplegable para elegir entre varios ejercicios del mismo tipo
function selectorHtml(lista, nombre, actual) {
  return `<select id="sel" aria-label="Elegir ejercicio">${lista
    .map((e, i) => `<option value="${i}" ${i === actual ? "selected" : ""}>${esc(nombre(e, i))}</option>`)
    .join("")}</select>`;
}

// ================= 3. TIPO 1: TEST (pregunta y varias respuestas) =================
function verTest() {
  if (!datos.test.length) return vacio();
  const lista = mezclar(datos.test);
  let i = 0, puntos = 0; // pregunta actual y aciertos

  function mostrar() {
    // Si ya no quedan preguntas, enseñamos el resultado
    if (i >= lista.length) {
      app.innerHTML = `<h2>Resultado</h2><p class="grande">${puntos} / ${lista.length}</p><button id="rep">Repetir test</button>`;
      $("#rep").onclick = verTest;
      return;
    }
    const p = lista[i];
    const opciones = mezclar([p.correcta, ...p.incorrectas]); // "..." = desplegar la lista
    app.innerHTML = `
      <p class="prog">Pregunta ${i + 1} de ${lista.length}</p>
      <h2>${esc(p.pregunta)}</h2>
      <div class="opciones">${opciones.map((o) => `<button class="op">${esc(o)}</button>`).join("")}</div>
      <p id="fb" class="fb"></p>
      <button id="sig" hidden>Siguiente</button>`;

    app.querySelectorAll(".op").forEach((boton) => {
      boton.onclick = () => {
        const acierto = boton.textContent === p.correcta;
        if (acierto) puntos++;
        // Bloqueamos todos los botones y coloreamos la solución
        app.querySelectorAll(".op").forEach((b) => {
          b.disabled = true;
          if (b.textContent === p.correcta) b.classList.add("ok");
        });
        if (!acierto) boton.classList.add("mal");
        $("#fb").textContent = acierto ? "¡Correcto!" : "Incorrecto.";
        $("#sig").hidden = false;
      };
    });
    $("#sig").onclick = () => { i++; mostrar(); };
  }
  mostrar();
}

// ================= 4. TIPO 2: TARJETAS DE ESTUDIO =================
function verTarjetas() {
  if (!datos.tarjetas.length) return vacio();
  const lista = mezclar(datos.tarjetas);
  let i = 0, girada = false;

  function mostrar() {
    const t = lista[i];
    app.innerHTML = `
      <p class="prog">Tarjeta ${i + 1} de ${lista.length}</p>
      <button class="tarjeta ${girada ? "reverso" : ""}">${esc(girada ? t.reverso : t.anverso)}</button>
      <div class="fila"><button id="ant">← Anterior</button><button id="sig">Siguiente →</button></div>`;
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

function verUnir(n = 0) {
  if (!datos.unir.length) return vacio();
  const ej = datos.unir[Math.min(n, datos.unir.length - 1)];
  const total = ej.pares.length;
  // Cada elemento recuerda el número de su pareja (i): así sabemos si encajan
  const izq = ej.pares.map((p, i) => ({ t: p[0], i }));
  const der = mezclar(ej.pares.map((p, i) => ({ t: p[1], i })));
  const boton = (x, lado) => `<button class="item ${lado}" data-i="${x.i}">${esc(x.t)}</button>`;

  app.innerHTML = `
    ${selectorHtml(datos.unir, (e) => e.titulo, n)}
    <h2>Une cada pareja</h2>
    <div class="marcador"><span id="marc">Aciertos: 0 de ${total}</span></div>
    <div class="columnas"><div id="col-izq">${izq.map((x) => boton(x, "izq")).join("")}</div>
    <div id="col-der">${der.map((x) => boton(x, "der")).join("")}</div></div>`;
  $("#sel").onchange = (e) => verUnir(Number(e.target.value));

  const colIzq = $("#col-izq"), colDer = $("#col-der");
  let elegido = null;   // botón de la izquierda seleccionado
  let ocupado = false;  // true mientras hay una animación en marcha (ignora clics)
  let aciertos = 0, resueltas = 0;

  function alTerminar() {
    ocupado = false;
    if (resueltas === total) {
      $("#marc").innerHTML = `¡Terminado! Has acertado ${aciertos} de ${total}. <button id="rep">Repetir</button>`;
      $("#rep").onclick = () => verUnir(n);
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
function verHuecos(n = 0) {
  if (!datos.huecos.length) return vacio();
  const ej = datos.huecos[Math.min(n, datos.huecos.length - 1)];

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
    ${selectorHtml(datos.huecos, (e, i) => e.traduccion || "Ejercicio " + (i + 1), n)}
    <h2>Traduce la frase: arrastra cada palabra a su hueco</h2>
    <div class="frase">${fraseHtml}</div>
    <div class="banco">${palabras.map((p) => `<span class="palabra" draggable="true">${esc(p)}</span>`).join("")}</div>
    <div class="fila"><button id="comp">Comprobar</button><button id="reint">Reintentar</button></div>
    <p id="fb" class="fb"></p>`;
  $("#sel").onchange = (e) => verHuecos(Number(e.target.value));

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

  $("#comp").onclick = () => {
    let bien = 0;
    app.querySelectorAll(".hueco").forEach((h) => {
      const ok = h.firstElementChild && h.firstElementChild.textContent === h.dataset.resp;
      h.classList.remove("ok", "mal");
      h.classList.add(ok ? "ok" : "mal");
      if (ok) bien++;
    });
    $("#fb").textContent = `${bien} de ${respuestas.length} huecos correctos.`;
  };
  $("#reint").onclick = () => verHuecos(n);
}

// ================= 7. SECCIÓN CREAR =================
// Convierte un texto de varias líneas en una lista de líneas no vacías
const lineas = (t) => t.split("\n").map((s) => s.trim()).filter(Boolean);

function verCrear() {
  app.innerHTML = `
    <h2>Crear ejercicios</h2>
    <p class="aviso">Test: ${datos.test.length} · Tarjetas: ${datos.tarjetas.length} · Unir: ${datos.unir.length} · Huecos: ${datos.huecos.length}</p>

    <details open><summary>Pregunta de test</summary>
      <form id="f-test">
        <label>Pregunta<input name="pregunta" required></label>
        <label>Respuesta correcta<input name="correcta" required></label>
        <label>Respuestas incorrectas (una por línea)<textarea name="incorrectas" rows="3" required></textarea></label>
        <button>Añadir</button><span class="msg"></span>
      </form></details>

    <details><summary>Tarjeta de estudio</summary>
      <form id="f-tarjeta">
        <label>Anverso (lo que ves primero)<input name="anverso" required></label>
        <label>Reverso (la respuesta)<input name="reverso" required></label>
        <button>Añadir</button><span class="msg"></span>
      </form></details>

    <details><summary>Ejercicio de unir</summary>
      <form id="f-unir">
        <label>Título<input name="titulo" required></label>
        <label>Parejas, una por línea, con el formato: japonés = español
          <textarea name="pares" rows="5" placeholder="猫 = gato&#10;犬 = perro" required></textarea></label>
        <button>Añadir</button><span class="msg"></span>
      </form></details>

    <details><summary>Completar huecos</summary>
      <form id="f-huecos">
        <label>Frase, con los huecos entre [corchetes]
          <input name="frase" placeholder="私は[水]を[飲みます]。" required></label>
        <label>Traducción al español (es lo que verás en el selector)
          <input name="traduccion" placeholder="Bebo agua." required></label>
        <label>Palabras que sobran (separadas por comas)
          <input name="extras" placeholder="食べます, 本"></label>
        <button>Añadir</button><span class="msg"></span>
      </form></details>

    <button id="reset">Restaurar ejemplos</button>`;

  // Función genérica: conecta un formulario con una función que lo procesa.
  // "proceso" devuelve un texto de error, o null si todo fue bien.
  function conectar(id, proceso) {
    const f = $(id);
    f.onsubmit = (e) => {
      e.preventDefault(); // evita que el navegador recargue la página
      const error = proceso(f.elements);
      const msg = f.querySelector(".msg");
      if (error) { msg.textContent = error; return; }
      guardar();
      f.reset();
      msg.textContent = "Añadido ✓";
    };
  }

  conectar("#f-test", (c) => {
    datos.test.push({ pregunta: c.pregunta.value.trim(), correcta: c.correcta.value.trim(), incorrectas: lineas(c.incorrectas.value) });
    return null;
  });
  conectar("#f-tarjeta", (c) => {
    datos.tarjetas.push({ anverso: c.anverso.value.trim(), reverso: c.reverso.value.trim() });
    return null;
  });
  conectar("#f-unir", (c) => {
    // Cada línea "a = b" se corta por el "=" y se convierte en un par [a, b]
    const pares = lineas(c.pares.value).map((l) => l.split("=").map((s) => s.trim())).filter((p) => p[0] && p[1]);
    if (pares.length < 2) return "Escribe al menos 2 parejas con el formato japonés = español.";
    datos.unir.push({ titulo: c.titulo.value.trim(), pares });
    return null;
  });
  conectar("#f-huecos", (c) => {
    const frase = c.frase.value.trim();
    if (!/\[.+?\]/.test(frase)) return "Marca al menos un hueco con [corchetes].";
    const extras = c.extras.value.split(",").map((s) => s.trim()).filter(Boolean);
    datos.huecos.push({ frase, traduccion: c.traduccion.value.trim(), extras });
    return null;
  });

  $("#reset").onclick = () => {
    if (confirm("Se borrarán tus ejercicios y volverán los de ejemplo. ¿Seguro?")) {
      datos = structuredClone(EJEMPLOS); guardar(); verCrear();
    }
  };
}

// ================= 8. ARRANQUE Y MENÚ =================
const secciones = { test: verTest, tarjetas: verTarjetas, unir: () => verUnir(0), huecos: () => verHuecos(0), crear: verCrear };

document.querySelectorAll("nav button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("nav button").forEach((x) => x.classList.remove("activo"));
    b.classList.add("activo");
    secciones[b.dataset.sec](); // ejecuta la función de la sección pulsada
  };
});

cargar();
verTest(); // sección inicial
