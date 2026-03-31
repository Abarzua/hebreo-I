import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Volume2, Info, Keyboard, Delete, Layers, Menu, X, Globe, BookMarked, ChevronDown, ChevronRight, PenTool, CheckCircle, FileText, Lightbulb, Microscope, Wrench, ArrowDown } from 'lucide-react';

// ============================================================================
// 1. FUNCIONES UTILITARIAS Y DE BÚSQUEDA
// ============================================================================

/**
 * Normaliza el texto para búsquedas (elimina tildes y pasa a minúsculas)
 * Permite que búsquedas como "arbol" coincidan con "Árbol"
 */
const normalizeText = (text) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

// ============================================================================
// 2. MOTOR DE ANÁLISIS MORFOLÓGICO (PARSING ENGINE)
// ============================================================================

/**
 * Diccionario central para la deconstrucción de caracteres hebreos.
 * Contiene el símbolo base, nombre, representación visual y su gramática.
 */
const hebrewCharNames = {
  // Consonantes del Alefato
  "א": "Álef (א) [Cons. Muda / Gutural]", "ב": "Bet (ב) [BeGaDKeFaT]", "ג": "Guímel (ג) [BeGaDKeFaT]", "ד": "Dálet (ד) [BeGaDKeFaT]", "ה": "He (ה) [Gutural]", "ו": "Vav (ו) [Consonante o Mater Lectionis]", "ז": "Zayin (ז)", "ח": "Het (ח) [Gutural Fuerte]", "ט": "Tet (ט)", "י": "Yod (י) [Consonante o Mater Lectionis]", "כ": "Kaf (כ) [BeGaDKeFaT]", "ך": "Kaf Final (ך) [Sofiyot]", "ל": "Lámed (ל)", "מ": "Mem (מ)", "ם": "Mem Final (ם) [Sofiyot]", "נ": "Nun (נ)", "ן": "Nun Final (ן) [Sofiyot]", "ס": "Sámej (ס)", "ע": "Ayin (ע) [Cons. Muda / Gutural]", "פ": "Pe (פ) [BeGaDKeFaT]", "ף": "Pe Final (ף) [Sofiyot]", "צ": "Tsade (צ)", "ץ": "Tsade Final (ץ) [Sofiyot]", "ק": "Qof (ק)", "ר": "Resh (ר) [Gutural]", "ש": "Shin/Sin (ש) [Sibilante]", "ת": "Tav (ת) [BeGaDKeFaT]",
  
  // Puntos Vocálicos y Signos Diacríticos (Nikud)
  "\u05B0": "Shewa (אְ) [Vocal 'e' breve o divisor Mudo]", 
  "\u05B1": "Hataf Segol (אֱ) [e muy breve - Prefiere guturales]", 
  "\u05B2": "Hataf Pátah (אֲ) [a muy breve - Prefiere guturales]", 
  "\u05B3": "Hataf Qámets (אֳ) [o muy breve - Prefiere guturales]", 
  "\u05B4": "Híreq (אִ) [Vocal 'i' corta]", 
  "\u05B5": "Tsere (אֵ) [Vocal 'e' larga]", 
  "\u05B6": "Segol (אֶ) [Vocal 'e' corta]", 
  "\u05B7": "Pátah (אַ) [Vocal 'a' corta]", 
  "\u05B8": "Qámets (אָ) [Vocal 'a' larga / 'o' corta en sílaba cerrada]", 
  "\u05B9": "Hólem (אֹ) [Vocal 'o' larga]", 
  "\u05BB": "Qibbúts (אֻ) [Vocal 'u' corta]", 
  "\u05BC": "Dagesh (בּ) [Punto: Lene (endurece) o Forte (duplica)]", 
  "\u05BD": "Silluq (אֽ) [Pausa final de versículo]", 
  "\u05BE": "Maqqef (־) [Unión lógica / Quita acento]", 
  "\u05C1": "Punto Shin (שׁ) [Sonido Sh]", 
  "\u05C2": "Punto Sin (שׂ) [Sonido S]", 
  "\u0591": "Athnaj (א֑) [Pausa media de versículo]"
};

/**
 * Analiza una palabra y devuelve un string con sus componentes separados por flechas
 * Útil para el Pop-Up interactivo.
 */
const getWordBreakdown = (word) => {
  const letters = [];
  for (const char of word) {
    if (hebrewCharNames[char]) letters.push(hebrewCharNames[char]);
  }
  return letters.join(" ➔ ");
};

/**
 * Analiza una palabra insertada libremente y devuelve un arreglo de objetos 
 * con propiedades separadas (nombre, símbolo, gramática).
 * Útil para el Laboratorio de Exégesis Libre.
 */
const parseCustomWord = (word) => {
  const parsed = [];
  for (const char of word) {
    if (char === " ") continue; 
    const info = hebrewCharNames[char];
    if (info) {
      // Expresión regular para separar: Nombre (Símbolo) [Gramática]
      const match = info.match(/^(.*?)\s+\((.*?)\)(?:\s+\[(.*?)\])?$/);
      if (match) {
        parsed.push({ char, name: match[1], symbol: match[2], grammar: match[3] || "Símbolo base" });
      } else {
        parsed.push({ char, name: info, symbol: char, grammar: "Símbolo" });
      }
    } else {
      parsed.push({ char, name: "Desconocido", symbol: char, grammar: "Símbolo no registrado" });
    }
  }
  return parsed;
};

