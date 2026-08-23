/**
 * Seed script: inserts example community posts + reactions + comments.
 * Run once with: pnpm --filter @workspace/api-server tsx ./scripts/seed-community.ts
 */
import {
  db,
  socialPostsTable,
  socialCommentsTable,
  socialReactionsTable,
  wodplaceUsersTable,
} from "@workspace/db";

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3_600_000);
}

// ── Fake member IDs (stable so reactions link correctly) ──────────────────────
const SEED_USERS = [
  { id: "seed-user-maria", name: "María González" },
  { id: "seed-user-carlos", name: "Carlos Rodríguez" },
  { id: "seed-user-valentina", name: "Valentina Morales" },
  { id: "seed-user-javier", name: "Javier Soto" },
  { id: "seed-user-andrea", name: "Andrea Pizarro" },
];

async function main() {
  console.log("🌱  Seeding community posts…");

  // ── Users (needed for FK) ─────────────────────────────────────────────────
  for (const u of SEED_USERS) {
    await db
      .insert(wodplaceUsersTable)
      .values({ id: u.id, name: u.name, email: `${u.id}@seed.wodplace` })
      .onConflictDoNothing();
  }
  console.log(`  ✓  ${SEED_USERS.length} usuarios insertados`);

  // ── Posts ─────────────────────────────────────────────────────────────────
  const posts: (typeof socialPostsTable.$inferInsert)[] = [
    {
      id: "seed-post-box-001",
      userId: null,
      authorName: "El Box",
      body:
        "¡Bienvenidos al espacio social del box! 🏋️‍♂️ Aquí pueden compartir sus PRs, fotos de entrenamientos y motivarse entre todos. Recuerden respetar a cada miembro de la comunidad. ¡A moverse!",
      imageUris: null,
      type: "announcement",
      createdAt: daysAgo(3),
    },
    {
      id: "seed-post-maria-pr",
      userId: SEED_USERS[0]!.id,
      authorName: SEED_USERS[0]!.name,
      body:
        "¡NUEVO PR! Hoy lo logré: 85 kg en back squat. Hace 8 meses no podía con 40 kg. Gracias a tod@s por el apoyo y al profe por no dejarme rendirme 🔥🔥🔥",
      imageUris: null,
      type: "post",
      createdAt: daysAgo(2),
    },
    {
      id: "seed-post-carlos-murph",
      userId: SEED_USERS[1]!.id,
      authorName: SEED_USERS[1]!.name,
      body:
        "Después de un año entrenando, hoy completé mi primer Murph sin escalar y con chaleco. 1 milla, 100 pull-ups, 200 push-ups, 300 squats, 1 milla. No voy a mentir: el techo estuvo un buen rato mirándome 😂 pero lo hice. ¡Gracias comunidad! 🎉",
      imageUris: null,
      type: "post",
      createdAt: daysAgo(1),
    },
    {
      id: "seed-post-valentina-wod",
      userId: SEED_USERS[2]!.id,
      authorName: SEED_USERS[2]!.name,
      body:
        "El WOD de hoy me dejó en el piso literalmente 😩 21-15-9 de thrusters y pull-ups y quedé mirando el techo 10 minutos. Pero lo terminé, que es lo importante. ¡Mañana volvemos más fuertes! 💪",
      imageUris: null,
      type: "post",
      createdAt: hoursAgo(18),
    },
    {
      id: "seed-post-javier-horario",
      userId: SEED_USERS[3]!.id,
      authorName: SEED_USERS[3]!.name,
      body:
        "¿Alguien más probó el nuevo horario de las 6:30 AM? El ambiente de madrugada es completamente otro nivel. Clase pequeña, mucha concentración, y llegar al trabajo ya entrenado es una bestia 🌅 Se los recomiendo",
      imageUris: null,
      type: "post",
      createdAt: hoursAgo(10),
    },
    {
      id: "seed-post-andrea-gracias",
      userId: SEED_USERS[4]!.id,
      authorName: SEED_USERS[4]!.name,
      body:
        "Quiero agradecer públicamente a toda la clase del martes. Llegué con el ánimo por el suelo y todos me recibieron con buena onda, me alentaron en cada round y al terminar me fui con una sonrisa enorme. Eso es comunidad ❤️",
      imageUris: null,
      type: "post",
      createdAt: hoursAgo(4),
    },
  ];

  for (const p of posts) {
    await db.insert(socialPostsTable).values(p).onConflictDoNothing();
  }
  console.log(`  ✓  ${posts.length} posts insertados`);

  // ── Reactions ─────────────────────────────────────────────────────────────
  const reactions: (typeof socialReactionsTable.$inferInsert)[] = [
    // Announcement
    { id: makeId("r"), postId: "seed-post-box-001",     userId: SEED_USERS[0]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-box-001",     userId: SEED_USERS[1]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-box-001",     userId: SEED_USERS[2]!.id, emoji: "❤️" },
    // María PR
    { id: makeId("r"), postId: "seed-post-maria-pr",    userId: SEED_USERS[1]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-maria-pr",    userId: SEED_USERS[2]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-maria-pr",    userId: SEED_USERS[3]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-maria-pr",    userId: SEED_USERS[4]!.id, emoji: "❤️" },
    // Carlos Murph
    { id: makeId("r"), postId: "seed-post-carlos-murph", userId: SEED_USERS[0]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-carlos-murph", userId: SEED_USERS[2]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-carlos-murph", userId: SEED_USERS[4]!.id, emoji: "❤️" },
    // Valentina
    { id: makeId("r"), postId: "seed-post-valentina-wod", userId: SEED_USERS[0]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-valentina-wod", userId: SEED_USERS[1]!.id, emoji: "❤️" },
    // Javier
    { id: makeId("r"), postId: "seed-post-javier-horario", userId: SEED_USERS[4]!.id, emoji: "❤️" },
    // Andrea
    { id: makeId("r"), postId: "seed-post-andrea-gracias", userId: SEED_USERS[0]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-andrea-gracias", userId: SEED_USERS[1]!.id, emoji: "❤️" },
    { id: makeId("r"), postId: "seed-post-andrea-gracias", userId: SEED_USERS[3]!.id, emoji: "❤️" },
  ];

  for (const r of reactions) {
    await db.insert(socialReactionsTable).values(r).onConflictDoNothing();
  }
  console.log(`  ✓  ${reactions.length} reacciones insertadas`);

  // ── Comments ──────────────────────────────────────────────────────────────
  function minAgo(m: number) {
    return new Date(Date.now() - m * 60_000);
  }

  const comments: (typeof socialCommentsTable.$inferInsert)[] = [
    // On María's PR
    { id: makeId("c"), postId: "seed-post-maria-pr", userId: SEED_USERS[1]!.id, authorName: SEED_USERS[1]!.name, body: "¡Increíble María! ¡Qué trabajo el que has hecho! 🏆", createdAt: daysAgo(2) },
    { id: makeId("c"), postId: "seed-post-maria-pr", userId: SEED_USERS[3]!.id, authorName: SEED_USERS[3]!.name, body: "85 kg es una bestia. ¡Felicitaciones! 💪", createdAt: hoursAgo(47) },
    { id: makeId("c"), postId: "seed-post-maria-pr", userId: SEED_USERS[4]!.id, authorName: SEED_USERS[4]!.name, body: "Eres una inspiración para todas 🔥", createdAt: hoursAgo(46) },
    // On Carlos Murph
    { id: makeId("c"), postId: "seed-post-carlos-murph", userId: SEED_USERS[0]!.id, authorName: SEED_USERS[0]!.name, body: "¡Eso Carlos! ¡Qué orgullo verte crecer! 🎉", createdAt: daysAgo(1) },
    { id: makeId("c"), postId: "seed-post-carlos-murph", userId: SEED_USERS[4]!.id, authorName: SEED_USERS[4]!.name, body: "El próximo que se sume al club Murph soy yo 😅", createdAt: hoursAgo(22) },
    // On Valentina
    { id: makeId("c"), postId: "seed-post-valentina-wod", userId: SEED_USERS[0]!.id, authorName: SEED_USERS[0]!.name, body: "¡El techo nos une a todos! jajaja 😂", createdAt: hoursAgo(17) },
    { id: makeId("c"), postId: "seed-post-valentina-wod", userId: SEED_USERS[3]!.id, authorName: SEED_USERS[3]!.name, body: "Froy + pull-ups = techo garantizado 😩", createdAt: hoursAgo(16) },
    // On Javier
    { id: makeId("c"), postId: "seed-post-javier-horario", userId: SEED_USERS[2]!.id, authorName: SEED_USERS[2]!.name, body: "¡Me apunto al 6:30! ¿Tienen cupo?", createdAt: hoursAgo(9) },
    // On Andrea
    { id: makeId("c"), postId: "seed-post-andrea-gracias", userId: SEED_USERS[2]!.id, authorName: SEED_USERS[2]!.name, body: "¡Así se hace! La comunidad es todo ❤️", createdAt: minAgo(180) },
    { id: makeId("c"), postId: "seed-post-andrea-gracias", userId: SEED_USERS[1]!.id, authorName: SEED_USERS[1]!.name, body: "¡El martes somos una familia!", createdAt: minAgo(120) },
  ];

  for (const c of comments) {
    await db.insert(socialCommentsTable).values(c).onConflictDoNothing();
  }
  console.log(`  ✓  ${comments.length} comentarios insertados`);

  console.log("✅  Seed completado.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Error:", err);
  process.exit(1);
});
