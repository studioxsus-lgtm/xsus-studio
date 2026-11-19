export const bookingProfile = Object.freeze({
  id: "booking",
  matches(goal) { return /\b(?:booking|reservation)\b/i.test(goal); },
  productLabel: "Booking application",
  pages: ["Booking overview", "Availability calendar", "Customer details", "Booking confirmation"],
  components: ["Calendar picker", "Availability slots", "Customer form", "Booking summary", "Status badge"],
  dataModels: ["Service", "Availability slot", "Customer", "Booking"],
  interactions: [
    "Browse availability",
    "Select a time slot",
    "Create or reschedule a booking",
    "Cancel a booking"
  ],
  questions: [
    "Which services or resources can be booked?",
    "Which availability and cancellation rules apply?",
    "Are customer accounts required?",
    "Which time zone and calendar should bookings use?"
  ]
});
