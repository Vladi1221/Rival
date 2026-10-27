import { getSupabaseError, isSupabaseConfigured, supabase } from "./supabase.js";

const STORAGE_KEY = "rival-demo-state-v1";
const POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const POST_IMAGE_MAX_SIZE = 10 * 1024 * 1024;

const challenges = [
  {
    id: "lectura",
    title: "30 minutos de lectura",
    category: "Estudio",
    duration: 7,
    difficulty: "Constante",
    description: "Desconectá un rato y dedicá media hora a un libro cada día.",
    rules: "Leé durante al menos 30 minutos por día. Al terminar la semana, el progreso queda pendiente de revisión; esta demo no admite envío de evidencias.",
    reward: 120,
    participants: 128,
    symbol: "▤",
  },
  {
    id: "movimiento",
    title: "Movete todos los días",
    category: "Fitness",
    duration: 7,
    difficulty: "Intermedio",
    description: "Sumá 20 minutos de movimiento consciente durante una semana.",
    rules: "Elegí una actividad que te haga bien y registrá un día por cada sesión. La revisión de evidencia no está conectada en esta demo.",
    reward: 150,
    participants: 246,
    symbol: "↗",
  },
  {
    id: "enfoque",
    title: "Una hora sin distracciones",
    category: "Productividad",
    duration: 5,
    difficulty: "Intermedio",
    description: "Reservá un bloque de foco real para lo que más importa.",
    rules: "Completá una hora sin notificaciones ni multitarea durante cinco días. El contador de esta demo solo guarda tu progreso local.",
    reward: 100,
    participants: 94,
    symbol: "◷",
  },
  {
    id: "codigo",
    title: "Construí algo pequeño",
    category: "Programación",
    duration: 7,
    difficulty: "Desafiante",
    description: "Dedicá un rato cada día a avanzar en un proyecto propio.",
    rules: "Hacé un avance concreto en tu proyecto cada día durante una semana. La recompensa requiere validación, todavía no disponible.",
    reward: 180,
    participants: 73,
    symbol: "</>",
  },
  {
    id: "crear",
    title: "Una idea al día",
    category: "Creatividad",
    duration: 5,
    difficulty: "Constante",
    description: "Capturá una idea creativa por día, sin juzgarla.",
    rules: "Anotá una idea nueva durante cinco días. Los datos se guardan únicamente en este navegador.",
    reward: 100,
    participants: 61,
    symbol: "✳",
  },
  {
    id: "pausa",
    title: "Cerrá el día con intención",
    category: "Desarrollo personal",
    duration: 7,
    difficulty: "Constante",
    description: "Tomate cinco minutos para reconocer lo que sí avanzó.",
    rules: "Al final del día, registrá una cosa que salió bien o que aprendiste. No hace falta compartirla.",
    reward: 120,
    participants: 108,
    symbol: "◎",
  },
];

const seedState = {
  joined: [
    { challengeId: "lectura", progress: 3, status: "active" },
    { challengeId: "movimiento", progress: 5, status: "active" },
  ],
};

const leaderboard = [
  { place: 1, initials: "MC", name: "Martina C.", level: 12, points: 2840, delta: "+2" },
  { place: 2, initials: "JT", name: "Julián T.", level: 11, points: 2610, delta: "—" },
  { place: 3, initials: "VL", name: "Valen", level: 8, points: 2340, delta: "+1", isYou: true },
  { place: 4, initials: "SR", name: "Sofi R.", level: 9, points: 2190, delta: "-2" },
  { place: 5, initials: "DP", name: "Damián P.", level: 8, points: 1980, delta: "+1" },
];

const stories = [
  { id: "valen", initials: "VL", name: "Tu historia", style: "story-you" },
  { id: "martina", initials: "MC", name: "martu.c", style: "story-red" },
  { id: "julian", initials: "JT", name: "julian.t", style: "story-orange" },
  { id: "sofi", initials: "SR", name: "sofi.r", style: "story-violet" },
  { id: "damian", initials: "DP", name: "dami.p", style: "story-green" },
];

const socialPosts = [
  {
    id: "martina",
    initials: "MC",
    name: "martu.c",
    detail: "Estudio · hace 2 h",
    challenge: "30 minutos de lectura",
    caption: "Una semana leyendo un poquito cada día. No parece mucho hasta que mirás todo lo que avanzaste.",
    likes: 24,
    comments: 3,
    art: "post-art-reading",
    artEyebrow: "UN DÍA A LA VEZ",
    artTitle: "7 días<br />para mí",
    artCaption: "RITUAL DE LECTURA",
  },
  {
    id: "julian",
    initials: "JT",
    name: "julian.t",
    detail: "Fitness · hace 5 h",
    challenge: "Movete todos los días",
    caption: "Hoy no tenía ganas. Fui igual, aunque fueran veinte minutos. Esa también cuenta. #constancia",
    likes: 18,
    comments: 2,
    art: "post-art-movement",
    artEyebrow: "SIN EXCUSAS",
    artTitle: "20'<br />cuentan",
    artCaption: "MOVIMIENTO · DÍA 05",
  },
  {
    id: "sofi",
    initials: "SR",
    name: "sofi.r",
    detail: "Programación · ayer",
    challenge: "Construí algo pequeño",
    caption: "Una función menos en mi lista. Un paso más cerca de terminarlo. ¿Qué estás construyendo esta semana?",
    likes: 31,
    comments: 5,
    art: "post-art-code",
    artEyebrow: "PROYECTO PERSONAL",
    artTitle: "build<br />in public",
    artCaption: "PROGRESO REAL, PASOS PEQUEÑOS",
  },
];

const likedPostIds = new Set();
const savedPostIds = new Set();
const followedProfileIds = new Set();
const followedUserIds = new Set();
const viewedStoryIds = new Set();

let state = isSupabaseConfigured ? { joined: [] } : loadState();
let currentView = "inicio";
let toastTimer;
let currentSession = null;
let currentProfile = null;
let profileXp = 0;
let profileBadges = [];
let backendChallenges = null;
let feedPosts = null;
let globalRanking = null;
const postLikeCounts = new Map();

const main = document.querySelector("#main-content");
const dialog = document.querySelector("#challenge-dialog");
const dialogContent = document.querySelector("#dialog-content");

function icon(name, className = "") {
  const paths = {
    heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />',
    comment: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 20l.9-4.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 7.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 9 8z" />',
    send: '<path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />',
    bookmark: '<path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-4-6 4Z" />',
    more: '<circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />',
    clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />',
    xp: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />',
  };
  return `<svg class="icon${className ? ` ${className}` : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] ?? ""}</svg>`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.joined)) {
      return {
        joined: saved.joined.filter((item) =>
          challenges.some((challenge) => challenge.id === item.challengeId)
          && Number.isInteger(item.progress)
          && ["active", "pending"].includes(item.status),
        ),
      };
    }
  } catch (error) {
    console.warn("No se pudo leer el progreso local de RIVAL.", error);
  }
  return structuredClone(seedState);
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("No se pudo guardar el progreso local de RIVAL.", error);
    showToast("No pudimos guardar los cambios en este navegador.");
  }
}

function getChallenge(id) {
  return (isSupabaseConfigured ? backendChallenges ?? [] : challenges)
    .find((challenge) => challenge.id === id);
}

function getParticipation(id) {
  return state.joined.find((item) => item.challengeId === id);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function demoNotice() {
  if (isSupabaseConfigured) {
    return `<div class="demo-notice backend-notice"><span class="notice-mark" aria-hidden="true">✓</span><span><strong>Conexión Supabase configurada.</strong> El contenido proviene de la base de datos. No publiques información sensible; la visibilidad depende de las políticas de tu proyecto.</span></div>`;
  }
  return `<div class="demo-notice"><span class="notice-mark" aria-hidden="true">i</span><span><strong>Estás explorando una demo.</strong> El contenido es de muestra; tu progreso se guarda solo en este navegador. Las cuentas, evidencias, recompensas y funciones sociales aún no están conectadas a un servidor.</span></div>`;
}

function mapChallenge(row, participantCount = 0) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    duration: row.duration_days,
    difficulty: row.difficulty,
    description: row.description,
    rules: row.rules,
    reward: row.xp_reward,
    requiresEvidence: row.requires_evidence,
    participants: participantCount,
    symbol: "R",
  };
}

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recientemente";
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
  if (hours < 1) return "hace menos de 1 h";
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

