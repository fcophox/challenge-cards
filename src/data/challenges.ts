import { DEFAULT_DIFFICULTY_BY_RARITY, DEFAULT_POINTS_BY_RARITY } from "../lib/game/config.ts";
import type { CategoryId, Challenge, DifficultyId, EvidenceType, RarityId } from "../lib/game/types.ts";

/**
 * Seed catalogue: 60 original challenges (30 común, 15 curiosa, 10 desafío,
 * 5 legendaria). Content guidelines: safe, inclusive, low/no cost; never ask
 * for intimate content, documents, addresses or third parties' data.
 * `scripts/generate-seed.mts` turns this file into `supabase/seed.sql`.
 */

const CREATED_AT = "2026-10-29T00:00:00.000Z";

interface ChallengeInput {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  category: CategoryId;
  minutes: number;
  evidence: EvidenceType;
  tags: string[];
  difficulty?: DifficultyId;
  points?: number;
}

function defineGroup(rarity: RarityId, inputs: ChallengeInput[]): Challenge[] {
  return inputs.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    instructions: c.instructions,
    category: c.category,
    rarity,
    difficulty: c.difficulty ?? DEFAULT_DIFFICULTY_BY_RARITY[rarity],
    points: c.points ?? DEFAULT_POINTS_BY_RARITY[rarity],
    estimatedMinutes: c.minutes,
    evidence: c.evidence,
    available: true,
    createdAt: CREATED_AT,
    tags: c.tags,
  }));
}