// ============================================================================
// 3. BASE DE DATOS ESTRUCTURADA DEL CURSO (L1 - L12)
// ============================================================================
const hebrewData = [
  {
    id: "l1",
    lesson: "Lección 1: El alefato hebreo",
    description: "Ramo Hebreo I, año académico 2016, 1er Semestre. Las 22 consonantes base.",
    paradigm: "El hebreo se lee y escribe estrictamente de DERECHA a IZQUIERDA (←). Consta de 22 consonantes; las vocales son un sistema de puntos añadido posteriormente (Nikud).",
    items: [
      { hebrew: "א", name: "Álef", type: "Consonante", grammar: "Consonante muda y gutural.", isVocab: false, pronunciation: "Muda", note: "Toma el sonido de la vocal que la acompaña.", tags: ["Gutural", "Alefato"] },
      { hebrew: "ב", name: "Bet", type: "Consonante", grammar: "Consonante oclusiva/fricativa.", isVocab: false, pronunciation: "B / V", note: "B (fuerte) con punto, V (suave) sin punto.", tags: ["BeGaDKeFaT"] },
      { hebrew: "ג", name: "Guímel", type: "Consonante", grammar: "Consonante oclusiva.", isVocab: false, pronunciation: "G", note: "Como en 'gato'.", tags: ["BeGaDKeFaT"] },
      { hebrew: "ד", name: "Dálet", type: "Consonante", grammar: "Consonante oclusiva.", isVocab: false, pronunciation: "D", note: "Similar a la D en español.", tags: ["BeGaDKeFaT"] },
      { hebrew: "ה", name: "He", type: "Consonante", grammar: "Consonante gutural.", isVocab: false, pronunciation: "H", note: "Aspirada, como en inglés.", tags: ["Gutural"] },
      { hebrew: "ו", name: "Vav", type: "Consonante", grammar: "Consonante labial (Mater Lectionis).", isVocab: false, pronunciation: "V / O / U", note: "Puede funcionar como consonante o vocal." },
      { hebrew: "ז", name: "Zayin", type: "Consonante", grammar: "Consonante sibilante.", isVocab: false, pronunciation: "Z", note: "Vibrante, como el zumbido de una abeja." },
      { hebrew: "ח", name: "Het", type: "Consonante", grammar: "Consonante gutural fuerte.", isVocab: false, pronunciation: "J", note: "Sonido fuerte desde la garganta.", tags: ["Gutural"] },
      { hebrew: "ט", name: "Tet", type: "Consonante", grammar: "Consonante enfática.", isVocab: false, pronunciation: "T", note: "Pronunciada con mayor tensión." },
      { hebrew: "י", name: "Yod", type: "Consonante", grammar: "Consonante palatal (Mater Lectionis).", isVocab: false, pronunciation: "Y / I", note: "La letra más pequeña. Puede ser vocal." },
      { hebrew: "כ", name: "Kaf", type: "Consonante", grammar: "Consonante oclusiva/fricativa.", isVocab: false, pronunciation: "K / J", note: "K con punto, J sin punto.", tags: ["BeGaDKeFaT"] },
      { hebrew: "ל", name: "Lámed", type: "Consonante", grammar: "Consonante líquida.", isVocab: false, pronunciation: "L", note: "La letra más alta del renglón." },
      { hebrew: "מ", name: "Mem", type: "Consonante", grammar: "Consonante nasal.", isVocab: false, pronunciation: "M", note: "Sonido de M regular." },
      { hebrew: "נ", name: "Nun", type: "Consonante", grammar: "Consonante nasal.", isVocab: false, pronunciation: "N", note: "Sonido de N regular." },
      { hebrew: "ס", name: "Sámej", type: "Consonante", grammar: "Consonante sibilante.", isVocab: false, pronunciation: "S", note: "Sonido de S regular." },
      { hebrew: "ע", name: "Ayin", type: "Consonante", grammar: "Consonante muda y gutural profunda.", isVocab: false, pronunciation: "Muda", note: "Toma el sonido de la vocal.", tags: ["Gutural"] },
      { hebrew: "פ", name: "Pe", type: "Consonante", grammar: "Consonante oclusiva/fricativa.", isVocab: false, pronunciation: "P / F", note: "P con punto, F sin punto.", tags: ["BeGaDKeFaT"] },
      { hebrew: "צ", name: "Tsade", type: "Consonante", grammar: "Consonante sibilante enfática.", isVocab: false, pronunciation: "Ts", note: "Como en 'pizza'." },
      { hebrew: "ק", name: "Qof", type: "Consonante", grammar: "Consonante oclusiva profunda.", isVocab: false, pronunciation: "K", note: "Profunda en la garganta." },
      { hebrew: "ר", name: "Resh", type: "Consonante", grammar: "Consonante gutural suave.", isVocab: false, pronunciation: "R", note: "A veces se clasifica como gutural.", tags: ["Gutural"] },
      { hebrew: "ש", name: "Shin / Sin", type: "Consonante", grammar: "Consonante sibilante.", isVocab: false, pronunciation: "Sh / S", note: "Sh (punto der.), S (punto izq.)." },
      { hebrew: "ת", name: "Tav", type: "Consonante", grammar: "Consonante oclusiva/fricativa.", isVocab: false, pronunciation: "T", note: "Similar a nuestra T.", tags: ["BeGaDKeFaT"] }
    ],
    exercises: [
      { id: 1, title: "Análisis Visual de Consonantes", instruction: "Lee las siguientes consonantes de derecha a izquierda. En tu mente, deconstruye cada letra de acuerdo a sus etiquetas gramaticales:", content: ["א  ב  ג  ד  ה  ו  ז  ח  ט  י  כ", "ל  מ  נ  ס  ע  פ  צ  ק  ר  ש  ת"], example: { hebrew: "א", translation: "Álef.", analysis: "1. Identificación: Es la primera letra.\n2. Fonética: Es completamente muda.\n3. Gramática: Pertenece al grupo de las letras GUTURALES." }, guide: "No te limites a decir 'Alef, Bet'. El proceso es: identificar el símbolo ➔ definir su sonido ➔ definir su grupo gramatical." },
      { id: 2, title: "C. Pares Confusos y Reglas", instruction: "Distingue cuidadosamente entre las siguientes consonantes y declara verbalmente la regla que las diferencia:", pairs: ["ב כ", "ג נ", "ד ר", "ה ח ת", "ו ז י ן", "ט מ", "ם ס", "ע צ"], guide: "Ejemplo con ה ח ת: La He (ה) tiene una apertura arriba, la Het (ח) está cerrada, y la Tav (ת) tiene un 'pie' extra." }
    ]
  },
  {
    id: "l2",
    lesson: "Lección 2: Sonidos y Reglas",
    description: "Particularidades fonéticas: Letras finales, BeGaDKeFaT, Sin/Shin.",
    paradigm: "Letras Finales: כ, מ, נ, פ, צ cambian a ך, ם, ן, ף, ץ al final de la palabra. Regla BeGaDKeFaT: (ב ג ד כ פ ת) tienen sonido fuerte con Dagesh (punto) y suave sin él.",
    items: [
      { hebrew: "ב ג ד כ פ ת", name: "Letras BeGaDKeFaT", type: "Regla Fonética", grammar: "Consonantes de doble sonido.", isVocab: false, pronunciation: "Fuerte con Dagesh" },
      { hebrew: "ך ם ן ף ץ", name: "Letras Finales (Sofiyot)", type: "Regla de Escritura", grammar: "Formas terminales.", isVocab: false, pronunciation: "Igual a la base" },
      { hebrew: "שׂ / שׁ", name: "Sin y Shin", type: "Regla Diacrítica", grammar: "Sibilantes diferenciadas.", isVocab: false, pronunciation: "S / Sh" }
    ],
    exercises: [
      { id: 1, title: "Análisis de Pronunciación y Dagesh", instruction: "Analiza y deconstruye las siguientes consonantes prestando especial atención a la regla fonética y los puntos:", pairs: ["בּ / ב", "כּ / כ", "פּ / פ", "תּ / ת", "שׂ / שׁ"], example: { hebrew: "בּ", translation: "Bet oclusiva ('B').", analysis: "1. Símbolo base: Consonante Bet.\n2. Símbolo interior: Dagesh Lene (Punto de endurecimiento).\n3. Regla aplicable: Al ser una letra BeGaDKeFaT con punto, el aire se corta, sonando como 'B' fuerte." }, guide: "Para cada par, aplica este desglose: Nombra la consonante, nombra el símbolo que la acompaña y declara su efecto fonético." }
    ]
  },
  {
    id: "l3",
    lesson: "Lección 3: Las Vocales",
    description: "Sistema masorético de puntuación (Nikud) y primer vocabulario.",
    paradigm: "Sistema de Vocales (Nikud): Las vocales en hebreo siempre se leen DESPUÉS de la consonante que las acompaña.",
    items: [
      { hebrew: "אַ", name: "Pátah", type: "Vocal", grammar: "Vocal Corta (Clase A).", isVocab: false, pronunciation: "a (corta)" },
      { hebrew: "אָ", name: "Qámets", type: "Vocal", grammar: "Vocal Larga (Clase A).", isVocab: false, pronunciation: "a (larga)" },
      { hebrew: "אֶ", name: "Segol", type: "Vocal", grammar: "Vocal Corta (Clase E).", isVocab: false, pronunciation: "e (corta)" },
      { hebrew: "אֵ", name: "Tsere", type: "Vocal", grammar: "Vocal Larga (Clase E).", isVocab: false, pronunciation: "ei (larga)" },
      { hebrew: "אִ", name: "Híreq", type: "Vocal", grammar: "Vocal Corta (Clase I).", isVocab: false, pronunciation: "i (corta)" },
      { hebrew: "אִי", name: "Híreq Larga", type: "Vocal", grammar: "Vocal Larga Plena (Clase I).", isVocab: false, pronunciation: "i (larga)" },
      { hebrew: "אָ", name: "Qamets Hatuf", type: "Vocal", grammar: "Vocal Corta (Clase O).", isVocab: false, pronunciation: "o (corta)" },
      { hebrew: "אֹ / אוֹ", name: "Hólem", type: "Vocal", grammar: "Vocal Larga (Clase O).", isVocab: false, pronunciation: "o (larga)" },
      { hebrew: "אֻ", name: "Qibbúts", type: "Vocal", grammar: "Vocal Corta (Clase U).", isVocab: false, pronunciation: "u (corta)" },
      { hebrew: "אוּ", name: "Shúreq", type: "Vocal", grammar: "Vocal Larga Plena (Clase U).", isVocab: false, pronunciation: "u (larga)" },
      
      { hebrew: "אָב", name: "Padre", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "áv", note: "Plural irregular: 'avot'." },
      { hebrew: "אָדוֹן", name: "Señor / Amo", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "adón", note: "Suele usarse para referirse a Dios (Adonai)." },
      { hebrew: "אָח", name: "Hermano", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "áj", note: "Plural irregular: 'ajim'." },
      { hebrew: "אִישׁ", name: "Hombre / Esposo", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "ísh", note: "La Yod NO tiene vocal debajo, por ende forma parte de la Híreq anterior (Mater Lectionis)." },
      { hebrew: "אִשָּׁה", name: "Mujer / Esposa", type: "Sustantivo", grammar: "Sustantivo femenino singular. Irregular.", isVocab: true, pronunciation: "ishá", note: "Plural irregular: 'nashim'." },
      { hebrew: "בַּיִת", name: "Casa / Familia", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "báyit", note: "Al ser segolado, su acento cae en la penúltima sílaba. La Yod SÍ tiene su propia vocal (Híreq) debajo, actuando como consonante (y)." },
      { hebrew: "בֵּן", name: "Hijo", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "bén", note: "Plural irregular: 'banim'." },
      { hebrew: "בַּת", name: "Hija", type: "Sustantivo", grammar: "Sustantivo femenino singular.", isVocab: true, pronunciation: "bát", note: "Plural: 'banot'." },
      { hebrew: "דָּבָר", name: "Palabra / Asunto", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "davár", note: "Muy frecuente en teología profética." },
      { hebrew: "יוֹם", name: "Día", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "yóm", note: "Plural irregular: 'yamim'." },
      { hebrew: "מֶלֶךְ", name: "Rey", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "mélej", note: "Acento en la penúltima sílaba (Mé-lej)." }
    ],
    exercises: [
      { id: 1, title: "A. Lectura Consonante + Vocal", instruction: "Lee las siguientes combinaciones de consonante y vocal (de derecha a izquierda):", content: ["בָּ  בֵּ  בִּ  בֹּ  בֻּ  בָּ", "גַּ  גֶּ  גִּ  גָּ  גֻּ", "דָּ  דֵּ  דִּ  דּוֹ  דוּ"], guide: "Aplica la regla de oro: primero la consonante, luego la vocal. Pronuncia la consonante y agrégale el sonido vocálico inmediatamente." },
      { id: 2, title: "B. Lectura de Sílabas Variadas", instruction: "Lee las siguientes sílabas:", content: ["מָ  שֶׂ  צִ  רֹ  תֻּ", "לַ  יֶ  אִ  דָּ  קֻ", "סָ  פֵּ  טִ  חוֹ  שׁוּ"], guide: "Identifica cuidadosamente qué vocal acompaña a cada consonante. ¿Es de la clase A, E, I, O, U? ¿Es corta o larga?" },
      { id: 3, title: "Análisis de Consonante + Vocal (Parsing)", instruction: "Toma las siguientes palabras de vocabulario y deconstrúyelas símbolo por símbolo:", pairs: ["דָּבָר", "בַּיִת", "מֶלֶךְ", "אָב", "אָדוֹן"], example: { hebrew: "דָּבָר", translation: "Palabra / Asunto.", analysis: "1. Consonante Dálet.\n2. Símbolo Dagesh Lene (dentro de Dálet, endurece).\n3. Vocal Qámets (a larga).\n4. Consonante Bet (suave, sin dagesh = v).\n5. Vocal Qámets (a larga).\n6. Consonante Resh.\nRegla General: Sustantivo masculino singular." }, guide: "Usa este método exacto para las demás palabras. El objetivo es que no se te escape ni una sola vocal o punto interior." }
    ]
  },
  {
    id: "l4",
    lesson: "Lección 4: Las Sílabas",
    description: "Reglas de división silábica y vocabulario asociado.",
    paradigm: "Toda sílaba debe comenzar con una consonante. Sílaba Abierta (CV) = Consonante + Vocal. Sílaba Cerrada (CVC) = Consonante + Vocal + Consonante.",
    items: [
      { hebrew: "CV", name: "Sílaba Abierta", type: "Regla Gramatical", grammar: "Estructura Silábica.", isVocab: false, pronunciation: "Cons. + Vocal", note: "Termina en vocal." },
      { hebrew: "CVC", name: "Sílaba Cerrada", type: "Regla Gramatical", grammar: "Estructura Silábica.", isVocab: false, pronunciation: "Cons. + Vocal + Cons.", note: "Termina en consonante." },
      
      { hebrew: "אֱלֹהִים", name: "Dios / dioses", type: "Sustantivo", grammar: "Sustantivo masculino plural.", isVocab: true, pronunciation: "elohím", note: "Se usa como plural de majestad para referirse al Dios único." },
      { hebrew: "אֶרֶץ", name: "Tierra / País", type: "Sustantivo", grammar: "Sustantivo femenino singular. Segolado.", isVocab: true, pronunciation: "érets", note: "Toma artículo definido con frecuencia." },
      { hebrew: "סוּס", name: "Caballo", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "sús", note: "La Vav no tiene vocal debajo, actúa como Mater Lectionis (vocal 'u') con el Shúreq." },
      { hebrew: "עִיר", name: "Ciudad", type: "Sustantivo", grammar: "Sustantivo femenino singular. Irregular.", isVocab: true, pronunciation: "ír", note: "La Yod no tiene vocal debajo; es parte de la Híreq (Mater Lectionis)." },
      { hebrew: "קוֹל", name: "Voz / Sonido", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "qól", note: "Utiliza Hólem plena." },
      { hebrew: "שֵׁם", name: "Nombre", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "shém", note: "Plural: 'shemot'." },
      { hebrew: "שָׁנָה", name: "Año", type: "Sustantivo", grammar: "Sustantivo femenino singular.", isVocab: true, pronunciation: "shaná", note: "Plural: 'shanim' (terminación m. pero género f.)." }
    ],
    exercises: [
      { id: 1, title: "A. Análisis de Estructura Silábica Simple", instruction: "Desglosa símbolo por símbolo y determina la estructura silábica (CV o CVC):", content: ["סוּס", "שֵׁם", "קוֹל"], example: { hebrew: "סוּס", translation: "Caballo.", analysis: "1. Consonante Sámej.\n2. Símbolo Shúreq (Vav con punto central = Vocal 'u' larga plena).\n3. Consonante Sámej final.\nEstructura Silábica: Consonante + Vocal + Consonante = 1 SÍLABA CERRADA (CVC)." }, guide: "Identifica cada letra y vocal. Si el último sonido pronunciado es consonante, es CVC. Si es vocal, es CV." },
      { id: 2, title: "B. Clasificación de Sílabas", instruction: "Divide las siguientes palabras multisilábicas usando un guion e identifica si es ABIERTA o CERRADA:", content: ["דָּבָר", "מֶלֶךְ", "אֱלֹהִים", "שָׁנָה"], example: { hebrew: "דָּבָר", translation: "Palabra / Asunto.", analysis: "División fonética: da - var (דָּ ־ בָר)\n\n1. Primera sílaba [דָּ]: Consonante Dálet + Vocal Qámets. SÍLABA ABIERTA (CV).\n2. Segunda sílaba [בָר]: Cons. Bet + Vocal Qámets + Cons. Resh. SÍLABA CERRADA (CVC)." }, guide: "Evalúa la última letra de CADA bloque individual para determinar la estructura." }
    ]
  },
  {
    id: "l5",
    lesson: "Lección 5: El Shewa",
    description: "El shewa (ְ) como vocal ultra-corta o divisor de sílabas.",
    paradigm: "Shewa Vocal: Al inicio de sílaba, suena como 'e' breve. Shewa Silencioso: Cierra una sílaba (mudo). Dagesh Lene SIEMPRE va después de un shewa silencioso en letras BeGaDKeFaT.",
    items: [
      { hebrew: "ְ", name: "Shewa Vocal / Mudo", type: "Puntuación", grammar: "Semiconsonante / Divisor silábico.", isVocab: false, pronunciation: "e (breve) / mudo", note: "Regula el inicio o cierre de las sílabas." },
      
      { hebrew: "אָדָם", name: "Hombre / Ser humano", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "adám", note: "También es el nombre propio Adán." },
      { hebrew: "אֲדָמָה", name: "Tierra / Suelo", type: "Sustantivo", grammar: "Sustantivo femenino singular.", isVocab: true, pronunciation: "adamá", note: "Relacionado etimológicamente con 'adam'." },
      { hebrew: "בְּהֵמָה", name: "Bestia / Ganado", type: "Sustantivo", grammar: "Sustantivo femenino singular.", isVocab: true, pronunciation: "behemá", note: "Inicia con Shewa vocal." },
      { hebrew: "בָּשָׂר", name: "Carne", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "basár", note: "Se usa a menudo para referirse a la 'humanidad carnal'." },
      { hebrew: "יְהוָה", name: "Yahweh / SEÑOR", type: "Nombre Propio", grammar: "Sustantivo propio divino.", isVocab: true, pronunciation: "Adonai (por reverencia)", note: "El Tetragrámaton. Su vocalización original se perdió." },
      { hebrew: "רוּחַ", name: "Espíritu / Viento", type: "Sustantivo", grammar: "Sustantivo femenino (a veces m.) singular.", isVocab: true, pronunciation: "rúaj", note: "Termina con vocal furtiva." }
    ],
    exercises: [
      { id: 1, title: "Análisis del Shewa (Vocal vs Silencioso)", instruction: "Realiza el parsing de estas palabras especificando la función de cada Shewa encontrado:", content: ["בְּהֵמָה", "מִדְבָּר"], example: { hebrew: "בְּהֵמָה", translation: "Bestia / Ganado.", analysis: "1. Cons. Bet + Dagesh Lene.\n2. Símbolo Shewa (ְ). Como está debajo de la primera letra, es un SHEWA VOCAL (suena 'e').\n3. Cons. He + Vocal Tsere (e larga).\n4. Cons. Mem + Vocal Qámets (a larga).\n5. Cons. He muda final.\nTotal: be-he-má." }, guide: "La clave es: ¿El shewa abre la sílaba (vocal) o la cierra (silencioso/mudo)?" }
    ]
  },
  {
    id: "l6",
    lesson: "Lección 6: Letras Quietud",
    description: "Matres Lectionis: Consonantes que funcionan como vocales (Alef, He, Vav, Yod).",
    paradigm: "Regla de Oro: Si la Yod (י) o Vav (ו) tienen su propia vocal debajo, funcionan como CONSONANTES. Si NO tienen vocal propia, pierden su sonido y son parte de la vocal anterior (Matres Lectionis).",
    items: [
      { hebrew: "א ה ו י", name: "Matres Lectionis", type: "Regla Ortográfica", grammar: "Madres de lectura.", isVocab: false, pronunciation: "Vocálico", note: "Perdieron su sonido consonántico original." },
      
      { hebrew: "אֵשׁ", name: "Fuego", type: "Sustantivo", grammar: "Sustantivo femenino singular.", isVocab: true, pronunciation: "esh", note: "Raíz frecuente en contextos de sacrificio." },
      { hebrew: "הֵיכָל", name: "Templo / Palacio", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "hejál", note: "La Yod no tiene vocal debajo; acompaña a la Tsere formando una vocal 'e' larga." },
      { hebrew: "זָהָב", name: "Oro", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "zaháv", note: "Metal precioso, frecuentemente en descripciones del tabernáculo." },
      { hebrew: "כֶּסֶף", name: "Plata / Dinero", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "késef", note: "Acento en la penúltima sílaba." },
      { hebrew: "מִזְבֵּחַ", name: "Altar", type: "Sustantivo", grammar: "Sustantivo masculino singular. Furtiva.", isVocab: true, pronunciation: "mizbéaj", note: "Toma Pátah furtiva al final." },
      { hebrew: "עוֹלָם", name: "Eternidad / Antigüedad", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "olám", note: "Concepto de tiempo inmedible." },
      { hebrew: "שָׁלוֹם", name: "Paz / Bienestar", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "shalóm", note: "Usa Vav como Mater Lectionis para la 'O'." }
    ],
    exercises: [
      { id: 1, title: "Análisis de Matres Lectionis", instruction: "Determina si la letra א, ה, ו o י funciona como consonante real o como Mater Lectionis (vocal):", content: ["שָׁלוֹם", "רֹאשׁ", "הֵיכָל"], example: { hebrew: "שָׁלוֹם", translation: "Paz / Bienestar.", analysis: "1. Cons. Shin + Punto Shin (diacrítico derecho) + Vocal Qámets (sha).\n2. Cons. Lámed.\n3. Símbolo Hólem (punto superior) + Consonante Vav. La Vav no tiene vocal debajo, por lo que pierde su cualidad consonántica y forma una MATER LECTIONIS (Vocal 'O').\n4. Cons. Mem final." }, guide: "Aplica tu descubrimiento: Si la Yod (י) o Vav (ו) tienen su propia vocal debajo, son consonantes. Si no, se agrupan con la vocal." },
      { id: 2, title: "B. Traducción Acumulativa", instruction: "Traduce al español las siguientes palabras de las lecciones anteriores:", pairs: ["רוּחַ", "יְהוָה", "אָדָם", "בָּשָׂר", "אֶרֶץ", "עִיר"], guide: "Obliga a tu mente a recordar antes de buscar en el glosario." }
    ]
  },
  {
    id: "l7",
    lesson: "Lección 7: El Dagesh",
    description: "Dagesh Lene vs Dagesh Forte.",
    paradigm: "Regla del Dagesh (ּ): El LENE endurece el sonido (solo en BeGaDKeFaT). El FORTE duplica la consonante y siempre va precedido de una vocal. Fonéticamente, la primera letra reduplicada actúa como si llevara un SHEWA MUDO (cierra la sílaba).",
    items: [
      { hebrew: "ּ", name: "Dagesh Lene / Forte", type: "Puntuación", grammar: "Marcador de duplicación o endurecimiento.", isVocab: false, pronunciation: "Punto central", note: "Lene = duro. Forte = doble." },
      
      { hebrew: "מַלְאָךְ", name: "Ángel / Mensajero", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "mal'áj", note: "Contiene una Álef quieta (muda) en el medio." },
      { hebrew: "נָבִיא", name: "Profeta", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "naví", note: "La Yod actúa como Mater Lectionis (no tiene vocal debajo)." },
      { hebrew: "קָדוֹשׁ", name: "Santo / Sagrado", type: "Adjetivo", grammar: "Adjetivo masculino singular.", isVocab: true, pronunciation: "qadósh", note: "La Vav actúa como Mater Lectionis para la 'o'." },
      { hebrew: "שָׁמַיִם", name: "Cielos", type: "Sustantivo", grammar: "Sustantivo masculino dual/plural.", isVocab: true, pronunciation: "shamáyim", note: "La Yod SÍ tiene su propia vocal (Híreq) debajo, por lo tanto actúa como consonante (y)." }
    ],
    exercises: [
      { id: 1, title: "Análisis del Dagesh Lene y Forte", instruction: "Realiza el parsing de estas palabras e identifica explícitamente el tipo de Dagesh y su efecto fonético:", content: ["הַמֶּלֶךְ", "בַּיִת", "שָׁמַיִם"], example: { hebrew: "הַמֶּלֶךְ", translation: "El Rey.", analysis: "1. Cons. He + Vocal Pátah.\n2. Cons. Mem + Símbolo Dagesh. Este punto es un DAGESH FORTE porque la Mem NO es una letra BeGaDKeFaT y está precedida por una vocal. Su función es duplicar la Mem. Fonéticamente, la primera Mem reduplicada lleva un SHEWA MUDO implícito (ham-mé-lej).\n3. Vocal Segol.\n4. Cons. Lámed + Vocal Segol.\n5. Kaf Final." }, guide: "Al llegar al punto, evalúa: ¿Es BeGaDKeFaT al inicio de sílaba? (Lene). ¿Está después de vocal? (Forte, entonces aplica la regla de reduplicación con shewa mudo)." }
    ]
  },
  {
    id: "l8",
    lesson: "Lección 8: Maqqef, Méteg...",
    description: "Símbolos de unión y vocales cortas.",
    paradigm: "Maqqef (־): Guion alto que une palabras. La palabra que antecede pierde su acento primario. Si tiene una Qámets (ā), al perder el acento en sílaba cerrada, se acorta a Qámets Hatuf (o).",
    items: [
      { hebrew: "־", name: "Maqqef", type: "Puntuación", grammar: "Guión de unión lógica.", isVocab: false, pronunciation: "Guion de unión", note: "Altera el acento de la palabra precedente." },
      
      { hebrew: "כָּל־ / כֹּל", name: "Todo / Cada", type: "Cuantificador", grammar: "Sustantivo usado como cuantificador.", isVocab: true, pronunciation: "kol- / kol", note: "Al unirse con Maqqef cambia su vocal a Qámets Hatuf." },
      { hebrew: "כִּי", name: "Que / Porque", type: "Conjunción", grammar: "Conjunción subordinante.", isVocab: true, pronunciation: "kí", note: "Extremadamente común en el texto bíblico." },
      { hebrew: "לֹא", name: "No", type: "Adverbio", grammar: "Partícula negativa / Adverbio.", isVocab: true, pronunciation: "lo", note: "Niega acciones o estados." },
      { hebrew: "עַל", name: "Sobre / Por", type: "Preposición", grammar: "Preposición espacial/causal.", isVocab: true, pronunciation: "al", note: "También puede significar 'acerca de'." },
      { hebrew: "עֵץ", name: "Árbol / Madera", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "ets", note: "Plural: 'etsim'." },
      { hebrew: "פְּרִי", name: "Fruto", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "prí", note: "Comienza con Shewa vocal." }
    ],
    exercises: [
      { id: 1, title: "C. Traducción y Gramática (Análisis)", instruction: "Identifique la forma gramatical de cada palabra aplicando las reglas de acentuación (Maqqef):", content: ["כָּל־הָאָרֶץ", "עַל־הַבַּיִת", "עֵץ וּפְרִי"], example: { hebrew: "כָּל־הָאָרֶץ", translation: "Toda la tierra.", analysis: "כָּל־ (Sustantivo constructo) pierde su acento por el MAQQEF, por lo que su vocal Qámets se acorta a Qámets Hatuf ('o'). + הָאָרֶץ (Artículo definido 'ha' + Sustantivo fem. singular segolado)." }, guide: "El Maqqef hace que traduzcamos las palabras como un solo bloque lógico y fonético." }
    ]
  },
  {
    id: "l9",
    lesson: "Lección 9: Las Guturales",
    description: "Reglas de Álef, He, Het, Ayin y Resh.",
    paradigm: "Las letras א ה ח ע ר NUNCA reciben Dagesh Forte y prefieren vocales de clase 'A' (Pátah). Si una palabra termina en ח o ע precedida de otra vocal, toma una Pátah furtiva que se lee ANTES de la consonante.",
    items: [
      { hebrew: "א ה ח ע ר", name: "Letras Guturales", type: "Regla Fonética", grammar: "Consonantes de la garganta.", isVocab: false, pronunciation: "Garganta", tags: ["Gutural"] },
      
      { hebrew: "הַר", name: "Monte / Montaña", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "har", note: "Plural: 'harim'." },
      { hebrew: "חֶרֶב", name: "Espada", type: "Sustantivo", grammar: "Sustantivo femenino singular. Segolado.", isVocab: true, pronunciation: "jérev", note: "Acento en la penúltima sílaba." },
      { hebrew: "נַעַר", name: "Joven / Muchacho", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "ná'ar", note: "Tiene una Pátah en lugar de Segol por la gutural Ayin." },
      { hebrew: "עֶבֶד", name: "Siervo / Esclavo", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "éved", note: "Acento en la penúltima sílaba." },
      { hebrew: "עַם", name: "Pueblo / Nación", type: "Sustantivo", grammar: "Sustantivo masculino singular.", isVocab: true, pronunciation: "am", note: "Plural: 'amim'." },
      { hebrew: "רֹאשׁ", name: "Cabeza / Cima", type: "Sustantivo", grammar: "Sustantivo masculino singular. Irregular.", isVocab: true, pronunciation: "rosh", note: "Plural: 'rashim'." }
    ],
    exercises: [
      { id: 1, title: "Análisis de Pátah Furtiva y Guturales", instruction: "Realiza el parsing identificando la gutural y describiendo el fenómeno vocálico al final:", content: ["רוּחַ", "מִזְבֵּחַ", "נַעַר"], example: { hebrew: "רוּחַ", translation: "Espíritu / Viento.", analysis: "1. Cons. Resh (Gutural).\n2. Vocal Shúreq (u larga plena).\n3. Cons. Het (Gutural fuerte). Al estar al final de la palabra, precedida de vocal que no es 'A', el símbolo de abajo es una PÁTAH FURTIVA. Regla: Se pronuncia ANTES de la consonante (ru-a-j)." }, guide: "No omitas ningún paso. Identifica la consonante ➔ Identifica la vocal ➔ Justifica por qué se lee al revés al final de la palabra." }
    ]
  },
  {
    id: "l10",
    lesson: "Lección 10: Acentos",
    description: "Athnaj y Silluq, formas de pausa.",
    paradigm: "Athnaj (֑) marca la mitad lógica del verso; Silluq (ֽ) indica el final del verso. Cuando una palabra está en pausa, a menudo alarga su vocal corta a una larga.",
    items: [
      { hebrew: "֑", name: "Athnaj", type: "Acento Masorético", grammar: "Pausa fuerte (mitad del verso).", isVocab: false, pronunciation: "Pausa media", note: "Afecta la acentuación y a veces las vocales (forma de pausa)." },
      { hebrew: "ֽ", name: "Silluq", type: "Acento Masorético", grammar: "Pausa absoluta (final del verso).", isVocab: false, pronunciation: "Pausa final", note: "Siempre va debajo de la sílaba tónica de la última palabra." },
      
      { hebrew: "זֶרַע", name: "Semilla / Descendencia", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "zéra", note: "Muy frecuente en promesas patriarcales." },
      { hebrew: "לֶחֶם", name: "Pan / Comida", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "léjem", note: "Forma parte del nombre de la ciudad de Belén (Beit Lejem)." },
      { hebrew: "מַיִם", name: "Agua / Aguas", type: "Sustantivo", grammar: "Sustantivo masculino dual/plural.", isVocab: true, pronunciation: "máyim", note: "Solo existe en forma plural/dual." },
      { hebrew: "עֶרֶב", name: "Tarde", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "érev", note: "Opuesto a bóqer." },
      { hebrew: "בֹּקֶר", name: "Mañana", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado.", isVocab: true, pronunciation: "bóqer", note: "Opuesto a érev." },
      { hebrew: "לַיְלָה", name: "Noche", type: "Sustantivo", grammar: "Sustantivo masculino singular. Segolado Irregular.", isVocab: true, pronunciation: "láilah", note: "Tiene terminación femenina (ah) pero es gramaticalmente masculino." }
    ],
    exercises: [
      { id: 1, title: "C. Análisis en Pausa y Traducción", instruction: "Observe cómo los acentos de pausa (Athnaj/Silluq) afectan la vocalización original de las palabras:", content: ["לֶחֶם וָמָֽיִם", "עֶרֶב וָבֹֽקֶר", "זֶרַע אָדָֽם"], example: { hebrew: "וָמָֽיִם", translation: "y agua.", analysis: "1. Cons. Vav + Vocal Qámets (Conjunción 'y').\n2. Cons. Mem + Vocal Qámets.\n3. Símbolo SILLUQ (Línea vertical baja). Indica el fin del verso.\n4. Cons. Yod + Vocal Híreq + Mem Final.\nRegla de Pausa: La palabra original es 'máyim' (con Pátah). El Silluq alarga esa Pátah convirtiéndola en Qámets (mā-yim)." }, guide: "Sigue la cadena: Consonante ➔ Acento de Pausa ➔ Efecto en la vocal." }
    ]
  },
  {
    id: "l11",
    lesson: "Lección 11: Artículo Definido",
    description: "Uso de Ha-",
    paradigm: "El artículo definido se forma con la letra He (הַּ) + vocal Pátah + Dagesh Forte insertado en la consonante siguiente.",
    items: [
      { hebrew: "הַּ", name: "Artículo Definido", type: "Gramática", grammar: "Prefijo de determinación.", isVocab: false, pronunciation: "ha-", note: "El hebreo NO tiene artículo indefinido (un, una). Solo definido (el, la, los)." },
      { hebrew: "הַיּוֹם", name: "El día / Hoy", type: "Sustantivo + Artículo", grammar: "Sustantivo m.s. determinado.", isVocab: true, pronunciation: "hayóm", note: "Se traduce 'hoy' en muchos contextos narrativos." }
    ],
    exercises: [
      { id: 1, title: "Análisis del Artículo Definido", instruction: "Realiza el parsing separando el prefijo del sustantivo base, identificando los símbolos involucrados:", content: ["הַמֶּלֶךְ", "הַיּוֹם"], example: { hebrew: "הַמֶּלֶךְ", translation: "El rey.", analysis: "1. Prefijo: Cons. He + Vocal Pátah.\n2. Símbolo de Unión: Dagesh Forte insertado en la primera consonante de la raíz (Mem). Al duplicarse, la primera Mem asume un SHEWA MUDO implícito, cerrando la primera sílaba (ham-mé-lej).\n3. Raíz: Cons. Mem + Vocal Segol + Cons. Lámed + Vocal Segol + Kaf Final (Sustantivo segolado 'Mélej')." }, guide: "Demuestra que sabes por qué está el Dagesh allí. El artículo definido exige la duplicación de la letra siguiente." }
    ]
  },
  {
    id: "l12",
    lesson: "Lección 12: Pronombres Singulares",
    description: "Pronombres personales independientes.",
    paradigm: "El hebreo distingue género (masculino/femenino) tanto en la 2da como en la 3ra persona. Yo (אֲנִי), Tú Masc (אַתָּה), Tú Fem (אַתְּ), Él (הוּא), Ella (הִיא).",
    items: [
      { hebrew: "אֲנִי", name: "Yo", type: "Pronombre", grammar: "Pronombre personal, 1ra persona común singular.", isVocab: true, pronunciation: "aní", note: "Aplica tanto para hombres como mujeres." },
      { hebrew: "אַתָּה", name: "Tú (Masculino)", type: "Pronombre", grammar: "Pronombre personal, 2da persona masculino singular.", isVocab: true, pronunciation: "atá", note: "Termina en Qámets He." },
      { hebrew: "אַתְּ", name: "Tú (Femenino)", type: "Pronombre", grammar: "Pronombre personal, 2da persona femenino singular.", isVocab: true, pronunciation: "at", note: "Lleva Shewa silencioso al final." },
      { hebrew: "הוּא", name: "Él", type: "Pronombre", grammar: "Pronombre personal, 3ra persona masculino singular.", isVocab: true, pronunciation: "hú", note: "Utiliza Shúreq." },
      { hebrew: "הִיא", name: "Ella", type: "Pronombre", grammar: "Pronombre personal, 3ra persona femenino singular.", isVocab: true, pronunciation: "hí", note: "Utiliza Híreq Yod." },
      
      { hebrew: "בְּרִית", name: "Pacto / Alianza", type: "Sustantivo", grammar: "Sustantivo femenino singular.", isVocab: true, pronunciation: "berít", note: "Concepto teológico central (A.T. / N.T.)." }
    ],
    exercises: [
      { id: 1, title: "Análisis Pronominal Completo", instruction: "Realiza el desglose letra por letra y define la categoría gramatical exacta (Persona, Género, Número):", content: ["הוּא", "אַתָּה", "אֲנִי"], example: { hebrew: "הוּא", translation: "Él.", analysis: "1. Cons. He (Gutural).\n2. Símbolo Shúreq (Vav con punto = Vocal 'u' larga plena).\n3. Cons. Álef (Quieta/Muda en esta posición).\nGramática: Pronombre personal independiente. 3ra Persona, Masculino, Singular (3ms)." }, guide: "No uses atajos. Asigna la clasificación oficial (ej: 1cs, 2ms, 3fp). Esta disciplina será vital para los verbos." }
    ]
  }
];

// Índice 13 al 98
const futureLessons = [];
const sections = [
  { start: 13, end: 28, title: "Sustantivos y Adjetivos" },
  { start: 29, end: 51, title: "El Verbo Fuerte" },
  { start: 52, end: 58, title: "Sufijos Pronominales" },
  { start: 59, end: 98, title: "Verbos Débiles" }
];
sections.forEach(sec => {
  for (let i = sec.start; i <= sec.end; i++) {
    futureLessons.push({ id: `l${i}`, lesson: `Lección ${i}: ${sec.title}`, group: sec.title });
  }
});

const kbConsonants = ["א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כ", "ך", "ל", "מ", "ם", "נ", "ן", "ס", "ע", "פ", "ף", "צ", "ץ", "ק", "ר", "ש", "ת"];
const kbVowels = ["אַ", "אָ", "אֶ", "אֵ", "אִ", "אִי", "אֹ", "אוֹ", "אֻ", "אוּ"];
const kbPunctuation = ["ְ", "ּ", "־", "֑", "ֽ", "׃"];
const kbSyllables = ["CV", "CVC"];

// ============================================================================
// 4. COMPONENTE PRINCIPAL (APP)
// ============================================================================
export default function App() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [keyboardTab, setKeyboardTab] = useState("consonants");
  
  const [activeTab, setActiveTab] = useState("all"); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedMenuId, setExpandedMenuId] = useState(null);
  
  const [activePopupItem, setActivePopupItem] = useState(null);
  
  // Estado para el Analizador Libre
  const [analyzerInput, setAnalyzerInput] = useState("");
  
  const popupRef = useRef(null);

  // Cerrar pop-up si se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setActivePopupItem(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popupRef]);

  const handleKeyClick = (char) => {
    if (activeTab === "analyzer") {
      setAnalyzerInput(prev => prev + char);
    } else {
      setSearchTerm(prev => prev + char);
    }
  };
  
  const handleBackspace = () => {
    if (activeTab === "analyzer") {
      setAnalyzerInput(prev => prev.slice(0, -1));
    } else {
      setSearchTerm(prev => prev.slice(0, -1));
    }
  };

  const isExerciseView = activeTab.endsWith("-exercises");
  const baseSectionId = activeTab.split("-")[0];

  let dataToRender = [];
  let exercisesToRender = [];

  // Determinación de la vista actual
  if (activeTab === "vocab-full") {
    const allVocab = hebrewData.flatMap(section => section.items.filter(item => item.isVocab));
    dataToRender = [{
      lesson: "Glosario Hebreo-Español (L1 - L12)",
      description: "Recopilación exhaustiva de todo el vocabulario aprendido en el curso, con su respectiva leyenda gramatical.",
      items: allVocab
    }];
  } else if (activeTab === "appendix" || activeTab === "analyzer") {
    dataToRender = []; 
  } else if (activeTab === "all") {
    dataToRender = hebrewData;
  } else if (isExerciseView) {
    const section = hebrewData.find(s => s.id === baseSectionId);
    if (section) {
       exercisesToRender = section.exercises || [];
       dataToRender = [{ ...section, isExerciseContainer: true }];
    }
  } else {
    const section = hebrewData.find(s => s.id === baseSectionId);
    if (section) {
      dataToRender = [section];
    }
  }

  // Filtrado de Búsqueda Inteligente (Incluye la deconstrucción oculta)
  const termNormalized = normalizeText(searchTerm);
  const filteredData = dataToRender.map(section => {
    if (section.isExerciseContainer) return section; 
    const filteredItems = section.items.filter(item => {
      if (!termNormalized) return true;
      
      const breakdown = getWordBreakdown(item.hebrew);

      const searchFields = [
        item.name, 
        item.pronunciation, 
        item.type, 
        item.note, 
        item.description, 
        item.grammar, 
        breakdown,
        ...(item.tags || [])
      ].map(field => normalizeText(field || ""));
      
      return searchFields.some(field => field.includes(termNormalized)) || item.hebrew.includes(searchTerm);
    });
    return { ...section, items: filteredItems };
  }).filter(section => section.isExerciseContainer || section.items?.length > 0);

  const groupedFutureLessons = futureLessons.reduce((acc, lesson) => {
    if (!acc[lesson.group]) acc[lesson.group] = [];
    acc[lesson.group].push(lesson);
    return acc;
  }, {});

  // Deconstrucción del texto libre
  const parsedCustomData = parseCustomWord(analyzerInput);

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-800 relative">
      
      {/* OVERLAY DEL MENÚ */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 transition-opacity" onClick={() => setIsMenuOpen(false)}></div>
      )}
      
      {/* SIDEBAR OFF-CANVAS */}
      <aside className={`fixed top-0 left-0 h-screen w-80 bg-[#003366] text-white flex flex-col shadow-2xl z-50 transition-transform transform ${isMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-6 flex flex-col items-start relative border-b border-white/10 shrink-0">
          <button className="absolute top-4 right-4 text-gray-300 hover:text-white p-1" onClick={() => setIsMenuOpen(false)}>
            <X size={24} />
          </button>
          
          <h1 className="text-xl font-bold tracking-wide text-white pr-6">Portafolio de Hebreo I - STACYM 2026</h1>
          <p className="text-sm text-gray-300 mt-2 leading-relaxed">Seminario Teológico Alianza Cristiana y Misionera</p>
          
          <div className="mt-5 w-full pt-4 border-t border-blue-400/20">
            <p className="text-xs text-[#66b2ff] font-medium leading-relaxed">
              Desarrollado para la investigación y estudio teológico de las Escrituras
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-4 space-y-6 scrollbar-thin scrollbar-thumb-white/20 pb-10">
          
          <div>
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-4">Vistas Generales</p>
            <button onClick={() => { setActiveTab("all"); setExpandedMenuId(null); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === "all" ? "bg-[#0d6efd] text-white font-medium shadow-md" : "text-gray-300 hover:bg-white/5"}`}>
              <Globe size={18} className={activeTab === "all" ? "text-white" : "text-gray-400"} /> 
              Todo el Contenido
            </button>
            <button onClick={() => { setActiveTab("analyzer"); setExpandedMenuId(null); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors mt-2 ${activeTab === "analyzer" ? "bg-amber-600 text-white font-medium shadow-md" : "text-gray-300 hover:bg-white/5"}`}>
              <Wrench size={18} className={activeTab === "analyzer" ? "text-white" : "text-amber-500"} /> 
              Analizador Libre
            </button>
          </div>

          <div>
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Gramática Básica (L1 - L12)</p>
            {hebrewData.map(section => {
              const isExpanded = expandedMenuId === section.id;
              const isActiveGroup = activeTab.startsWith(section.id);
              
              return (
                <div key={section.id} className="mt-1.5 flex flex-col">
                  <button 
                    onClick={() => { 
                      setExpandedMenuId(isExpanded ? null : section.id);
                      if (!isExpanded) setActiveTab(`${section.id}-theory`);
                    }} 
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${isActiveGroup && !isExpanded ? "bg-[#0d6efd]/20 border border-[#0d6efd]/30 text-white font-medium" : "text-gray-300 hover:bg-white/5"}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Layers size={16} className={isActiveGroup ? "text-[#4da3ff]" : "text-gray-400"}/> 
                      <span className="truncate">{section.lesson.split(":")[0]}</span>
                    </div>
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400"/> : <ChevronRight size={16} className="text-gray-500"/>}
                  </button>

                  {isExpanded && (
                    <div className="ml-7 mt-1.5 flex flex-col gap-1 border-l border-white/10 pl-3">
                      <button 
                        onClick={() => { setActiveTab(`${section.id}-theory`); setIsMenuOpen(false); }}
                        className={`text-left text-sm py-1.5 px-2 rounded hover:bg-white/5 transition-colors ${activeTab === `${section.id}-theory` ? 'text-[#4da3ff] font-medium' : 'text-gray-400'}`}
                      >
                        • Teoría y Vocabulario
                      </button>
                      
                      {section.exercises && section.exercises.length > 0 && (
                        <button 
                          onClick={() => { setActiveTab(`${section.id}-exercises`); setIsMenuOpen(false); }}
                          className={`text-left text-sm py-1.5 px-2 rounded hover:bg-white/5 transition-colors flex items-center gap-2 ${activeTab === `${section.id}-exercises` ? 'text-emerald-400 font-medium' : 'text-gray-400'}`}
                        >
                          <Microscope size={14} /> Análisis Práctico
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Índice Completo (L13 - L98) */}
          <div className="border-t border-white/10 pt-4 mt-4">
             <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Índice Avanzado (Próximamente)</p>
             {Object.entries(groupedFutureLessons).map(([groupName, lessons]) => (
                <div key={groupName} className="mb-4">
                  <p className="px-3 text-xs text-[#66b2ff] mb-2">{groupName}</p>
                  {lessons.map(lesson => (
                    <div key={lesson.id} className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-gray-500 opacity-60 ml-2">
                      <span className="truncate">{lesson.lesson}</span>
                    </div>
                  ))}
                </div>
             ))}
          </div>

          {/* Anexos Habilitados */}
          <div className="border-t border-white/10 pt-4 mt-4 pb-8">
            <p className="px-3 text-xs font-semibold text-[#CC0000] uppercase tracking-wider mb-2">Anexos Oficiales</p>
            <button onClick={() => { setActiveTab("appendix"); setExpandedMenuId(null); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left ${activeTab === "appendix" ? 'bg-[#0d6efd] text-white font-medium shadow-md' : 'text-gray-300 hover:bg-white/5'}`}>
               <FileText size={18} className={activeTab === "appendix" ? 'text-white' : 'text-gray-400'} /> 
               Apéndice (Paradigmas)
            </button>
            <button onClick={() => { setActiveTab("vocab-full"); setExpandedMenuId(null); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors text-left mt-2 ${activeTab === "vocab-full" ? 'bg-[#0d6efd] text-white font-medium shadow-md' : 'text-gray-300 hover:bg-white/5'}`}>
               <Volume2 size={18} className={activeTab === "vocab-full" ? 'text-white' : 'text-gray-400'} /> 
               Vocabulario Hebreo-Español
            </button>
          </div>

        </div>
      </aside>

      {/* ================= CONTENIDO PRINCIPAL ================= */}
      <div className="flex-1 flex flex-col min-h-screen w-full relative">
        
        <header className="bg-white shadow-sm sticky top-0 z-30 px-4 py-4 md:px-8">
          <div className="flex items-center gap-4 max-w-5xl mx-auto">
            <button className="text-[#003366] p-2 bg-gray-100 rounded hover:bg-gray-200 transition-colors" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} />
            </button>

            <div className="hidden sm:flex items-center gap-3 ml-2 mr-4">
              <BookOpen size={28} className="text-[#CC0000]" />
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-[#003366] leading-tight">Portafolio de Hebreo I</h1>
              </div>
            </div>
            
            <div className="relative w-full flex-1">
              <div className="flex gap-2">
                {activeTab !== "analyzer" ? (
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      dir="auto"
                      placeholder="Buscar (ej. 'Qámets', 'segolado', 'Gutural', 'Dios')..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003366] focus:border-transparent transition-all shadow-inner"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={isExerciseView || activeTab === "appendix"} 
                    />
                  </div>
                ) : (
                  <div className="relative w-full bg-amber-50 border border-amber-200 rounded-lg py-2.5 px-4 text-amber-800 font-medium text-sm flex items-center">
                    <Info size={16} className="mr-2 text-amber-600" />
                    Buscador deshabilitado. Usa la caja de texto inferior para analizar.
                  </div>
                )}
                <button 
                  onClick={() => setShowKeyboard(!showKeyboard)}
                  className={`p-2.5 rounded-lg transition-colors border shrink-0 ${showKeyboard ? 'bg-[#003366] border-[#003366] text-white shadow-md' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-[#003366]'}`}
                >
                  <Keyboard size={20} />
                </button>
              </div>

              {/* Teclado Virtual */}
              {showKeyboard && (
                <div className="absolute top-full mt-3 right-0 w-full md:w-[34rem] max-w-[90vw] bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-40 flex flex-col">
                  <div className="flex justify-between items-start md:items-center mb-4 border-b border-gray-100 pb-3 gap-2 flex-col md:flex-row">
                    <div className="flex flex-wrap gap-1 bg-gray-100 p-1.5 rounded-lg w-full md:w-auto">
                      <button onClick={() => setKeyboardTab("consonants")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex-1 md:flex-none ${keyboardTab === "consonants" ? "bg-white text-[#003366] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Consonantes</button>
                      <button onClick={() => setKeyboardTab("vowels")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex-1 md:flex-none ${keyboardTab === "vowels" ? "bg-white text-[#CC0000] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Vocales</button>
                      <button onClick={() => setKeyboardTab("punctuation")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex-1 md:flex-none ${keyboardTab === "punctuation" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Signos</button>
                      <button onClick={() => setKeyboardTab("syllables")} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex-1 md:flex-none ${keyboardTab === "syllables" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Sílabas</button>
                    </div>
                    <button onClick={handleBackspace} className="text-gray-500 hover:text-[#CC0000] p-2 bg-gray-50 rounded-md border border-gray-200 hover:border-red-200 self-end md:self-auto shrink-0">
                      <Delete size={18} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end overflow-y-auto max-h-[50vh] pr-1 pb-1" dir="rtl">
                    {keyboardTab === "consonants" && kbConsonants.map((char, index) => (
                      <button key={`cons-${index}`} onClick={() => handleKeyClick(char)} className="w-10 h-12 flex items-center justify-center text-2xl font-serif text-[#003366] bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-[#003366] active:bg-blue-100 shadow-sm transition-all">{char}</button>
                    ))}
                    {keyboardTab === "vowels" && kbVowels.map((char, index) => (
                      <button key={`vow-${index}`} onClick={() => handleKeyClick(char)} className="w-12 h-12 flex items-center justify-center text-2xl font-serif text-[#CC0000] bg-white border border-gray-200 rounded hover:bg-red-50 hover:border-[#CC0000] active:bg-red-100 shadow-sm transition-all">{char}</button>
                    ))}
                    {keyboardTab === "punctuation" && kbPunctuation.map((char, index) => (
                      <button key={`punct-${index}`} onClick={() => handleKeyClick(char)} className="w-12 h-12 flex items-center justify-center text-3xl font-serif text-emerald-600 bg-white border border-gray-200 rounded hover:bg-emerald-50 hover:border-emerald-600 active:bg-emerald-100 shadow-sm transition-all">{char}</button>
                    ))}
                    {keyboardTab === "syllables" && kbSyllables.map((char, index) => (
                      <button key={`syll-${index}`} onClick={() => handleKeyClick(char)} className="px-4 h-12 flex items-center justify-center text-lg font-sans font-bold text-purple-600 bg-white border border-gray-200 rounded hover:bg-purple-50 hover:border-purple-600 active:bg-purple-100 shadow-sm transition-all">{char}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Área Principal */}
        <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full relative">
          
          {/* Overlay oscuro para enfocar el popup */}
          {activePopupItem && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-40 transition-all duration-300" onClick={() => setActivePopupItem(null)}></div>
          )}

          {/* POP-UP INTERACTIVO FLOTANTE */}
          {activePopupItem && (
            <div 
              ref={popupRef}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[92%] sm:w-[95%] max-w-md md:max-w-lg bg-slate-900/90 backdrop-blur-xl text-left text-white rounded-2xl shadow-[0_0_40px_-10px_rgba(102,178,255,0.4)] p-6 sm:p-8 z-50 border border-blue-500/30 max-h-[85vh] overflow-y-auto transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl pointer-events-none"></div>
              
              <div className="relative flex justify-between items-start border-b border-slate-700/60 pb-4 mb-5">
                <div>
                  <h5 className="font-bold text-[#66b2ff] text-2xl sm:text-3xl flex items-baseline gap-2 drop-shadow-[0_0_10px_rgba(102,178,255,0.5)]">
                    {activePopupItem.name} <span className="font-serif text-white">({activePopupItem.hebrew})</span>
                  </h5>
                  <p className="text-blue-300/80 text-xs sm:text-sm mt-1 uppercase tracking-widest font-semibold">{activePopupItem.type}</p>
                </div>
                <button onClick={() => setActivePopupItem(null)} className="text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full p-2 transition-colors border border-slate-600/50 shadow-sm shrink-0 ml-4">
                  <X size={20} />
                </button>
              </div>
              
              <div className="relative space-y-4">
                {activePopupItem.grammar && (
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-800/60 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]">
                    <span className="font-bold text-emerald-400 block mb-1 uppercase text-[10px] sm:text-xs tracking-wider">Gramática:</span> {activePopupItem.grammar}
                  </p>
                )}
                
                {activePopupItem.note && (
                  <p className="text-sm text-slate-300 leading-relaxed px-1">
                    <span className="font-bold text-[#66b2ff] uppercase text-[10px] sm:text-xs tracking-wider block mb-1">Descripción:</span> {activePopupItem.note}
                  </p>
                )}

                <div className="flex items-center gap-3 bg-blue-900/40 p-4 rounded-xl border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                  <div className="bg-blue-500/20 p-2 rounded-full shrink-0">
                    <Volume2 size={20} className="text-blue-400" />
                  </div>
                  <p className="text-sm font-semibold text-white flex flex-col sm:flex-row sm:gap-2">
                    Pronunciación: <span className="font-normal text-blue-100">{activePopupItem.pronunciation}</span>
                  </p>
                </div>

                {getWordBreakdown(activePopupItem.hebrew).includes("➔") && (
                  <div className="border-t border-slate-700/60 mt-6 pt-5">
                    <p className="text-[10px] sm:text-xs text-blue-300/70 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Microscope size={16} className="text-amber-400"/> Análisis (De der. a izq.):
                    </p>
                    <p className="text-xs sm:text-sm text-amber-300 font-mono leading-relaxed bg-black/60 p-4 rounded-xl overflow-x-auto border border-amber-500/20 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]" dir="ltr">
                      {getWordBreakdown(activePopupItem.hebrew)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              {activeTab === "vocab-full" ? <BookMarked className="text-[#CC0000]"/> : 
               activeTab === "appendix" ? <FileText className="text-blue-600"/> :
               activeTab === "analyzer" ? <Wrench className="text-amber-600"/> :
               isExerciseView ? <Microscope className="text-emerald-600"/> : <BookOpen className="text-[#003366]"/>}
              
              {activeTab === "vocab-full" ? "Vocabulario Hebreo-Español Completo" : 
               activeTab === "appendix" ? "Apéndice: Paradigmas Básicos" :
               activeTab === "analyzer" ? "Laboratorio de Exégesis Libre" :
               activeTab === "all" ? "Todo el Material" : dataToRender[0]?.lesson + (isExerciseView ? " - Análisis Práctico" : "")}
            </h2>
            
            {activeTab === "vocab-full" && <p className="text-gray-500 mt-1">Busca cualquier concepto gramatical (ej. 'segolado', 'masculino') en la barra superior para filtrar el glosario.</p>}
            {isExerciseView && <p className="text-gray-500 mt-1">Saca tu cuaderno físico. Deconstruye cada palabra según el Modelo de Análisis (Parsing) provisto.</p>}
            {activeTab === "analyzer" && <p className="text-gray-500 mt-1">Pega cualquier palabra o texto para que el sistema lo deconstruya automáticamente.</p>}
          </div>

          {/* ==================================================== */}
          {/* VISTA: LABORATORIO DE ANÁLISIS LIBRE                 */}
          {/* ==================================================== */}
          {activeTab === "analyzer" && (
            <div className="space-y-6">
              <div className="bg-amber-50 border-l-4 border-amber-600 p-5 rounded-r-lg shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={20} className="text-amber-700" />
                  <h3 className="text-lg font-bold text-amber-800">¿Tienes una foto del texto?</h3>
                </div>
                <p className="text-amber-900 leading-relaxed">
                  Si tienes una foto del manual y no sabes cómo escribir la palabra, súbela al chat. Yo (Tu Agente IA de estudio) extraeré los caracteres hebreos exactos para ti, y podrás pegarlos aquí abajo.
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                <div className="mb-8 relative">
                  <input
                    type="text"
                    dir="rtl"
                    value={analyzerInput}
                    onChange={(e) => setAnalyzerInput(e.target.value)}
                    placeholder="Escribe con el teclado virtual o pega texto aquí..."
                    className="w-full text-5xl md:text-6xl font-serif text-[#003366] p-8 rounded-xl border-2 border-gray-300 focus:border-amber-500 focus:ring-0 text-center shadow-inner tracking-[0.2em]"
                  />
                  {analyzerInput && (
                    <button 
                      onClick={() => setAnalyzerInput("")} 
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 p-2 bg-gray-100 rounded-full"
                      title="Limpiar"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {analyzerInput.trim() !== "" ? (
                  <div>
                    <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2 border-b pb-2">
                      <Microscope size={20} /> Desglose (De Derecha a Izquierda)
                    </h4>
                    <div className="flex flex-col gap-3">
                      {parsedCustomData.map((item, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row items-center gap-4 bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          {/* Símbolo gigante */}
                          <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white border border-gray-300 rounded-lg text-4xl font-serif text-[#003366]" dir="rtl">
                            {item.symbol}
                          </div>
                          
                          {/* Flecha indicadora */}
                          <div className="hidden md:block text-gray-300">
                            <ArrowDown size={24} className="-rotate-90" />
                          </div>
                          <div className="md:hidden text-gray-300">
                            <ArrowDown size={24} />
                          </div>

                          {/* Info del símbolo */}
                          <div className="flex-1 text-center md:text-left">
                            <h5 className="text-xl font-bold text-[#CC0000]">{item.name}</h5>
                            <p className="text-gray-600 font-medium">{item.grammar}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 opacity-50">
                    <Keyboard size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-500">Esperando texto hebreo para analizar...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA: APÉNDICE */}
          {activeTab === "appendix" && (
            <div className="space-y-6">
              <section className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 md:p-8">
                <h3 className="text-xl font-bold text-[#003366] mb-4 border-b pb-2">Reglas Generales Resumidas</h3>
                <ul className="list-disc pl-5 space-y-3 text-gray-700">
                  <li><strong className="text-gray-900">BeGaDKeFaT:</strong> ב ג ד כ פ ת reciben Dagesh Lene al inicio de palabra.</li>
                  <li><strong className="text-gray-900">Guturales:</strong> א ה ח ע ר rechazan el Dagesh Forte (no se duplican) y prefieren vocales 'a'.</li>
                  <li><strong className="text-gray-900">Matres Lectionis:</strong> א ה ו י pueden actuar como vocales en lugar de consonantes.</li>
                  <li><strong className="text-gray-900">Sílabas:</strong> Toda sílaba debe empezar con una consonante.</li>
                </ul>
              </section>
              <section className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 md:p-8">
                <h3 className="text-xl font-bold text-[#003366] mb-4 border-b pb-2">Paradigma: Pronombres Personales</h3>
                <div className="grid grid-cols-2 gap-4 text-center" dir="rtl">
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">אֲנִי</span><br/><span className="text-sm text-gray-500">1cs (Yo)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">אֲנַחְנוּ</span><br/><span className="text-sm text-gray-500">1cp (Nosotros)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">אַתָּה</span><br/><span className="text-sm text-gray-500">2ms (Tú masc.)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">אַתֶּם</span><br/><span className="text-sm text-gray-500">2mp (Vosotros)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">אַתְּ</span><br/><span className="text-sm text-gray-500">2fs (Tú fem.)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">אַתֵּן</span><br/><span className="text-sm text-gray-500">2fp (Vosotras)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">הוּא</span><br/><span className="text-sm text-gray-500">3ms (Él)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">הֵם</span><br/><span className="text-sm text-gray-500">3mp (Ellos)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">הִיא</span><br/><span className="text-sm text-gray-500">3fs (Ella)</span></div>
                  <div className="bg-gray-50 p-4 rounded border"><span className="text-2xl font-serif">הֵן</span><br/><span className="text-sm text-gray-500">3fp (Ellas)</span></div>
                </div>
              </section>
            </div>
          )}

          {filteredData.length === 0 && !isExerciseView && activeTab !== "appendix" && activeTab !== "analyzer" ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <Info size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600">No hay coincidencias</h3>
              <p className="text-gray-500">Prueba buscar en español o usa el teclado hebreo.</p>
            </div>
          ) : (
            <div className="space-y-10">
              
              {/* VISTA: EJERCICIOS ANALÍTICOS (Parsing) */}
              {isExerciseView && activeTab !== "appendix" ? (
                <section className="bg-white rounded-xl shadow-sm border border-emerald-100 p-6 md:p-8">
                   {exercisesToRender.length > 0 ? (
                     <div className="space-y-10">
                       {exercisesToRender.map((ex, i) => (
                         <div key={ex.id} className="relative pl-8 border-l-4 border-emerald-500 pb-4">
                           <div className="absolute left-[-18px] top-0 bg-white text-emerald-500 rounded-full">
                             <CheckCircle size={32} />
                           </div>
                           <h3 className="text-xl font-bold text-gray-900 mb-3">{ex.title}</h3>
                           <p className="text-gray-800 text-lg leading-relaxed mb-4 font-medium">{ex.instruction}</p>
                           
                           {/* Bloque de Ejemplo de Análisis */}
                           {ex.example && (
                             <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6 shadow-sm">
                               <div className="flex items-center gap-2 mb-3">
                                 <Microscope size={18} className="text-[#003366]" />
                                 <h4 className="font-bold text-[#003366] text-sm uppercase tracking-wider">Modelo de Análisis (Parsing)</h4>
                               </div>
                               <p className="text-4xl font-serif text-[#003366] mb-3 border-b border-blue-100 pb-3" dir="rtl">{ex.example.hebrew}</p>
                               <div className="text-sm text-gray-700 bg-white p-4 rounded border border-blue-100 shadow-inner">
                                 <p className="mb-3"><span className="font-bold text-[#CC0000] uppercase tracking-wider">Traducción:</span> {ex.example.translation}</p>
                                 <span className="font-bold text-[#003366] block mb-2 uppercase tracking-widest text-[10px]">Desglose Gramatical Letra por Letra:</span> 
                                 <p className="whitespace-pre-line leading-relaxed font-mono">{ex.example.analysis}</p>
                               </div>
                             </div>
                           )}

                           {/* Contenido del ejercicio */}
                           {ex.content && (
                             <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-4 shadow-sm" dir="rtl">
                               {ex.content.map((line, idx) => (
                                 <p key={idx} className="text-3xl md:text-4xl font-serif text-[#003366] leading-[2.5] tracking-widest">{line}</p>
                               ))}
                             </div>
                           )}

                           {ex.pairs && (
                             <div className="flex flex-wrap gap-4 text-3xl font-serif text-[#003366] bg-emerald-50/50 p-5 rounded-lg border border-emerald-100 mb-4" dir="rtl">
                               {ex.pairs.map((pair, idx) => <span key={idx} className="bg-white px-4 py-2 border border-emerald-200 rounded shadow-sm">{pair}</span>)}
                             </div>
                           )}

                           {ex.guide && (
                             <div className="flex items-start gap-3 bg-amber-50 p-4 rounded border border-amber-200 mt-2">
                               <Lightbulb className="text-amber-600 shrink-0 mt-0.5" size={18} />
                               <p className="text-sm text-gray-800 leading-relaxed"><span className="font-bold text-amber-700">Guía de estudio:</span> {ex.guide}</p>
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="text-center py-10">
                        <PenTool size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-600">No hay ejercicios cargados</h3>
                        <p className="text-gray-500">Tu profesor aún no ha asignado práctica formal para esta lección.</p>
                     </div>
                   )}
                </section>
              ) : 
              
              /* VISTA: TEORÍA Y VOCABULARIO */
              activeTab !== "appendix" && activeTab !== "analyzer" && filteredData.map((section, idx) => (
                <div key={idx} className="space-y-6">
                  
                  {!isExerciseView && activeTab !== "vocab-full" && section.paradigm && (
                    <div className="bg-blue-50 border-l-4 border-[#003366] p-5 rounded-r-lg shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen size={20} className="text-[#003366]" />
                        <h3 className="text-lg font-bold text-[#003366]">Regla Paradigmática</h3>
                      </div>
                      <p className="text-gray-800 leading-relaxed">{section.paradigm}</p>
                    </div>
                  )}

                  <section className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    
                    {activeTab !== "vocab-full" && (
                      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-[#003366]">{section.lesson}</h3>
                          <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {section.items?.map((item, itemIdx) => (
                        <div 
                          key={itemIdx} 
                          onClick={() => setActivePopupItem(item)}
                          className={`group border rounded-xl p-5 hover:shadow-lg transition-all bg-white relative flex flex-col cursor-pointer ${item.isVocab ? 'border-blue-100 hover:border-[#003366]' : 'border-gray-200 hover:border-gray-400'}`}
                        >
                          
                          <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${item.isVocab ? 'bg-[#003366] text-white' : 'bg-gray-200 text-gray-700'}`}>
                            {item.type}
                          </span>
                          
                          <div className="text-center py-6 border-b border-gray-100 mb-4 relative flex flex-col items-center justify-center">
                            <span className="text-6xl font-serif text-[#003366] group-hover:scale-110 transition-transform inline-block" dir="rtl">
                              {item.hebrew}
                            </span>
                            <span className="text-[10px] text-[#CC0000] font-bold mt-3 opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-red-50 px-2 py-1 rounded">
                              <Microscope size={12} /> Clic para deconstruir
                            </span>
                          </div>
                          
                          <div className="space-y-3 flex-1 flex flex-col">
                            <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                              {item.name}
                            </h4>

                            {item.grammar && (
                              <div className="flex items-start gap-2 text-sm bg-blue-50/50 p-2.5 rounded border border-blue-100 mb-2">
                                <BookMarked size={16} className="text-[#003366] mt-0.5 shrink-0"/>
                                <p className="text-[#003366] text-xs leading-relaxed font-semibold">{item.grammar}</p>
                              </div>
                            )}
                            
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 mb-2">
                                {item.tags.map((tag, tIdx) => (
                                  <span key={tIdx} className={`text-[10px] font-bold px-2 py-0.5 rounded border ${tag === 'Gutural' ? 'bg-orange-50 text-orange-600 border-orange-200' : tag === 'Muda' ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="mt-auto space-y-2 pt-3 border-t border-gray-100">
                              <div className="flex items-start gap-2 text-sm">
                                <Volume2 size={16} className="text-gray-400 mt-0.5 shrink-0"/>
                                <p><span className="font-semibold text-gray-700">Pronunciación:</span> <span className="text-gray-600">{item.pronunciation}</span></p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}