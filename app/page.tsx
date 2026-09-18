"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import categories from "../content/categories.json";
import heroSlides from "../content/hero.json";
import lenses from "../content/creative-lenses.json";
import themes from "../content/themes.json";
import { describeLens, visualGuidance } from "../lib/ai/prompt-guidance";
import { getImageCopy, heroTranslations, imageTranslations, lensGroupTranslations, categoryTranslations, themeDescriptions, type Language, ui } from "../lib/i18n";

type Category = (typeof categories)[number];
type ImageRecord = Category["images"][number];
type Lens = (typeof lenses)[number]["lenses"][number];
type SelectedImage = { categoryId: string; index: number };
type GeneratedResult = { id: string; imageUrl: string; prompt: string; sourceImage?: string; createdAt: number; mock?: boolean; message?: string };
type ReferenceMode = "chat" | "template";
type ChatMessage = { role: "user" | "assistant"; content: string };

const navIds = ["home", "lenses", "exhibition", "create", "works"] as const;
const chatLimit = 4;
const quickEdits = [
  { th: "เพิ่มความหวัง", en: "Make it more hopeful" },
  { th: "ทำให้ปัญหาชัดขึ้น", en: "Make the problem clearer" },
  { th: "เปลี่ยนเป็นฉากโรงเรียน", en: "Set it at a school" },
  { th: "ใช้ฝาขวดเป็นสัญลักษณ์", en: "Use bottle caps as a symbol" },
];
const chatStarters = [
  { th: "ช่วยคิดภาพจากประเด็นน้ำ", en: "Help me imagine an image about water" },
  { th: "เปลี่ยนแนวคิดนี้ให้เป็น Contrast", en: "Turn this idea into Contrast" },
  { th: "ทำให้ภาพนี้มีความหวังมากขึ้น", en: "Make this image feel more hopeful" },
  { th: "เล่าเรื่องฝาขวดแบบไม่ซ้ำใคร", en: "Tell a fresh story about bottle caps" },
];
const objectOptions = [
  { th: "ฝาขวด", en: "bottle cap" }, { th: "ขวดน้ำ", en: "water bottle" }, { th: "ต้นไม้", en: "tree" },
  { th: "สวิตช์ไฟ", en: "light switch" }, { th: "สิ่งของใกล้ตัว", en: "an everyday object" },
] as const;
const inspirations = [
  { label: "น้ำดื่มในโรงเรียน", labelEn: "Drinking water at school", lens: "Contrast", place: "จุดเติมน้ำในโรงเรียน", placeEn: "a school water refill station", tension: "นักเรียนยังซื้อขวดน้ำใช้ครั้งเดียว", tensionEn: "students still buy single-use water bottles", reframe: "ให้ขวดใช้ครั้งเดียวกองอยู่ข้างจุดเติมน้ำ ขณะที่ขวดใช้ซ้ำเด่นอยู่กลางภาพ", reframeEn: "show single-use bottles piling up beside the refill station while a reusable bottle stands at the center", audience: "อยากเริ่มพกขวดน้ำใช้ซ้ำ", audienceEn: "want to start carrying a reusable bottle", idea: "ที่จุดเติมน้ำในโรงเรียน ขวดใช้ครั้งเดียวกองเพิ่มขึ้นทุกวัน ให้ภาพเปรียบเทียบกับขวดใช้ซ้ำที่ช่วยลดขยะ", ideaEn: "At a school refill station, single-use bottles pile up each day. Contrast them with a reusable bottle that helps reduce waste." },
  { label: "โรงอาหารไม่เหลือทิ้ง", labelEn: "A zero-waste cafeteria", lens: "Reveal", place: "โรงอาหารในโรงเรียน", placeEn: "a school cafeteria", tension: "อาหารเหลือและภาชนะใช้ครั้งเดียวถูกทิ้งรวมกัน", tensionEn: "food waste and single-use containers are thrown away together", reframe: "เปิดฝาครอบถาดอาหารให้เห็นขยะที่ซ่อนอยู่ข้างใต้", reframeEn: "lift the food tray cover to reveal the waste hidden underneath", audience: "อยากตักอาหารพอดีและแยกขยะ", audienceEn: "want to take the right amount and sort waste", idea: "ในโรงอาหารโรงเรียน เปิดให้เห็นว่าหลังมื้ออาหารมีอาหารเหลือและภาชนะใช้ครั้งเดียวซ่อนอยู่มากแค่ไหน", ideaEn: "In a school cafeteria, reveal how much leftover food and single-use packaging are hidden after a meal." },
  { label: "ฝาขวดเปลี่ยนพื้นที่", labelEn: "Bottle caps change a place", lens: "Exaggerate", place: "ลานโรงเรียน", placeEn: "a school courtyard", tension: "ฝาขวดเล็ก ๆ สะสมทุกวัน", tensionEn: "tiny bottle caps accumulate every day", reframe: "ขยายฝาขวดหนึ่งฝาให้ใหญ่จนปิดท่อระบายน้ำกลางลาน", reframeEn: "enlarge one bottle cap until it blocks the drain in the middle of the courtyard", audience: "เห็นคุณค่าของการแยกขยะ", audienceEn: "see the value of sorting waste", idea: "ฝาขวดเล็ก ๆ ที่สะสมในโรงเรียนถูกขยายให้ใหญ่จนปิดท่อระบายน้ำ เพื่อให้เห็นผลของปริมาณสะสม", ideaEn: "Tiny bottle caps that accumulate at school are enlarged until they block a drain, making the effect of accumulation visible." },
  { label: "ห้องเรียนใช้พลังงาน", labelEn: "An energy-using classroom", lens: "Limit", place: "ห้องเรียนหลังเลิกเรียน", placeEn: "a classroom after school", tension: "ไฟและพัดลมยังเปิดในห้องว่าง", tensionEn: "the lights and fan are still on in an empty room", reframe: "ทำให้พลังงานของโลกแสดงเป็นแบตเตอรี่ที่เหลือเพียง 1%", reframeEn: "show the planet's energy as a battery with only 1% left", audience: "อยากปิดไฟก่อนออกจากห้อง", audienceEn: "want to switch off the lights before leaving", idea: "ห้องเรียนว่างหลังเลิกเรียนยังเปิดไฟและพัดลมอยู่ ให้แบตเตอรี่ของโลกเหลือ 1% เพื่อชวนคิดก่อนปิดสวิตช์", ideaEn: "An empty classroom after school still has its lights and fan on. Show the planet's battery at 1% to prompt a pause before switching off." },
] as const;