const common = defineGroup("common", [
  { id: "c01", title: "Quisiera ver qué estás comiendo hoy", description: "Tu almuerzo, tu merienda o lo que tengas en el plato ahora mismo.", instructions: ["Busca buena luz natural si puedes.", "Fotografía el plato desde arriba.", "Bonus: ponle nombre de restaurante elegante."], category: "comida", minutes: 2, evidence: "photo", tags: ["comida", "rápido"] },
  { id: "c02", title: "Muéstrame algo que siempre está en tu escritorio", description: "Ese objeto que nunca se mueve de su sitio.", instructions: ["Elige un objeto fijo de tu mesa de trabajo o estudio.", "Retira papeles con información personal del encuadre.", "Fotografíalo en su lugar habitual."], category: "objetos", minutes: 2, evidence: "photo", tags: ["escritorio"] },
  { id: "c03", title: "Muéstrame tu taza favorita", description: "Toda persona tiene una taza que prefiere sobre las demás.", instructions: ["Busca tu taza preferida.", "Piensa por qué es tu favorita.", "Hazle una foto con estilo."], category: "objetos", minutes: 2, evidence: "photo", tags: ["cocina"] },
  { id: "c04", title: "Muéstrame el cielo de ahora mismo", description: "Nublado, azul o de noche: todos los cielos cuentan.", instructions: ["Asómate a una ventana o sal un momento.", "Encuadra solo el cielo.", "Observa un minuto antes de volver."], category: "exploracion", minutes: 3, evidence: "photo", tags: ["exterior", "calma"] },
  { id: "c05", title: "Muéstrame tu cepillo de dientes", description: "Un clásico del día a día. ¿Manual o eléctrico?", instructions: ["Busca tu cepillo de dientes.", "Fotografíalo en su vaso o soporte."], category: "cotidiano", minutes: 1, evidence: "photo", tags: ["baño", "rápido"] },
  { id: "c06", title: "Encuentra algo de tu color favorito", description: "Demuéstralo con un objeto real.", instructions: ["Recorre tu espacio buscando tu color.", "Elige el objeto que mejor lo represente.", "Fotografíalo sobre un fondo neutro."], category: "exploracion", minutes: 3, evidence: "photo", tags: ["color"] },
  { id: "c07", title: "Muéstrame el último libro que hojeaste", description: "Libro, cómic, revista o recetario: vale todo.", instructions: ["Busca el último que tuviste en las manos.", "Fotografía la portada."], category: "objetos", minutes: 2, evidence: "photo", tags: ["lectura"] },
  { id: "c08", title: "Quisiera ver tus zapatos más cómodos", description: "Los que eliges cuando el día va a ser largo.", instructions: ["Encuentra tu calzado más cómodo.", "Colócalo en un lugar con buena luz.", "Fotografíalo."], category: "objetos", minutes: 2, evidence: "photo", tags: ["ropa"] },
  { id: "c09", title: "Enséñame algo verde cerca de ti", description: "Una planta, una hoja o cualquier cosa verde.", instructions: ["Busca el verde más cercano.", "Acércate para captar detalles."], category: "exploracion", minutes: 2, evidence: "photo", tags: ["naturaleza"] },
  { id: "c10", title: "Bebe un vaso de agua con calma", description: "Una pausa pequeña que tu cuerpo agradece.", instructions: ["Sírvete un vaso de agua.", "Bébelo despacio, sin pantallas.", "Respira hondo al terminar."], category: "bienestar", minutes: 2, evidence: "confirmation", tags: ["pausa", "salud"] },
  { id: "c11", title: "Muéstrame algo que siempre llevas contigo", description: "Un amuleto, un llavero, un auricular… algo inseparable.", instructions: ["Piensa en lo que nunca olvidas al salir.", "Evita documentos, tarjetas o llaves reconocibles.", "Fotografía el objeto solo."], category: "objetos", minutes: 2, evidence: "photo", tags: ["personal"] },
  { id: "c12", title: "Encuentra un objeto perfectamente redondo", description: "Platos, botones, monedas, relojes… ¿cuál es el más redondo?", instructions: ["Busca tres candidatos redondos.", "Elige al ganador.", "Fotografíalo de frente."], category: "exploracion", minutes: 3, evidence: "photo", tags: ["formas"] },
  { id: "c13", title: "Quisiera ver tu bolígrafo favorito", description: "O lápiz, rotulador o lo que uses para escribir.", instructions: ["Busca tu herramienta de escritura preferida.", "Fotografíala junto a un garabato."], category: "objetos", minutes: 2, evidence: "photo", tags: ["escritura"] },
  { id: "c14", title: "Estírate durante un minuto", description: "Cuello, hombros, espalda. Sin prisa.", instructions: ["Ponte de pie o siéntate con la espalda recta.", "Estira suavemente, sin forzar.", "Respira lento durante todo el minuto."], category: "bienestar", minutes: 1, evidence: "confirmation", tags: ["movimiento", "pausa"] },
  { id: "c15", title: "Escribe tres cosas que te hicieron sonreír", description: "De esta semana. Pequeñas valen igual.", instructions: ["Piensa en los últimos siete días.", "Escribe tres momentos que te sacaron una sonrisa."], category: "historias", minutes: 3, evidence: "text", tags: ["gratitud"] },
  { id: "c16", title: "Muéstrame tu snack preferido", description: "El que eliges cuando nadie mira.", instructions: ["Busca tu snack favorito.", "Preséntalo como si fuera un anuncio."], category: "comida", minutes: 2, evidence: "photo", tags: ["comida", "rápido"] },
  { id: "c17", title: "Encuentra la cosa más pequeña de tu habitación", description: "Más pequeña de lo que piensas.", instructions: ["Explora cajones y estanterías.", "Fotografía el objeto junto a tu dedo para dar escala."], category: "exploracion", minutes: 4, evidence: "photo", tags: ["búsqueda"] },
  { id: "c18", title: "Quisiera ver tu rincón favorito de casa", description: "El lugar donde mejor te sientes.", instructions: ["Ve a tu rincón preferido.", "Evita que aparezcan personas o datos de tu dirección.", "Fotografíalo tal como está."], category: "cotidiano", minutes: 2, evidence: "photo", tags: ["hogar"] },
  { id: "c19", title: "Haz una sombra divertida con tus manos", description: "Un perro, un pájaro o algo que acabas de inventar.", instructions: ["Busca una lámpara o luz directa.", "Crea una figura con las manos sobre una pared.", "Fotografía la sombra."], category: "creatividad", minutes: 3, evidence: "photo", tags: ["juego", "luz"] },
  { id: "c20", title: "Escribe la canción que tienes en la cabeza", description: "Esa que no se va desde esta mañana.", instructions: ["Escribe el título o un fragmento que recuerdes con tus palabras."], category: "historias", minutes: 1, evidence: "text", tags: ["música", "rápido"] },
  { id: "c21", title: "Muéstrame algo que tenga rayas", description: "Ropa, tazas, cuadernos… las rayas están por todas partes.", instructions: ["Busca un patrón de rayas.", "Fotografíalo de cerca."], category: "exploracion", minutes: 3, evidence: "photo", tags: ["patrones"] },
  { id: "c22", title: "Ordena un cajón pequeño", description: "Solo uno. Cinco minutos. Gran satisfacción.", instructions: ["Elige un cajón pequeño.", "Saca todo, descarta lo que sobra y vuelve a colocar.", "Opcional: foto del resultado."], category: "cotidiano", minutes: 5, evidence: "photo", tags: ["orden"] },
  { id: "c23", title: "Fotografía una textura de muy cerca", description: "Madera, tela, piel de una naranja… lo que te llame la atención.", instructions: ["Busca una superficie con textura.", "Acerca la cámara todo lo que pueda enfocar.", "¿Se reconoce qué es?"], category: "exploracion", minutes: 3, evidence: "photo", tags: ["detalle"] },
  { id: "c24", title: "Quisiera ver tu cojín favorito", description: "O almohada, manta o peluche. Lo más blandito que tengas.", instructions: ["Busca tu objeto más suave.", "Fotografíalo en su sitio."], category: "cotidiano", minutes: 2, evidence: "photo", tags: ["hogar"] },
  { id: "c25", title: "Describe tu desayuno ideal en una frase", description: "Sin límites de presupuesto ni de calorías.", instructions: ["Imagina el desayuno perfecto.", "Descríbelo en una sola frase."], category: "comida", minutes: 2, evidence: "text", tags: ["imaginación"] },
  { id: "c26", title: "Respira aire fresco durante cinco minutos", description: "Ventana abierta, balcón o paseo corto.", instructions: ["Busca un lugar seguro con aire fresco.", "Deja el móvil a un lado.", "Respira y observa cinco minutos."], category: "bienestar", minutes: 5, evidence: "confirmation", tags: ["calma", "exterior"] },
  { id: "c27", title: "Muéstrame el objeto más colorido que tengas", description: "Cuantos más colores, mejor.", instructions: ["Busca el objeto con más colores a tu alrededor.", "Fotografíalo sobre fondo blanco."], category: "objetos", minutes: 3, evidence: "photo", tags: ["color"] },
  { id: "c28", title: "Encuentra algo que haga un sonido curioso", description: "Un juguete, una caja, un vaso con agua…", instructions: ["Busca un objeto que suene de forma interesante.", "Describe el sonido en una frase."], category: "exploracion", minutes: 3, evidence: "text", tags: ["sonido"] },
  { id: "c29", title: "Escribe una palabra que defina tu día", description: "Solo una. Piénsala bien.", instructions: ["Repasa tu día hasta ahora.", "Elige una única palabra."], category: "historias", minutes: 1, evidence: "text", tags: ["reflexión", "rápido"] },
  { id: "c30", title: "Quisiera ver tu fruta favorita", description: "O verdura. Sin juicios.", instructions: ["Busca tu fruta o verdura favorita (o dibújala si no tienes).", "Fotografíala con buena luz."], category: "comida", minutes: 2, evidence: "photo", tags: ["comida"] },
]);

