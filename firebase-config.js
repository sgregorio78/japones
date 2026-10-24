// CONFIGURACIÓN DE FIREBASE
//
// Pega aquí los datos de tu proyecto de Firebase:
//   Firebase Console → ⚙ Configuración del proyecto → General → "Tus apps" → app web
//   → "Configuración del SDK" → opción "Config". Copia solo los valores que pide abajo.
//

// Estos valores NO son secretos: van dentro de la web y cualquiera puede verlos.
// La seguridad de tus datos la dan las reglas de Firestore (ver las instrucciones).
const firebaseConfig = {
  apiKey: "AIzaSyD8aFqN8wyyQ9RQ3HRbh2JGwQ8JzXbMFS0",
  authDomain: "japones-5855d.firebaseapp.com",
  projectId: "japones-5855d",
  appId: "1:879763555944:web:c55ef8bda504fb9b095ddd"
};

// Firebase identifica a los usuarios por correo electrónico. Para poder escribir solo
// "ana" en la pantalla de acceso, la app le añade este final: "ana" -> "ana@japones.app".
// Al crear los usuarios en Firebase, usa ese formato (ana@japones.app) y su contraseña.
// No hace falta que el dominio exista: no se envía ningún correo.
// Si escribes un usuario que ya lleve "@", se usa tal cual.
const DOMINIO_USUARIOS = "@japones.app";
