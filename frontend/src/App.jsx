import './App.css'
import { useState } from 'react'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

const [activePage, setActivePage] = useState('booking')

  const [warehouse, setWarehouse] = useState('')
const [deliveryDate, setDeliveryDate] = useState('')
const [selectedSlot, setSelectedSlot] = useState(null)
const [carrierName, setCarrierName] = useState('')
const [truckRegistration, setTruckRegistration] = useState('')
const [bookingEmail, setBookingEmail] = useState('')
const [bookings, setBookings] = useState([])
const [bookingConfirmation, setBookingConfirmation] = useState(null)


const demoSlots = [
  { id: 'slot-1', start: '09:00', end: '10:00', status: 'Available' },
  { id: 'slot-2', start: '10:00', end: '11:00', status: 'Booked' },
  { id: 'slot-3', start: '11:00', end: '12:00', status: 'Available' },
]
function getSlotStatus(slot) {


const alreadyBooked = bookings.some(
  (booking) =>
    booking.warehouse === warehouse &&
    booking.date === deliveryDate &&
    booking.slotId === slot.id &&
    booking.status === 'Confirmed'
)


if (alreadyBooked) {
  return 'Booked'
}
  const now = new Date()

  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)

  const currentTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Warsaw',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now)

  if (
    deliveryDate < today ||
    (deliveryDate === today && slot.start <= currentTime)
  ) {
    return 'Unavailable'
  }

  return slot.status
}

function handleCancelBooking(reference) {
  const bookingToCancel = bookings.find(
    (booking) => booking.reference === reference
  )

  if (!bookingToCancel || bookingToCancel.status !== 'Confirmed') {
    return
  }

  const confirmed = window.confirm(
    'Are you sure you want to cancel this booking?'
  )

  if (!confirmed) {
    return
  }

  setBookings((previousBookings) =>
    previousBookings.map((booking) =>
      booking.reference === reference
        ? { ...booking, status: 'Cancelled' }
        : booking
    )
  )

  setBookingConfirmation(null)
}

