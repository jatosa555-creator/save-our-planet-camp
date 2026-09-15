"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import categories from "../content/categories.json";
import heroSlides from "../content/hero.json";
import lenses from "../content/creative-lenses.json";
import themes from "../content/themes.json";
import { describeLens, visualGuidance } from "../lib/ai/prompt-guidance";

type Category = (typeof categories)[number];
type ImageRecord = Category["images"][number];
type Lens = (typeof lenses)[number]["lenses"][number];

type SelectedImage = {
  categoryId: string;
  index: number;
};

type GeneratedResult = {
  id: string;
  imageUrl: string;
  prompt: string;
  sourceImage?: string;
  createdAt: number;
  mock?: boolean;
  message?: string;
};

type ReferenceMode = "chat" | "template";

const commonQuickEdits = [
  "เพิ่มความหวัง",
  "ทำให้ปัญหาชัดขึ้น",
  "เปลี่ยนเป็นฉากโรงเรียน",
  "ใช้ฝาขวดเป็นสัญลักษณ์",
];

const chatStarters = [
  "ช่วยคิดภาพจากประเด็นน้ำ",
  "เปลี่ยนแนวคิดนี้ให้เป็น Contrast",
  "ทำให้ภาพนี้มีความหวังมากขึ้น",
  "เล่าเรื่องฝาขวดแบบไม่ซ้ำใคร",
];

const CHAT_ROUND_LIMIT = 4;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const inspirationIdeas = [
  {
    label: "น้ำดื่มในโรงเรียน",
    lens: "Contrast",
    place: "จุดเติมน้ำในโรงเรียน",
    tension: "นักเรียนยังซื้อขวดน้ำใช้ครั้งเดียว",
    reframe: "ให้ขวดใช้ครั้งเดียวกองอยู่ข้างจุดเติมน้ำ ขณะที่ขวดใช้ซ้ำเด่นอยู่กลางภาพ",
    audience: "อยากเริ่มพกขวดน้ำใช้ซ้ำ",
    idea: "ที่จุดเติมน้ำในโรงเรียน ขวดใช้ครั้งเดียวกองเพิ่มขึ้นทุกวัน ให้ภาพเปรียบเทียบกับขวดใช้ซ้ำที่ช่วยลดขยะ",
  },
  {
    label: "โรงอาหารไม่เหลือทิ้ง",
    lens: "Reveal",
    place: "โรงอาหารในโรงเรียน",
    tension: "อาหารเหลือและภาชนะใช้ครั้งเดียวถูกทิ้งรวมกัน",
    reframe: "เปิดฝาครอบถาดอาหารให้เห็นขยะที่ซ่อนอยู่ข้างใต้",
    audience: "อยากตักอาหารพอดีและแยกขยะ",
    idea: "ในโรงอาหารโรงเรียน เปิดให้เห็นว่าหลังมื้ออาหารมีอาหารเหลือและภาชนะใช้ครั้งเดียวซ่อนอยู่มากแค่ไหน",
  },
  {
    label: "ฝาขวดเปลี่ยนพื้นที่",
    lens: "Exaggerate",
    place: "ลานโรงเรียน",
    tension: "ฝาขวดเล็ก ๆ สะสมทุกวัน",
    reframe: "ขยายฝาขวดหนึ่งฝาให้ใหญ่จนปิดท่อระบายน้ำกลางลาน",
    audience: "เห็นคุณค่าของการแยกขยะ",
    idea: "ฝาขวดเล็ก ๆ ที่สะสมในโรงเรียนถูกขยายให้ใหญ่จนปิดท่อระบายน้ำ เพื่อให้เห็นผลของปริมาณสะสม",
  },
  {
    label: "ห้องเรียนใช้พลังงาน",
    lens: "Limit",
    place: "ห้องเรียนหลังเลิกเรียน",
    tension: "ไฟและพัดลมยังเปิดในห้องว่าง",
    reframe: "ทำให้พลังงานของโลกแสดงเป็นแบตเตอรี่ที่เหลือเพียง 1%",
    audience: "อยากปิดไฟก่อนออกจากห้อง",
    idea: "ห้องเรียนว่างหลังเลิกเรียนยังเปิดไฟและพัดลมอยู่ ให้แบตเตอรี่ของโลกเหลือ 1% เพื่อชวนคิดก่อนปิดสวิตช์",
  },
] as const;

const navItems = [
  ["หน้าแรก", "home"],
  ["เลนส์", "lenses"],
  ["นิทรรศการ", "exhibition"],
  ["สร้างภาพ", "create"],
  ["ผลงาน", "works"],
] as const;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function categoryById(id: string) {
  return categories.find((category) => category.id === id) ?? categories[0];
}

function getSessionId() {
  if (typeof window === "undefined") return "browser";
  const key = "save-our-planet-session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = `session-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, created);
  return created;
}

function prepareReferenceImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("กรุณาเลือกไฟล์รูปภาพ"));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error("รูปใหญ่เกินไป กรุณาเลือกไฟล์ไม่เกิน 12 MB"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("เตรียมรูปไม่สำเร็จ"));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("อ่านรูปนี้ไม่สำเร็จ"));
    };
    image.src = objectUrl;
  });
}

function getUserFacingError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "เชื่อมต่อไม่สำเร็จ ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง ไอเดียของคุณยังอยู่";
  }
  return message || fallback;
}

