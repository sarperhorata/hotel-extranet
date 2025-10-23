import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'
import { SocketProvider } from './contexts/SocketContext'

import Layout from './components/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Dashboard from './pages/Dashboard'
import Properties from './pages/properties/Properties'
import PropertyForm from './pages/properties/PropertyForm'
import Rooms from './pages/rooms/Rooms'
import RoomForm from './pages/rooms/RoomForm'
import Inventory from './pages/inventory/Inventory'
import Bookings from './pages/bookings/Bookings'
import BookingDetails from './pages/bookings/BookingDetails'
import Search from './pages/search/Search'
import Channels from './pages/channels/Channels'
import Rates from './pages/rates/Rates'
import Notifications from './pages/notifications/Notifications'

import ProtectedRoute from './components/ProtectedRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <SocketProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    
                    {/* Properties */}
                    <Route path="properties" element={<Properties />} />
                    <Route path="properties/new" element={<PropertyForm />} />
                    <Route path="properties/:id/edit" element={<PropertyForm />} />
                    
                    {/* Rooms */}
                    <Route path="rooms" element={<Rooms />} />
                    <Route path="rooms/new" element={<RoomForm />} />
                    <Route path="rooms/:id/edit" element={<RoomForm />} />
                    
                    {/* Inventory */}
                    <Route path="inventory" element={<Inventory />} />
                    
                    {/* Bookings */}
                    <Route path="bookings" element={<Bookings />} />
                    <Route path="bookings/:id" element={<BookingDetails />} />
                    
                    {/* Search */}
                    <Route path="search" element={<Search />} />
                    
                    {/* Channels */}
                    <Route path="channels" element={<Channels />} />
                    
                    {/* Rates */}
                    <Route path="rates" element={<Rates />} />
                    
                    {/* Notifications */}
                    <Route path="notifications" element={<Notifications />} />
                  </Route>
                  
                  {/* Catch all route */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
                
                <ToastContainer
                  position="top-right"
                  autoClose={5000}
                  hideProgressBar={false}
                  newestOnTop={false}
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                />
              </div>
            </Router>
          </SocketProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
