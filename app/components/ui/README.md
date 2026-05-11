# Nikon Dashboard — Design System & UI Components

Foundation untuk visual konsisten di seluruh page Nikon Dashboard.

## Filosofi

- **1 brand color**: Nikon yellow `#FFE500` untuk CTA & highlight saja
- **Status semantic**: 5 warna (`success`/`warning`/`danger`/`info`/`neutral`) untuk arti, bukan dekorasi
- **Dual theme**: `light` (admin pages) & `dark` (public pages)
- **Spacing**: kelipatan 4px (Tailwind default)
- **Typography**: 4 ukuran heading + 3 ukuran body, 2 weight (regular & bold)

## Quick Start

```tsx
import { Button, Card, Badge, Stat, StatGrid, EmptyState, PageHeader } from '@/app/components/ui';

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Validasi Pembayaran Event"
        subtitle="Approve atau tolak pendaftaran"
        breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Admin Event' }]}
        actions={<Button variant="primary">+ Tambah</Button>}
      />

      <StatGrid cols={4}>
        <Stat label="Total" value={142} />
        <Stat label="Disetujui" value={98} variant="success" />
        <Stat label="Pending" value={32} variant="warning" />
        <Stat label="Ditolak" value={12} variant="danger" />
      </StatGrid>

      <Card>
        <Card.Header
          title="Jamal Jipesya"
          subtitle="📱 0851-7809-2162"
          action={<Badge variant="success">Terdaftar</Badge>}
        />
        <p>Konten...</p>
        <Card.Footer>
          <Button variant="secondary" size="sm">Edit</Button>
          <Button variant="danger" size="sm">Hapus</Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
```

## Komponen

### `<Badge>`
Status indicator dengan semantic color.
```tsx
<Badge variant="success">Terdaftar</Badge>
<Badge variant="warning" theme="dark" uppercase>Menunggu</Badge>
<Badge variant="brand" icon="✨" size="xs">Premium</Badge>
```

Variants: `success` · `warning` · `danger` · `info` · `neutral` · `brand`

### `<Button>` / `<IconButton>`
```tsx
<Button variant="primary">Simpan</Button>
<Button variant="danger" loading>Hapus</Button>
<Button variant="secondary" leftIcon="📥" size="sm">Export CSV</Button>
<Button variant="ghost" theme="dark" fullWidth>Lihat Detail</Button>

<IconButton variant="ghost">✕</IconButton>
```

Variants: `primary` · `secondary` · `ghost` · `danger` · `success`
Sizes: `sm` · `md` · `lg`

### `<Card>`
```tsx
<Card padding="md" hoverable theme="light">
  <Card.Header
    icon="📅"
    title="Nikon Z9 Masterclass"
    subtitle="12 Agustus 2026"
    action={<Badge variant="success">Aktif</Badge>}
  />
  <p>...</p>
  <Card.Footer>
    <Button variant="secondary" size="sm">Edit</Button>
  </Card.Footer>
</Card>
```

### `<Stat>` / `<StatGrid>`
```tsx
<StatGrid cols={4}>
  <Stat label="Total" value={142} />
  <Stat label="Hadir" value={98} variant="success" delta={{ value: '+12', positive: true }} />
  <Stat
    label="Pending"
    value={44}
    variant="warning"
    onClick={() => filter('pending')}
    active
  />
</StatGrid>
```

### `<EmptyState>`
```tsx
<EmptyState
  icon="📅"
  title="Belum Ada Event"
  description="Tambahkan event pertama untuk mulai menerima pendaftaran."
  action={<Button variant="primary">+ Tambah Event</Button>}
/>
```

### `<PageHeader>` / `<Section>` / `<Divider>`
```tsx
<PageHeader
  title="Master Event"
  subtitle="Kelola semua event Nikon"
  breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Event' }]}
  icon="📅"
  actions={<Button>+ Tambah</Button>}
/>

<Section label="Filter" title="Cari Event">
  <input type="text" />
</Section>

<Divider />
```

## Design Tokens

Semua di `app/lib/design-system.ts`:
- `colors` — semantic colors
- `surfaces[theme]` — bg & border untuk theme
- `text[theme]` — text color hierarchy
- `radius` — `sm`/`md`/`lg`/`xl`/`full`
- `typography` — predefined text styles
- `focusRing` — class focus ring konsisten
- `transition` — class transition default
- `cn(...)` — class merger helper

## Theme

Setiap komponen accept prop `theme?: 'light' | 'dark'` (default `'light'`).

- **Light** — admin pages (`/`, `/admin/*`)
- **Dark** — public pages (`/events/register`, `/events/refund`)

Pakai theme yang sesuai context page.
