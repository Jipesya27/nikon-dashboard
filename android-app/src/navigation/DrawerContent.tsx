import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useAuth } from '../context/AuthContext';

interface DrawerItemProps {
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
  active?: boolean;
}

function DrawerItem({ label, icon, badge, onPress, active }: DrawerItemProps) {
  return (
    <TouchableOpacity
      style={[styles.drawerItem, active && styles.activeDrawerItem]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.drawerIcon}>{icon}</Text>
      <Text style={[styles.drawerLabel, active && styles.activeDrawerLabel]}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { karyawan, logout } = useAuth();
  const currentRouteName = props.state.routeNames[props.state.index];

  const navigateTo = (routeName: string) => {
    props.navigation.navigate(routeName);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>N</Text>
          </View>
          <Text style={styles.brandName}>Nikon Dashboard</Text>
        </View>

        <View style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {karyawan?.nama_karyawan?.substring(0, 2).toUpperCase() ?? 'SA'}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{karyawan?.nama_karyawan ?? 'Super Admin'}</Text>
            <Text style={styles.userRole}>{karyawan?.role ?? 'Admin'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.drawerContent} showsVerticalScrollIndicator={false}>
        <SectionTitle title="UTAMA" />
        <DrawerItem
          label="Dashboard"
          icon="🏠"
          onPress={() => navigateTo('Home')}
          active={currentRouteName === 'Home'}
        />
        <DrawerItem
          label="Pesan"
          icon="💬"
          badge={11}
          onPress={() => navigateTo('Chat')}
          active={currentRouteName === 'Chat'}
        />
        <DrawerItem
          label="Konsumen"
          icon="👤"
          onPress={() => navigateTo('Konsumen')}
          active={currentRouteName === 'Konsumen'}
        />

        <SectionTitle title="OPERASIONAL" />
        <DrawerItem label="Promo" icon="🏷️" onPress={() => navigateTo('Promo')} />
        <DrawerItem
          label="Claim Promo"
          icon="📋"
          badge={4}
          onPress={() => navigateTo('Claims')}
          active={currentRouteName === 'Claims'}
        />
        <DrawerItem
          label="Garansi"
          icon="🛡️"
          badge={58}
          onPress={() => navigateTo('Garansi')}
          active={currentRouteName === 'Garansi'}
        />
        <DrawerItem
          label="Service"
          icon="🔧"
          badge={1}
          onPress={() => navigateTo('Service')}
          active={currentRouteName === 'Service'}
        />
        <DrawerItem
          label="Peminjaman"
          icon="📦"
          badge={4}
          onPress={() => navigateTo('Peminjaman')}
          active={currentRouteName === 'Peminjaman'}
        />
        <DrawerItem label="Barang Aset" icon="🏢" onPress={() => navigateTo('BarangAset')} />
        <DrawerItem label="Transaksi Dealer" icon="🛒" onPress={() => navigateTo('TransaksiDealer')} />
        <DrawerItem label="Affiliate" icon="🔗" onPress={() => navigateTo('Affiliate')} />
        <DrawerItem label="Upload File Resi" icon="📤" onPress={() => navigateTo('UploadResi')} />

        <SectionTitle title="EVENT" />
        <DrawerItem label="1. Proposal Event" icon="📄" onPress={() => navigateTo('ProposalEvent')} />
        <DrawerItem
          label="2. Daftar Event"
          icon="📅"
          onPress={() => navigateTo('Events')}
          active={currentRouteName === 'Events'}
        />
        <DrawerItem label="3. Data Peserta" icon="👥" onPress={() => navigateTo('DataPeserta')} />
        <DrawerItem label="4. Report Event (SG)" icon="📊" onPress={() => navigateTo('ReportEvent')} />
        <DrawerItem
          label="5. Claim Biaya"
          icon="💰"
          onPress={() => navigateTo('ExpenseClaims')}
          active={currentRouteName === 'ExpenseClaims'}
        />

        <SectionTitle title="MANAJEMEN" />
        <DrawerItem label="Import Data" icon="📥" onPress={() => navigateTo('ImportData')} />
        <DrawerItem label="User Role" icon="👥" badge={15} onPress={() => navigateTo('UserRole')} />
        <DrawerItem label="Bot Settings" icon="⚙️" badge={12} onPress={() => navigateTo('BotSettings')} />
        <DrawerItem label="Saran Isian" icon="⚡" onPress={() => navigateTo('SaranIsian')} />
        <DrawerItem label="WA Templates" icon="📝" onPress={() => navigateTo('WaTemplates')} />
        <DrawerItem label="Infrastruktur" icon="💻" onPress={() => navigateTo('Infrastruktur')} />

        <SectionTitle title="HALAMAN ADMIN" />
        <DrawerItem label="Validasi Pembayaran" icon="✅" onPress={() => navigateTo('ValidasiPembayaran')} />
        <DrawerItem label="Deposit & Refund" icon="💵" onPress={() => navigateTo('DepositRefund')} />
        <DrawerItem label="Absensi Event" icon="📋" onPress={() => navigateTo('AbsensiEvent')} />

        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandIcon: {
    width: 32, height: 32, backgroundColor: '#FFE500', borderRadius: 6,
    alignItems: 'center', justifyCenter: 'center', marginRight: 10,
  },
  brandIconText: { fontWeight: '900', fontSize: 18, color: '#1A1A1A' },
  brandName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 12 },
  userAvatar: {
    width: 40, height: 40, backgroundColor: '#FFE500', borderRadius: 20,
    alignItems: 'center', justifyCenter: 'center', marginRight: 12,
  },
  userAvatarText: { fontWeight: '800', fontSize: 14, color: '#1A1A1A' },
  userName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  userRole: { fontSize: 11, color: '#9aa0a6', fontWeight: '500' },
  drawerContent: { flex: 1, paddingHorizontal: 10 },
  sectionTitle: {
    fontSize: 11, fontWeight: '800', color: '#adb5bd',
    marginTop: 20, marginBottom: 10, marginLeft: 15, letterSpacing: 1,
  },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    paddingHorizontal: 15, borderRadius: 10, marginBottom: 2,
  },
  activeDrawerItem: { backgroundColor: '#FFE500', color: '#1A1A1A' },
  drawerIcon: { fontSize: 20, marginRight: 12 },
  drawerLabel: { fontSize: 14, fontWeight: '600', color: '#495057', flex: 1 },
  activeDrawerLabel: { color: '#1A1A1A', fontWeight: '700' },
  badge: {
    backgroundColor: '#f1f3f5', paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: 10, minWidth: 24, alignItems: 'center',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#adb5bd' },
  footer: { marginTop: 20, marginBottom: 30, paddingHorizontal: 5 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    backgroundColor: '#fff5f5', borderRadius: 10,
  },
  logoutIcon: { fontSize: 18, marginRight: 12 },
  logoutText: { fontSize: 14, fontWeight: '700', color: '#fa5252' },
});
