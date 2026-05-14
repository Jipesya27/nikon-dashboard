export interface KodeposEntry {
  kelurahan: string[];
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
}

export const KODEPOS_DB: Record<string, KodeposEntry> = {
  // ── DKI Jakarta ──────────────────────────────────────────────────────────
  '10160': { kelurahan: ['Petojo Selatan'],        kecamatan: 'Gambir',            kabupaten: 'Kota Jakarta Pusat',   provinsi: 'DKI Jakarta' },
  '10630': { kelurahan: ['Kebon Kosong'],           kecamatan: 'Kemayoran',         kabupaten: 'Kota Jakarta Pusat',   provinsi: 'DKI Jakarta' },
  '10710': { kelurahan: ['Mangga Dua Selatan'],     kecamatan: 'Sawah Besar',       kabupaten: 'Kota Jakarta Pusat',   provinsi: 'DKI Jakarta' },
  '10730': { kelurahan: ['Mangga Dua Selatan'],     kecamatan: 'Sawah Besar',       kabupaten: 'Kota Jakarta Pusat',   provinsi: 'DKI Jakarta' },
  '11059': { kelurahan: ['Pademangan Barat','Pademangan Timur'], kecamatan: 'Pademangan', kabupaten: 'Kota Jakarta Utara', provinsi: 'DKI Jakarta' },
  '11480': { kelurahan: ['Kemanggisan'],            kecamatan: 'Palmerah',          kabupaten: 'Kota Jakarta Barat',   provinsi: 'DKI Jakarta' },
  '11540': { kelurahan: ['Sukabumi Utara'],         kecamatan: 'Kebon Jeruk',       kabupaten: 'Kota Jakarta Barat',   provinsi: 'DKI Jakarta' },
  '11610': { kelurahan: ['Kembangan Selatan'],      kecamatan: 'Kembangan',         kabupaten: 'Kota Jakarta Barat',   provinsi: 'DKI Jakarta' },
  '11720': { kelurahan: ['Kapuk'],                  kecamatan: 'Cengkareng',        kabupaten: 'Kota Jakarta Barat',   provinsi: 'DKI Jakarta' },
  '12230': { kelurahan: ['Cipulir'],                kecamatan: 'Kebayoran Lama',    kabupaten: 'Kota Jakarta Selatan', provinsi: 'DKI Jakarta' },
  '12750': { kelurahan: ['Rawa Jati'],              kecamatan: 'Pancoran',          kabupaten: 'Kota Jakarta Selatan', provinsi: 'DKI Jakarta' },
  '14350': { kelurahan: ['Sunter Agung'],           kecamatan: 'Tanjung Priok',     kabupaten: 'Kota Jakarta Utara',   provinsi: 'DKI Jakarta' },
  '14450': { kelurahan: ['Pluit'],                  kecamatan: 'Penjaringan',       kabupaten: 'Kota Jakarta Utara',   provinsi: 'DKI Jakarta' },

  // ── Banten ────────────────────────────────────────────────────────────────
  '15123': { kelurahan: ['Belendung'],              kecamatan: 'Benda',             kabupaten: 'Kota Tangerang',       provinsi: 'Banten' },
  '15225': { kelurahan: ['Pondok Karya'],           kecamatan: 'Pondok Aren',       kabupaten: 'Kota Tangerang Selatan', provinsi: 'Banten' },
  '15312': { kelurahan: ['Keranggan'],              kecamatan: 'Setu',              kabupaten: 'Kota Tangerang Selatan', provinsi: 'Banten' },
  '15332': { kelurahan: ['Curug Sangereng'],        kecamatan: 'Kelapa Dua',        kabupaten: 'Kabupaten Tangerang',  provinsi: 'Banten' },
  '15424': { kelurahan: ['Pondok Aren'],            kecamatan: 'Pondok Aren',       kabupaten: 'Kota Tangerang Selatan', provinsi: 'Banten' },
  '15534': { kelurahan: ['Medang'],                 kecamatan: 'Pagedangan',        kabupaten: 'Kabupaten Tangerang',  provinsi: 'Banten' },

  // ── Jawa Barat ────────────────────────────────────────────────────────────
  '16120': { kelurahan: ['Cibeuteung Muara'],       kecamatan: 'Ciseeng',           kabupaten: 'Kabupaten Bogor',      provinsi: 'Jawa Barat' },
  '16157': { kelurahan: ['Ciparigi'],               kecamatan: 'Bogor Utara',       kabupaten: 'Kota Bogor',           provinsi: 'Jawa Barat' },
  '16340': { kelurahan: ['Cibinong'],               kecamatan: 'Gunung Sindur',     kabupaten: 'Kabupaten Bogor',      provinsi: 'Jawa Barat' },
  '16517': { kelurahan: ['Curug'],                  kecamatan: 'Bojongsari',        kabupaten: 'Kota Depok',           provinsi: 'Jawa Barat' },
  '16810': { kelurahan: ['Kadu Manggu'],            kecamatan: 'Babakan Madang',    kabupaten: 'Kabupaten Bogor',      provinsi: 'Jawa Barat' },
  '16811': { kelurahan: ['Karang Tengah'],          kecamatan: 'Babakan Madang',    kabupaten: 'Kabupaten Bogor',      provinsi: 'Jawa Barat' },
  '16920': { kelurahan: ['Susukan'],                kecamatan: 'Bojong Gede',       kabupaten: 'Kabupaten Bogor',      provinsi: 'Jawa Barat' },
  '17122': { kelurahan: ['Perwira'],                kecamatan: 'Bekasi Utara',      kabupaten: 'Kota Bekasi',          provinsi: 'Jawa Barat' },
  '17136': { kelurahan: ['Bintara Jaya'],           kecamatan: 'Bekasi Barat',      kabupaten: 'Kota Bekasi',          provinsi: 'Jawa Barat' },
  '17320': { kelurahan: ['Burangkeng'],             kecamatan: 'Setu',              kabupaten: 'Kabupaten Bekasi',     provinsi: 'Jawa Barat' },
  '40191': { kelurahan: ['Cikadut'],                kecamatan: 'Cimenyan',          kabupaten: 'Kabupaten Bandung',    provinsi: 'Jawa Barat' },
  '40379': { kelurahan: ['Batukarut'],              kecamatan: 'Arjasari',          kabupaten: 'Kabupaten Bandung',    provinsi: 'Jawa Barat' },
  '41162': { kelurahan: ['Citeko'],                 kecamatan: 'Plered',            kabupaten: 'Kabupaten Purwakarta', provinsi: 'Jawa Barat' },
  '41357': { kelurahan: ['Jati Tengah'],            kecamatan: 'Tirtajaya',         kabupaten: 'Kabupaten Karawang',   provinsi: 'Jawa Barat' },
  '41363': { kelurahan: ['Parungmulya'],            kecamatan: 'Ciampel',           kabupaten: 'Kabupaten Karawang',   provinsi: 'Jawa Barat' },
  '43262': { kelurahan: ['Sukamaju'],               kecamatan: 'Cibeber',           kabupaten: 'Kabupaten Cianjur',    provinsi: 'Jawa Barat' },
  '43268': { kelurahan: ['Neglasari'],              kecamatan: 'Kadupandak',        kabupaten: 'Kabupaten Cianjur',    provinsi: 'Jawa Barat' },
  '45463': { kelurahan: ['Kertarahayu'],            kecamatan: 'Talaga',            kabupaten: 'Kabupaten Majalengka', provinsi: 'Jawa Barat' },

  // ── Jawa Tengah & DI Yogyakarta ──────────────────────────────────────────
  '50118': { kelurahan: ['Trimulyo'],               kecamatan: 'Genuk',             kabupaten: 'Kota Semarang',        provinsi: 'Jawa Tengah' },
  '50185': { kelurahan: ['Tambak Aji'],             kecamatan: 'Ngaliyan',          kabupaten: 'Kota Semarang',        provinsi: 'Jawa Tengah' },
  '55153': { kelurahan: ['Brontokusuman'],          kecamatan: 'Mergangsan',        kabupaten: 'Kota Yogyakarta',      provinsi: 'DI Yogyakarta' },
  '55198': { kelurahan: ['Banguntapan'],            kecamatan: 'Banguntapan',       kabupaten: 'Kabupaten Bantul',     provinsi: 'DI Yogyakarta' },
  '55281': { kelurahan: ['Caturtunggal'],           kecamatan: 'Depok',             kabupaten: 'Kabupaten Sleman',     provinsi: 'DI Yogyakarta' },
  '57134': { kelurahan: ['Gilingan'],               kecamatan: 'Banjarsari',        kabupaten: 'Kota Surakarta',       provinsi: 'Jawa Tengah' },
  '57176': { kelurahan: ['Gatak'],                  kecamatan: 'Colomadu',          kabupaten: 'Kabupaten Karanganyar',provinsi: 'Jawa Tengah' },
  '57452': { kelurahan: ['Wonoboyo'],               kecamatan: 'Jogonalan',         kabupaten: 'Kabupaten Klaten',     provinsi: 'Jawa Tengah' },
  '57481': { kelurahan: ['Bengking'],               kecamatan: 'Jatinom',           kabupaten: 'Kabupaten Klaten',     provinsi: 'Jawa Tengah' },
  '59182': { kelurahan: ['Kalimulyo'],              kecamatan: 'Jakenan',           kabupaten: 'Kabupaten Pati',       provinsi: 'Jawa Tengah' },

  // ── Jawa Timur ────────────────────────────────────────────────────────────
  '60174': { kelurahan: ['Alun-alun Contong'],      kecamatan: 'Bubutan',           kabupaten: 'Kota Surabaya',        provinsi: 'Jawa Timur' },
  '60224': { kelurahan: ['Gunung Sari'],            kecamatan: 'Dukuh Pakis',       kabupaten: 'Kota Surabaya',        provinsi: 'Jawa Timur' },
  '60299': { kelurahan: ['Panjang Jiwo'],           kecamatan: 'Tenggilis Mejoyo',  kabupaten: 'Kota Surabaya',        provinsi: 'Jawa Timur' },
  '61256': { kelurahan: ['Kepuhkiriman'],           kecamatan: 'Waru',              kabupaten: 'Kabupaten Sidoarjo',   provinsi: 'Jawa Timur' },
  '64116': { kelurahan: ['Campurejo'],              kecamatan: 'Mojoroto',          kabupaten: 'Kota Kediri',          provinsi: 'Jawa Timur' },
  '65163': { kelurahan: ['Kepanjen'],               kecamatan: 'Kepanjen',          kabupaten: 'Kabupaten Malang',     provinsi: 'Jawa Timur' },
  '68165': { kelurahan: ['Tembokrejo'],             kecamatan: 'Gumukmas',          kabupaten: 'Kabupaten Jember',     provinsi: 'Jawa Timur' },
  '68417': { kelurahan: ['Kebalenan'],              kecamatan: 'Banyuwangi',        kabupaten: 'Kabupaten Banyuwangi', provinsi: 'Jawa Timur' },

  // ── Sumatera ──────────────────────────────────────────────────────────────
  '20152': { kelurahan: ['Madras Hulu'],            kecamatan: 'Medan Polonia',     kabupaten: 'Kota Medan',           provinsi: 'Sumatera Utara' },
  '22615': { kelurahan: ['Lubuk Tukko'],            kecamatan: 'Pandan',            kabupaten: 'Kabupaten Tapanuli Tengah', provinsi: 'Sumatera Utara' },
  '23117': { kelurahan: ['Laumpang'],               kecamatan: 'Ulee Kareng',       kabupaten: 'Kota Banda Aceh',      provinsi: 'Aceh' },
  '25211': { kelurahan: ['Alang Laweh'],            kecamatan: 'Padang Selatan',    kabupaten: 'Kota Padang',          provinsi: 'Sumatera Barat' },
  '28293': { kelurahan: ['Tuah Karya'],             kecamatan: 'Tampan',            kabupaten: 'Kota Pekanbaru',       provinsi: 'Riau' },
  '29556': { kelurahan: ['Perhentian Luas'],        kecamatan: 'Logas Tanah Darat', kabupaten: 'Kabupaten Kuantan Singingi', provinsi: 'Riau' },
  '29566': { kelurahan: ['Pasar Benai'],            kecamatan: 'Benai',             kabupaten: 'Kabupaten Kuantan Singingi', provinsi: 'Riau' },
  '30966': { kelurahan: ['Cintamanis Baru'],        kecamatan: 'Air Kumbang',       kabupaten: 'Kabupaten Banyuasin',  provinsi: 'Sumatera Selatan' },
  '33149': { kelurahan: ['Air Itam'],               kecamatan: 'Bukit Intan',       kabupaten: 'Kota Pangkalpinang',   provinsi: 'Kepulauan Bangka Belitung' },
  '35139': { kelurahan: ['Pematang Wangi'],         kecamatan: 'Tanjung Senang',    kabupaten: 'Kota Bandar Lampung',  provinsi: 'Lampung' },
  '36124': { kelurahan: ['Legok'],                  kecamatan: 'Danau Sipin',       kabupaten: 'Kota Jambi',           provinsi: 'Jambi' },
  '37112': { kelurahan: ['Gedang'],                 kecamatan: 'Sungai Penuh',      kabupaten: 'Kota Sungai Penuh',    provinsi: 'Jambi' },
  '37171': { kelurahan: ['Hiang Lestari'],          kecamatan: 'Sitinjau Laut',     kabupaten: 'Kabupaten Kerinci',    provinsi: 'Jambi' },

  // ── Bali ──────────────────────────────────────────────────────────────────
  '80112': { kelurahan: ['Pemecutan'],              kecamatan: 'Denpasar Barat',    kabupaten: 'Kota Denpasar',        provinsi: 'Bali' },
  '80113': { kelurahan: ['Dauh Puri Kauh'],         kecamatan: 'Denpasar Barat',    kabupaten: 'Kota Denpasar',        provinsi: 'Bali' },
  '80117': { kelurahan: ['Padangsambian Kaja'],     kecamatan: 'Denpasar Barat',    kabupaten: 'Kota Denpasar',        provinsi: 'Bali' },
  '80224': { kelurahan: ['Sidakarya'],              kecamatan: 'Denpasar Selatan',  kabupaten: 'Kota Denpasar',        provinsi: 'Bali' },
  '80228': { kelurahan: ['Sanur'],                  kecamatan: 'Denpasar Selatan',  kabupaten: 'Kota Denpasar',        provinsi: 'Bali' },
  '80232': { kelurahan: ['Dauh Puri'],              kecamatan: 'Denpasar Barat',    kabupaten: 'Kota Denpasar',        provinsi: 'Bali' },
  '80238': { kelurahan: ['Penatih'],                kecamatan: 'Denpasar Timur',    kabupaten: 'Kota Denpasar',        provinsi: 'Bali' },
  '80511': { kelurahan: ['Pering'],                 kecamatan: 'Blahbatuh',         kabupaten: 'Kabupaten Gianyar',    provinsi: 'Bali' },
  '80571': { kelurahan: ['Ubud'],                   kecamatan: 'Ubud',              kabupaten: 'Kabupaten Gianyar',    provinsi: 'Bali' },
  '80582': { kelurahan: ['Batubulan Kangin'],       kecamatan: 'Sukawati',          kabupaten: 'Kabupaten Gianyar',    provinsi: 'Bali' },
  '82181': { kelurahan: ['Marga Dauh Puri'],        kecamatan: 'Marga',             kabupaten: 'Kabupaten Tabanan',    provinsi: 'Bali' },
  '82191': { kelurahan: ['Baturiti'],               kecamatan: 'Baturiti',          kabupaten: 'Kabupaten Tabanan',    provinsi: 'Bali' },

  // ── Kalimantan ────────────────────────────────────────────────────────────
  '70654': { kelurahan: ['Kertak Hanyar I'],        kecamatan: 'Kertak Hanyar',     kabupaten: 'Kabupaten Banjar',     provinsi: 'Kalimantan Selatan' },
  '75111': { kelurahan: ['Pasar Pagi'],             kecamatan: 'Samarinda Kota',    kabupaten: 'Kota Samarinda',       provinsi: 'Kalimantan Timur' },
  '75125': { kelurahan: ['Lok Bahu'],               kecamatan: 'Sungai Kunjang',    kabupaten: 'Kota Samarinda',       provinsi: 'Kalimantan Timur' },
  '76115': { kelurahan: ['Sepinggan'],              kecamatan: 'Balikpapan Selatan',kabupaten: 'Kota Balikpapan',      provinsi: 'Kalimantan Timur' },
  '76125': { kelurahan: ['Gunung Samarinda'],       kecamatan: 'Balikpapan Utara',  kabupaten: 'Kota Balikpapan',      provinsi: 'Kalimantan Timur' },

  // ── Sulawesi ──────────────────────────────────────────────────────────────
  '90174': { kelurahan: ['Baru'],                   kecamatan: 'Ujung Pandang',     kabupaten: 'Kota Makassar',        provinsi: 'Sulawesi Selatan' },
  '90222': { kelurahan: ['Balla Parang','Mappala'], kecamatan: 'Rappocini',         kabupaten: 'Kota Makassar',        provinsi: 'Sulawesi Selatan' },
  '90225': { kelurahan: ['Barombong'],              kecamatan: 'Tamalate',          kabupaten: 'Kota Makassar',        provinsi: 'Sulawesi Selatan' },
  '92119': { kelurahan: ['Bontoramba','Paccinongan'], kecamatan: 'Somba Opu',       kabupaten: 'Kabupaten Gowa',       provinsi: 'Sulawesi Selatan' },
  '92713': { kelurahan: ['Macege'],                 kecamatan: 'Tanete Riattang',   kabupaten: 'Kabupaten Bone',       provinsi: 'Sulawesi Selatan' },
  '93121': { kelurahan: ['Lahundape'],              kecamatan: 'Kendari Barat',     kabupaten: 'Kota Kendari',         provinsi: 'Sulawesi Tenggara' },
  '94231': { kelurahan: ['Tatura Selatan'],         kecamatan: 'Palu Selatan',      kabupaten: 'Kota Palu',            provinsi: 'Sulawesi Tengah' },
  '95127': { kelurahan: ['Dendengan Luar'],         kecamatan: 'Paal Dua',          kabupaten: 'Kota Manado',          provinsi: 'Sulawesi Utara' },
  '96266': { kelurahan: ['Marisa Selatan'],         kecamatan: 'Marisa',            kabupaten: 'Kabupaten Pohuwato',   provinsi: 'Gorontalo' },

  // ── Maluku Utara ──────────────────────────────────────────────────────────
  '87827': { kelurahan: ['Bukit Durian'],           kecamatan: 'Oba Utara',         kabupaten: 'Kota Tidore Kepulauan',provinsi: 'Maluku Utara' },

  // ── NTB ───────────────────────────────────────────────────────────────────
  '83372': { kelurahan: ['Dasan Geria'],            kecamatan: 'Lingsar',           kabupaten: 'Kabupaten Lombok Barat', provinsi: 'Nusa Tenggara Barat' },
};

export function lookupKodepos(kodepos: string): KodeposEntry | null {
  return KODEPOS_DB[kodepos] ?? null;
}
