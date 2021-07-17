## RoomOS codec macro for autodialing a meeting URI

This macro automates a meeting join. It react on OBTP events (Event.Bookings)
and if there is a meeting start, it dials the associated URI. When the meeting ends,
the macro disconnects the call. The macro can also monitor people presence in the room
and disconnect the call if nobody shows up in a defined time limit.

### How to install
1. open the codec management web page (directly or via Webex Control Hub)
2. click on **Macro Editor**
3. if macros are not activated, confirm the activation
4. click **Import from file...** and upload the macro
5. adjust the **NO_SHOW_DELAY** and **DETECT_PEOPLE** constants at the beginning of the macro and save
6. enable the macro
