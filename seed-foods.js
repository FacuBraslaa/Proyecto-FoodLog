import pool from "./dbconfig.js";

const foods = [
  { name: "Manzana", unit_label: "unidad (150 g)", calories_per_unit: 80 },
  { name: "Banana", unit_label: "unidad (120 g)", calories_per_unit: 105 },
  { name: "Naranja", unit_label: "unidad (130 g)", calories_per_unit: 62 },
  { name: "Palta", unit_label: "unidad (200 g)", calories_per_unit: 320 },
  { name: "Frutillas", unit_label: "taza (150 g)", calories_per_unit: 50 },
  { name: "Yogur natural", unit_label: "vaso (200 ml)", calories_per_unit: 120 },
  { name: "Leche descremada", unit_label: "vaso (200 ml)", calories_per_unit: 70 },
  { name: "Leche entera", unit_label: "vaso (200 ml)", calories_per_unit: 120 },
  { name: "Queso blanco", unit_label: "cda (30 g)", calories_per_unit: 60 },
  { name: "Huevo", unit_label: "unidad", calories_per_unit: 70 },
  { name: "Clara de huevo", unit_label: "unidad", calories_per_unit: 17 },
  { name: "Pollo a la plancha", unit_label: "porción (150 g)", calories_per_unit: 240 },
  { name: "Pechuga de pavo", unit_label: "porción (150 g)", calories_per_unit: 210 },
  { name: "Carne magra", unit_label: "porción (150 g)", calories_per_unit: 280 },
  { name: "Lomo a la plancha", unit_label: "porción (150 g)", calories_per_unit: 260 },
  { name: "Salmón", unit_label: "porción (150 g)", calories_per_unit: 310 },
  { name: "Atún al natural", unit_label: "lata (120 g)", calories_per_unit: 140 },
  { name: "Arroz blanco", unit_label: "taza cocida (150 g)", calories_per_unit: 200 },
  { name: "Arroz integral", unit_label: "taza cocida (150 g)", calories_per_unit: 180 },
  { name: "Papas al horno", unit_label: "porción (180 g)", calories_per_unit: 160 },
  { name: "Puré de papas", unit_label: "taza (200 g)", calories_per_unit: 214 },
  { name: "Pasta cocida", unit_label: "taza (150 g)", calories_per_unit: 220 },
  { name: "Pan integral", unit_label: "rebanada (40 g)", calories_per_unit: 90 },
  { name: "Pan blanco", unit_label: "rebanada (40 g)", calories_per_unit: 100 },
  { name: "Avena arrollada", unit_label: "taza (80 g)", calories_per_unit: 300 },
  { name: "Granola", unit_label: "porción (50 g)", calories_per_unit: 220 },
  { name: "Ensalada mixta", unit_label: "plato (200 g)", calories_per_unit: 90 },
  { name: "Ensalada César", unit_label: "plato (220 g)", calories_per_unit: 330 },
  { name: "Garbanzos cocidos", unit_label: "taza (150 g)", calories_per_unit: 240 },
  { name: "Lentejas cocidas", unit_label: "taza (150 g)", calories_per_unit: 210 },
  { name: "Porotos negros", unit_label: "taza (150 g)", calories_per_unit: 220 },
  { name: "Tostadas de arroz", unit_label: "unidad", calories_per_unit: 35 },
  { name: "Mantequilla de maní", unit_label: "cda (16 g)", calories_per_unit: 95 },
  { name: "Almendras", unit_label: "porción (30 g)", calories_per_unit: 170 },
  { name: "Nueces", unit_label: "porción (30 g)", calories_per_unit: 200 },
  { name: "Batata asada", unit_label: "porción (180 g)", calories_per_unit: 160 },
  { name: "Brócoli al vapor", unit_label: "taza (150 g)", calories_per_unit: 50 },
  { name: "Zanahoria cruda", unit_label: "unidad (60 g)", calories_per_unit: 25 },
  { name: "Aceite de oliva", unit_label: "cda (15 ml)", calories_per_unit: 120 },
  { name: "Mayonesa light", unit_label: "cda (15 g)", calories_per_unit: 60 },
  { name: "Queso cheddar", unit_label: "feta (28 g)", calories_per_unit: 113 },
  { name: "Queso mozzarella", unit_label: "feta (28 g)", calories_per_unit: 85 },
  { name: "Pizza muzarella", unit_label: "porción (120 g)", calories_per_unit: 285 },
  { name: "Hamburguesa casera", unit_label: "unidad (200 g)", calories_per_unit: 450 },
  { name: "Empanada de carne", unit_label: "unidad (80 g)", calories_per_unit: 240 },
  { name: "Tarta de verduras", unit_label: "porción (150 g)", calories_per_unit: 260 },
  { name: "Sopa de verduras", unit_label: "tazón (300 ml)", calories_per_unit: 120 },
  { name: "Café con leche", unit_label: "taza (200 ml)", calories_per_unit: 90 },
  { name: "Jugo de naranja", unit_label: "vaso (200 ml)", calories_per_unit: 90 },
  { name: "Agua", unit_label: "vaso (200 ml)", calories_per_unit: 0 },
];

async function seedFoods() {
  const { rows } = await pool.query("SELECT LOWER(name) AS name FROM foods");
  const existing = new Set(rows.map((r) => r.name));

  let inserted = 0;

  for (const food of foods) {
    const key = food.name.toLowerCase();
    if (existing.has(key)) continue;

    try {
      await pool.query(
        `
        INSERT INTO foods (name, unit_label, calories_per_unit)
        VALUES ($1, $2, $3)
      `,
        [food.name, food.unit_label, food.calories_per_unit],
      );
      inserted += 1;
    } catch (err) {
      // Si hay constraint de único, ignoramos duplicados
      if (err.code === "23505") continue;
      console.error(`No se pudo insertar ${food.name}:`, err.message);
    }
  }

  console.log(`Semilla de alimentos completada. Nuevos insertados: ${inserted}`);
}

seedFoods()
  .catch((err) => {
    console.error("Fallo la semilla de alimentos:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
