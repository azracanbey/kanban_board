import type { Locale } from "@/lib/i18n/dictionaries";

export type BoardTemplateCard = {
  title: string;
  description: string;
};

export type BoardTemplateColumn = {
  title: string;
  color: string;
  cards: BoardTemplateCard[];
};

export type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  columns: BoardTemplateColumn[];
};

type LocalizedMeta = { name: string; description: string };

type LocalizedColumn = {
  color: string;
  tr: { title: string; cards: BoardTemplateCard[] };
  en: { title: string; cards: BoardTemplateCard[] };
};

/** Şablon sabitleri: her dil için isim, açıklama, sütun başlıkları ve örnek kartlar. */
export type BoardTemplateDefinition = {
  id: string;
  icon: string;
  tr: LocalizedMeta;
  en: LocalizedMeta;
  columns: LocalizedColumn[];
};

export const BOARD_TEMPLATE_DEFINITIONS: readonly BoardTemplateDefinition[] = [
  {
    id: "empty",
    icon: "⬜",
    tr: { name: "Boş Board", description: "Sıfırdan başla" },
    en: { name: "Empty board", description: "Start from scratch" },
    columns: [],
  },
  {
    id: "kanban",
    icon: "📋",
    tr: {
      name: "Kanban Klasik",
      description: "Yazılım ekipleri için standart akış",
    },
    en: {
      name: "Classic Kanban",
      description: "Standard flow for software teams",
    },
    columns: [
      {
        color: "#E2E5EA",
        tr: {
          title: "Backlog",
          cards: [
            { title: "Gereksinimleri topla", description: "Paydaşlarla görüşme planla" },
            { title: "Teknik analiz yap", description: "" },
          ],
        },
        en: {
          title: "Backlog",
          cards: [
            { title: "Gather requirements", description: "Schedule stakeholder review" },
            { title: "Technical analysis", description: "" },
          ],
        },
      },
      {
        color: "#C1C7FF",
        tr: { title: "Yapılacak", cards: [{ title: "Tasarım mockup'u hazırla", description: "" }] },
        en: { title: "To Do", cards: [{ title: "Prepare design mockup", description: "" }] },
      },
      {
        color: "#FFF0C1",
        tr: { title: "Devam Ediyor", cards: [] },
        en: { title: "In Progress", cards: [] },
      },
      {
        color: "#FFD1DD",
        tr: { title: "İncelemede", cards: [] },
        en: { title: "In Review", cards: [] },
      },
      {
        color: "#CEFFC1",
        tr: { title: "Tamamlandı", cards: [] },
        en: { title: "Done", cards: [] },
      },
    ],
  },
  {
    id: "scrum",
    icon: "🏃",
    tr: {
      name: "Scrum Sprint",
      description: "Sprint bazlı geliştirme süreci",
    },
    en: {
      name: "Scrum sprint",
      description: "Sprint-based delivery",
    },
    columns: [
      {
        color: "#E2E5EA",
        tr: {
          title: "Sprint Backlog",
          cards: [
            {
              title: "User story: Giriş ekranı",
              description: "Kullanıcı email ve şifre ile giriş yapabilmeli",
            },
            { title: "User story: Dashboard", description: "" },
          ],
        },
        en: {
          title: "Sprint backlog",
          cards: [
            {
              title: "User story: Login screen",
              description: "User can sign in with email and password",
            },
            { title: "User story: Dashboard", description: "" },
          ],
        },
      },
      {
        color: "#C1FFFF",
        tr: { title: "Geliştiriliyor", cards: [] },
        en: { title: "In development", cards: [] },
      },
      {
        color: "#FFF0C1",
        tr: { title: "Test Ediliyor", cards: [] },
        en: { title: "In testing", cards: [] },
      },
      {
        color: "#CEFFC1",
        tr: { title: "Done", cards: [] },
        en: { title: "Done", cards: [] },
      },
    ],
  },
  {
    id: "personal",
    icon: "✅",
    tr: {
      name: "Kişisel Görevler",
      description: "Günlük hayat ve kişisel projeler",
    },
    en: {
      name: "Personal tasks",
      description: "Daily life and side projects",
    },
    columns: [
      {
        color: "#FFD1DD",
        tr: {
          title: "Fikirler",
          cards: [
            { title: "Kitap oku", description: "" },
            { title: "Yeni dil öğren", description: "" },
          ],
        },
        en: {
          title: "Ideas",
          cards: [
            { title: "Read a book", description: "" },
            { title: "Learn a new language", description: "" },
          ],
        },
      },
      {
        color: "#FFF0C1",
        tr: { title: "Bu Hafta", cards: [] },
        en: { title: "This week", cards: [] },
      },
      {
        color: "#C1C7FF",
        tr: { title: "Bugün", cards: [] },
        en: { title: "Today", cards: [] },
      },
      {
        color: "#CEFFC1",
        tr: { title: "Tamamlandı", cards: [] },
        en: { title: "Done", cards: [] },
      },
    ],
  },
  {
    id: "marketing",
    icon: "📣",
    tr: {
      name: "Pazarlama",
      description: "Kampanya ve içerik takibi",
    },
    en: {
      name: "Marketing",
      description: "Campaigns and content pipeline",
    },
    columns: [
      {
        color: "#FFC1C1",
        tr: {
          title: "İçerik Fikirleri",
          cards: [
            { title: "Blog yazısı: AI trendleri", description: "" },
            { title: "Sosyal medya takvimi", description: "" },
          ],
        },
        en: {
          title: "Content ideas",
          cards: [
            { title: "Blog post: AI trends", description: "" },
            { title: "Social media calendar", description: "" },
          ],
        },
      },
      {
        color: "#FFF0C1",
        tr: { title: "Hazırlanıyor", cards: [] },
        en: { title: "In preparation", cards: [] },
      },
      {
        color: "#C1FFFF",
        tr: { title: "Onay Bekliyor", cards: [] },
        en: { title: "Awaiting approval", cards: [] },
      },
      {
        color: "#CEFFC1",
        tr: { title: "Yayınlandı", cards: [] },
        en: { title: "Published", cards: [] },
      },
    ],
  },
] as const;

export function resolveBoardTemplate(
  definition: BoardTemplateDefinition,
  locale: Locale,
): BoardTemplate {
  const lang = locale === "en" ? "en" : "tr";
  const meta = definition[lang];
  return {
    id: definition.id,
    icon: definition.icon,
    name: meta.name,
    description: meta.description,
    columns: definition.columns.map((col) => {
      const block = col[lang];
      return {
        title: block.title,
        color: col.color,
        cards: block.cards.map((c) => ({ ...c })),
      };
    }),
  };
}

export function getTemplateDefinitionById(
  id: string,
): BoardTemplateDefinition | undefined {
  return BOARD_TEMPLATE_DEFINITIONS.find((d) => d.id === id);
}