function scrollToSection(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function categoryById(id: string) { return categories.find((category) => category.id === id) ?? categories[0]; }
function getSessionId() {
  if (typeof window === "undefined") return "browser";
  const key = "save-our-planet-session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = `session-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}
function navItems(language: Language) { return navIds.map((id, index) => [ui[language].nav[index], id] as const); }
function lensLabel(lens: Lens, language: Language) { return language === "th" ? `${lens.name} (${lens.thai})` : lens.name; }
function prepareReferenceImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("INVALID_IMAGE"));
    if (file.size > 12 * 1024 * 1024) return reject(new Error("IMAGE_TOO_LARGE"));
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("IMAGE_PREPARE_FAILED"));
      context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("IMAGE_READ_FAILED")); };
    image.src = objectUrl;
  });
}

export default function Home({ initialLanguage = "th" }: { initialLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const t = ui[language];
  const [heroIndex, setHeroIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [selected, setSelected] = useState<SelectedImage | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState("Contrast");
  const [starterPrompt, setStarterPrompt] = useState("");
  const [remixIdea, setRemixIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [myWorks, setMyWorks] = useState<GeneratedResult[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatReferenceImage, setChatReferenceImage] = useState<string | null>(null);
  const [chatReferenceName, setChatReferenceName] = useState("");
  const [templateReferenceImage, setTemplateReferenceImage] = useState<string | null>(null);
  const [templateReferenceName, setTemplateReferenceName] = useState("");
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupEnabled, setSetupEnabled] = useState<boolean | null>(null);
  const [openRouterConfigured, setOpenRouterConfigured] = useState<boolean | null>(null);
  const [setupKey, setSetupKey] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");
  const [template, setTemplate] = useState({ place: "", tension: "", reframe: "", audience: "", object: "ฝาขวด", lens: "Contrast", mood: t.defaultMood });
  const [templatePrompt, setTemplatePrompt] = useState("");
  const pointerStart = useRef<number | null>(null);
  const setupInputRef = useRef<HTMLInputElement | null>(null);
  const selectedCategory = selected ? categoryById(selected.categoryId) : null;
  const selectedImage: ImageRecord | null = selectedCategory && selected ? selectedCategory.images[selected.index] : null;
  const selectedCopy = selectedImage ? getImageCopy(selectedImage, language) : null;
  const filteredCategories = activeTheme ? categories.filter((category) => category.environmentThemes.includes(activeTheme)) : categories;
  const chatRounds = chatHistory.filter((message) => message.role === "user").length;
  const currentPrompt = useMemo(() => selectedCopy ? [starterPrompt || selectedCopy.starterPrompt, remixIdea].filter(Boolean).join("\n\n") : "", [selectedCopy, starterPrompt, remixIdea]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("save-our-planet-language", language);
  }, [language]);
  useEffect(() => {
    if (initialLanguage !== "th") return;
    const saved = window.localStorage.getItem("save-our-planet-language");
    if (saved === "th" || saved === "en") setLanguage(saved);
  }, [initialLanguage]);
  useEffect(() => {
    const saved = window.localStorage.getItem("save-our-planet-works");
    if (saved) try { setMyWorks(JSON.parse(saved)); } catch { window.localStorage.removeItem("save-our-planet-works"); }
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" }).then(async (response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data) return;
      setOpenRouterConfigured(Boolean(data.openRouterConfigured));
      setSetupEnabled(data.setupEnabled !== false);
    }).catch(() => { if (active) setSetupEnabled(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const sections = navIds.map((id) => document.getElementById(id)).filter((element): element is HTMLElement => Boolean(element));
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (visible?.target.id) setActiveSection(visible.target.id); }, { rootMargin: "-18% 0px -60% 0px", threshold: [0.05, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section)); return () => observer.disconnect();
  }, []);
  useEffect(() => { const interval = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroSlides.length), 6500); return () => window.clearInterval(interval); }, []);
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") { setSelected(null); setEditMode(false); } if (!editMode && event.key === "ArrowLeft") moveGallery(-1); if (!editMode && event.key === "ArrowRight") moveGallery(1); };
    window.addEventListener("keydown", onKeyDown); document.body.classList.add("modal-open");
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.classList.remove("modal-open"); };
  }, [selected, editMode]);

  function changeLanguage(next: Language) {
    setLanguage(next); setMenuOpen(false);
    const target = next === "en" ? "/en" : "/";
    if (window.location.pathname !== target) window.history.replaceState({}, "", target);
  }
  function openGallery(categoryId: string, imageOrIndex: number | string) {
    const category = categoryById(categoryId);
    const index = typeof imageOrIndex === "number" ? imageOrIndex : category.images.findIndex((image) => image.id === imageOrIndex);
    if (index < 0 || !category.images[index]) return;
    const image = category.images[index]; const copy = getImageCopy(image, language);
    setSelected({ categoryId, index }); setEditMode(false); setResult(null); setStarterPrompt(copy.starterPrompt); setRemixIdea(""); setStatus("");
  }
  function moveGallery(delta: number) { if (!selected || editMode) return; const category = categoryById(selected.categoryId); openGallery(selected.categoryId, (selected.index + delta + category.images.length) % category.images.length); }
  function chooseLens(lens: Lens) { setActiveLens(lens.name); setRemixIdea((current) => current || `${lens.name}: ${language === "th" ? lens.thai : lens.name}`); scrollToSection("create"); }
  function appendQuickEdit(edit: { th: string; en: string }) { const value = edit[language]; setRemixIdea((current) => current ? `${current}, ${value}` : value); }
  function useInspiration(inspiration: (typeof inspirations)[number]) {
    const en = language === "en";
    setChatText(en ? inspiration.ideaEn : inspiration.idea); setChatHistory([]); setChatPrompt(""); setActiveLens(inspiration.lens);
    setTemplate((current) => ({ ...current, place: en ? inspiration.placeEn : inspiration.place, tension: en ? inspiration.tensionEn : inspiration.tension, reframe: en ? inspiration.reframeEn : inspiration.reframe, audience: en ? inspiration.audienceEn : inspiration.audience, lens: inspiration.lens }));
    setTemplatePrompt(""); setStatus(t.statusIdeaAdded(en ? inspiration.labelEn : inspiration.label));
  }
  function saveWork(work: GeneratedResult, notice = t.statusImageReady) { const next = [work, ...myWorks.filter((item) => item.id !== work.id)].slice(0, 12); setMyWorks(next); window.localStorage.setItem("save-our-planet-works", JSON.stringify(next)); setStatus(notice); }
  function friendlyError(error: unknown, fallback: string) { const message = error instanceof Error ? error.message : ""; if (/failed to fetch|networkerror|load failed/i.test(message)) return t.statusNetwork; return ({ INVALID_IMAGE: t.statusInvalidImage, IMAGE_TOO_LARGE: t.statusImageTooLarge, IMAGE_READ_FAILED: t.statusImageReadError, IMAGE_PREPARE_FAILED: t.statusPrepareError } as Record<string, string>)[message] || message || fallback; }
  async function generateRemix() {
    if (!selectedImage || generating) return; setGenerating(true); setStatus(t.statusRemixing);
    try { const response = await fetch("/api/remix", { method: "POST", headers: { "Content-Type": "application/json", "x-session-id": getSessionId() }, body: JSON.stringify({ sourceImage: selectedImage.src, sourceImageId: selectedImage.id, prompt: currentPrompt, lens: activeLens }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || t.statusImageError); const generated = { id: `work-${Date.now()}`, imageUrl: data.imageUrl, sourceImage: selectedImage.src, prompt: currentPrompt, createdAt: Date.now(), mock: data.mock, message: data.message } as GeneratedResult; setResult(generated); setEditMode(false); saveWork(generated); } catch (error) { setStatus(friendlyError(error, t.statusImageError)); } finally { setGenerating(false); }
  }
  async function runChat(mode: "coach" | "prompt") {
    const idea = chatText.trim(); if (chatBusy || (mode === "coach" && (!idea || chatRounds >= chatLimit)) || (mode === "prompt" && !idea && chatHistory.length === 0)) return; setChatBusy(true); setStatus(mode === "coach" ? t.statusChatting : t.statusSummarizing);
    try { const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "x-session-id": getSessionId() }, body: JSON.stringify({ idea: idea || t.statusPromptSummary, lens: activeLens, mode, history: chatHistory, language }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || t.statusPromptError); if (mode === "coach") { setChatHistory((current) => [...current, { role: "user", content: idea }, { role: "assistant", content: data.prompt || t.statusIdeaFallback }]); setChatText(""); setChatPrompt(""); const remaining = chatLimit - chatRounds - 1; setStatus(remaining > 0 ? t.statusMoreRounds(remaining) : t.statusRoundsDone); } else { setChatPrompt(data.prompt || idea); setStatus(t.statusPromptReady); } } catch (error) { if (mode === "prompt" && idea) setChatPrompt(idea); setStatus(friendlyError(error, t.statusPromptError)); } finally { setChatBusy(false); }
  }
  function resetChat() { setChatHistory([]); setChatText(""); setChatPrompt(""); setStatus(t.statusNewConversation); }
  async function handleReferenceImage(event: React.ChangeEvent<HTMLInputElement>, mode: ReferenceMode) { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; try { const prepared = await prepareReferenceImage(file); if (mode === "chat") { setChatReferenceImage(prepared); setChatReferenceName(file.name); } else { setTemplateReferenceImage(prepared); setTemplateReferenceName(file.name); } setStatus(t.statusReferenceAdded); } catch (error) { setStatus(friendlyError(error, t.statusImageFailed)); } }
  function clearReferenceImage(mode: ReferenceMode) { if (mode === "chat") { setChatReferenceImage(null); setChatReferenceName(""); } else { setTemplateReferenceImage(null); setTemplateReferenceName(""); } setStatus(t.statusReferenceRemoved); }
  function deleteWork(workId: string) { const work = myWorks.find((item) => item.id === workId); if (!work || !window.confirm(t.confirmDelete)) return; const next = myWorks.filter((item) => item.id !== workId); setMyWorks(next); window.localStorage.setItem("save-our-planet-works", JSON.stringify(next)); if (result?.id === workId) setResult(null); setStatus(t.statusDeleted); }
  async function submitOpenRouterKey(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (!setupKey.trim() || setupBusy) return; setSetupBusy(true); setSetupMessage(t.statusKeyCheck); try { const response = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: setupKey.trim() }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || t.statusApiError); setOpenRouterConfigured(true); setSetupKey(""); setSetupOpen(false); setSetupMessage(""); setStatus(t.statusConnected); } catch (error) { setSetupMessage(error instanceof Error ? error.message : t.statusSetupError); } finally { setSetupBusy(false); } }
  function buildTemplatePrompt() { const en = language === "en"; const prompt = [`${en ? "Real place" : "สถานที่จริง"}: ${template.place || t.statusTemplatePlace}`, `${en ? "Tension" : "จุดชวนคิด"}: ${template.tension || t.statusTemplateTension}`, `${en ? "New perspective" : "มุมมองใหม่"}: ${template.reframe.trim() || t.statusTemplateReframe}`, `${en ? "Main object" : "วัตถุหลัก"}: ${template.object}`, `${en ? "Creative Lens" : "Creative Lens"}: ${en ? template.lens : describeLens(template.lens)}`, `${en ? "Viewer should feel" : "คนดูควรรู้สึก"}: ${template.audience || t.statusTemplateAudience}`, `${en ? "Mood" : "บรรยากาศ"}: ${template.mood}`, en ? "One image, one idea, one focal point. Keep the place and the student's intent." : visualGuidance].join("\n"); setTemplatePrompt(prompt); setActiveLens(template.lens); setStatus(t.statusPromptBuilt); }
  async function generateFromPrompt(promptText: string, sourceImage?: string | null) { if (!promptText.trim() || generating) return; setGenerating(true); setStatus(t.statusGenerating); try { const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json", "x-session-id": getSessionId() }, body: JSON.stringify({ prompt: promptText, sourceImage: sourceImage || undefined }) }); const data = await response.json(); if (!response.ok || typeof data.imageUrl !== "string") throw new Error(data.error || t.statusImageError); const generated = { id: `work-${Date.now()}`, imageUrl: data.imageUrl, prompt: promptText, createdAt: Date.now(), mock: data.mock, message: data.message } as GeneratedResult; setResult(generated); saveWork(generated); scrollToSection("works"); } catch (error) { setStatus(friendlyError(error, t.statusImageError)); } finally { setGenerating(false); } }

  const heroCopy = heroTranslations[heroSlides[heroIndex].id];
  return <main lang={language} aria-busy={generating}>
    <header className="site-header">
      <a className="brand" href="#home" onClick={() => setMenuOpen(false)}><span className="brand-mark">◒</span><span><strong>CAP TO CHANGE</strong><small>Save Our Planet Camp</small></span></a>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div className="language-switch" role="group" aria-label={t.language} style={{ display: "inline-flex", gap: 2, padding: 3, border: "1px solid rgba(21,63,54,.16)", borderRadius: 999, background: "rgba(255,255,255,.55)" }}><button type="button" aria-pressed={language === "th"} onClick={() => changeLanguage("th")} style={{ border: 0, borderRadius: 999, padding: "5px 9px", background: language === "th" ? "#153f36" : "transparent", color: language === "th" ? "#fff" : "#153f36", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>ไทย</button><button type="button" aria-pressed={language === "en"} onClick={() => changeLanguage("en")} style={{ border: 0, borderRadius: 999, padding: "5px 9px", background: language === "en" ? "#153f36" : "transparent", color: language === "en" ? "#fff" : "#153f36", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>EN</button></div>
        <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /><b>{t.menu}</b></button>
      </div>
      <nav id="main-nav" className={menuOpen ? "main-nav open" : "main-nav"} aria-label={t.menu}>{navItems(language).map(([label, id]) => <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>)}</nav>
    </header>
    {generating && <div className="generation-toast" role="status" aria-live="polite"><span className="generation-spinner" aria-hidden="true" /><div><strong>{t.generationTitle}</strong><p>{t.generationBody}</p></div></div>}
    <section id="home" className="hero-section"><div className="hero-copy"><p className="eyebrow">{t.heroEyebrow}</p><h1>{t.heroTitle}<br /><em>{t.heroTitleEm}</em></h1><p className="hero-lead">{t.heroLead}</p><div className="hero-actions"><button className="button button-primary" onClick={() => scrollToSection("exhibition")}>{t.browseExhibition} <span>↘</span></button><button className="button button-ghost" onClick={() => scrollToSection("create")}>{t.startCreating}</button></div><div className="hero-note"><span className="note-dot" /><span>{t.inspirationFirst}</span><button className={openRouterConfigured ? "setup-link setup-ready" : "setup-link"} type="button" onClick={() => { setSetupMessage(""); setSetupOpen(true); }}>{openRouterConfigured ? t.aiReady : t.configureAi}</button></div></div><div className="hero-visual" aria-label={t.chooseCover}><img src={heroSlides[heroIndex].src} alt={language === "en" ? heroCopy?.title || heroSlides[heroIndex].title : heroSlides[heroIndex].title} fetchPriority="high" /><div className="hero-caption"><span>0{heroIndex + 1} / 0{heroSlides.length}</span><strong>{language === "en" ? heroCopy?.title : heroSlides[heroIndex].title}</strong><p>{language === "en" ? heroCopy?.subtitle : heroSlides[heroIndex].subtitle}</p></div><div className="hero-controls"><button aria-label={t.previousImage} onClick={() => setHeroIndex((heroIndex - 1 + heroSlides.length) % heroSlides.length)}>←</button><div className="hero-dots" aria-label={t.chooseCover}>{heroSlides.map((slide, index) => <button key={slide.id} aria-label={t.imageNumber(index)} className={index === heroIndex ? "active" : ""} onClick={() => setHeroIndex(index)} />)}</div><button aria-label={t.nextImage} onClick={() => setHeroIndex((heroIndex + 1) % heroSlides.length)}>→</button></div></div></section>
    <section className="intro-strip"><div><span className="section-number">01</span><h2>{t.introTitle}</h2></div><p>{t.introSteps}</p><span className="scroll-hint">{t.scrollExplore}</span></section>
    <section id="lenses" className="lenses-section section-shell"><div className="section-heading split-heading"><div><p className="eyebrow orange-text">{t.lensesEyebrow}</p><h2>{t.lensesTitle}<br /><em>{t.lensesTitleEm}</em></h2></div><p>{t.lensesBody}</p></div><div className="lens-layout"><div className="lens-reference"><img src="/content/references/creative-lenses.png" alt={t.lensAlt} loading="lazy" /><div className="lens-formula"><span>{t.realPlace}</span><b>+</b><span>{t.oneTension}</span><b>+</b><span>{t.oneLens}</span><b>+</b><span>{t.oneQuestion}</span></div></div><div className="lens-groups">{lenses.map((group) => { const groupCopy = lensGroupTranslations[group.group] || { title: group.title, hint: group.hint }; return <div className={`lens-group ${group.color}`} key={group.group}><div className="lens-group-title"><span>{group.group}</span><div><h3>{language === "th" ? group.thai : groupCopy.title}</h3><p>{language === "th" ? `${group.thai} · ${group.hint}` : groupCopy.hint}</p></div></div><div className="lens-grid">{group.lenses.map((lens) => <button key={lens.name} className={activeLens === lens.name ? "lens-card selected" : "lens-card"} onClick={() => chooseLens(lens)}><strong>{lens.name}</strong><span>{language === "th" ? lens.thai : lens.name}</span><small>{lens.example}</small></button>)}</div></div>; })}</div></div></section>
    <section className="theme-section section-shell"><div className="section-heading"><p className="eyebrow blue-text">{t.lookCloser}</p><h2>{t.themesTitle}<br /><em>{t.themesTitleEm}</em></h2><p>{t.themesBody}</p></div><div className="theme-grid">{themes.map((theme, index) => <a key={theme.id} className={`theme-card theme-${index + 1}`} href="#exhibition" onClick={() => setActiveTheme(theme.title)}><span className="theme-index">0{index + 1}</span><h3>{language === "th" ? theme.thai : theme.title}</h3><strong>{language === "th" ? theme.title : theme.thai}</strong><p>{language === "th" ? theme.description : themeDescriptions[theme.id] || theme.description}</p><span className="theme-arrow">↗</span></a>)}</div></section>
    <section id="exhibition" className="exhibition-section section-shell"><div className="section-heading split-heading"><div><p className="eyebrow green-text">{t.exhibitionEyebrow}</p><h2>{t.exhibitionTitle}<br /><em>{t.exhibitionTitleEm}</em></h2></div><p>{t.exhibitionBody}</p></div>{activeTheme && <div className="filter-note"><span>{t.viewingTheme}</span><strong>{language === "th" ? themes.find((theme) => theme.title === activeTheme)?.thai : activeTheme}</strong><button onClick={() => setActiveTheme(null)}>{t.viewAll}</button></div>}<div className="collection-list">{filteredCategories.map((category) => { const isExpanded = expanded[category.id]; const featuredIds = new Set(category.featuredImageIds); const visibleImages = isExpanded ? category.images : category.images.filter((image) => featuredIds.has(image.id)); const catCopy = categoryTranslations[category.id]; return <article className={`collection collection-${category.accent}`} key={category.id}><div className="collection-heading"><div><span className="collection-kicker">COLLECTION {category.id.toUpperCase()}</span><h3>{language === "th" ? category.title : catCopy?.title || category.englishTitle} <small>{language === "th" ? category.englishTitle : category.title}</small></h3><p>{language === "th" ? category.description : catCopy?.description || category.description}</p></div><div className="collection-count"><strong>{category.images.length}</strong><span>{t.works}</span></div></div><div className="image-grid">{visibleImages.map((image) => { const copy = getImageCopy(image, language); return <button className="image-card" key={image.id} onClick={() => openGallery(category.id, image.id)}><span className="image-frame"><img src={image.src} alt={`${copy.title} — ${copy.caption}`} loading="lazy" /><span className="image-open">{t.openImage}</span></span><span className="image-meta"><strong>{copy.title}</strong><span>{image.lens.join(" · ")}</span><small>{copy.caption}</small></span></button>; })}</div>{category.images.length > visibleImages.length && <button className="text-button" onClick={() => setExpanded((current) => ({ ...current, [category.id]: !isExpanded }))}>{isExpanded ? t.showFeatured : t.moreWorks(category.images.length - visibleImages.length)} <span>↓</span></button>}</article>; })}</div></section>
    <section id="create" className="create-section section-shell"><div className="section-heading split-heading"><div><p className="eyebrow orange-text">{t.createEyebrow}</p><h2>{t.createTitle}<br /><em>{t.createTitleEm}</em></h2></div><p>{t.createBody}</p></div><div className="selected-lens-banner"><span>{t.selectedLens}</span><strong>{activeLens}</strong><button onClick={() => scrollToSection("lenses")}>{t.changeLens}</button></div><p className="quota-note"><strong>{t.quota}</strong> {t.quotaBody}</p><div className="inspiration-panel"><div className="inspiration-heading"><div><span className="card-label">{t.inspirationLabel}</span><h3>{t.inspirationTitle}</h3></div><p>{t.inspirationBody}</p></div><div className="inspiration-grid">{inspirations.map((inspiration) => <button type="button" className="inspiration-card" key={inspiration.label} onClick={() => useInspiration(inspiration)}><strong>{language === "en" ? inspiration.labelEn : inspiration.label}</strong><span>{inspiration.lens} · {language === "en" ? inspiration.ideaEn : inspiration.idea}</span><small>{t.useExample}</small></button>)}</div></div><div className="creator-grid"><div className="creator-card chat-card"><div className="creator-card-top"><span className="creator-icon">✦</span><div><span className="card-label">{t.chatMode}</span><h3>{t.chatTitle}</h3></div></div><label htmlFor="chat-idea">{t.chatLabel}</label><textarea id="chat-idea" value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder={t.chatPlaceholder} /><div className="chip-row">{chatStarters.map((starter) => <button key={starter.en} onClick={() => setChatText(starter[language])}>{starter[language]}</button>)}</div><p className="chat-round-note">{t.chatRoundNote(chatLimit)}</p>{chatHistory.length > 0 && <div className="chat-thread" aria-live="polite">{chatHistory.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "user" ? t.you : t.ai}</span><p>{message.content}</p></div>)}<small>{t.round(chatRounds, chatLimit)}</small></div>}<div className="reference-upload"><div><span className="card-label">{t.optionalReference}</span><p>{t.referenceBody}</p></div><label className="upload-button" htmlFor="chat-reference-image">{t.addImage}<input id="chat-reference-image" className="file-input" type="file" accept="image/*" onChange={(event) => handleReferenceImage(event, "chat")} /></label>{chatReferenceImage && <div className="reference-preview"><img src={chatReferenceImage} alt={t.optionalReference} /><span title={chatReferenceName}>{chatReferenceName}</span><button type="button" onClick={() => clearReferenceImage("chat")}>{t.remove}</button></div>}</div><div className="chat-actions"><button className="button button-dark" disabled={!chatText.trim() || chatBusy || chatRounds >= chatLimit} onClick={() => runChat("coach")}>{chatBusy ? <><span className="button-spinner" aria-hidden="true" />{t.thinking}</> : chatRounds >= chatLimit ? t.completeRounds : t.continueChat} <span>→</span></button><button className="text-button" type="button" disabled={chatBusy || (!chatText.trim() && chatHistory.length === 0)} onClick={() => runChat("prompt")}>{t.createVisualPrompt}</button>{chatHistory.length > 0 && <button className="text-button chat-reset" type="button" disabled={chatBusy} onClick={resetChat}>{t.restart}</button>}</div>{chatPrompt && <div className="prompt-result"><span>{t.visualPrompt}</span><p>{chatPrompt}</p><button className="button button-primary" disabled={generating} onClick={() => generateFromPrompt(chatPrompt, chatReferenceImage)}>{generating ? <><span className="button-spinner" aria-hidden="true" />{t.generatingNew}</> : t.createFromIdea}</button></div>}</div>
      <div className="creator-card template-card"><div className="creator-card-top"><span className="creator-icon">◎</span><div><span className="card-label">{t.templateMode}</span><h3>{t.templateTitle}</h3></div></div><div className="template-form"><label>{t.realPlaceLabel}<input value={template.place} onChange={(event) => setTemplate({ ...template, place: event.target.value })} placeholder={t.realPlacePlaceholder} /></label><label>{t.tensionLabel}<textarea value={template.tension} onChange={(event) => setTemplate({ ...template, tension: event.target.value })} placeholder={t.tensionPlaceholder} /></label><label>{t.reframeLabel}<textarea value={template.reframe} onChange={(event) => setTemplate({ ...template, reframe: event.target.value })} placeholder={t.reframePlaceholder} /></label><div className="form-row"><label>{t.mainObject}<select value={template.object} onChange={(event) => setTemplate({ ...template, object: event.target.value })}>{objectOptions.map((option) => <option key={option.en} value={option.th}>{language === "th" ? option.th : option.en}</option>)}</select></label><label>{t.lensLabel}<select value={template.lens} onChange={(event) => setTemplate({ ...template, lens: event.target.value })}>{lenses.flatMap((group) => group.lenses).map((lens) => <option key={lens.name} value={lens.name}>{lensLabel(lens, language)}</option>)}</select></label></div><label>{t.audienceLabel}<input value={template.audience} onChange={(event) => setTemplate({ ...template, audience: event.target.value })} placeholder={t.audiencePlaceholder} /></label></div><div className="reference-upload"><div><span className="card-label">{t.optionalReference}</span><p>{t.referenceBody}</p></div><label className="upload-button" htmlFor="template-reference-image">{t.addImage}<input id="template-reference-image" className="file-input" type="file" accept="image/*" onChange={(event) => handleReferenceImage(event, "template")} /></label>{templateReferenceImage && <div className="reference-preview"><img src={templateReferenceImage} alt={t.optionalReference} /><span title={templateReferenceName}>{templateReferenceName}</span><button type="button" onClick={() => clearReferenceImage("template")}>{t.remove}</button></div>}</div><button className="button button-outline full-button" onClick={buildTemplatePrompt}>{t.makePrompt} <span>→</span></button>{templatePrompt && <div className="prompt-result"><span>{t.yourPrompt}</span><p>{templatePrompt}</p><button className="button button-primary" disabled={generating} onClick={() => generateFromPrompt(templatePrompt, templateReferenceImage)}>{generating ? <><span className="button-spinner" aria-hidden="true" />{t.generatingNew}</> : t.createFromIdea}</button></div>}</div></div>{status && <p className="global-status" role="status">{status}</p>}</section>
    <section id="works" className="works-section section-shell"><div className="section-heading split-heading"><div><p className="eyebrow blue-text">{t.worksEyebrow}</p><h2>{t.worksTitle}<br /><em>{t.worksTitleEm}</em></h2></div><p>{t.worksBody}</p></div>{result && <div className="latest-result"><div><span className="card-label">{t.latestWork}</span><h3>{t.latestQuestion}</h3><p>{result.message || result.prompt}</p><div className="result-actions"><button className="button button-dark" onClick={() => saveWork(result)}>{t.saveAgain}</button><a className="button button-outline" href={result.imageUrl} download>{t.downloadNew}</a></div><small className="download-hint">{t.iphoneHint}</small></div><img src={result.imageUrl} alt={t.latestWork} /></div>}{myWorks.length === 0 && !result ? <div className="empty-works"><span>✦</span><h3>{t.emptyWorksTitle}</h3><p>{t.emptyWorksBody}</p><button className="button button-primary" onClick={() => scrollToSection("exhibition")}>{t.backToWorks}</button></div> : myWorks.length > 0 ? <div className="works-grid">{myWorks.map((work) => <article className="work-card" key={work.id}><img src={work.imageUrl} alt={t.latestWork} loading="lazy" /><div><span>{new Date(work.createdAt).toLocaleDateString(language === "th" ? "th-TH" : "en-US")}</span><p>{work.prompt}</p><div className="work-card-actions"><a className="download-link" href={work.imageUrl} download>{t.download}</a><button className="text-button delete-work" type="button" onClick={() => deleteWork(work.id)}>{t.deleteLocal}</button></div></div></article>)}</div> : null}</section>
    <nav className="mobile-bottom-nav" aria-label={t.mobileShortcuts}>{navItems(language).map(([label, id]) => <a key={id} className={activeSection === id ? "active" : undefined} aria-current={activeSection === id ? "location" : undefined} href={`#${id}`}><span>{id === "home" ? "⌂" : id === "lenses" ? "✦" : id === "exhibition" ? "▦" : id === "create" ? "＋" : "◌"}</span>{label}</a>)}</nav>
    <footer className="site-footer"><div><span className="brand-mark">◒</span><strong>CAP TO CHANGE</strong></div><p>{t.footerTagline}</p><span>{t.footerMvp}</span></footer>
    {setupOpen && <div className="modal-backdrop setup-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !setupBusy) setSetupOpen(false); }}><div className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title"><div className="setup-modal-header"><span>{t.aiConnection}</span><button className="modal-close" aria-label={t.setupClose} disabled={setupBusy} onClick={() => setSetupOpen(false)}>×</button></div><div className="setup-modal-body"><span className="card-label">{t.openRouterExhibition}</span><h2 id="setup-title">{t.setupTitle}<br /><em>{t.setupTitleEm}</em></h2><p>{t.setupBody}</p>{setupEnabled === false ? <div className="setup-manual-note">{t.setupManual}</div> : <form className="setup-form" onSubmit={submitOpenRouterKey}><label htmlFor="openrouter-key">{t.apiKey}<input ref={setupInputRef} id="openrouter-key" type="password" autoComplete="new-password" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} placeholder="sk-or-…" spellCheck={false} /></label><button className="button button-primary full-button" type="submit" disabled={setupBusy || !setupKey.trim()}>{setupBusy ? t.checking : t.saveConnect} <span>→</span></button>{setupMessage && <p className="setup-error" role="alert">{setupMessage}</p>}</form>}<p className="setup-safety">{t.safety}</p></div></div></div>}
    {selectedImage && selectedCategory && selectedCopy && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setEditMode(false); } }}><div className={editMode ? "gallery-modal edit-mode" : "gallery-modal"} role="dialog" aria-modal="true" aria-label={selectedCopy.title}><div className="modal-header"><span>{language === "th" ? selectedCategory.title : categoryTranslations[selectedCategory.id]?.title || selectedCategory.englishTitle} · {(selected?.index || 0) + 1} / {selectedCategory.images.length}</span><button className="modal-close" aria-label={t.galleryClose} onClick={() => { setSelected(null); setEditMode(false); }}>×</button></div><div className="gallery-content"><div className="gallery-visual"><img src={result?.imageUrl || selectedImage.src} alt={`${selectedCopy.title} — ${selectedCopy.caption}`} />{!editMode && <><button className="gallery-arrow gallery-prev" aria-label={t.previousImage} onClick={() => moveGallery(-1)}>←</button><button className="gallery-arrow gallery-next" aria-label={t.nextImage} onClick={() => moveGallery(1)}>→</button></>}{result && <span className="result-badge">{t.newVersion}</span>}</div><div className="gallery-info">{status && <p className="modal-status" role="status" aria-live="polite">{status}</p>}{!editMode ? <><span className="card-label">{selectedImage.lens.join(" · ")}</span><h2>{selectedCopy.title}</h2><p className="gallery-caption">{selectedCopy.caption}</p><div className="message-box"><span>{t.galleryThought}</span><p>{selectedCopy.message}</p></div><div className="gallery-actions"><button className="button button-primary" onClick={() => { setEditMode(true); setResult(null); }}>{t.remixEdit}</button><a className="button button-outline" href={selectedImage.src} download>{t.originalDownload}</a></div>{result && <div className="result-panel"><span className="card-label">{t.resultFromIdea}</span><p>{result.message || t.resultQuestion}</p><div className="result-actions"><button className="button button-dark" onClick={() => saveWork(result)}>{t.saveAgain}</button><a className="button button-outline" href={result.imageUrl} download>{t.downloadNew}</a><button className="text-button" onClick={() => setEditMode(true)}>{t.adjustAgain}</button></div><small className="download-hint">{t.downloadHint}</small></div>}</> : <div className="remix-panel"><button className="back-button" onClick={() => setEditMode(false)}>{t.backToImage}</button><span className="card-label">REMIX / EDIT</span><h2>{t.remixTitle}</h2><p>{t.remixBody}</p><label htmlFor="starter-prompt">{t.starterPrompt}<textarea id="starter-prompt" value={starterPrompt} onChange={(event) => setStarterPrompt(event.target.value)} /></label><label htmlFor="remix-lens">{t.chooseLens}<select id="remix-lens" value={activeLens} onChange={(event) => setActiveLens(event.target.value)}>{lenses.flatMap((group) => group.lenses).map((lens) => <option key={lens.name} value={lens.name}>{lensLabel(lens, language)}</option>)}</select></label><label htmlFor="remix-idea">{t.remixLabel}<textarea id="remix-idea" value={remixIdea} onChange={(event) => setRemixIdea(event.target.value)} placeholder={t.remixPlaceholder} /></label><div className="chip-row">{quickEdits.map((edit) => <button key={edit.en} onClick={() => appendQuickEdit(edit)}>{edit[language]}</button>)}</div><button className="button button-primary full-button" disabled={generating || !currentPrompt.trim()} onClick={generateRemix}>{generating ? <><span className="button-spinner" aria-hidden="true" />{t.generatingNew}</> : t.generateNew} <span>→</span></button><p className="privacy-note">{t.privacy}</p></div>}</div></div>{!editMode && <div className="thumbnail-strip" aria-label={t.galleryChoose}>{selectedCategory.images.map((image, index) => <button key={image.id} aria-label={t.imageNumber(index)} className={index === (selected?.index ?? 0) ? "active" : ""} onClick={() => openGallery(selectedCategory.id, index)}><img src={image.src} alt="" /></button>)}</div>}</div></div>}
  </main>;
}