async function loadBackendData() {
  if (!supabase) return;
  likedPostIds.clear();
  savedPostIds.clear();
  followedUserIds.clear();
  postLikeCounts.clear();
  const challengeResult = await supabase
    .from("challenges")
    .select("id, title, category, duration_days, difficulty, description, rules, xp_reward, requires_evidence")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (challengeResult.error) throw challengeResult.error;

  const challengeIds = challengeResult.data.map((challenge) => challenge.id);
  const [participantsResult, postsResult] = await Promise.all([
    challengeIds.length
      ? supabase.rpc("get_challenge_participant_counts", { p_challenge_ids: challengeIds })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("posts")
      .select("id, author_id, challenge_id, caption, image_path, created_at, profiles!posts_author_id_fkey(username, display_name, avatar_path), challenges!posts_challenge_id_fkey(title)")
      .in("visibility", ["public", "followers"])
      .order("created_at", { ascending: false })
      .limit(30),
  ]);
  if (participantsResult.error) throw participantsResult.error;
  if (postsResult.error) throw postsResult.error;

  const participantCounts = new Map(
    (participantsResult.data ?? []).map((item) => [item.challenge_id, Number(item.participant_count)]),
  );
  backendChallenges = challengeResult.data.map((challenge) =>
    mapChallenge(challenge, participantCounts.get(challenge.id) ?? 0),
  );

  let realPosts = (postsResult.data ?? []).map((post) => ({
    id: post.id,
    isReal: true,
    authorId: post.author_id,
    challengeId: post.challenge_id,
    initials: (post.profiles?.display_name || post.profiles?.username || "R").slice(0, 2).toUpperCase(),
    name: post.profiles?.username ? `@${post.profiles.username}` : post.profiles?.display_name || "Atleta",
    detail: formatRelativeTime(post.created_at),
    challenge: post.challenges?.title ?? null,
    caption: post.caption,
    likes: 0,
    comments: 0,
    imagePath: post.image_path,
    imageUrl: null,
    avatarPath: post.profiles?.avatar_path ?? null,
  }));
  const postIds = realPosts.map((post) => post.id);
  if (postIds.length) {
    const [likesResult, commentsResult, interactionsResult] = await Promise.all([
      supabase.rpc("get_post_like_counts", { p_post_ids: postIds }),
      supabase.from("comments").select("post_id").in("post_id", postIds),
      currentSession
        ? supabase.rpc("get_my_post_interactions", { p_post_ids: postIds })
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (likesResult.error) throw likesResult.error;
    if (commentsResult.error) throw commentsResult.error;
    if (interactionsResult.error) throw interactionsResult.error;
    const likes = new Map((likesResult.data ?? []).map((item) => [item.post_id, Number(item.like_count)]));
    postLikeCounts.clear();
    for (const [postId, likeCount] of likes) postLikeCounts.set(postId, likeCount);
    const comments = new Map();
    for (const comment of commentsResult.data ?? []) {
      comments.set(comment.post_id, (comments.get(comment.post_id) ?? 0) + 1);
    }
    for (const interaction of interactionsResult.data ?? []) {
      if (interaction.liked) likedPostIds.add(interaction.post_id);
      if (interaction.saved) savedPostIds.add(interaction.post_id);
    }
    realPosts = await Promise.all(realPosts.map(async (post) => {
      post.likes = likes.get(post.id) ?? 0;
      post.comments = comments.get(post.id) ?? 0;
      if (post.imagePath) {
        const { data, error } = await supabase.storage
          .from("post-images")
          .createSignedUrl(post.imagePath, 3600);
        if (error) console.warn("No se pudo cargar una imagen del feed.", error);
        post.imageUrl = data?.signedUrl ?? null;
      }
      if (post.avatarPath) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(post.avatarPath);
        post.avatarUrl = data.publicUrl;
      }
      return post;
    }));
  }
  feedPosts = realPosts;

  const [participationResult, followsResult] = currentSession
    ? await Promise.all([
      supabase
        .from("challenge_participants")
        .select("challenge_id, progress_days, status")
        .eq("user_id", currentSession.user.id)
        .in("status", ["active", "pending_review"]),
      supabase.from("follows").select("following_id").eq("follower_id", currentSession.user.id),
    ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (participationResult.error) throw participationResult.error;
  if (followsResult.error) throw followsResult.error;
  for (const follow of followsResult.data ?? []) followedUserIds.add(follow.following_id);
  state.joined = (participationResult.data ?? []).map((item) => ({
    challengeId: item.challenge_id,
    progress: item.progress_days,
    status: item.status === "pending_review" ? "pending" : "active",
  }));

  if (currentSession) {
    const [profileResult, rankingResult, xpResult, badgesResult] = await Promise.all([
      supabase.from("profiles")
        .select("user_id, username, display_name, bio, avatar_path, created_at")
        .eq("user_id", currentSession.user.id)
        .maybeSingle(),
      supabase.rpc("get_global_ranking", { p_limit: 100, p_offset: 0 }),
      supabase.from("user_xp_events").select("amount").eq("user_id", currentSession.user.id),
      supabase.from("user_badges")
        .select("awarded_at, badges!user_badges_badge_id_fkey(code, name, description)")
        .eq("user_id", currentSession.user.id),
    ]);
    if (profileResult.error) throw profileResult.error;
    if (rankingResult.error) throw rankingResult.error;
    if (xpResult.error) throw xpResult.error;
    if (badgesResult.error) throw badgesResult.error;
    currentProfile = profileResult.data;
    profileXp = (xpResult.data ?? []).reduce((total, item) => total + item.amount, 0);
    profileBadges = (badgesResult.data ?? []).map((item) => item.badges).filter(Boolean);
    globalRanking = rankingResult.data.map((item) => ({
      place: Number(item.position),
      userId: item.user_id,
      initials: (item.display_name || item.username).slice(0, 2).toUpperCase(),
      name: item.display_name,
      level: Math.floor(Number(item.total_xp) / 300) + 1,
      points: Number(item.total_xp),
      delta: "—",
      isYou: item.user_id === currentSession.user.id,
    }));
  } else {
    currentProfile = null;
    profileXp = 0;
    profileBadges = [];
    globalRanking = null;
  }
}

async function refreshBackendView() {
  if (!supabase) return;
  try {
    await loadBackendData();
    render();
  } catch (error) {
    console.error("No se pudieron cargar los datos de Supabase.", error);
    showToast(`Error al cargar RIVAL: ${getSupabaseError(error)}`);
  }
}

function activeChallenges() {
  return state.joined
    .filter((item) => item.status === "active")
    .map((item) => ({ ...item, challenge: getChallenge(item.challengeId) }));
}

function todayLabel() {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date()).toLocaleUpperCase("es-AR");
}

function renderStreakDays() {
  const dayLabels = ["D", "L", "M", "X", "J", "V", "S"];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const isToday = index === 6;
    const isDone = index >= 3;
    const label = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(date);
    const stateLabel = isToday ? "hoy" : isDone ? "racha demo" : "sin actividad";
    return `<span class="streak-day${isDone ? " is-done" : ""}${isToday ? " is-today" : ""}" title="${label}: ${stateLabel}" aria-label="${label}: ${stateLabel}"><i></i>${dayLabels[date.getDay()]}</span>`;
  }).join("");
}

