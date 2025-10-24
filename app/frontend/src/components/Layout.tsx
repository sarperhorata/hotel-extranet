import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import {
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CHeaderToggler,
  CNavLink,
  CNavItem,
  CSidebar,
  CSidebarBrand,
  CSidebarNav,
  CSidebarToggler,
  CNavTitle,
  CNavGroup,
  CNavGroupItems,
  CBadge,
  CButton,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CDropdownDivider,
  CWidgetStatsC,
} from '@coreui/react';
import {
  cilSpeedometer,
  cilBuilding,
  cilBed,
  cilCalendar,
  cilSearch,
  cilCreditCard,
  cilSettings,
  cilBell,
  cilAccountLogout,
  cilUser,
  cilMenu,
  cilChartLine,
} from '@coreui/icons';
import CIcon from '@coreui/icons-react';

import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

const Layout: React.FC = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarUnfoldable, setSidebarUnfoldable] = useState(false);
  const { user, logout } = useAuth();
  const { notifications, isConnected } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unreadNotifications = notifications.filter(n => !n.isRead).length;

  const navigation = [
    {
      name: 'Dashboard',
      to: '/dashboard',
      icon: cilSpeedometer,
    },
    {
      name: 'Properties',
      to: '/properties',
      icon: cilBuilding,
      children: [
        { name: 'All Properties', to: '/properties' },
        { name: 'Add Property', to: '/properties/new' },
      ],
    },
    {
      name: 'Rooms',
      to: '/rooms',
      icon: cilBed,
      children: [
        { name: 'All Rooms', to: '/rooms' },
        { name: 'Add Room', to: '/rooms/new' },
      ],
    },
    {
      name: 'Inventory',
      to: '/inventory',
      icon: cilCalendar,
    },
    {
      name: 'Bookings',
      to: '/bookings',
      icon: cilSearch,
    },
    {
      name: 'Search',
      to: '/search',
      icon: cilSearch,
    },
    {
      name: 'Channels',
      to: '/channels',
      icon: cilSettings,
    },
    {
      name: 'Rates',
      to: '/rates',
      icon: cilChartLine,
    },
    {
      name: 'Payments',
      to: '/payments',
      icon: cilCreditCard,
    },
    {
      name: 'Notifications',
      to: '/notifications',
      icon: cilBell,
      badge: unreadNotifications > 0 ? unreadNotifications : undefined,
    },
  ];

  return (
    <div className="c-app c-default-layout">
      <CSidebar
        visible={sidebarVisible}
        unfoldable={sidebarUnfoldable}
        onVisibleChange={setSidebarVisible}
        className="sidebar"
      >
        <CSidebarBrand className="d-md-down-none">
          <CIcon icon={cilBuilding} className="sidebar-brand-full" height={35} />
          <span className="ms-2">Hotel Extranet</span>
        </CSidebarBrand>

        <CSidebarNav>
          <CNavTitle>Navigation</CNavTitle>
          {navigation.map((item) => (
            <React.Fragment key={item.name}>
              {item.children ? (
                <CNavGroup
                  toggler={
                    <>
                      <CIcon icon={item.icon} className="nav-icon" />
                      {item.name}
                      {item.badge && (
                        <CBadge color="danger" className="ms-auto">
                          {item.badge}
                        </CBadge>
                      )}
                    </>
                  }
                >
                  {item.children.map((child) => (
                    <CNavGroupItems key={child.to}>
                      <CNavLink as={NavLink} to={child.to}>
                        {child.name}
                      </CNavLink>
                    </CNavGroupItems>
                  ))}
                </CNavGroup>
              ) : (
                <CNavItem>
                  <CNavLink as={NavLink} to={item.to}>
                    <CIcon icon={item.icon} className="nav-icon" />
                    {item.name}
                    {item.badge && (
                      <CBadge color="danger" className="ms-auto">
                        {item.badge}
                      </CBadge>
                    )}
                  </CNavLink>
                </CNavItem>
              )}
            </React.Fragment>
          ))}
        </CSidebarNav>

        <CSidebarToggler
          className="d-none d-lg-flex"
          onClick={() => setSidebarUnfoldable(!sidebarUnfoldable)}
        />
      </CSidebar>

      <div className="c-wrapper">
        <CHeader position="sticky" className="header">
          <CContainer fluid>
            <CHeaderToggler
              className="ms-md-3 d-lg-none"
              onClick={() => setSidebarVisible(!sidebarVisible)}
            >
              <CIcon icon={cilMenu} size="lg" />
            </CHeaderToggler>

            <CHeaderBrand className="mx-auto d-md-none">
              <CIcon icon={cilBuilding} height={35} />
            </CHeaderBrand>

            <CHeaderNav className="ms-3">
              {/* Connection Status */}
              <CNavItem>
                <CBadge
                  color={isConnected ? 'success' : 'danger'}
                  className="me-2"
                >
                  {isConnected ? 'Online' : 'Offline'}
                </CBadge>
              </CNavItem>

              {/* Notifications */}
              <CNavItem>
                <CNavLink href="#/notifications" className="position-relative">
                  <CIcon icon={cilBell} size="lg" />
                  {unreadNotifications > 0 && (
                    <CBadge
                      color="danger"
                      className="position-absolute top-0 start-100 translate-middle p-1 rounded-circle"
                    >
                      <span className="visually-hidden">unread notifications</span>
                    </CBadge>
                  )}
                </CNavLink>
              </CNavItem>

              {/* User Menu */}
              <CDropdown variant="nav-item">
                <CDropdownToggle placement="bottom-end" className="py-0" caret={false}>
                  <CIcon icon={cilUser} className="me-2" />
                  {user?.firstName} {user?.lastName}
                </CDropdownToggle>
                <CDropdownMenu className="pt-0">
                  <CDropdownItem href="#/profile">
                    <CIcon icon={cilUser} className="me-2" />
                    Profile
                  </CDropdownItem>
                  <CDropdownItem href="#/settings">
                    <CIcon icon={cilSettings} className="me-2" />
                    Settings
                  </CDropdownItem>
                  <CDropdownDivider />
                  <CDropdownItem onClick={handleLogout}>
                    <CIcon icon={cilAccountLogout} className="me-2" />
                    Logout
                  </CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </CHeaderNav>
          </CContainer>
        </CHeader>

        <div className="c-body">
          <main className="c-main">
            <CContainer fluid className="main">
              <Outlet />
            </CContainer>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