const curious = defineGroup("curious", [
  { id: "q01", title: "Encuentra un objeto que tenga más de diez años", description: "Algo que ha sobrevivido a una década contigo.", instructions: ["Busca un objeto con al menos diez años.", "Recuerda de dónde salió.", "Fotografíalo y anota su edad aproximada."], category: "recuerdos", minutes: 10, evidence: "photo", tags: ["nostalgia"] },
  { id: "q02", title: "Fotografía cinco objetos del mismo color", description: "Un pequeño bodegón monocromático.", instructions: ["Elige un color.", "Reúne cinco objetos de ese color.", "Colócalos juntos y fotografía la composición."], category: "creatividad", minutes: 10, evidence: "photo", tags: ["color", "composición"] },
  { id: "q03", title: "Quisiera ver el objeto más antiguo que conservas", description: "El más veterano de tu colección personal.", instructions: ["Piensa qué es lo más antiguo que guardas.", "Fotografíalo con cuidado.", "Bonus: escribe su historia en una línea."], category: "recuerdos", minutes: 10, evidence: "photo", tags: ["nostalgia", "historia"] },
  { id: "q04", title: "Dibuja tu comida sin mirar el papel", description: "Dibujo a ciegas: el resultado siempre sorprende.", instructions: ["Coloca tu comida delante.", "Dibújala sin mirar el papel ni levantar el lápiz.", "Fotografía la obra maestra."], category: "creatividad", minutes: 8, evidence: "photo", tags: ["dibujo", "humor"] },
  { id: "q05", title: "Haz una cara con objetos de la cocina", description: "Cucharas como cejas, una taza como nariz…", instructions: ["Reúne objetos seguros de cocina (nada de cuchillos).", "Compón una cara sobre la mesa.", "Fotografíala desde arriba."], category: "creatividad", minutes: 10, evidence: "photo", tags: ["humor", "composición"] },
  { id: "q06", title: "Cuenta la historia de un regalo", description: "Un objeto que alguien te regaló y que aún conservas.", instructions: ["Elige un regalo especial.", "Escribe cómo llegó a ti, sin datos personales de nadie."], category: "recuerdos", minutes: 10, evidence: "text", tags: ["historia", "gratitud"] },
  { id: "q07", title: "Ordena diez objetos por tamaño", description: "Del más grande al más pequeño, en fila.", instructions: ["Reúne diez objetos distintos.", "Ordénalos por tamaño en línea.", "Fotografía la fila completa."], category: "creatividad", minutes: 12, evidence: "photo", tags: ["orden", "composición"] },
  { id: "q08", title: "Encuentra tres cosas que empiecen por M", description: "Manzana, mapa, mochila… ¿qué encuentras tú?", instructions: ["Explora tu espacio.", "Reúne tres objetos que empiecen por M.", "Fotografíalos juntos."], category: "exploracion", minutes: 8, evidence: "photo", tags: ["juego", "palabras"] },
  { id: "q09", title: "Escribe un haiku sobre tu mañana", description: "Tres versos: 5, 7 y 5 sílabas.", instructions: ["Piensa en un momento de tu mañana.", "Escríbelo en tres versos de 5, 7 y 5 sílabas."], category: "historias", minutes: 10, evidence: "text", tags: ["poesía"] },
  { id: "q10", title: "Prepara una bebida como en una cafetería", description: "Agua, té o café: la presentación lo es todo.", instructions: ["Prepara la bebida que prefieras.", "Decórala o preséntala con estilo.", "Fotografíala como para una carta."], category: "comida", minutes: 10, evidence: "photo", tags: ["presentación"] },
  { id: "q11", title: "Fotografía una sombra interesante", description: "Las sombras cuentan otra versión de las cosas.", instructions: ["Busca una sombra con forma curiosa.", "Encuádrala sin mostrar el objeto que la proyecta.", "¿Alguien adivinaría qué es?"], category: "exploracion", minutes: 10, evidence: "photo", tags: ["luz", "misterio"] },
  { id: "q12", title: "Muéstrame algo que no usas pero no puedes tirar", description: "Todos guardamos algo así.", instructions: ["Busca ese objeto inútil pero querido.", "Fotografíalo.", "Bonus: ¿por qué lo guardas?"], category: "recuerdos", minutes: 8, evidence: "photo", tags: ["nostalgia", "humor"] },
  { id: "q13", title: "Crea un mini jardín zen", description: "Con arena, sal, arroz o lo que tengas a mano.", instructions: ["Usa un plato o bandeja como base.", "Añade un material granulado y algunas piedras u objetos.", "Traza líneas con un tenedor y fotografía el resultado."], category: "creatividad", minutes: 15, evidence: "photo", tags: ["calma", "manualidad"] },
  { id: "q14", title: "Aprende a decir «gracias» en un idioma nuevo", description: "Uno que nunca hayas estudiado.", instructions: ["Elige un idioma desconocido para ti.", "Aprende cómo se dice «gracias» y cómo se pronuncia.", "Escríbelo aquí."], category: "exploracion", minutes: 8, evidence: "text", tags: ["idiomas"] },
  { id: "q15", title: "Haz un arcoíris con objetos de tu casa", description: "Rojo, naranja, amarillo, verde, azul y violeta.", instructions: ["Busca un objeto de cada color.", "Ordénalos como un arcoíris.", "Fotografía la composición."], category: "creatividad", minutes: 15, evidence: "photo", tags: ["color", "composición"] },
]);