function header(eyebrow, title, subtitle, action = "") {
  return `<div class="heading-row page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}

function challengeCard(challenge) {
  const participation = getParticipation(challenge.id);
  const progress = participation?.status === "active"
    ? `<div class="challenge-progress"><div class="progress-track"><span style="width:${Math.min(100, Math.round(participation.progress / challenge.duration * 100))}%"></span></div><span>${participation.progress}/${challenge.duration} DÍAS</span></div>`
    : "";
  let action = `<button class="button button-small button-primary" data-action="open-challenge" data-id="${challenge.id}">Ver desafío <span aria-hidden="true">↗</span></button>`;
  if (participation?.status === "active") {
    action = `<button class="button button-small" data-action="open-challenge" data-id="${challenge.id}">En curso · ${participation.progress}/${challenge.duration}</button>`;
  }
  if (participation?.status === "pending") {
    action = `<button class="button button-small" data-action="open-challenge" data-id="${challenge.id}">Revisión pendiente</button>`;
  }
  return `<article class="panel challenge-card">
    <div class="challenge-card-top"><span class="category-tag">${escapeHtml(challenge.category)}</span><span class="difficulty-tag">${escapeHtml(challenge.difficulty)}</span></div>
    <h3>${escapeHtml(challenge.title)}</h3><p>${escapeHtml(challenge.description)}</p>${progress}
    <div class="challenge-meta"><span>${icon("clock")} ${challenge.duration} días</span><span>${icon("xp")} ${challenge.reward} XP${isSupabaseConfigured ? "" : "*"}</span></div>
    <div class="challenge-card-bottom"><span class="participant-count">${isSupabaseConfigured ? `${challenge.participants} participantes` : `${challenge.participants} en demo`}</span>${action}</div>
  </article>`;
}

function renderDashboard() {
  return renderSocialFeed(true);
}

function renderChallenges() {
  const catalog = isSupabaseConfigured ? backendChallenges ?? [] : challenges;
  return `${demoNotice()}${header(isSupabaseConfigured ? "CATÁLOGO · SUPABASE" : "CATÁLOGO", "Elegí tu próximo reto.", isSupabaseConfigured ? "Desafíos disponibles desde tu proyecto." : "Desafíos de muestra para poner a prueba tu constancia.", `<div class="heading-actions"><span class="demo-pill"><span></span> ${state.joined.length} INICIADOS</span></div>`)}
    <div class="filters"><label class="search-box"><span aria-hidden="true">⌕</span><input id="challenge-search" type="search" placeholder="Buscar desafíos..." autocomplete="off" /></label>
      <select class="filter-select" id="category-filter" aria-label="Filtrar por categoría"><option value="">Todas las categorías</option>${[...new Set(catalog.map((challenge) => challenge.category))].map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}</select>
      <select class="filter-select" id="duration-filter" aria-label="Filtrar por duración"><option value="">Cualquier duración</option><option value="5">5 días</option><option value="7">7 días</option></select>
    </div><p class="rank-note" id="challenge-count"></p><section class="challenge-grid" id="challenge-grid"></section>`;
}

function renderRanking() {
  const people = isSupabaseConfigured ? globalRanking ?? [] : leaderboard;
  const rows = people.length
    ? people.map((person) => `<div class="rank-row${person.place <= 3 ? " is-podium" : ""}${person.place === 1 ? " is-first" : ""}${person.isYou ? " is-you" : ""}"><span class="rank-position">${String(person.place).padStart(2, "0")}</span><div class="rank-profile"><span class="avatar">${escapeHtml(person.initials)}</span><span>${escapeHtml(person.name)}${person.isYou ? " · vos" : ""}</span></div><span>Nivel ${String(person.level).padStart(2, "0")}</span><span class="rank-points">${person.points.toLocaleString("es-AR")} XP${isSupabaseConfigured ? "" : "*"}</span><span class="rank-change">${person.delta}</span></div>`).join("")
    : `<div class="empty-state">Todavía no hay experiencia registrada para armar el ranking.</div>`;
  return `${demoNotice()}${header("CLASIFICACIÓN", "Avanzar también inspira.", isSupabaseConfigured ? "Clasificación calculada con recompensas validadas." : "Una vista de muestra del ranking general.", `<div class="heading-actions">${isSupabaseConfigured ? "" : '<select class="filter-select" aria-label="Período"><option>Esta semana</option><option>Este mes</option><option>Histórico</option></select>'}</div>`)}
    <div class="filters"><select class="filter-select" aria-label="Tipo de ranking"><option>${isSupabaseConfigured ? "Global" : "Comunidad demo"}</option>${isSupabaseConfigured ? "" : "<option>Amigos · próximamente</option>"}</select><select class="filter-select" aria-label="Categoría de ranking"><option>Todas las categorías</option>${[...new Set((backendChallenges ?? challenges).map((challenge) => challenge.category))].map((category) => `<option>${escapeHtml(category)}</option>`).join("")}</select></div>
    <section class="panel rank-list"><div class="rank-header"><span>POS.</span><span>PERSONA</span><span>NIVEL</span><span>PUNTOS</span><span>CAMBIO</span></div>${rows}</section>${isSupabaseConfigured ? "" : '<p class="rank-note">* Clasificación ilustrativa, sin usuarios reales ni conexión a un servicio.</p>'}`;
}

function renderCommunity() {
  return renderSocialFeed(false);
}

function renderStory(story) {
  const viewed = viewedStoryIds.has(story.id);
  const self = story.id === "valen";
  return `<button class="story-item${viewed ? " is-viewed" : ""}" data-action="view-story" data-id="${story.id}" aria-label="${self ? "Agregar historia de muestra" : `Ver historia de ${story.name}`}">
    <span class="story-ring ${story.style}"><span class="story-avatar">${story.initials}</span>${self ? '<span class="story-add">+</span>' : ""}</span>
    <span class="story-name">${escapeHtml(story.name)}</span>
  </button>`;
}

function renderPostComposer() {
  if (!isSupabaseConfigured) return "";
  if (!currentSession) {
    return `<section class="panel post-composer"><p class="eyebrow">COMPARTÍ TU PROGRESO</p><p>Iniciá sesión para publicar un avance en la comunidad.</p><button class="button button-primary" data-action="open-auth">Conectar cuenta</button></section>`;
  }
  const challengeOptions = (backendChallenges ?? [])
    .map((challenge) => `<option value="${challenge.id}">${escapeHtml(challenge.title)}</option>`)
    .join("");
  return `<section class="panel post-composer" aria-labelledby="post-composer-title">
    <div class="composer-heading"><span class="avatar">${escapeHtml(currentProfile?.display_name.slice(0, 2).toUpperCase() ?? "R")}</span><div><p class="eyebrow">COMUNIDAD · RIVAL</p><h2 id="post-composer-title">¿Qué avance querés compartir?</h2></div></div>
    <form class="auth-form composer-form" data-form="post">
      <label>Tu publicación<textarea name="caption" maxlength="2200" rows="3" placeholder="Un paso a la vez también es progreso."></textarea></label>
      <label>Imagen (opcional)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" /><small>JPG, PNG o WebP · máximo 10 MB. La publicación será pública.</small></label>
      ${challengeOptions ? `<label>Desafío relacionado (opcional)<select name="challenge_id" class="filter-select"><option value="">Sin desafío</option>${challengeOptions}</select></label>` : ""}
      <button class="button button-primary auth-submit" type="submit">Publicar avance</button>
      <p class="auth-feedback" aria-live="polite"></p>
    </form>
  </section>`;
}

function renderPost(post) {
  const liked = likedPostIds.has(post.id);
  const likes = (postLikeCounts.get(post.id) ?? post.likes) + (liked && !post.isReal ? 1 : 0);
  const linkedChallenge = (backendChallenges ?? challenges).find((challenge) =>
    post.challengeId ? challenge.id === post.challengeId : challenge.title === post.challenge,
  );
  const postVisual = post.isReal
    ? post.imageUrl
      ? `<img class="post-photo" src="${escapeHtml(post.imageUrl)}" alt="Evidencia compartida por ${escapeHtml(post.name)}" loading="lazy" />`
      : `<div class="post-photo-empty"><span>${icon("xp")}</span><strong>AVANCE COMPARTIDO</strong><small>Esta publicación no tiene imagen.</small></div>`
    : `<div class="post-art ${post.art}" role="img" aria-label="Ilustración de muestra: ${escapeHtml(post.challenge)}">
      <span class="art-corner-mark">R<span>.</span></span>
      <span class="art-eyebrow">${escapeHtml(post.artEyebrow)}</span>
      <strong>${post.artTitle}</strong>
      <span class="art-caption">${escapeHtml(post.artCaption)}</span>
      <span class="art-orbit art-orbit-one"></span><span class="art-orbit art-orbit-two"></span>
    </div>`;
  const avatar = post.avatarUrl
    ? `<img class="post-avatar-image" src="${escapeHtml(post.avatarUrl)}" alt="" />`
    : post.initials;
  const followButton = isSupabaseConfigured && currentSession && post.authorId !== currentSession.user.id
    ? `<button class="follow-button post-follow${followedUserIds.has(post.authorId) ? " is-following" : ""}" data-action="toggle-follow" data-id="${post.authorId}" aria-pressed="${followedUserIds.has(post.authorId)}">${followedUserIds.has(post.authorId) ? "Siguiendo" : "Seguir"}</button>`
    : "";
  return `<article class="social-post${post.id === "martina" ? " social-post-featured" : ""}">
    <header class="post-header">
      <span class="post-avatar avatar-${escapeHtml(post.id)}">${avatar}</span>
      <div class="post-author"><strong>${escapeHtml(post.name)}${post.isReal ? "" : ' <span class="verified-mark" aria-label="Perfil de muestra">✓</span>'}</strong><span>${escapeHtml(post.detail)}${post.isReal ? "" : " · demo"}</span></div>
      ${followButton}
      <button class="post-more" data-action="post-options" aria-label="Más opciones">${icon("more")}</button>
    </header>
    ${postVisual}
    <div class="post-actions">
      <div class="post-action-group">
        <button class="post-action like-action${liked ? " is-liked" : ""}" data-action="toggle-like" data-id="${post.id}" aria-pressed="${liked}" aria-label="${liked ? "Quitar me gusta" : "Me gusta"}">${icon("heart")}</button>
        <button class="post-action" data-action="show-comments" data-id="${post.id}" aria-label="Ver comentarios">${icon("comment")}</button>
        <button class="post-action" data-action="share-post" aria-label="Compartir publicación">${icon("send")}</button>
      </div>
      ${linkedChallenge ? `<button class="post-challenge-link" data-action="open-challenge" data-id="${linkedChallenge.id}">Ver reto</button>` : ""}
      <button class="post-save${savedPostIds.has(post.id) ? " is-saved" : ""}" data-action="save-post" data-id="${post.id}" aria-pressed="${savedPostIds.has(post.id)}" aria-label="${savedPostIds.has(post.id) ? "Quitar de guardados" : "Guardar publicación"}">${icon("bookmark")}</button>
    </div>
    <div class="post-body"><strong class="post-likes">${likes} me gusta${post.isReal ? "" : " · demo"}</strong>
      ${post.caption ? `<p><strong>${escapeHtml(post.name)}</strong> ${escapeHtml(post.caption)}</p>` : ""}
      <button class="post-comments" data-action="show-comments" data-id="${post.id}">${post.isReal ? `Ver ${post.comments} comentarios` : `Ver los ${post.comments} comentarios de muestra`}</button>
      ${post.isReal ? (post.challenge ? `<div class="post-real-challenge"><span>DESAFÍO</span><strong>${escapeHtml(post.challenge)}</strong></div>` : "") : '<span class="post-demo-label">PUBLICACIÓN ILUSTRATIVA · NO ES CONTENIDO DE USUARIOS REALES</span>'}
    </div>
  </article>`;
}

function renderSocialFeed(isHome) {
  const active = activeChallenges();
  const totalProgress = active.reduce((sum, item) => sum + item.progress, 0);
  const followed = followedProfileIds;
  const suggestions = (globalRanking ?? leaderboard).filter((person) => !person.isYou).slice(0, 3);
  const posts = isSupabaseConfigured ? feedPosts ?? [] : feedPosts ?? socialPosts;
  const feedItems = posts.length
    ? posts.map(renderPost).join("")
    : `<div class="social-empty"><span class="empty-rule"></span><h2>El feed empieza con vos.</h2><p>Todavía no hay publicaciones visibles. Cuando alguien comparta un avance público, aparecerá acá.</p></div>`;
  const storyItems = isSupabaseConfigured ? "" : `<section class="stories-panel" aria-label="Historias de muestra"><div class="stories-heading"><h2>Historias</h2><span>DEMO · 24 H</span></div><div class="stories-track">${stories.map(renderStory).join("")}</div></section>`;
  const railAccount = currentProfile
    ? `<div class="rail-profile"><span class="rail-user-avatar">${escapeHtml(currentProfile.display_name.slice(0, 2).toUpperCase())}</span><div><strong>${escapeHtml(currentProfile.username)}</strong><span>${escapeHtml(currentProfile.display_name)}</span></div><span class="rail-demo-dot"></span></div>`
    : isSupabaseConfigured
      ? `<div class="rail-profile"><span class="rail-user-avatar">R</span><div><strong>Tu cuenta</strong><span>Iniciá sesión para continuar</span></div><button class="text-link" data-action="open-auth">Entrar →</button></div>`
      : `<div class="rail-profile"><span class="rail-user-avatar">VL</span><div><strong>valen</strong><span>Perfil de muestra · demo</span></div><span class="rail-demo-dot"></span></div>`;
  const realRail = isSupabaseConfigured
    ? `<div class="rail-section-head"><strong>Tu actividad</strong><span>EN VIVO</span></div>
      <section class="panel rail-progress"><div class="rail-xp"><span>Desafíos activos</span><strong>${active.length}</strong></div><div class="rail-xp"><span>Avance validado</span><strong>${totalProgress} días</strong></div>${currentProfile ? '<button class="text-link" data-view="perfil">Ver mi perfil →</button>' : '<button class="text-link" data-action="open-auth">Iniciar sesión →</button>'}</section>
      <div class="rail-section-head suggestions-heading"><strong>Ranking de la comunidad</strong><button class="text-link" data-view="ranking">Ver ranking</button></div>
      <section class="suggestion-list">${suggestions.map((person) => `<div class="suggestion-row"><span class="suggestion-avatar">${escapeHtml(person.initials)}</span><div class="suggestion-copy"><strong>${escapeHtml(person.name)}</strong><span>Nivel ${person.level}</span></div>${currentSession && person.userId ? `<button class="follow-button${followedUserIds.has(person.userId) ? " is-following" : ""}" data-action="toggle-follow" data-id="${person.userId}" aria-pressed="${followedUserIds.has(person.userId)}">${followedUserIds.has(person.userId) ? "Siguiendo" : "Seguir"}</button>` : ""}</div>`).join("") || '<p class="rail-disclaimer">El ranking se mostrará cuando haya actividad.</p>'}</section>
      <p class="rail-disclaimer">Datos obtenidos de Supabase con acceso controlado por RLS.</p>`
    : `<div class="rail-section-head"><strong>Tu semana</strong><span>DEMO</span></div>
      <section class="panel rail-progress">
        <div class="rail-progress-heading"><span class="rail-progress-icon">↗</span><div><strong>Racha de 4 días</strong><span>La constancia suma.</span></div></div>
        <div class="rail-week">${renderStreakDays()}</div>
        <div class="rail-xp"><span>Desafíos activos</span><strong>${active.length}</strong></div>
        <div class="rail-xp"><span>Avance registrado</span><strong>${totalProgress} días</strong></div>
        <button class="text-link" data-view="perfil">Ver mi perfil →</button>
      </section>
      <div class="rail-section-head suggestions-heading"><strong>Personas para descubrir</strong><button class="text-link" data-view="ranking">Ver ranking</button></div>
      <section class="suggestion-list">${suggestions.map((person) => `<div class="suggestion-row"><span class="suggestion-avatar">${person.initials}</span><div class="suggestion-copy"><strong>${escapeHtml(person.name)}</strong><span>Nivel ${person.level} · demo</span></div><button class="follow-button${followed.has(person.initials) ? " is-following" : ""}" data-action="toggle-follow" data-id="${person.initials}" aria-pressed="${followed.has(person.initials)}">${followed.has(person.initials) ? "Siguiendo" : "Seguir"}</button></div>`).join("")}</section>
      <section class="rail-challenge"><span class="card-label">UN RETO PARA VOS</span><strong>Una hora sin distracciones</strong><p>Hacé espacio para lo que importa.</p><button class="text-link" data-action="open-challenge" data-id="enfoque">Descubrir desafío →</button></section>
      <p class="rail-disclaimer">Feed y perfiles ilustrativos. Las interacciones son locales y temporales; no se publican ni sincronizan.</p>`;
  return `${demoNotice()}
    <div class="social-layout">
      <section class="social-main">
        <div class="social-heading"><div><p class="eyebrow">${isHome ? todayLabel() : "RIVAL · COMUNIDAD"}</p><h1>${isHome ? "Tu espacio." : "Comunidad."}</h1></div><button class="button button-primary" data-view="desafios">Encontrá tu próximo reto <span aria-hidden="true">↗</span></button></div>
        ${renderPostComposer()}
        ${storyItems}
        <div class="feed-heading"><h2>Para inspirarte</h2><span>${isSupabaseConfigured ? "PUBLICACIONES PÚBLICAS" : "PUBLICACIONES DE MUESTRA"}</span></div>
        <div class="social-feed">${feedItems}</div>
        ${posts.length ? '<div class="feed-end">ESTÁS AL DÍA <span>—</span> VOLVÉ A TUS DESAFÍOS CUANDO QUIERAS</div>' : ""}
      </section>
      <aside class="social-rail">
        ${railAccount}
        ${realRail}
      </aside>
    </div>`;
}

function renderProfile() {
  if (isSupabaseConfigured && !currentSession) {
    return `${demoNotice()}${header("PERFIL", "Tu progreso empieza acá.", "Iniciá sesión o creá una cuenta para abrir tu perfil.")}
      <section class="panel profile-card"><p class="profile-bio">Tus datos, progreso y desafíos se guardarán en tu proyecto de Supabase.</p><button class="button button-primary" data-action="open-auth">Conectar cuenta →</button></section>`;
  }
  if (isSupabaseConfigured) {
    const earned = profileBadges.length
      ? profileBadges.map((badge, index) => `<span><i>${String(index + 1).padStart(2, "0")}</i>${escapeHtml(badge.name)}</span>`).join("")
      : `<span class="achievement-empty">Todavía no hay insignias obtenidas.</span>`;
    const xpToNext = 3000 - profileXp % 3000;
    const progressToNext = Math.round((profileXp % 3000) / 30);
    return `${demoNotice()}${header("ATLETA · PERFIL", "El trabajo habla.", "Tu recorrido y logros validados.")}
      <div class="profile-grid"><section class="panel profile-card"><div class="profile-banner"><span>RIVAL<br /><strong>NO DAYS<br />GIVEN</strong></span><i></i></div><div class="profile-identity"><span class="avatar">${escapeHtml(currentProfile?.display_name.slice(0, 2).toUpperCase() ?? "R")}</span><div><h2>${escapeHtml(currentProfile?.display_name ?? "Atleta")}</h2><p>@${escapeHtml(currentProfile?.username ?? "")}</p></div><span class="level-badge"><small>NIVEL</small><strong>${String(Math.floor(profileXp / 3000) + 1).padStart(2, "0")}</strong></span></div><p class="profile-bio">${escapeHtml(currentProfile?.bio || "Construí tu perfil y compartí tu progreso.")}</p><div class="profile-stats"><div class="profile-stat"><strong>${state.joined.length}</strong><span>RETOS ACTIVOS</span></div><div class="profile-stat"><strong>${profileXp.toLocaleString("es-AR")}</strong><span>XP VALIDADO</span></div><div class="profile-stat"><strong>${profileBadges.length}</strong><span>INSIGNIAS</span></div></div><div class="profile-achievements"><span class="card-label">DISTINCIONES</span><div class="achievement-list">${earned}</div></div></section>
      <section class="panel level-card"><span class="card-label">PROGRESIÓN</span><h3>Ganate el próximo nivel.</h3><p>El XP solo se acredita luego de completar un desafío o recibir una insignia validada.</p><div class="level-progress"><div class="progress-track"><span style="width:${progressToNext}%"></span></div></div><div class="level-foot"><span>${profileXp.toLocaleString("es-AR")} XP</span><span>${xpToNext.toLocaleString("es-AR")} XP para el siguiente nivel</span></div><div class="level-next"><span class="level-next-mark">${String(Math.floor(profileXp / 3000) + 2).padStart(2, "0")}</span><div><strong>El siguiente escalón</strong><span>Progreso según recompensas validadas</span></div></div></section></div>`;
  }
  const completed = state.joined.filter((item) => item.status === "pending").length;
  return `${demoNotice()}${header("ATLETA · PERFIL PERSONAL", "El trabajo habla.", "Tu recorrido de muestra, listo para seguir creciendo.")}
    <div class="profile-grid"><section class="panel profile-card"><div class="profile-banner"><span>RIVAL<br /><strong>NO DAYS<br />GIVEN</strong></span><i></i></div><div class="profile-identity"><span class="avatar">VL</span><div><h2>Valen</h2><p>@valen · Perfil de demostración</p></div><span class="level-badge"><small>NIVEL</small><strong>08</strong></span></div><p class="profile-bio">Construyendo constancia, un desafío a la vez. Este perfil solo existe en esta vista de muestra.</p><div class="profile-stats"><div class="profile-stat"><strong>${state.joined.length}</strong><span>RETOS INICIADOS</span></div><div class="profile-stat"><strong>${completed}</strong><span>POR REVISAR</span></div><div class="profile-stat"><strong>04</strong><span>RACHA DEMO</span></div></div><div class="profile-achievements"><span class="card-label">DISTINCIONES · DEMO</span><div class="achievement-list"><span><i>01</i> Primer paso</span><span><i>04</i> Constancia</span><span><i>08</i> En ascenso</span></div></div></section>
      <section class="panel level-card"><span class="card-label">PROGRESIÓN DE MUESTRA</span><h3>Ganate el próximo nivel.</h3><p>La experiencia y las insignias son ilustrativas. Las recompensas no se acreditan desde esta demo.</p><div class="level-progress"><div class="progress-track"><span style="width:68%"></span></div></div><div class="level-foot"><span>2.340 XP</span><span>3.000 XP · demo</span></div><div class="level-next"><span class="level-next-mark">09</span><div><strong>El siguiente escalón</strong><span>660 XP para avanzar · dato de muestra</span></div></div></section></div>`;
}

function showAuth(mode = "login") {
  if (!supabase) {
    dialogContent.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="eyebrow">SUPABASE · CONFIGURACIÓN</span><button class="icon-button" data-action="close-dialog" aria-label="Cerrar">×</button></div><h2 id="dialog-title">Conectá tu proyecto.</h2><p class="dialog-description">La autenticación está preparada, pero faltan las credenciales públicas de Supabase.</p><ol class="setup-steps"><li>Creá un proyecto en Supabase.</li><li>Copiá su URL y la clave publishable.</li><li>Completá un archivo <code>.env</code> basándote en <code>.env.example</code>.</li><li>Aplicá la migración y reiniciá el servidor.</li></ol><div class="dialog-actions"><button class="button button-primary" data-action="close-dialog">Entendido</button></div></div>`;
    if (!dialog.open) dialog.showModal();
    return;
  }
  if (mode === "update-password") {
    dialogContent.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="eyebrow">SEGURIDAD</span><button class="icon-button" data-action="close-dialog" aria-label="Cerrar">×</button></div><h2 id="dialog-title">Elegí una nueva contraseña.</h2><form class="auth-form" data-form="update-password"><label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="8" required /></label><p class="auth-form-note">Usá al menos ocho caracteres.</p><button class="button button-primary auth-submit" type="submit">Actualizar contraseña</button><p class="auth-feedback" aria-live="polite"></p></form></div>`;
    if (!dialog.open) dialog.showModal();
    return;
  }
  const isRegister = mode === "register";
  const isRecovery = mode === "recovery";
  const fields = `${isRegister ? '<label>Nombre visible<input name="display_name" type="text" maxlength="60" autocomplete="name" required /></label><label>Nombre de usuario<input name="username" type="text" minlength="3" maxlength="30" pattern="[A-Za-z0-9_]{3,30}" autocomplete="username" required /><small>3–30 caracteres: letras, números o guion bajo.</small></label>' : ""}<label>Correo electrónico<input name="email" type="email" autocomplete="email" required /></label>${isRecovery ? "" : '<label>Contraseña<input name="password" type="password" minlength="8" autocomplete="current-password" required /></label>'}`;
  const title = isRegister ? "Empezá tu camino." : isRecovery ? "Recuperá el acceso." : "Volvé al juego.";
  const alternate = isRecovery
    ? '<button class="text-link" type="button" data-action="auth-mode" data-mode="login">Volver a iniciar sesión</button>'
    : isRegister
      ? '<span>¿Ya tenés cuenta?</span><button class="text-link" type="button" data-action="auth-mode" data-mode="login">Iniciar sesión</button>'
      : '<span>¿Todavía no tenés cuenta?</span><button class="text-link" type="button" data-action="auth-mode" data-mode="register">Crear cuenta</button>';
  dialogContent.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="brand auth-brand"><span class="brand-mark" aria-hidden="true">R</span><span>RIVAL<span class="brand-period">.</span></span></span><button class="icon-button" data-action="close-dialog" aria-label="Cerrar">×</button></div><p class="eyebrow">CUENTA RIVAL</p><h2 id="dialog-title">${title}</h2><p class="dialog-description">${isRegister ? "Una cuenta para guardar tu progreso." : isRecovery ? "Te enviamos un enlace seguro a tu correo." : "Entrá para continuar tu progreso."}</p><form class="auth-form" data-form="auth" data-mode="${mode}">${fields}<button class="button button-primary auth-submit" type="submit">${isRegister ? "Crear cuenta" : isRecovery ? "Enviar enlace" : "Iniciar sesión"}</button><p class="auth-feedback" aria-live="polite"></p></form><div class="auth-alternate">${alternate}</div>${!isRegister && !isRecovery ? '<button class="text-link auth-recovery" type="button" data-action="auth-mode" data-mode="recovery">¿Olvidaste tu contraseña?</button>' : ""}<p class="auth-privacy">Autenticación segura gestionada por Supabase.</p></div>`;
  if (!dialog.open) dialog.showModal();
}