function handleBooking(event) {
  event.preventDefault()

  if (!selectedSlot || !warehouse || !deliveryDate) {
    return
  }

  if (getSlotStatus(selectedSlot) !== 'Available') {
    alert('This delivery slot is no longer available.')
    return
  }

  const alreadyBooked = bookings.some(
    (booking) =>
      booking.warehouse === warehouse &&
      booking.date === deliveryDate &&
      booking.slotId === selectedSlot.id
  )

  if (alreadyBooked) {
    alert('This delivery slot has already been booked.')
    return
  }

  const newBooking = {
    reference: crypto.randomUUID(),
    warehouse,
    date: deliveryDate,
    slotId: selectedSlot.id,
    start: selectedSlot.start,
    end: selectedSlot.end,
    carrierName: carrierName.trim(),
    truckRegistration: truckRegistration.trim(),
    email: bookingEmail.trim(),
    status: 'Confirmed',
  }

  setBookings((previousBookings) => [
    ...previousBookings,
    newBooking,
  ])

  setBookingConfirmation(newBooking)
  setSelectedSlot(null)

  setCarrierName('')
  setTruckRegistration('')
  setBookingEmail('')
}

  function handleSubmit(event) {
    event.preventDefault()
    setIsLoggedIn(true)
  }
  if (isLoggedIn) {
    return (
      <main className="login-page">
        
        <section className="login-card">

<nav aria-label="Main navigation">
  <button
    type="button"
    onClick={() => setActivePage('booking')}
    aria-current={activePage === 'booking' ? 'page' : undefined}
  >
    Book a delivery
  </button>

  <button
    type="button"
    onClick={() => setActivePage('profile')}
    aria-current={activePage === 'profile' ? 'page' : undefined}
  >
    My Profile
  </button>
</nav>

{activePage === 'profile' && (
  <section aria-labelledby="profile-title">
    <h1 id="profile-title">My Profile</h1>

    <p>Welcome to your personal dashboard.</p>

    <h2>Account information</h2>
    <p><strong>Account type:</strong> Carrier</p>
    <p><strong>Role:</strong> Delivery booking user</p>

    <h2>Booking overview</h2>
    <p><strong>Total bookings:</strong> {bookings.length}</p>
    <p>
      <strong>Confirmed bookings:</strong>{' '}
      {bookings.filter(
        (booking) => booking.status === 'Confirmed'
      ).length}
    </p>
  </section>
)}

{activePage === 'booking' && (
  <>

          <h1>Book a delivery</h1>
          <p>Select a warehouse to view delivery slots.</p>

          <label htmlFor="warehouse">Warehouse</label>
          <select id="warehouse" value={warehouse}
  onChange={(event) => setWarehouse(event.target.value)}
>
            <option value="" disabled>
              Select a warehouse
            </option>
            <option value="warsaw">
              Warsaw Warehouse — demo
            </option>
          </select>
          <div style={{ marginTop: '20px' }}>
  <label htmlFor="delivery-date">Delivery date</label>
  <input
    id="delivery-date"
    type="date"
    value={deliveryDate}
onChange={(event) => setDeliveryDate(event.target.value)}
    min={new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Warsaw',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())}
    required
  />
</div>
{warehouse && deliveryDate && (
  <section aria-labelledby="slots-title">
    <h2 id="slots-title">Delivery slots</h2>
    <p>
      Date: {deliveryDate}
      <br />
      Time zone: Europe/Warsaw
    </p>
    <p>Demo schedule</p>

    <ul>
  {demoSlots.map((slot) => (
    <li key={slot.id}>
      <button
        type="button"
        disabled={getSlotStatus(slot) !== 'Available'}
        onClick={() => setSelectedSlot({
          ...slot,
          date: deliveryDate,
          warehouse,
        })}
      >
        {slot.start}–{slot.end} — {getSlotStatus(slot)}
        {selectedSlot?.id === slot.id &&
          selectedSlot?.date === deliveryDate &&
          selectedSlot?.warehouse === warehouse &&
          ' ✓'}
      </button>
    </li>
  ))}
</ul>
    {!demoSlots.some((slot) => getSlotStatus(slot) === 'Available') && (
  <p role="status">
    No available slots for this date. Please choose another date.
  </p>
)}
  </section>
)}

{bookingConfirmation && (
  <section aria-labelledby="confirmation-title" role="status">
    <h2 id="confirmation-title">
      Booking confirmed!
    </h2>

    <p>Your delivery slot has been successfully booked.</p>

    <p>
      <strong>Booking reference:</strong>
      <br />
      {bookingConfirmation.reference}
    </p>

    <p>
      <strong>Warehouse:</strong> {bookingConfirmation.warehouse}
    </p>

    <p>
      <strong>Date:</strong> {bookingConfirmation.date}
    </p>

    <p>
      <strong>Time:</strong> {bookingConfirmation.start}–
      {bookingConfirmation.end}
    </p>

    <p>
      <strong>Carrier:</strong> {bookingConfirmation.carrierName}
    </p>

    <p>
      <strong>Status:</strong> {bookingConfirmation.status}
    </p>

    <button
      type="button"
      onClick={() => setBookingConfirmation(null)}
    >
      Close confirmation
    </button>
  </section>
)}


{selectedSlot &&
  selectedSlot.date === deliveryDate &&
  selectedSlot.warehouse === warehouse &&
  getSlotStatus(selectedSlot) === 'Available' && (
    <section aria-labelledby="booking-title">
      <h2 id="booking-title">Booking details</h2>

      <p>
        Selected slot: {selectedSlot.date},
        {' '}{selectedSlot.start}–{selectedSlot.end}
      </p>

      
<form onSubmit={handleBooking}>

        <label htmlFor="carrier-name">Carrier name</label>
        <input
          id="carrier-name"
          type="text"
          value={carrierName}
          onChange={(event) => setCarrierName(event.target.value)}
          required
        />

        <label htmlFor="truck-registration">
          Truck registration
        </label>
        <input
          id="truck-registration"
          type="text"
          value={truckRegistration}
          onChange={(event) =>
            setTruckRegistration(event.target.value)
          }
          required
        />

        <label htmlFor="booking-email">Email address</label>
        <input
          id="booking-email"
          type="email"
          value={bookingEmail}
          onChange={(event) => setBookingEmail(event.target.value)}
          required
        />

        <button type="submit">Confirm booking</button>
      </form>
    </section>
  )}

<section aria-labelledby="my-bookings-title">
  <h2 id="my-bookings-title">My Bookings</h2>

  {bookings.length === 0 ? (
    <p>You have no bookings yet.</p>
  ) : (
    <ul>
      {bookings.map((booking) => (
        <li key={booking.reference}>
          <p>
            <strong>Reference:</strong> {booking.reference}
          </p>
          <p>
            <strong>Date:</strong> {booking.date}
          </p>
          <p>
            <strong>Time:</strong> {booking.start}–{booking.end}
          </p>
          <p>
            <strong>Carrier:</strong> {booking.carrierName}
          </p>
          <p>
            <strong>Truck:</strong> {booking.truckRegistration}
          </p>
          <p>
            <strong>Status:</strong> {booking.status}
          </p>

{booking.status === 'Confirmed' && (
  <button
    type="button"
    onClick={() => handleCancelBooking(booking.reference)}
  >
    Cancel booking
  </button>
)}

        </li>
      ))}
    </ul>
  )}
</section>
  </>
)}


          <p>
            <button
              type="button"
              onClick={() => setIsLoggedIn(false)}
            >
              Sign out
            </button>
          </p>
        </section>
      </main>
    )
  }
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <h1 id="login-title">DSBS</h1>
        <p>Sign in to manage your deliveries.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="you@company.com"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          <button type="submit">Sign in</button>
        </form>

        <p>Demo interface — sign-in is not connected yet.</p>
      </section>
    </main>
  )
}

export default App