const challenge = defineGroup("challenge", [
  { id: "d01", title: "Recrea una escena de película con objetos domésticos", description: "Sin actores: solo objetos, luz e imaginación.", instructions: ["Elige una escena icónica de una película.", "Recréala con objetos de casa.", "Fotografíala y escribe el título en tu nota mental."], category: "creatividad", minutes: 30, evidence: "photo", tags: ["cine", "composición"] },
  { id: "d02", title: "Construye una obra de arte con tres objetos cotidianos", description: "Una escultura efímera digna de museo.", instructions: ["Elige tres objetos que no tengan nada que ver.", "Combínalos en una escultura estable.", "Ponle título y fotografíala."], category: "creatividad", minutes: 20, evidence: "photo", tags: ["arte", "manualidad"] },
  { id: "d03", title: "Cuéntame una historia usando tres objetos", description: "Los tres deben ser imprescindibles en la trama.", instructions: ["Escoge tres objetos al azar a tu alrededor.", "Escribe una historia breve donde los tres sean clave.", "Opcional: título dramático."], category: "historias", minutes: 20, evidence: "text", tags: ["escritura", "imaginación"] },
  { id: "d04", title: "Recrea una fotografía antigua", description: "Una foto tuya, de un lugar o de un objeto, años después.", instructions: ["Busca una foto antigua donde salgas tú, un lugar o un objeto.", "Si aparecen otras personas, consigue su permiso o elige otra.", "Repite la pose o el encuadre lo más fiel posible."], category: "recuerdos", minutes: 30, evidence: "photo", tags: ["nostalgia", "fotografía"] },
  { id: "d05", title: "Cocina algo con solo cinco ingredientes", description: "Creatividad culinaria con límites.", instructions: ["Elige cinco ingredientes que ya tengas (sal y aceite cuentan).", "Prepara un plato con ellos, con cuidado en la cocina.", "Emplátalo y fotografíalo."], category: "comida", minutes: 40, evidence: "photo", tags: ["cocina"] },
  { id: "d06", title: "Diseña la portada de un álbum imaginario", description: "Inventa el grupo, el título y la portada.", instructions: ["Inventa un nombre de grupo y de álbum.", "Diseña la portada con dibujo, collage u objetos.", "Fotografía el resultado."], category: "creatividad", minutes: 30, evidence: "photo", tags: ["música", "diseño"] },
  { id: "d07", title: "Escribe una carta a tu yo de dentro de un año", description: "¿Qué quieres recordarte?", instructions: ["Busca un momento tranquilo.", "Escribe una carta a tu yo futuro: deseos, preguntas, consejos.", "Guárdala aquí; es privada."], category: "historias", minutes: 20, evidence: "text", tags: ["reflexión"] },
  { id: "d08", title: "Construye la torre más alta con objetos de cocina", description: "Ingeniería doméstica. Nada de vidrio ni objetos cortantes.", instructions: ["Usa solo objetos irrompibles: táperes, cucharas de madera, trapos…", "Construye la torre más alta que se sostenga sola.", "Fotografíala antes de que caiga."], category: "creatividad", minutes: 20, evidence: "photo", tags: ["juego", "construcción"] },
  { id: "d09", title: "Haz un paseo fotográfico de diez fotos", description: "Elige un tema y búscalo durante tu paseo.", instructions: ["Elige un tema: círculos, rojo, sombras…", "Pasea por un lugar seguro y conocido.", "Haz diez fotos y comparte aquí tu favorita."], category: "exploracion", minutes: 40, evidence: "photo", tags: ["paseo", "fotografía"] },
  { id: "d10", title: "Inventa un juego de mesa con lo que tienes", description: "Reglas propias, piezas improvisadas.", instructions: ["Reúne objetos que sirvan de fichas y tablero.", "Escribe tres reglas sencillas.", "Juega una partida y fotografía el tablero."], category: "creatividad", minutes: 40, evidence: "photo", tags: ["juego", "diseño"] },
]);