async function submitAuthForm(form) {
  if (!supabase) return;
  const button = form.querySelector('[type="submit"]');
  const feedback = form.querySelector(".auth-feedback");
  const values = new FormData(form);
  const mode = form.dataset.mode;
  button.disabled = true;
  feedback.textContent = "Procesando…";
  feedback.classList.remove("is-error");
  try {
    if (form.dataset.form === "update-password") {
      const { error } = await supabase.auth.updateUser({ password: values.get("password") });
      if (error) throw error;
      dialog.close();
      showToast("Contraseña actualizada.");
      return;
    }
    const email = String(values.get("email")).trim();
    if (mode === "register") {
      const username = String(values.get("username")).trim().toLowerCase();
      if (!/^[a-z0-9_]{3,30}$/.test(username)) throw new Error("El nombre de usuario debe tener entre 3 y 30 caracteres válidos.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password: String(values.get("password")),
        options: { data: { username, display_name: String(values.get("display_name")).trim() } },
      });
      if (error) throw error;
      feedback.textContent = data.session
        ? "Cuenta creada. Tu perfil está listo."
        : "Cuenta creada. Revisá tu correo para confirmar el registro.";
      if (data.session) {
        currentSession = data.session;
        dialog.close();
      }
      return;
    }
    if (mode === "recovery") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
      feedback.textContent = "Si el correo está registrado, recibirás un enlace para restablecer la contraseña.";
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: String(values.get("password")),
    });
    if (error) throw error;
    currentSession = data.session;
    dialog.close();
    showToast("Sesión iniciada.");
  } catch (error) {
    console.error("Falló una operación de autenticación.", error);
    feedback.textContent = getSupabaseError(error);
    feedback.classList.add("is-error");
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

async function submitEvidenceForm(form) {
  if (!supabase || !currentSession) {
    showAuth();
    return;
  }
  const file = form.querySelector('input[type="file"]').files?.[0];
  const caption = String(new FormData(form).get("caption") ?? "").trim();
  const feedback = form.querySelector(".auth-feedback");
  const button = form.querySelector('[type="submit"]');
  if (!file) {
    feedback.textContent = "Elegí un archivo antes de enviar.";
    feedback.classList.add("is-error");
    return;
  }
  if (!["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"].includes(file.type) || file.size > 20 * 1024 * 1024) {
    feedback.textContent = "Usá JPG, PNG, WebP, MP4 o PDF de hasta 20 MB.";
    feedback.classList.add("is-error");
    return;
  }
  button.disabled = true;
  feedback.textContent = "Subiendo evidencia…";
  feedback.classList.remove("is-error");
  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
  const path = `${currentSession.user.id}/${crypto.randomUUID()}-${safeName}`;
  let uploaded = false;
  try {
    const { error: uploadError } = await supabase.storage.from("challenge-evidence")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    uploaded = true;
    const { error } = await supabase.rpc("submit_challenge_evidence", {
      p_challenge_id: form.dataset.challengeId,
      p_file_path: path,
      p_caption: caption,
    });
    if (error) throw error;
    dialog.close();
    await refreshBackendView();
    showToast("Evidencia enviada. El progreso se actualizará cuando la revisen.");
  } catch (error) {
    console.error("No se pudo enviar la evidencia.", error);
    const hasResponseCode = typeof error === "object" && error !== null && "code" in error;
    if (uploaded && hasResponseCode) {
      const { error: cleanupError } = await supabase.storage.from("challenge-evidence").remove([path]);
      if (cleanupError) console.error("No se pudo limpiar el archivo que quedó sin entrega.", cleanupError);
    }
    feedback.textContent = uploaded && !hasResponseCode
      ? `No pudimos confirmar la entrega. Revisá el estado del desafío antes de volver a enviarla. ${getSupabaseError(error)}`
      : getSupabaseError(error);
    feedback.classList.add("is-error");
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

async function submitPostForm(form) {
  if (!supabase || !currentSession) {
    showAuth();
    return;
  }
  const values = new FormData(form);
  const caption = String(values.get("caption") ?? "").trim();
  const image = form.querySelector('input[name="image"]').files?.[0] ?? null;
  const challengeId = String(values.get("challenge_id") ?? "");
  const feedback = form.querySelector(".auth-feedback");
  const button = form.querySelector('[type="submit"]');
  if (!caption && !image) {
    feedback.textContent = "Escribí una publicación o elegí una imagen.";
    feedback.classList.add("is-error");
    return;
  }
  if (caption.length > 2200) {
    feedback.textContent = "La publicación no puede superar los 2200 caracteres.";
    feedback.classList.add("is-error");
    return;
  }
  if (image && (!POST_IMAGE_TYPES.includes(image.type) || image.size > POST_IMAGE_MAX_SIZE)) {
    feedback.textContent = "Usá una imagen JPG, PNG o WebP de hasta 10 MB.";
    feedback.classList.add("is-error");
    return;
  }
  button.disabled = true;
  feedback.textContent = image ? "Subiendo imagen y publicando…" : "Publicando…";
  feedback.classList.remove("is-error");
  let imagePath = null;
  let uploaded = false;
  let insertStarted = false;
  try {
    if (image) {
      const safeName = image.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100);
      imagePath = `${currentSession.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("post-images")
        .upload(imagePath, image, { contentType: image.type, upsert: false });
      if (error) throw error;
      uploaded = true;
    }
    insertStarted = true;
    const { error } = await supabase.from("posts").insert({
      author_id: currentSession.user.id,
      caption,
      image_path: imagePath,
      challenge_id: challengeId || null,
      visibility: "public",
    });
    if (error) throw error;
    showToast("Publicación compartida con la comunidad.");
    await refreshBackendView();
  } catch (error) {
    console.error("No se pudo crear la publicación.", error);
    const hasResponseCode = typeof error === "object" && error !== null && "code" in error;
    if (uploaded && hasResponseCode && imagePath) {
      try {
        const { error: cleanupError } = await supabase.storage.from("post-images").remove([imagePath]);
        if (cleanupError) console.error("No se pudo limpiar la imagen sin publicación.", cleanupError);
      } catch (cleanupError) {
        console.error("No se pudo limpiar la imagen sin publicación.", cleanupError);
      }
    }
    feedback.textContent = uploaded && insertStarted && !hasResponseCode
      ? `No pudimos confirmar la publicación. Revisá el feed antes de volver a intentarlo. ${getSupabaseError(error)}`
      : getSupabaseError(error);
    feedback.classList.add("is-error");
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

async function showComments(postId) {
  if (!supabase) {
    showToast("Los comentarios de la demo son ilustrativos y no se guardan.");
    return;
  }
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, profiles!comments_author_id_fkey(username, display_name)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.error("No se pudieron cargar los comentarios.", error);
    showToast(`No se pudieron cargar los comentarios: ${getSupabaseError(error)}`);
    return;
  }
  const rows = data.length
    ? data.map((comment) => `<article class="comment-item"><strong>${escapeHtml(comment.profiles?.username ?? comment.profiles?.display_name ?? "Atleta")}</strong><p>${escapeHtml(comment.body)}</p><time>${escapeHtml(formatRelativeTime(comment.created_at))}</time></article>`).join("")
    : '<p class="comments-empty">Todavía no hay comentarios. Abrí la conversación.</p>';
  const form = currentSession
    ? `<form class="auth-form comment-form" data-form="comment" data-post-id="${postId}"><label>Dejá tu comentario<textarea name="body" maxlength="1000" rows="3" required></textarea></label><button class="button button-primary auth-submit" type="submit">Publicar comentario</button><p class="auth-feedback" aria-live="polite"></p></form>`
    : '<button class="button button-primary" data-action="open-auth">Iniciá sesión para comentar</button>';
  dialogContent.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="eyebrow">CONVERSACIÓN</span><button class="icon-button" data-action="close-dialog" aria-label="Cerrar">×</button></div><h2 id="dialog-title">Comentarios.</h2><section class="comment-list">${rows}</section>${form}</div>`;
  dialog.showModal();
}

async function submitCommentForm(form) {
  if (!supabase || !currentSession) {
    showAuth();
    return;
  }
  const button = form.querySelector('[type="submit"]');
  const feedback = form.querySelector(".auth-feedback");
  const body = String(new FormData(form).get("body")).trim();
  button.disabled = true;
  try {
    const { error } = await supabase.from("comments").insert({
      post_id: form.dataset.postId,
      author_id: currentSession.user.id,
      body,
    });
    if (error) throw error;
    dialog.close();
    await refreshBackendView();
    showToast("Comentario publicado.");
  } catch (error) {
    console.error("No se pudo publicar el comentario.", error);
    feedback.textContent = getSupabaseError(error);
    feedback.classList.add("is-error");
  } finally {
    if (button.isConnected) button.disabled = false;
  }
}

async function handleBackendAction(action, id) {
  if (!supabase) return false;
  if (!currentSession) {
    showAuth();
    return true;
  }
  const userId = currentSession.user.id;
  try {
    if (action === "toggle-like") {
      const { error } = likedPostIds.has(id)
        ? await supabase.from("post_likes").delete().eq("post_id", id).eq("user_id", userId)
        : await supabase.from("post_likes").insert({ post_id: id, user_id: userId });
      if (error) throw error;
      if (likedPostIds.has(id)) likedPostIds.delete(id);
      else likedPostIds.add(id);
      await refreshBackendView();
      return true;
    }
    if (action === "save-post") {
      const { error } = savedPostIds.has(id)
        ? await supabase.from("saved_posts").delete().eq("post_id", id).eq("user_id", userId)
        : await supabase.from("saved_posts").insert({ post_id: id, user_id: userId });
      if (error) throw error;
      if (savedPostIds.has(id)) savedPostIds.delete(id);
      else savedPostIds.add(id);
      await refreshBackendView();
      showToast(savedPostIds.has(id) ? "Publicación guardada." : "Publicación quitada de guardados.");
      return true;
    }
    if (action === "toggle-follow") {
      if (id === userId) return true;
      const { error } = followedUserIds.has(id)
        ? await supabase.from("follows").delete().eq("following_id", id).eq("follower_id", userId)
        : await supabase.from("follows").insert({ follower_id: userId, following_id: id });
      if (error) throw error;
      if (followedUserIds.has(id)) followedUserIds.delete(id);
      else followedUserIds.add(id);
      await refreshBackendView();
      showToast(followedUserIds.has(id) ? "Ahora seguís a este atleta." : "Dejaste de seguir a este atleta.");
      return true;
    }
    if (action === "join-challenge") {
      const { error } = await supabase.rpc("join_challenge", { p_challenge_id: id });
      if (error) throw error;
      await refreshBackendView();
      showToast("Desafío iniciado.");
      return true;
    }
    if (action === "advance-challenge") {
      const { error } = await supabase.rpc("record_challenge_day", { p_challenge_id: id });
      if (error) throw error;
      dialog.close();
      await refreshBackendView();
      showToast("Avance registrado. Si completaste el objetivo, el XP se acreditó una sola vez.");
      return true;
    }
    if (action === "leave-challenge") {
      const { error } = await supabase.rpc("leave_challenge", { p_challenge_id: id });
      if (error) throw error;
      dialog.close();
      await refreshBackendView();
      showToast("Desafío abandonado.");
      return true;
    }
  } catch (error) {
    console.error(`Falló la acción ${action}.`, error);
    showToast(`No se pudo completar la acción: ${getSupabaseError(error)}`);
    return true;
  }
  return false;
}

function updateChallengeGrid() {
  const grid = document.querySelector("#challenge-grid");
  if (!grid) return;
  const search = document.querySelector("#challenge-search").value.trim().toLocaleLowerCase("es");
  const category = document.querySelector("#category-filter").value;
  const duration = document.querySelector("#duration-filter").value;
  const catalog = isSupabaseConfigured ? backendChallenges ?? [] : challenges;
  const visible = catalog.filter((challenge) =>
    (!category || challenge.category === category)
    && (!duration || challenge.duration === Number(duration))
    && (!search || `${challenge.title} ${challenge.description} ${challenge.category}`.toLocaleLowerCase("es").includes(search)),
  );
  grid.innerHTML = visible.length
    ? visible.map(challengeCard).join("")
    : `<div class="empty-state">No encontramos desafíos con esos filtros. Probá con otra búsqueda.</div>`;
  document.querySelector("#challenge-count").textContent = `${visible.length} ${visible.length === 1 ? "desafío disponible" : "desafíos disponibles"} · ${isSupabaseConfigured ? "Supabase" : "catálogo de muestra"}`;
}

function render() {
  const views = {
    inicio: renderDashboard,
    desafios: renderChallenges,
    ranking: renderRanking,
    comunidad: renderCommunity,
    perfil: renderProfile,
  };
  main.innerHTML = views[currentView]();
  document.querySelector("#current-section").textContent = currentView.toLocaleUpperCase("es");
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === currentView);
    if (button.matches("button.nav-link, button.mobile-nav-link")) {
      button.setAttribute("aria-current", button.dataset.view === currentView ? "page" : "false");
    }
  });
  const authAction = document.querySelector("#auth-action");
  const topAvatar = document.querySelector(".top-avatar");
  if (authAction) {
    authAction.textContent = currentSession ? "Cerrar sesión" : "Conectar cuenta";
    authAction.dataset.action = currentSession ? "sign-out" : "open-auth";
  }
  if (topAvatar) {
    topAvatar.textContent = currentProfile?.display_name?.slice(0, 2).toUpperCase() ?? "R";
    topAvatar.setAttribute("aria-label", currentSession ? "Abrir mi perfil" : "Iniciar sesión");
    topAvatar.dataset.view = currentSession ? "perfil" : "";
    topAvatar.dataset.action = currentSession ? "" : "open-auth";
  }
  const sidebarName = document.querySelector(".sidebar-user-copy strong");
  const sidebarDetail = document.querySelector(".sidebar-user-copy span");
  const sidebarAvatar = document.querySelector(".sidebar-user .avatar");
  if (sidebarName) sidebarName.textContent = currentProfile?.display_name ?? (currentSession ? "Atleta" : "Demo RIVAL");
  if (sidebarDetail) sidebarDetail.textContent = currentSession ? `@${currentProfile?.username ?? ""} · Cuenta conectada` : "Vista de demostración";
  if (sidebarAvatar) sidebarAvatar.textContent = currentProfile?.display_name?.slice(0, 2).toUpperCase() ?? "R";
  document.querySelector("#active-count").textContent = activeChallenges().length;
  if (currentView === "desafios") updateChallengeGrid();
}

function showToast(message) {
  const region = document.querySelector("#toast-region");
  region.innerHTML = `<div class="toast" role="status">${escapeHtml(message)}</div>`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { region.innerHTML = ""; }, 3200);
}