export default function Home() {
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
  const [template, setTemplate] = useState({
    place: "",
    tension: "",
    reframe: "",
    audience: "",
    object: "ฝาขวด",
    lens: "Contrast",
    mood: "สร้างแรงบันดาลใจ",
  });
  const [templatePrompt, setTemplatePrompt] = useState("");
  const pointerStart = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const setupInputRef = useRef<HTMLInputElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const selectedCategory = selected ? categoryById(selected.categoryId) : null;
  const selectedIndex = selected?.index ?? 0;
  const selectedImage: ImageRecord | null = selectedCategory && selected
    ? selectedCategory.images[selected.index]
    : null;

  useEffect(() => {
    const saved = window.localStorage.getItem("save-our-planet-works");
    if (saved) {
      try {
        setMyWorks(JSON.parse(saved));
      } catch {
        window.localStorage.removeItem("save-our-planet-works");
      }
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ openRouterConfigured?: boolean; setupEnabled?: boolean }>;
      })
      .then((data) => {
        if (!active || !data) return;
        const configured = Boolean(data.openRouterConfigured);
        setOpenRouterConfigured(configured);
        setSetupEnabled(data.setupEnabled !== false);
        if (!configured && data.setupEnabled !== false) setSetupOpen(true);
      })
      .catch(() => {
        if (active) setSetupEnabled(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!setupOpen) return;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => setupInputRef.current?.focus());
    return () => document.body.classList.remove("modal-open");
  }, [setupOpen]);

  useEffect(() => {
    const sectionElements = navItems
      .map(([, id]) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!("IntersectionObserver" in window) || sectionElements.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id) setActiveSection(visible.target.id);
    }, { rootMargin: "-18% 0px -60% 0px", threshold: [0.05, 0.25, 0.5] });
    sectionElements.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const interval = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroSlides.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selected) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setEditMode(false);
      }
      if (!editMode && event.key === "ArrowLeft") moveGallery(-1);
      if (!editMode && event.key === "ArrowRight") moveGallery(1);
      if (event.key === "Tab") {
        const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, [tabindex]:not([tabindex=\"-1\"])") ?? [])
          .filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("modal-open");
      previouslyFocusedRef.current?.focus();
    };
  }, [selected, editMode]);

  const currentPrompt = useMemo(() => {
    if (!selectedImage) return "";
    return [starterPrompt || selectedImage.starterPrompt, remixIdea].filter(Boolean).join("\n\n");
  }, [selectedImage, starterPrompt, remixIdea]);
  const filteredCategories = activeTheme ? categories.filter((category) => category.environmentThemes.includes(activeTheme)) : categories;
  const chatRounds = chatHistory.filter((message) => message.role === "user").length;

  function openGallery(categoryId: string, imageOrIndex: number | string) {
    const category = categoryById(categoryId);
    const index = typeof imageOrIndex === "number"
      ? imageOrIndex
      : category.images.findIndex((image) => image.id === imageOrIndex);
    if (index < 0 || !category.images[index]) return;
    const image = category.images[index];
    setSelected({ categoryId, index });
    setEditMode(false);
    setResult(null);
    setStarterPrompt(image.starterPrompt);
    setRemixIdea("");
    setStatus("");
  }

  function moveGallery(delta: number) {
    if (!selected || editMode) return;
    const category = categoryById(selected.categoryId);
    const nextIndex = (selected.index + delta + category.images.length) % category.images.length;
    openGallery(selected.categoryId, nextIndex);
  }

  function chooseLens(lens: Lens) {
    setActiveLens(lens.name);
    setRemixIdea((current) => current || `${lens.name}: ${lens.thai}`);
    scrollToSection("create");
  }

  function appendQuickEdit(edit: string) {
    setRemixIdea((current) => (current ? `${current}, ${edit}` : edit));
  }

  function useInspiration(inspiration: (typeof inspirationIdeas)[number]) {
    setChatText(inspiration.idea);
    setChatHistory([]);
    setChatPrompt("");
    setActiveLens(inspiration.lens);
    setTemplate((current) => ({
      ...current,
      place: inspiration.place,
      tension: inspiration.tension,
      reframe: inspiration.reframe,
      audience: inspiration.audience,
      lens: inspiration.lens,
    }));
    setTemplatePrompt("");
    setStatus(`ใส่แรงบันดาลใจ “${inspiration.label}” ให้แล้ว แก้ต่อได้เลย`);
  }

  function saveWork(work: GeneratedResult, notice = "เพิ่มภาพไว้ในผลงานของฉันแล้ว") {
    const next = [work, ...myWorks.filter((item) => item.id !== work.id)].slice(0, 12);
    setMyWorks(next);
    window.localStorage.setItem("save-our-planet-works", JSON.stringify(next));
    setStatus(notice);
  }

  async function generateRemix() {
    if (!selectedImage || generating) return;
    setGenerating(true);
    setStatus("กำลังเตรียมเวอร์ชันใหม่จากภาพต้นฉบับ…");
    try {
      const response = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify({
          sourceImage: selectedImage.src,
          sourceImageId: selectedImage.id,
          prompt: currentPrompt,
          lens: activeLens,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "สร้างภาพไม่สำเร็จ ลองใหม่อีกครั้ง");
      const generated: GeneratedResult = {
        id: `work-${Date.now()}`,
        imageUrl: data.imageUrl,
        sourceImage: selectedImage.src,
        prompt: currentPrompt,
        createdAt: Date.now(),
        mock: data.mock,
        message: data.message,
      };
      setResult(generated);
      setEditMode(false);
      saveWork(generated, "สร้างภาพเสร็จแล้ว เก็บในเครื่องนี้แล้ว อย่าลืมดาวน์โหลด");
    } catch (error) {
      setStatus(getUserFacingError(error, "สร้างภาพไม่สำเร็จ แต่ไอเดียของคุณยังอยู่ ลองใหม่ได้เลย"));
    } finally {
      setGenerating(false);
    }
  }

  async function runChat(mode: "coach" | "prompt") {
    const idea = chatText.trim();
    if (chatBusy) return;
    if (mode === "coach" && (!idea || chatRounds >= CHAT_ROUND_LIMIT)) return;
    if (mode === "prompt" && !idea && chatHistory.length === 0) return;
    setChatBusy(true);
    setStatus(mode === "coach" ? "กำลังคุยต่อกับ AI…" : "กำลังสรุปเป็น Visual Prompt…");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify({
          idea: idea || "ช่วยสรุปบทสนทนานี้เป็น Visual Prompt",
          lens: activeLens,
          mode,
          history: chatHistory,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ช่วยสรุปไอเดียไม่สำเร็จ");
      if (mode === "coach") {
        setChatHistory((current) => [
          ...current,
          { role: "user", content: idea },
          { role: "assistant", content: data.prompt || "ลองเล่ารายละเอียดเพิ่มอีกนิด" },
        ]);
        setChatText("");
        setChatPrompt("");
        const remaining = CHAT_ROUND_LIMIT - (chatRounds + 1);
        setStatus(remaining > 0 ? `คุยต่อได้อีก ${remaining} รอบ` : "ครบ 4 รอบแล้ว กดสร้าง Visual Prompt ได้เลย");
      } else {
        setChatPrompt(data.prompt || idea);
        setStatus("ได้ Visual Prompt แล้ว ลองอ่านและสร้างภาพต่อได้เลย");
      }
    } catch (error) {
      if (mode === "prompt" && idea) setChatPrompt(idea);
      setStatus(getUserFacingError(error, "ระบบช่วยสรุปไม่พร้อม ไอเดียของคุณยังอยู่ให้ลองใหม่ได้"));
    } finally {
      setChatBusy(false);
    }
  }

  function resetChat() {
    setChatHistory([]);
    setChatText("");
    setChatPrompt("");
    setStatus("เริ่มบทสนทนาใหม่แล้ว");
  }

  async function handleReferenceImage(event: React.ChangeEvent<HTMLInputElement>, mode: ReferenceMode) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const prepared = await prepareReferenceImage(file);
      if (mode === "chat") {
        setChatReferenceImage(prepared);
        setChatReferenceName(file.name);
      } else {
        setTemplateReferenceImage(prepared);
        setTemplateReferenceName(file.name);
      }
      setStatus("เพิ่มรูปอ้างอิงแล้ว รูปนี้จะถูกใช้ตอนสร้างภาพ");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "เพิ่มรูปไม่สำเร็จ");
    }
  }

  function clearReferenceImage(mode: ReferenceMode) {
    if (mode === "chat") {
      setChatReferenceImage(null);
      setChatReferenceName("");
    } else {
      setTemplateReferenceImage(null);
      setTemplateReferenceName("");
    }
    setStatus("ลบรูปอ้างอิงแล้ว");
  }

  function deleteWork(workId: string) {
    const work = myWorks.find((item) => item.id === workId);
    if (!work || !window.confirm("ลบผลงานนี้ออกจากเครื่องนี้ใช่ไหม")) return;
    const next = myWorks.filter((item) => item.id !== workId);
    setMyWorks(next);
    window.localStorage.setItem("save-our-planet-works", JSON.stringify(next));
    if (result?.id === workId) setResult(null);
    setStatus("ลบผลงานออกจากเครื่องนี้แล้ว");
  }

  async function submitOpenRouterKey(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!setupKey.trim() || setupBusy) return;
    setSetupBusy(true);
    setSetupMessage("กำลังตรวจสอบคีย์กับ OpenRouter…");
    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setupKey.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "เชื่อมต่อไม่สำเร็จ");
      setOpenRouterConfigured(true);
      setSetupKey("");
      setSetupOpen(false);
      setSetupMessage("");
      setStatus("เชื่อมต่อ OpenRouter สำเร็จแล้ว ลองใช้ Chat หรือสร้างภาพได้เลย");
    } catch (error) {
      setSetupMessage(error instanceof Error ? error.message : "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSetupBusy(false);
    }
  }

  function buildTemplatePrompt() {
    const prompt = [
      `สถานที่จริง: ${template.place || "โรงเรียนของฉัน"}`,
      `จุดชวนคิด: ${template.tension || "การใช้ทรัพยากรแบบเดิม"}`,
      `มุมมองใหม่: ${template.reframe.trim() || "ใช้วิธีมองด้านล่างเปลี่ยนวัตถุหลักให้สื่อจุดชวนคิด"}`,
      `วัตถุหลัก: ${template.object}`,
      `Creative Lens: ${describeLens(template.lens)}`,
      `คนดูควรรู้สึก: ${template.audience || "อยากเริ่มเปลี่ยนสิ่งเล็ก ๆ"}`,
      `บรรยากาศ: ${template.mood}`,
      visualGuidance,
    ].join("\n");
    setTemplatePrompt(prompt);
    setActiveLens(template.lens);
    setStatus("ประกอบ prompt จากไอเดียของคุณแล้ว");
  }

  async function generateFromPrompt(promptText: string, sourceImage?: string | null) {
    if (!promptText.trim() || generating) return;
    setGenerating(true);
    setStatus("กำลังเตรียมภาพตัวอย่าง…");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify({ prompt: promptText, sourceImage: sourceImage || undefined }),
      });
      const data = await response.json();
      if (!response.ok || typeof data.imageUrl !== "string") throw new Error(data.error || "generation failed");
      const generated: GeneratedResult = {
        id: `work-${Date.now()}`,
        imageUrl: data.imageUrl,
        prompt: promptText,
        createdAt: Date.now(),
        mock: data.mock,
        message: data.message,
      };
      setResult(generated);
      saveWork(generated, "สร้างภาพเสร็จแล้ว เก็บในเครื่องนี้แล้ว อย่าลืมดาวน์โหลด");
      scrollToSection("works");
    } catch (error) {
      setStatus(getUserFacingError(error, "สร้างภาพไม่สำเร็จ ลองตรวจ prompt แล้วกดใหม่อีกครั้ง"));
    } finally {
      setGenerating(false);
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!editMode) pointerStart.current = event.clientX;
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!editMode && pointerStart.current !== null) {
      const distance = event.clientX - pointerStart.current;
      if (Math.abs(distance) > 55) moveGallery(distance > 0 ? -1 : 1);
    }
    pointerStart.current = null;
  }

  return (
    <main aria-busy={generating}>
      <header className="site-header">
        <a className="brand" href="#home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">◒</span>
          <span><strong>CAP TO CHANGE</strong><small>Save Our Planet Camp</small></span>
        </a>
        <button className="menu-toggle" aria-expanded={menuOpen} aria-controls="main-nav" onClick={() => setMenuOpen((open) => !open)}>
          <span /> <span /> <span /> <b>เมนู</b>
        </button>
        <nav id="main-nav" className={menuOpen ? "main-nav open" : "main-nav"} aria-label="เมนูหลัก">
          {navItems.map(([label, id]) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>{label}</a>
          ))}
        </nav>
      </header>

      {generating && <div className="generation-toast" role="status" aria-live="polite">
        <span className="generation-spinner" aria-hidden="true" />
        <div><strong>กำลังสร้างภาพ…</strong><p>AI กำลังเปลี่ยนไอเดียของคุณ กรุณาอย่าปิดหน้านี้</p></div>
      </div>}

      <section id="home" className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">SAVE OUR PLANET CAMP · CREATIVE EXHIBITION</p>
          <h1>เรื่องเดิม<br /><em>มองด้วยสายตาใหม่</em></h1>
          <p className="hero-lead">เริ่มจากดูภาพหนึ่งภาพ เลือก Creative Lens หนึ่งอย่าง แล้วลองเปลี่ยนความคุ้นเคยให้กลายเป็นไอเดียของคุณ</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => scrollToSection("exhibition")}>เริ่มดูนิทรรศการ <span>↘</span></button>
            <button className="button button-ghost" onClick={() => scrollToSection("create")}>เริ่มสร้างภาพ</button>
          </div>
          <div className="hero-note"><span className="note-dot" /><span>Inspiration first · AI second</span><button className={openRouterConfigured ? "setup-link setup-ready" : "setup-link"} type="button" onClick={() => { setSetupMessage(""); setSetupOpen(true); }}>{openRouterConfigured ? "AI พร้อม" : "ตั้งค่า AI"}</button></div>
        </div>
        <div className="hero-visual" aria-label="ภาพตัวอย่างนิทรรศการ">
          <img src={heroSlides[heroIndex].src} alt={heroSlides[heroIndex].title} fetchPriority="high" />
          <div className="hero-caption">
            <span>0{heroIndex + 1} / 0{heroSlides.length}</span>
            <strong>{heroSlides[heroIndex].title}</strong>
            <p>{heroSlides[heroIndex].subtitle}</p>
          </div>
          <div className="hero-controls">
            <button aria-label="ภาพก่อนหน้า" onClick={() => setHeroIndex((heroIndex - 1 + heroSlides.length) % heroSlides.length)}>←</button>
            <div className="hero-dots" aria-label="เลือกภาพปก">
              {heroSlides.map((slide, index) => <button key={slide.id} aria-label={`ภาพที่ ${index + 1}`} className={index === heroIndex ? "active" : ""} onClick={() => setHeroIndex(index)} />)}
            </div>
            <button aria-label="ภาพถัดไป" onClick={() => setHeroIndex((heroIndex + 1) % heroSlides.length)}>→</button>
          </div>
        </div>
      </section>

      <section className="intro-strip">
        <div><span className="section-number">01</span><h2>เริ่มจากการสังเกต</h2></div>
        <p>1 ดูภาพ  ·  2 เลือกเลนส์  ·  3 เติมคำถามของคุณ  ·  4 สร้างภาพเวอร์ชันใหม่</p>
        <span className="scroll-hint">SCROLL TO EXPLORE ↓</span>
      </section>

      <section id="lenses" className="lenses-section section-shell">
        <div className="section-heading split-heading">
          <div><p className="eyebrow orange-text">02 · CREATIVE LENSES</p><h2>เครื่องมือเปลี่ยน<br /><em>สายตา</em></h2></div>
          <p>เลือกวิธีคิดหนึ่งอย่าง แล้วลองนำไปใช้กับสถานที่จริง วัตถุหนึ่งชิ้น และคำถามหนึ่งข้อ</p>
        </div>
        <div className="lens-layout">
          <div className="lens-reference">
            <img src="/content/references/creative-lenses.png" alt="แผ่นแนะนำ Creative Lenses สำหรับเปลี่ยนมุมมองในการเล่าเรื่องสิ่งแวดล้อม" loading="lazy" />
            <div className="lens-formula"><span>REAL PLACE</span><b>+</b><span>ONE TENSION</span><b>+</b><span>ONE LENS</span><b>+</b><span>ONE QUESTION</span></div>
          </div>
          <div className="lens-groups">
            {lenses.map((group) => (
              <div className={`lens-group ${group.color}`} key={group.group}>
                <div className="lens-group-title"><span>{group.group}</span><div><h3>{group.title}</h3><p>{group.thai} · {group.hint}</p></div></div>
                <div className="lens-grid">
                  {group.lenses.map((lens) => (
                    <button key={lens.name} className={activeLens === lens.name ? "lens-card selected" : "lens-card"} onClick={() => chooseLens(lens)}>
                      <strong>{lens.name}</strong><span>{lens.thai}</span><small>{lens.example}</small>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="theme-section section-shell">
        <div className="section-heading"><p className="eyebrow blue-text">03 · LOOK CLOSER</p><h2>ประเด็นที่อยู่<br /><em>รอบตัวเรา</em></h2><p>เลือกประเด็นที่อยากสำรวจ แล้วกลับไปดูผลงานด้วยคำถามของตัวเอง</p></div>
        <div className="theme-grid">
          {themes.map((theme, index) => <a key={theme.id} className={`theme-card theme-${index + 1}`} href="#exhibition" onClick={() => setActiveTheme(theme.title)}><span className="theme-index">0{index + 1}</span><h3>{theme.thai}</h3><strong>{theme.title}</strong><p>{theme.description}</p><span className="theme-arrow">↗</span></a>)}
        </div>
      </section>

      <section id="exhibition" className="exhibition-section section-shell">
        <div className="section-heading split-heading"><div><p className="eyebrow green-text">04 · THE EXHIBITION</p><h2>ผลงานที่ทำให้เรา<br /><em>หยุดคิด</em></h2></div><p>แตะภาพเพื่อเปิดดูรายละเอียดและคำถามชวนคิด ภาพจาก 4 ชุดนิทรรศการจะช่วยให้คุณเริ่มต้นได้ทันที</p></div>
        {activeTheme && <div className="filter-note"><span>กำลังดูผลงานที่เชื่อมกับ</span><strong>{activeTheme}</strong><button onClick={() => setActiveTheme(null)}>ดูทุกหมวด ×</button></div>}
        <div className="collection-list">
          {filteredCategories.map((category) => {
            const isExpanded = expanded[category.id];
            const featuredIds = new Set(category.featuredImageIds);
            const visibleImages = isExpanded ? category.images : category.images.filter((image) => featuredIds.has(image.id));
            return <article className={`collection collection-${category.accent}`} key={category.id}>
              <div className="collection-heading"><div><span className="collection-kicker">COLLECTION {category.id.toUpperCase()}</span><h3>{category.title} <small>{category.englishTitle}</small></h3><p>{category.description}</p></div><div className="collection-count"><strong>{category.images.length}</strong><span>ผลงาน</span></div></div>
              <div className="image-grid">
                {visibleImages.map((image) => <button className="image-card" key={image.id} onClick={() => openGallery(category.id, image.id)}>
                  <span className="image-frame"><img src={image.src} alt={`${image.title} — ${image.caption}`} loading="lazy" /><span className="image-open">เปิดดู ↗</span></span>
                  <span className="image-meta"><strong>{image.title}</strong><span>{image.lens.join(" · ")}</span><small>{image.caption}</small></span>
                </button>)}
              </div>
              {category.images.length > visibleImages.length && <button className="text-button" onClick={() => setExpanded((current) => ({ ...current, [category.id]: !isExpanded }))}>{isExpanded ? "แสดง 4 ผลงานเด่น" : `ดูอีก ${category.images.length - visibleImages.length} ผลงาน`} <span>↓</span></button>}
            </article>;
          })}
        </div>
      </section>

      <section id="create" className="create-section section-shell">
        <div className="section-heading split-heading"><div><p className="eyebrow orange-text">05 · CREATE</p><h2>ไอเดียของคุณ<br /><em>เริ่มตรงนี้</em></h2></div><p>จะเริ่มจากการคุยแบบอิสระ หรือใช้คำถามทีละขั้นก็ได้ ทั้งสองทางพาไปสู่ภาพเดียวกัน: ภาพที่มีความหมายกับคุณ</p></div>
        <div className="selected-lens-banner"><span>CREATIVE LENS ที่เลือก</span><strong>{activeLens}</strong><button onClick={() => scrollToSection("lenses")}>เปลี่ยนเลนส์</button></div>
        <p className="quota-note"><strong>โควตาสร้างภาพ 5 ครั้ง</strong> รวม Generate และ Remix ต่อเครื่อง/รอบการใช้งาน · Chat ยังใช้ช่วยพัฒนาไอเดียได้ และเมื่อครบแล้วนำ Visual Prompt ไปทำต่อใน ChatGPT ของตัวเองได้เลย</p>
        <div className="inspiration-panel">
          <div className="inspiration-heading"><div><span className="card-label">INSPIRATION STARTERS (แรงบันดาลใจ)</span><h3>ยังไม่รู้จะเริ่มอย่างไร? เลือกตัวอย่างได้เลย</h3></div><p>ตัวอย่างจะเติมให้ทั้ง Chat และ Template แล้วคุณแก้ให้เป็นเรื่องของตัวเองได้</p></div>
          <div className="inspiration-grid">
            {inspirationIdeas.map((inspiration) => <button type="button" className="inspiration-card" key={inspiration.label} onClick={() => useInspiration(inspiration)}>
              <strong>{inspiration.label}</strong><span>{inspiration.lens} · {inspiration.idea}</span><small>ใช้ตัวอย่างนี้ →</small>
            </button>)}
          </div>
        </div>
        <div className="creator-grid">
          <div className="creator-card chat-card">
            <div className="creator-card-top"><span className="creator-icon">✦</span><div><span className="card-label">CHAT MODE (คุยกับ AI)</span><h3>คุยกับ AI เพื่อพัฒนาไอเดีย</h3></div></div>
            <label htmlFor="chat-idea">เล่าให้ฟังว่าคุณอยากสื่ออะไร</label>
            <textarea id="chat-idea" value={chatText} onChange={(event) => setChatText(event.target.value)} placeholder="เช่น ในโรงเรียนมีขวดพลาสติกเยอะมาก อยากทำให้คนเห็นว่ามันจะอยู่ไปอีกนาน…" />
            <div className="chip-row">{chatStarters.map((starter) => <button key={starter} onClick={() => setChatText(starter)}>{starter}</button>)}</div>
            <p className="chat-round-note">คุยต่อได้สูงสุด {CHAT_ROUND_LIMIT} รอบ แล้วกดสร้าง Visual Prompt · ไม่หักโควตารูป</p>
            {chatHistory.length > 0 && <div className="chat-thread" aria-live="polite">{chatHistory.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "user" ? "คุณ" : "AI"}</span><p>{message.content}</p></div>)}<small>รอบสนทนา {chatRounds}/{CHAT_ROUND_LIMIT}</small></div>}
            <div className="reference-upload">
              <div><span className="card-label">OPTIONAL IMAGE REFERENCE (ภาพอ้างอิง)</span><p>เพิ่มรูปของคุณได้ รูปจะใช้เป็นต้นแบบตอนกดสร้างภาพ</p></div>
              <label className="upload-button" htmlFor="chat-reference-image">＋ เพิ่มรูป<input id="chat-reference-image" className="file-input" type="file" accept="image/*" onChange={(event) => handleReferenceImage(event, "chat")} /></label>
              {chatReferenceImage && <div className="reference-preview"><img src={chatReferenceImage} alt="ตัวอย่างรูปอ้างอิงของฉัน" /><span title={chatReferenceName}>{chatReferenceName}</span><button type="button" onClick={() => clearReferenceImage("chat")}>ลบ</button></div>}
            </div>
            <div className="chat-actions"><button className="button button-dark" disabled={!chatText.trim() || chatBusy || chatRounds >= CHAT_ROUND_LIMIT} onClick={() => runChat("coach")}>{chatBusy ? <><span className="button-spinner" aria-hidden="true" />กำลังคิด…</> : chatRounds >= CHAT_ROUND_LIMIT ? "ครบ 4 รอบแล้ว" : "คุยต่อกับ AI"} <span>→</span></button><button className="text-button" type="button" disabled={chatBusy || (!chatText.trim() && chatHistory.length === 0)} onClick={() => runChat("prompt")}>สร้าง Visual Prompt</button>{chatHistory.length > 0 && <button className="text-button chat-reset" type="button" disabled={chatBusy} onClick={resetChat}>เริ่มใหม่</button>}</div>
            {chatPrompt && <div className="prompt-result"><span>VISUAL PROMPT (คำสั่งสร้างภาพ)</span><p>{chatPrompt}</p><button className="button button-primary" disabled={generating} onClick={() => generateFromPrompt(chatPrompt, chatReferenceImage)}>{generating ? <><span className="button-spinner" aria-hidden="true" />กำลังสร้างภาพ…</> : "สร้างภาพจากไอเดียนี้"}</button></div>}
          </div>

          <div className="creator-card template-card">
            <div className="creator-card-top"><span className="creator-icon">◎</span><div><span className="card-label">TEMPLATE MODE (แบบฟอร์ม)</span><h3>เล่าไอเดียทีละขั้น</h3></div></div>
            <div className="template-form">
              <label>สถานที่จริง<input value={template.place} onChange={(event) => setTemplate({ ...template, place: event.target.value })} placeholder="เช่น โรงอาหารในโรงเรียน" /></label>
              <label>จุดชวนคิด / ปัญหา<textarea value={template.tension} onChange={(event) => setTemplate({ ...template, tension: event.target.value })} placeholder="คุณเห็นอะไรที่อยากชวนคนอื่นคิดต่อ" /></label>
              <label>อยากเปลี่ยนมุมมองอย่างไร<textarea value={template.reframe} onChange={(event) => setTemplate({ ...template, reframe: event.target.value })} placeholder="ลองบิด กลับด้าน ขยาย หรือทำให้สิ่งของมีบุคลิก" /></label>
              <div className="form-row"><label>วัตถุหลัก<select value={template.object} onChange={(event) => setTemplate({ ...template, object: event.target.value })}><option>ฝาขวด</option><option>ขวดน้ำ</option><option>ต้นไม้</option><option>สวิตช์ไฟ</option><option>สิ่งของใกล้ตัว</option></select></label><label>Creative Lens<select value={template.lens} onChange={(event) => setTemplate({ ...template, lens: event.target.value })}>{lenses.flatMap((group) => group.lenses).map((lens) => <option key={lens.name} value={lens.name}>{lens.name} ({lens.thai})</option>)}</select></label></div>
              <label>อยากให้คนดูรู้สึกหรือคิดอะไร<input value={template.audience} onChange={(event) => setTemplate({ ...template, audience: event.target.value })} placeholder="เช่น อยากลองเปลี่ยนของเล็ก ๆ หนึ่งอย่าง" /></label>
            </div>
            <div className="reference-upload">
              <div><span className="card-label">OPTIONAL IMAGE REFERENCE (ภาพอ้างอิง)</span><p>เพิ่มรูปของคุณได้ รูปจะใช้เป็นต้นแบบตอนกดสร้างภาพ</p></div>
              <label className="upload-button" htmlFor="template-reference-image">＋ เพิ่มรูป<input id="template-reference-image" className="file-input" type="file" accept="image/*" onChange={(event) => handleReferenceImage(event, "template")} /></label>
              {templateReferenceImage && <div className="reference-preview"><img src={templateReferenceImage} alt="ตัวอย่างรูปอ้างอิงของฉัน" /><span title={templateReferenceName}>{templateReferenceName}</span><button type="button" onClick={() => clearReferenceImage("template")}>ลบ</button></div>}
            </div>
            <button className="button button-outline full-button" onClick={buildTemplatePrompt}>ช่วยสร้าง Prompt <span>→</span></button>
            {templatePrompt && <div className="prompt-result"><span>YOUR PROMPT (คำสั่งของคุณ)</span><p>{templatePrompt}</p><button className="button button-primary" disabled={generating} onClick={() => generateFromPrompt(templatePrompt, templateReferenceImage)}>{generating ? <><span className="button-spinner" aria-hidden="true" />กำลังสร้างภาพ…</> : "สร้างภาพจากไอเดียนี้"}</button></div>}
          </div>
        </div>
        {status && <p className="global-status" role="status">{status}</p>}
      </section>

      <section id="works" className="works-section section-shell">
        <div className="section-heading split-heading"><div><p className="eyebrow blue-text">06 · REFLECT & SHARE</p><h2>ผลงาน<br /><em>ของฉัน</em></h2></div><p>เก็บภาพที่คุณสร้างไว้ในเครื่องนี้ แล้วลองถามตัวเองว่า ภาพนี้สื่อสิ่งที่ตั้งใจหรือยัง</p></div>
        {result && <div className="latest-result"><div><span className="card-label">ภาพล่าสุดจากไอเดียของคุณ</span><h3>ลองถามตัวเองว่า ภาพนี้เปลี่ยนความหมายไปอย่างไร</h3><p>{result.message || result.prompt}</p><div className="result-actions"><button className="button button-dark" onClick={() => saveWork(result)}>เก็บเข้าผลงานของฉันอีกครั้ง</button><a className="button button-outline" href={result.imageUrl} download>ดาวน์โหลดภาพใหม่</a></div><small className="download-hint">iPhone: หากไม่ดาวน์โหลด ให้แตะค้างที่ภาพแล้วเลือก “บันทึกรูปภาพ”</small></div><img src={result.imageUrl} alt="ภาพล่าสุดที่สร้างจากไอเดียของนักเรียน" /></div>}
        {myWorks.length === 0 && !result ? <div className="empty-works"><span>✦</span><h3>พื้นที่นี้รอไอเดียของคุณ</h3><p>เปิดภาพสักภาพ เลือก Creative Lens แล้วลอง Remix ดู</p><button className="button button-primary" onClick={() => scrollToSection("exhibition")}>กลับไปดูผลงาน</button></div> : myWorks.length > 0 ? <div className="works-grid">{myWorks.map((work) => <article className="work-card" key={work.id}><img src={work.imageUrl} alt="ภาพที่สร้างจากไอเดียของฉัน" loading="lazy" /><div><span>{new Date(work.createdAt).toLocaleDateString("th-TH")}</span><p>{work.prompt}</p><div className="work-card-actions"><a className="download-link" href={work.imageUrl} download>ดาวน์โหลดภาพ ↗</a><button className="text-button delete-work" type="button" onClick={() => deleteWork(work.id)}>ลบจากเครื่องนี้</button></div></div></article>)}</div> : null}
      </section>

      <nav className="mobile-bottom-nav" aria-label="ทางลัดบนมือถือ">
        {navItems.map(([label, id]) => <a key={id} className={activeSection === id ? "active" : undefined} aria-current={activeSection === id ? "location" : undefined} href={`#${id}`}><span>{id === "home" ? "⌂" : id === "lenses" ? "✦" : id === "exhibition" ? "▦" : id === "create" ? "＋" : "◌"}</span>{label}</a>)}
      </nav>

      <footer className="site-footer"><div><span className="brand-mark">◒</span><strong>CAP TO CHANGE</strong></div><p>Same place. New perspective.</p><span>Save Our Planet Camp · MVP</span></footer>

      {setupOpen && <div className="modal-backdrop setup-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !setupBusy) setSetupOpen(false); }}>
        <div className="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setup-title">
          <div className="setup-modal-header"><span>AI CONNECTION</span><button className="modal-close" aria-label="ปิดหน้าต่างตั้งค่า AI" disabled={setupBusy} onClick={() => setSetupOpen(false)}>×</button></div>
          <div className="setup-modal-body">
            <span className="card-label">OPENROUTER · นิทรรศการสิ่งแวดล้อม</span>
            <h2 id="setup-title">เชื่อม AI จริง<br /><em>วางคีย์ตรงนี้</em></h2>
            <p>คีย์จะถูกส่งไปตรวจสอบที่เซิร์ฟเวอร์เครื่องนี้ และบันทึกไว้ในไฟล์ตั้งค่าเท่านั้น ไม่เก็บในเบราว์เซอร์และไม่แสดงในหน้าเว็บ</p>
            {setupEnabled === false ? <div className="setup-manual-note">เว็บโหมด Production ปิดการกรอกคีย์จากหน้าเว็บ เพื่อความปลอดภัย ให้ใส่คีย์ในไฟล์ Environment ของ VPS แทน</div> : <form className="setup-form" onSubmit={submitOpenRouterKey}>
              <label htmlFor="openrouter-key">OpenRouter API Key<input ref={setupInputRef} id="openrouter-key" type="password" autoComplete="new-password" value={setupKey} onChange={(event) => setSetupKey(event.target.value)} placeholder="sk-or-…" spellCheck={false} /></label>
              <button className="button button-primary full-button" type="submit" disabled={setupBusy || !setupKey.trim()}>{setupBusy ? "กำลังตรวจสอบ…" : "บันทึกและเชื่อมต่อ AI"} <span>→</span></button>
              {setupMessage && <p className="setup-error" role="alert">{setupMessage}</p>}
            </form>}
            <p className="setup-safety">ไม่ต้องส่งคีย์มาในแชต และอย่าใส่คีย์ในไฟล์ที่อัปโหลดขึ้น GitHub</p>
          </div>
        </div>
      </div>}

      {selectedImage && selectedCategory && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setEditMode(false); } }}>
        <div ref={modalRef} className={editMode ? "gallery-modal edit-mode" : "gallery-modal"} role="dialog" aria-modal="true" aria-label={`ดูผลงาน ${selectedImage.title}`}>
          <div className="modal-header"><span>{selectedCategory.title} · {selectedIndex + 1} / {selectedCategory.images.length}</span><button ref={closeButtonRef} className="modal-close" aria-label="ปิดภาพ" onClick={() => { setSelected(null); setEditMode(false); }}>×</button></div>
          <div className="gallery-content">
            <div className="gallery-visual" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
              <img src={result?.imageUrl || selectedImage.src} alt={`${selectedImage.title} — ${selectedImage.caption}`} />
              {!editMode && <><button className="gallery-arrow gallery-prev" aria-label="ผลงานก่อนหน้า" onClick={() => moveGallery(-1)}>←</button><button className="gallery-arrow gallery-next" aria-label="ผลงานถัดไป" onClick={() => moveGallery(1)}>→</button></>}
              {result && <span className="result-badge">เวอร์ชันใหม่</span>}
            </div>
            <div className="gallery-info">
              {status && <p className="modal-status" role="status" aria-live="polite">{status}</p>}
              {!editMode ? <>
                <span className="card-label">{selectedImage.lens.join(" · ")}</span><h2>{selectedImage.title}</h2><p className="gallery-caption">{selectedImage.caption}</p><div className="message-box"><span>สิ่งที่ภาพนี้ชวนคิด</span><p>{selectedImage.message}</p></div>
                <div className="gallery-actions"><button className="button button-primary" onClick={() => { setEditMode(true); setResult(null); }}>Remix / Edit (ปรับภาพนี้)</button><a className="button button-outline" href={selectedImage.src} download>ดาวน์โหลดต้นฉบับ</a></div>
                {result && <div className="result-panel"><span className="card-label">ผลลัพธ์จากไอเดียของคุณ</span><p>{result.message || "ลองดูว่าภาพใหม่เปลี่ยนความหมายอย่างไร"}</p><div className="result-actions"><button className="button button-dark" onClick={() => saveWork(result)}>เก็บเข้าผลงานของฉัน</button><a className="button button-outline" href={result.imageUrl} download>ดาวน์โหลดภาพใหม่</a><button className="text-button" onClick={() => setEditMode(true)}>ปรับอีกครั้ง →</button></div><small className="download-hint">หากกดดาวน์โหลดไม่ได้ ให้แตะภาพค้าง แล้วเลือก “บันทึกรูปภาพ”</small></div>}
              </> : <div className="remix-panel">
                <button className="back-button" onClick={() => setEditMode(false)}>← กลับไปดูภาพ</button><span className="card-label">REMIX / EDIT (ปรับภาพ)</span><h2>ถ้าเปลี่ยนอีกหนึ่งอย่าง…</h2><p>เลือกสิ่งที่อยากเก็บไว้ แล้วเติมไอเดียของคุณลงไป</p>
                <label htmlFor="starter-prompt">Starter Prompt (คำสั่งตั้งต้น)<textarea id="starter-prompt" value={starterPrompt} onChange={(event) => setStarterPrompt(event.target.value)} /></label>
                <label htmlFor="remix-lens">เลือก Creative Lens (เลนส์สร้างสรรค์)<select id="remix-lens" value={activeLens} onChange={(event) => setActiveLens(event.target.value)}>{lenses.flatMap((group) => group.lenses).map((lens) => <option key={lens.name} value={lens.name}>{lens.name} ({lens.thai})</option>)}</select></label>
                <label htmlFor="remix-idea">ฉันอยากเปลี่ยนหรือเพิ่มอะไรในภาพนี้<textarea id="remix-idea" value={remixIdea} onChange={(event) => setRemixIdea(event.target.value)} placeholder="เช่น เพิ่มเด็ก ๆ ที่กำลังช่วยกันเก็บฝาขวด แล้วทำให้ภาพมีความหวังขึ้น" /></label>
                <div className="chip-row">{commonQuickEdits.map((edit) => <button key={edit} onClick={() => appendQuickEdit(edit)}>{edit}</button>)}</div>
                <button className="button button-primary full-button" disabled={generating || !currentPrompt.trim()} onClick={generateRemix}>{generating ? <><span className="button-spinner" aria-hidden="true" />กำลังสร้างเวอร์ชันใหม่…</> : "Generate (สร้างภาพใหม่)"} <span>→</span></button>
                <p className="privacy-note">ภาพต้นฉบับจะถูกใช้เป็น reference เพื่อสร้าง variation ใหม่ · ไม่ต้องสมัครสมาชิก</p>
              </div>}
            </div>
          </div>
          {!editMode && <div className="thumbnail-strip" aria-label="เลือกภาพในหมวดนี้">{selectedCategory.images.map((image, index) => <button key={image.id} aria-label={`ดูภาพที่ ${index + 1}`} className={index === selectedIndex ? "active" : ""} onClick={() => openGallery(selectedCategory.id, index)}><img src={image.src} alt="" /></button>)}</div>}
        </div>
      </div>}
    </main>
  );
}
