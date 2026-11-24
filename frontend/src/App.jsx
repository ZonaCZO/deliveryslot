import './App.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, warsawDate, warsawTime, statusLabel } from './api'

// Refactor guide: all target paths below are relative to frontend/src/.
// Keep App.jsx as the composition root: session, activePage and page selection.
// Extract incrementally; preserve API payloads, CSS classes and current behavior.
function App() {
  // TODO -> hooks/useAuth.js: session/token/isStaff, login/logout and 401 handling.
  // Clear booking/slot state in App when the authenticated user changes.
  // Keep bearer credentials in memory; refreshing the page requires sign-in.
  const [session, setSession] = useState(null)
  const [activePage, setActivePage] = useState('booking')
  // TODO -> hooks/useDeliveryData.js: warehouse/date selection, slots, bookings,
  // loading/revision, data-loading effects, booking/cancellation and filter reset.
  // Return data/actions to BookingPage and StaffSchedulePage; do not duplicate API state.
  const [warehouses, setWarehouses] = useState([])
  const [warehouse, setWarehouse] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [bookingConfirmation, setBookingConfirmation] = useState(null)
  const [pendingCancelId, setPendingCancelId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const actionLock = useRef(false)
  const [now, setNow] = useState(() => Date.now())
  const token = session?.token
  const isStaff = session?.user.role === 'warehouse_staff'

  // TODO -> hooks/useNow.js: move the clock state and this effect together;
  // expose now to date inputs, SlotList and MyBookings for time-based UI checks.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // TODO -> hooks/useAuth.js: expose an unauthorized-session handler.
  // Keep ordinary request errors with their owning page/hook; preserve AbortError handling.
  const handleError = useCallback(error => {
    if (error.name === 'AbortError') return
    if (error.status === 401 && token) {
      setSession(null)
      setBookings([])
      setSlots([])
      setSelectedSlot(null)
      setBookingConfirmation(null)
      setError('Your session has expired. Please sign in again.')
    } else setError(error.message)
  }, [token])

  // TODO -> hooks/useDeliveryData.js: move all three loading effects below.
  // Preserve AbortController cleanup, token dependencies and carrier/staff route selection.
  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    api('/warehouses', { token, signal: controller.signal })
      .then(setWarehouses).catch(handleError)
    return () => controller.abort()
  }, [token, handleError])

  useEffect(() => {
    if (!token || isStaff) return
    const controller = new AbortController()
    api('/bookings/my', { token, signal: controller.signal })
      .then(setBookings).catch(handleError)
    return () => controller.abort()
  }, [token, isStaff, revision, handleError])

  useEffect(() => {
    if (!token || !warehouse || !deliveryDate) return
    const controller = new AbortController()
    api(`${isStaff ? '/staff/schedule' : '/slots'}?date=${deliveryDate}`, { token, signal: controller.signal })
      .then(setSlots).catch(handleError)
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [token, warehouse, deliveryDate, revision, isStaff, handleError])

  // TODO -> hooks/useAsyncAction.js: move runAction with busy/error/actionLock.
  // Preserve the synchronous ref lock so double-clicks cannot submit twice.
  async function runAction(work) {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true)
    setError('')
    try { await work() } catch (error) { handleError(error) }
    finally { actionLock.current = false; setBusy(false) }
  }

  // TODO -> pages/LoginPage.jsx: read form fields there, then call useAuth.login.
  // Keep navigation and delivery-state reset in App after a successful login.
  function handleSubmit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    runAction(async () => {
      const result = await api('/auth/login', { method: 'POST', body: { email: form.get('email'), password: form.get('password') } })
      setSession(result)
      setActivePage('booking')
      setWarehouses([])
      setWarehouse('')
      setDeliveryDate('')
    })
  }

  // TODO -> components/BookingForm.jsx: keep FormData extraction/form reset in the form.
  // TODO -> hooks/useDeliveryData.js: accept a plain booking payload, send POST,
  // update confirmation and refresh data. Preserve the 409 refresh/selection reset.
  function handleBooking(event) {
    event.preventDefault()
    if (!selectedSlot) return
    const form = event.currentTarget
    const fields = new FormData(form)
    runAction(async () => {
      try {
        const result = await api('/bookings', { token, method: 'POST', body: {
          slotId: selectedSlot.id, carrierName: fields.get('carrierName'),
          truckRegistration: fields.get('truckRegistration'), contactEmail: fields.get('contactEmail'),
        } })
        setBookingConfirmation({ ...result, ...selectedSlot, id: result.id, carrier_name: fields.get('carrierName') })
        setSelectedSlot(null)
        setSlots([])
        setLoading(true)
        setRevision(value => value + 1)
        form.reset()
      } catch (error) {
        if (error.status === 409) {
          setSelectedSlot(null)
          setSlots([])
          setLoading(true)
          setRevision(value => value + 1)
        }
        throw error
      }
    })
  }

  // TODO -> hooks/useDeliveryData.js: move cancellation and availability refresh here.
  // MyBookings receives onCancel; ownership/time validation remains on the backend.
  function handleCancelBooking(booking) {

    runAction(async () => {
      await api(`/bookings/${booking.id}/cancel`, { token, method: 'PATCH' })
      setBookings(items => items.map(item => item.id === booking.id ? { ...item, status: 'cancelled' } : item))
      setBookingConfirmation(null)
      setPendingCancelId(null)
      setRevision(value => value + 1)
    })
  }

  // TODO -> hooks/useAuth.js: revoke the backend session on logout.
  // App should clear user-specific page data after successful logout.
  function handleLogout() {
    runAction(async () => {
      await api('/auth/logout', { token, method: 'POST' })
      setSession(null)
      setBookings([])
      setSlots([])
      setSelectedSlot(null)
      setBookingConfirmation(null)
    })
  }

  // TODO -> hooks/useDeliveryData.js: preserve resetting stale slot selection
  // and confirmation whenever warehouse/date changes.
  function changeFilter(setter, value) {
    setter(value)
    setSelectedSlot(null)
    setSlots([])
    setBookingConfirmation(null)
    setError('')
    setLoading(true)
  }

  // TODO -> pages/LoginPage.jsx: extract this entire unauthenticated return.
  // Props: onSubmit, busy, error. Preserve labels, autocomplete and required fields.
  if (!session) return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">DSBS</h1>
        <p>Sign in to manage your deliveries.</p>
        {error && <p role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" placeholder="you@company.com" required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )

  return (
    <main className="login-page">
      <section className="login-card">
        {/* TODO -> components/Navigation.jsx: extract this nav; props activePage, isStaff, onNavigate. */}
        <nav aria-label="Main navigation">
          <button type="button" onClick={() => setActivePage('booking')} aria-current={activePage === 'booking' ? 'page' : undefined}>
            {isStaff ? 'Delivery schedule' : 'Book a delivery'}
          </button>{' '}
          <button type="button" onClick={() => setActivePage('profile')} aria-current={activePage === 'profile' ? 'page' : undefined}>My Profile</button>
        </nav>
        {/* TODO -> components/ErrorMessage.jsx: reuse role="alert" on login and authenticated pages. */}
        {error && <p role="alert">{error}</p>}
        {/* TODO -> pages/ProfilePage.jsx: extract profile section; props user, isStaff, bookings. */}
        {activePage === 'profile' && (
          <section aria-labelledby="profile-title">
            <h1 id="profile-title">My Profile</h1>
            <h2>Account information</h2>
            <p><strong>Email:</strong> {session.user.email}</p>
            <p><strong>Account type:</strong> {isStaff ? 'Warehouse staff' : 'Carrier'}</p>
            {!isStaff && <><h2>Booking overview</h2><p><strong>Total bookings:</strong> {bookings.length}</p>
              <p><strong>Confirmed bookings:</strong> {bookings.filter(b => b.status === 'active').length}</p></>}
          </section>
        )}
        {/* TODO -> pages/BookingPage.jsx and pages/StaffSchedulePage.jsx:
            split carrier booking view from staff schedule view; App selects by role.
            Both pages can reuse DeliveryFilters and SlotList. */}
        {activePage === 'booking' && <>
          <h1>{isStaff ? 'Delivery schedule' : 'Book a delivery'}</h1>
          <p>Select a warehouse and delivery date. Times are shown in Europe/Warsaw.</p>
          {/* TODO -> components/DeliveryFilters.jsx: extract warehouse select and date input;
              props warehouses, warehouse, deliveryDate, now, isStaff, busy and change handlers. */}
          <label htmlFor="warehouse">Warehouse</label>
          <select id="warehouse" value={warehouse} disabled={busy} onChange={event => changeFilter(setWarehouse, event.target.value)}>
            <option value="" disabled>Select a warehouse</option>
            {warehouses.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div style={{ marginTop: '20px' }}>
            <label htmlFor="delivery-date">Delivery date</label>
            <input id="delivery-date" type="date" value={deliveryDate} disabled={busy}
              min={isStaff ? undefined : warsawDate(now)}
              onChange={event => changeFilter(setDeliveryDate, event.target.value)} required />
          </div>
          {/* TODO -> components/SlotList.jsx: extract this slots section, loading/empty states
              and refresh action. StaffSchedulePage supplies schedule rows with contact details;
              BookingPage supplies available slots and onSelect. Preserve Europe/Warsaw display. */}
          {warehouse && deliveryDate && <section aria-labelledby="slots-title">
            <h2 id="slots-title">{isStaff ? 'Scheduled slots' : 'Delivery slots'}</h2>
            <p>Date: {deliveryDate}<br />Time zone: Europe/Warsaw</p>
            <button type="button" disabled={busy || loading} onClick={() => { setLoading(true); setRevision(v => v + 1) }}>Refresh slots</button>
            {loading ? <p role="status">Loading slots…</p> : <>
              <ul>{slots.map(slot => <li key={slot.id}>
                {isStaff ? <>
                  <p>{warsawTime(slot.start_time_utc)}–{warsawTime(slot.end_time_utc)} — {slot.booking_id ? 'Booked' : statusLabel(slot.status)}</p>
                  {slot.booking_id && <p>{slot.carrier_name} · {slot.truck_registration} · {slot.contact_email}</p>}
                </> : <button type="button" disabled={busy || Date.parse(slot.start_time_utc) <= now}
                  onClick={() => setSelectedSlot(slot)}>
                  {warsawTime(slot.start_time_utc)}–{warsawTime(slot.end_time_utc)} — Available{selectedSlot?.id === slot.id ? ' ✓' : ''}
                </button>}
              </li>)}</ul>
              {slots.length === 0 && <p role="status">{isStaff ? 'No slots for this date.' : 'No available slots for this date. Please choose another date.'}</p>}
            </>}
          </section>}
          {/* TODO -> components/BookingConfirmation.jsx: props bookingConfirmation, onClose.
              Keep the booking reference returned by the backend; never generate one in the UI. */}
          {bookingConfirmation && <section aria-labelledby="confirmation-title" role="status">
            <h2 id="confirmation-title">Booking confirmed!</h2>
            <p><strong>Booking reference:</strong> {bookingConfirmation.booking_reference}</p>
            <p><strong>Date:</strong> {warsawDate(bookingConfirmation.start_time_utc)}</p>
            <p><strong>Time:</strong> {warsawTime(bookingConfirmation.start_time_utc)}–{warsawTime(bookingConfirmation.end_time_utc)}</p>
            <p><strong>Status:</strong> Confirmed</p>
            <button type="button" onClick={() => setBookingConfirmation(null)}>Close confirmation</button>
          </section>}
          {/* TODO -> components/BookingForm.jsx: extract selected-slot summary and the form;
              props selectedSlot, deliveryDate, userEmail, busy, onSubmit. */}
          {!isStaff && selectedSlot && <section aria-labelledby="booking-title">
            <h2 id="booking-title">Booking details</h2>
            <p>Selected slot: {deliveryDate}, {warsawTime(selectedSlot.start_time_utc)}–{warsawTime(selectedSlot.end_time_utc)}</p>
            <form onSubmit={handleBooking}>
              <label htmlFor="carrier-name">Carrier name</label><input id="carrier-name" name="carrierName" maxLength={255} required />
              <label htmlFor="truck-registration">Truck registration</label><input id="truck-registration" name="truckRegistration" maxLength={50} required />
              <label htmlFor="booking-email">Email address</label><input id="booking-email" name="contactEmail" type="email" defaultValue={session.user.email} maxLength={255} required />
              <button type="submit" disabled={busy}>{busy ? 'Booking…' : 'Confirm booking'}</button>
            </form>
          </section>}
          {/* TODO -> components/MyBookings.jsx: extract list, status labels and cancellation UI;
              props bookings, now, busy, onCancel. Keep pendingCancelId local to this component. */}
          {!isStaff && <section aria-labelledby="my-bookings-title">
            <h2 id="my-bookings-title">My Bookings</h2>
            {bookings.length === 0 ? <p>You have no bookings yet.</p> : <ul>{bookings.map(booking => <li key={booking.id}>
              <p><strong>Reference:</strong> {booking.booking_reference}</p>
              <p><strong>Date:</strong> {warsawDate(booking.start_time_utc)}</p>
              <p><strong>Time:</strong> {warsawTime(booking.start_time_utc)}–{warsawTime(booking.end_time_utc)}</p>
              <p><strong>Carrier:</strong> {booking.carrier_name}</p>
              <p><strong>Truck:</strong> {booking.truck_registration}</p>
              <p><strong>Status:</strong> {statusLabel(booking.status)}</p>
              {booking.status === 'active' && Date.parse(booking.start_time_utc) > now &&
                <button type="button" disabled={busy} onClick={() => setPendingCancelId(booking.id)}>Cancel booking</button>}
              {pendingCancelId === booking.id && <div role="group" aria-label="Confirm cancellation">
                <p>Cancel this booking?</p>
                <button type="button" disabled={busy} onClick={() => handleCancelBooking(booking)}>Yes, cancel booking</button>{' '}
                <button type="button" disabled={busy} onClick={() => setPendingCancelId(null)}>Keep booking</button>
              </div>}
            </li>)}</ul>}
          </section>}
        </>}
        {/* Keep sign-out in App/shared layout; delegate session revocation to useAuth. */}
        <p><button type="button" disabled={busy} onClick={handleLogout}>Sign out</button></p>
      </section>
    </main>
  )
}
export default App