function openChallenge(id) {
  const challenge = getChallenge(id);
  if (!challenge) return;
  if (isSupabaseConfigured && !currentSession) {
    showAuth();
    return;
  }
  selectedChallenge = challenge;
  const participation = getParticipation(id);
  const progressCopy = participation?.status === "pending"
    ? `<div class="rules-box">Tu evidencia está pendiente de revisión. La experiencia y las recompensas solo se acreditan tras una aprobación.</div>`
    : participation
      ? `<div class="rules-box">${isSupabaseConfigured ? "Progreso validado" : "Tu progreso local"}: <strong>${participation.progress} de ${challenge.duration} días</strong>. ${challenge.requiresEvidence ? "Adjuntá una evidencia para que el equipo revise este avance." : "Registrá un día al completar el reto."}</div>`
      : `<div class="rules-box">${escapeHtml(challenge.rules)}</div>`;
  let actions = `<button class="button button-quiet" data-action="close-dialog">Ahora no</button><button class="button button-primary" data-action="join-challenge" data-id="${id}">Empezar desafío</button>`;
  if (participation?.status === "active") {
    actions = `<button class="button button-quiet" data-action="leave-challenge" data-id="${id}">Abandonar</button>${participation.progress < challenge.duration && !challenge.requiresEvidence ? `<button class="button button-primary" data-action="advance-challenge" data-id="${id}">Registrar un día</button>` : ""}`;
    if (isSupabaseConfigured && challenge.requiresEvidence) {
      actions += `<form class="evidence-form" data-form="evidence" data-challenge-id="${id}"><label>Foto, video o archivo<input name="evidence" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf" required /><small>JPG, PNG, WebP, MP4 o PDF · máximo 20 MB</small></label><label>Nota para la revisión<textarea name="caption" maxlength="500" rows="3" placeholder="Contá brevemente cómo completaste el avance."></textarea></label><button class="button button-primary auth-submit" type="submit">Enviar evidencia</button><p class="auth-feedback" aria-live="polite"></p></form>`;
    }
  } else if (participation?.status === "pending") {
    actions = `<button class="button button-primary" data-action="close-dialog">Entendido</button>`;
  }
  const actionClass = isSupabaseConfigured && participation?.status === "active" && challenge.requiresEvidence
    ? "dialog-actions has-evidence"
    : "dialog-actions";
  dialogContent.innerHTML = `<div class="dialog-inner"><div class="dialog-top"><span class="category-tag">${escapeHtml(challenge.category)}</span><button class="icon-button" data-action="close-dialog" aria-label="Cerrar">×</button></div><p class="eyebrow">${isSupabaseConfigured ? "DESAFÍO · SUPABASE" : "DESAFÍO DE MUESTRA"}</p><h2 id="dialog-title">${escapeHtml(challenge.title)}</h2><p class="dialog-description">${escapeHtml(challenge.description)}</p><div class="detail-grid"><div class="detail-box"><span>Duración</span><strong>${challenge.duration} días</strong></div><div class="detail-box"><span>Dificultad</span><strong>${escapeHtml(challenge.difficulty)}</strong></div><div class="detail-box"><span>Recompensa</span><strong>${challenge.reward} XP</strong></div></div>${progressCopy}<div class="${actionClass}">${actions}</div></div>`;
  dialog.showModal();
}

