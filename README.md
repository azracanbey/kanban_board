# TaskFlow — Kanban Board Uygulaması

Koç Sistem NewChapter staj başvurusu kapsamında geliştirilen, yapay zekâ destekli Kanban proje yönetim uygulaması.

## Özellikler

- **Sürükle-Bırak:** @dnd-kit ile kartları sütunlar arasında taşıma, sütun sıralamasını değiştirme — masaüstü, mobil (touch) ve klavye desteği
- **AI Asistan (Groq LLM):** Doğal dil ile board oluşturma, kart taşıma/silme/ekleme, kartları alt görevlere bölme ve aciliyet puanı atama
- **Fractional Indexing:** Kart ve sütun sıralama verisini verimli saklama — taşıma işlemlerinde yalnızca tek satır güncellenir
- **Optimistic Updates:** UI anında güncellenir, hata durumunda otomatik geri alınır
- **Kimlik Doğrulama & Yetkilendirme:** Supabase Auth + Row Level Security — kullanıcılar yalnızca kendi board'larına erişir
- **Board Şablonları:** Kanban, Scrum Sprint, Pazarlama, Kişisel Görevler ve Boş Board seçenekleri
- **Dark / Light Tema** ve **Türkçe / İngilizce** dil desteği
- **Profil Yönetimi:** Görünen ad ve unvan düzenleme
- **Kart Kopyala & Yapıştır:** Kartları sütunlar arasında kopyalama
- **Güvenlik:** PII maskeleme, input sanitizasyonu (DOMPurify), rate limiting, audit logging

## Teknoloji Kararları

| Katman | Tercih | Gerekçe |
|--------|--------|---------|
| Framework | Next.js 16 (App Router) | Server/client component ayrımı, middleware, API route'lar |
| Veritabanı | Supabase (PostgreSQL) | RLS ile veritabanı seviyesinde güvenlik, Auth entegrasyonu |
| Sürükle-Bırak | @dnd-kit | React 19 uyumlu, hook-tabanlı, erişilebilir, touch + keyboard desteği |
| Sıralama | Fractional indexing + RPC | Taşıma başına tek UPDATE; server-side atomik pozisyon hesabı |
| AI | Groq (Llama 3.3 70B) | Hızlı inference, tool-calling desteği |
| Stil | Tailwind CSS 4 + CSS custom properties | Tasarım token'ları ile tutarlı tema sistemi |

## Mimari

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Login, Register sayfaları
│   ├── (dashboard)/          # Boards listesi, Board detay, Profil (korumalı)
│   └── api/ai/chat/          # AI asistan API endpoint
├── components/
│   ├── board/                # BoardView, Column, Card, DragOverlay, useBoardMutations
│   ├── auth/                 # LoginForm, RegisterForm
│   ├── ai/                   # AIChatSidebar, GlobalAIAssistantDrawer
│   ├── profile/              # ProfileForm
│   └── ui/                   # Button, Input, Modal, DashboardHeader
├── lib/
│   ├── supabase/             # Client (browser) ve Server (SSR) Supabase istemcileri
│   ├── security/             # Rate limit, PII maskeleme, sanitizasyon, audit log
│   ├── ai/                   # Board context builder, tool tanımları
│   ├── types/                # Board, Column, Card, Profile tip tanımları
│   ├── i18n/                 # TR/EN sözlük dosyaları
│   └── utils/                # Fractional indexing
├── providers/                # ThemeProvider, LanguageProvider, GlobalAIDrawer
└── middleware.ts             # Auth koruması (korumalı route'lar)

supabase/migrations/          # Veritabanı şeması (8 migration)
```

## Kurulum

### Gereksinimler

- Node.js 18+
- Supabase projesi ([supabase.com](https://supabase.com))
- Groq API anahtarı ([console.groq.com](https://console.groq.com))

### Adımlar

```bash
# 1. Bağımlılıkları yükle
npm install

# 2. Ortam değişkenlerini ayarla
cp .env.example .env.local
# .env.local dosyasını düzenle:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   GROQ_API_KEY=...

# 3. Supabase migration'larını çalıştır
# Supabase Dashboard → SQL Editor'de supabase/migrations/ altındaki
# dosyaları sırayla çalıştır (0001 → 0009)

# 4. Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini aç.

## Veritabanı Şeması

```
boards (id, user_id, title, position, created_at)
  └── columns (id, board_id, title, position, color, created_at)  [ON DELETE CASCADE]
       └── cards (id, column_id, title, description, position,    [ON DELETE CASCADE]
                  urgency_score, ai_magic_applied, created_at)

profiles (id → auth.users, display_name, title, avatar_url)
audit_logs (id, user_id, action, detail, ip, created_at)
```

Tüm tablolarda **Row Level Security** aktiftir — kullanıcılar yalnızca kendi verilerine erişebilir.

## Ekran Görüntüleri

> Uygulama dark ve light tema destekler. AI asistan sağ alt köşedeki buton ile açılır.

## Lisans

Bu proje Koç Sistem NewChapter staj değerlendirmesi için geliştirilmiştir.