const legendary = defineGroup("legendary", [
  { id: "l01", title: "Crea un museo en miniatura de tu vida", description: "Cinco objetos, cinco cartelas, una exposición.", instructions: ["Elige cinco objetos que cuenten algo de ti.", "Escribe una pequeña cartela para cada uno.", "Monta la exposición y fotografía la sala completa."], category: "recuerdos", minutes: 60, evidence: "photo", tags: ["museo", "memoria"] },
  { id: "l02", title: "Rueda un cortometraje de 30 segundos sin diálogos", description: "Con objetos, sombras o tus manos como protagonistas.", instructions: ["Escribe una idea en tres frases: inicio, giro y final.", "Grábala en 30 segundos sin diálogos.", "Adjunta un fotograma como recuerdo (el vídeo se queda en tu dispositivo)."], category: "creatividad", minutes: 90, evidence: "photo", tags: ["cine", "vídeo"] },
  { id: "l03", title: "Dibuja un cómic de cuatro viñetas sobre tu día", description: "Tu día como si fuera una tira de periódico.", instructions: ["Elige cuatro momentos de tu día.", "Dibuja una viñeta por momento, con bocadillos.", "Fotografía la tira completa."], category: "creatividad", minutes: 60, evidence: "photo", tags: ["cómic", "dibujo"] },
  { id: "l04", title: "Dale una segunda vida a un objeto viejo", description: "Reinventa algo que ibas a tirar.", instructions: ["Elige un objeto en desuso.", "Transfórmalo para darle un nuevo uso, con herramientas seguras.", "Fotografía el antes y el después juntos."], category: "creatividad", minutes: 90, evidence: "photo", tags: ["reciclaje", "manualidad"] },
  { id: "l05", title: "Construye una reacción en cadena casera", description: "Fichas, libros, canicas: que una cosa mueva a la siguiente.", instructions: ["Diseña un recorrido con al menos cinco pasos.", "Usa objetos seguros y un espacio despejado.", "Ponlo en marcha y fotografía el montaje."], category: "creatividad", minutes: 120, evidence: "photo", tags: ["ingeniería", "juego"] },
]);

export const CHALLENGES: Challenge[] = [...common, ...curious, ...challenge, ...legendary];

export const CHALLENGES_BY_ID: ReadonlyMap<string, Challenge> = new Map(CHALLENGES.map((c) => [c.id, c]));