function changeView(view) {
  if (!["inicio", "desafios", "ranking", "comunidad", "perfil"].includes(view)) return;
  currentView = view;
  render();
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("click", (event) => {
  const control = event.target.closest("[data-view], [data-action]");
  if (!control) return;
  if (control.dataset.view) {
    event.preventDefault();
    changeView(control.dataset.view);
    return;
  }

  const { action, id } = control.dataset;
  if (action === "close-dialog") dialog.close();
  if (action === "open-auth") showAuth();
  if (action === "auth-mode") showAuth(control.dataset.mode);
  if (action === "sign-out") {
    if (supabase) {
      void supabase.auth.signOut().then(({ error }) => {
        if (error) throw error;
        showToast("Sesión cerrada.");
      }).catch((error) => {
        console.error("No se pudo cerrar la sesión.", error);
        showToast(`No se pudo cerrar la sesión: ${getSupabaseError(error)}`);
      });
    }
  }
  if (action === "open-challenge") openChallenge(id);
  if (action === "view-story") {
    if (id === "valen") {
      showToast("La creación de historias todavía no está disponible.");
    } else {
      viewedStoryIds.add(id);
      render();
      const story = stories.find((item) => item.id === id);
      showToast(`Historia de ${story.name}: contenido ilustrativo de demo.`);
    }
  }
  if (action === "toggle-like") {
    if (isSupabaseConfigured) {
      void handleBackendAction(action, id);
      return;
    }
    if (likedPostIds.has(id)) likedPostIds.delete(id);
    else likedPostIds.add(id);
    render();
  }
  if (action === "toggle-follow") {
    if (isSupabaseConfigured) {
      void handleBackendAction(action, id);
      return;
    }
    if (followedProfileIds.has(id)) followedProfileIds.delete(id);
    else followedProfileIds.add(id);
    render();
    showToast("Seguimiento de muestra actualizado solo en esta vista.");
  }
  if (action === "save-post") {
    if (isSupabaseConfigured) {
      void handleBackendAction(action, id);
      return;
    }
    if (savedPostIds.has(id)) savedPostIds.delete(id);
    else savedPostIds.add(id);
    render();
    showToast(savedPostIds.has(id) ? "Guardado en esta sesión de demo." : "Quitado de guardados.");
  }
  if (action === "show-comments") {
    void showComments(id);
    return;
  }
  if (["share-post", "post-options"].includes(action)) {
    const messages = {
      "share-post": "Compartir publicaciones estará disponible más adelante.",
      "post-options": "Más opciones estarán disponibles con los perfiles reales.",
    };
    showToast(messages[action]);
  }
  if (["join-challenge", "advance-challenge", "leave-challenge"].includes(action) && isSupabaseConfigured) {
    void handleBackendAction(action, id);
    return;
  }
  if (action === "join-challenge" && !getParticipation(id)) {
    state.joined.push({ challengeId: id, progress: 0, status: "active" });
    saveState();
    dialog.close();
    render();
    showToast("Desafío iniciado. Tu progreso se guarda solo en este navegador.");
  }
  if (action === "advance-challenge") {
    const participation = getParticipation(id);
    const challenge = getChallenge(id);
    if (!participation || participation.status !== "active" || !challenge) return;
    participation.progress = Math.min(challenge.duration, participation.progress + 1);
    if (participation.progress === challenge.duration) {
      participation.status = "pending";
      showToast("¡Objetivo alcanzado! Queda pendiente: esta demo no valida evidencias ni acredita XP.");
    } else {
      showToast("Día registrado en tu progreso local.");
    }
    saveState();
    dialog.close();
    render();
  }
  if (action === "leave-challenge") {
    state.joined = state.joined.filter((item) => item.challengeId !== id);
    saveState();
    dialog.close();
    render();
    showToast("Desafío quitado de tu lista local.");
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!form.matches("[data-form]")) return;
  event.preventDefault();
  if (form.dataset.form === "auth" || form.dataset.form === "update-password") {
    void submitAuthForm(form);
  } else if (form.dataset.form === "evidence") {
    void submitEvidenceForm(form);
  } else if (form.dataset.form === "comment") {
    void submitCommentForm(form);
  } else if (form.dataset.form === "post") {
    void submitPostForm(form);
  }
});

document.addEventListener("input", (event) => {
  if (event.target.id === "challenge-search") updateChallengeGrid();
});
document.addEventListener("change", (event) => {
  if (["category-filter", "duration-filter"].includes(event.target.id)) updateChallengeGrid();
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

render();
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;
    currentSession = session;
    if (event === "PASSWORD_RECOVERY" && session) {
      window.setTimeout(() => showAuth("update-password"), 0);
    }
    window.setTimeout(() => { void refreshBackendView(); }, 0);
  });
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) throw error;
    currentSession = data.session;
    return refreshBackendView();
  }).catch((error) => {
    console.error("No se pudo restaurar la sesión de Supabase.", error);
    showToast(`No se pudo restaurar la sesión: ${getSupabaseError(error)}`);
  });
}
