import xapi from 'xapi';

const NO_SHOW_DELAY = 15 * 60; // seconds
const DETECT_PEOPLE = false;
var managedCallId = 0;
var managedCallActive = false;
var peopleDetectedInManagedCall = false;
var bookingEnded = true;

function validateEmail(email) {
  const res = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return res.test(String(email).toLowerCase());
}

function checkBookingUri(bookingId) {
  xapi.Command.Bookings.Get({Id: bookingId})
    .then((bookingDetail) => {
      var meetingUri = bookingDetail.Booking.DialInfo.Calls.Call[0].Number;
      console.log("Booking URI: "+JSON.stringify(meetingUri)+", valid: "+validateEmail(meetingUri));
  });
}

function noShowHangup() {
  console.log("No show check..."+managedCallActive+" "+peopleDetectedInManagedCall);
  if (DETECT_PEOPLE && managedCallActive && !peopleDetectedInManagedCall) {
    hangupManagedCall();
  }
}

function hangupManagedCall() {
  xapi.Command.Call.Disconnect({CallId: managedCallId})
    .then((disc) => {
      console.log("No show hangup...: "+JSON.stringify(disc));
    });
}

// act on Bookings events, mainly Start and End
const bookingEventFeedback = xapi.Event.Bookings.on((booking) => {
  console.log('New booking event: ' + JSON.stringify(booking));
  if (booking.TimeRemaining) {
    console.log("Time to start: "+booking.TimeRemaining.Seconds);
    checkBookingUri(booking.TimeRemaining.Id)
  } else if (booking.Start) {
    console.log("Start id: "+booking.Start.Id);
    xapi.Command.Bookings.Get({Id: booking.Start.Id})
      .then((bookingDetail) => {
        var meetingUri = bookingDetail.Booking.DialInfo.Calls.Call[0].Number;
        var uriValid = validateEmail(meetingUri);
        console.log("Booking URI: "+JSON.stringify(meetingUri)+", valid: "+uriValid);
        if (uriValid) {
// dial the OBTP URI
          xapi.Command.Dial({Number: meetingUri, BookingId: booking.Start.Id})
            .then((dialing) => {
              console.log("Dialing...: "+JSON.stringify(dialing));
              if (dialing.status == "OK") {
                managedCallId = dialing.CallId;
                managedCallActive = true;
                peopleDetectedInManagedCall = false;
                bookingEnded = false;
                console.log("Managed call started");
                setTimeout(noShowHangup, NO_SHOW_DELAY * 1000)
              }
            });
        }
    });
  } else if (booking.End) {
    console.log("Booked meeting ended: "+booking.End.Id);
    bookingEnded = true;
    if (!DETECT_PEOPLE) {
      hangupManagedCall();
    }
  }
});

/*
const anyEventFeedback = xapi.Event.on((event) => {
  console.log('New event: ' + JSON.stringify(event));
});
*/

// people presence detection
const detectPeopleInCall = xapi.Status.RoomAnalytics.PeopleCount.Current.on((count) => {
  console.log("People count now: "+JSON.stringify(count));
  if (DETECT_PEOPLE && managedCallActive) {
    peopleDetectedInManagedCall = (count > 0)
    console.log("People detected in managed call: "+peopleDetectedInManagedCall);
    if (bookingEnded) {
      console.log("Meeting ended, people left. Hanging up...");
      hangupManagedCall();
    }
  }
});

// cleanup if there was any kind of hangup (automated/manual)
const hangupEventFeedback = xapi.Event.CallDisconnect.on((call) => {
  console.log("Call disconnect: "+JSON.stringify(call));
  if (managedCallActive && (call.CallId == managedCallId)) {
    managedCallActive = false;
    managedCallId = 0;
    peopleDetectedInManagedCall = false;
    console.log("Managed call ended");
  }
});
