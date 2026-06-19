'use client';
import React, { useState } from 'react';
import type { MobileAppProps, MobileScreen } from './types';
import MobileShell from './MobileShell';
import LoginScreen      from './screens/LoginScreen';
import DashboardScreen  from './screens/DashboardScreen';
import ClaimsScreen     from './screens/ClaimsScreen';
import GaransiScreen    from './screens/GaransiScreen';
import ServiceScreen    from './screens/ServiceScreen';
import PromoScreen      from './screens/PromoScreen';
import PeminjamanScreen from './screens/PeminjamanScreen';
import KonsumenScreen   from './screens/KonsumenScreen';
import BayarScreen      from './screens/BayarScreen';
import AbsensiScreen    from './screens/AbsensiScreen';
import InfraScreen      from './screens/InfraScreen';

// Screens that show bottom nav
const BOTTOM_NAV_SCREENS: MobileScreen[] = [
  'dashboard','pesan','konsumen','klaim','garansi',
  'service','promo','peminjaman','bayar','absensi','infra',
];

export default function MobileApp(props: MobileAppProps) {
  const [screen, setScreen]       = useState<MobileScreen>('dashboard');
  const [drawerOpen, setDrawer]   = useState(false);

  const navigate = (s: MobileScreen) => { setScreen(s); setDrawer(false); };

  // ── Not logged in → show login ─────────────────────────────────────────
  if (!props.isLoggedIn) {
    return (
      <div style={{ position: 'fixed', inset: 0, maxWidth: 430, margin: '0 auto', background: '#1A1A1A', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui,sans-serif' }}>
        {/* Status bar */}
        <div style={{ height: 32, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 16px', gap: 6, flexShrink: 0 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#fff' }}>wifi</span>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#fff' }}>battery_full</span>
        </div>
        <LoginScreen
          loginForm={props.loginForm}
          setLoginForm={props.setLoginForm}
          loginError={props.loginError}
          handleLogin={props.handleLogin}
        />
      </div>
    );
  }

  const shellProps = {
    screen,
    drawerOpen,
    onDrawerOpen:  () => setDrawer(true),
    onDrawerClose: () => setDrawer(false),
    onNavigate:    navigate,
    currentUser:   props.currentUser,
    onLogout:      props.handleLogout,
    showBottomNav: BOTTOM_NAV_SCREENS.includes(screen),
  };

  const screenEl = (() => {
    switch (screen) {
      case 'dashboard':
        return (
          <DashboardScreen
            onDrawerOpen={() => setDrawer(true)}
            onNavigate={navigate}
            claims={props.claims}
            warranties={props.warranties}
            services={props.services}
            lendingRecords={props.lendingRecords}
            consumersList={props.consumersList}
            messages={props.messages}
            currentUser={props.currentUser}
            getClaimStatusColor={props.getClaimStatusColor}
          />
        );
      case 'klaim':
        return (
          <ClaimsScreen
            onDrawerOpen={() => setDrawer(true)}
            claims={props.claims}
            setClaims={props.setClaims}
            consumers={props.consumers}
            getClaimStatusColor={props.getClaimStatusColor}
            getBadgeLabel={props.getBadgeLabel}
            formatTglBeli={props.formatTglBeli}
            formatSubmitDate={props.formatSubmitDate}
            handleKirimStatusClaim={props.handleKirimStatusClaim}
            handlePrintLabelPengiriman={props.handlePrintLabelPengiriman}
            openModal={props.openModal}
            handleDelete={props.handleDelete}
            openImageViewer={props.openImageViewer}
            isGoogleDriveLink={props.isGoogleDriveLink}
            currentUser={props.currentUser}
          />
        );
      case 'garansi':
        return (
          <GaransiScreen
            onDrawerOpen={() => setDrawer(true)}
            warranties={props.warranties}
            setWarranties={props.setWarranties}
            openModal={props.openModal}
            handleDelete={props.handleDelete}
            openImageViewer={props.openImageViewer}
          />
        );
      case 'service':
        return (
          <ServiceScreen
            onDrawerOpen={() => setDrawer(true)}
            services={props.services}
            setServices={props.setServices}
            openModal={props.openModal}
            handleDelete={props.handleDelete}
          />
        );
      case 'promo':
        return (
          <PromoScreen
            onDrawerOpen={() => setDrawer(true)}
            promos={props.promos}
            setPromos={props.setPromos}
            openModal={props.openModal}
            handleDelete={props.handleDelete}
            currentUser={props.currentUser}
          />
        );
      case 'peminjaman':
        return (
          <PeminjamanScreen
            onDrawerOpen={() => setDrawer(true)}
            lendingRecords={props.lendingRecords}
            setLendingRecords={props.setLendingRecords}
            openModal={props.openModal}
            handleDelete={props.handleDelete}
          />
        );
      case 'konsumen':
        return (
          <KonsumenScreen
            onDrawerOpen={() => setDrawer(true)}
            consumersList={props.consumersList}
            openModal={props.openModal}
          />
        );
      case 'bayar':
        return <BayarScreen onDrawerOpen={() => setDrawer(true)} />;
      case 'absensi':
        return <AbsensiScreen onDrawerOpen={() => setDrawer(true)} />;
      case 'infra':
        return <InfraScreen onDrawerOpen={() => setDrawer(true)} />;
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d0d4d8' }}>construction</span>
            <div style={{ fontSize: 14, color: '#9aa0a6', fontWeight: 600 }}>Segera hadir</div>
          </div>
        );
    }
  })();

  return (
    <MobileShell {...shellProps}>
      {screenEl}
    </MobileShell>
  );
}
