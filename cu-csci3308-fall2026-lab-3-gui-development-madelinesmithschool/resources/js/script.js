// script.js
// Handles the "in person / remote" field toggle, form validation,
// building event cards, rendering them into the calendar, and
// editing existing events.

// In-memory list of saved event objects. There is no persistent
// storage in this lab, so events disappear on page reload.
let events = [];

// The id of the event currently being edited, or null when the
// modal is being used to create a brand-new event.
let editingEventId = null;
let eventIdCounter = 0;

document.addEventListener("DOMContentLoaded", function () {
  // Set the correct field visibility/required state on first load.
  updateLocationOptions();

  // Whenever the modal finishes closing (Save, Close button, Esc,
  // or backdrop click), reset it back to "create" mode so the next
  // time it opens via the Create Event button it starts blank.
  const modalEl = document.getElementById("event_modal");
  modalEl.addEventListener("hidden.bs.modal", function () {
    editingEventId = null;
    document.getElementById("event_modal_label").textContent = "New event";
    document.getElementById("save_event_btn").textContent = "Save event";
    resetEventForm(document.getElementById("event_form"));
  });
});

/**
 * Shows the Location field for in-person events and the Remote URL
 * field for remote events, toggling the "required" attribute so a
 * hidden field never blocks form submission. Wired to the modality
 * select's onchange handler in index.html.
 */
function updateLocationOptions() {
  // 1. Read the current modality value.
  const modality = document.getElementById("event_modality").value;

  // 2. Retrieve the Location and Remote URL containers.
  const locationGroup = document.getElementById("location_group");
  const locationField = document.getElementById("event_location");
  const remoteGroup = document.getElementById("remote_url_group");
  const remoteField = document.getElementById("event_remote_url");

  // 3. Toggle visibility based on the selected modality, and keep
  //    "required" in sync so the hidden field is never validated.
  if (modality === "remote") {
    remoteGroup.classList.remove("d-none");
    locationGroup.classList.add("d-none");

    remoteField.required = true;
    locationField.required = false;
    locationField.classList.remove("is-invalid");
  } else {
    locationGroup.classList.remove("d-none");
    remoteGroup.classList.add("d-none");

    locationField.required = true;
    remoteField.required = false;
    remoteField.classList.remove("is-invalid");
  }
}

/**
 * Validates the event form and, if valid, saves the event (creating
 * a new one or updating the one being edited) and closes the modal.
 * Called by the Save Event button.
 */
function saveEvent() {
  const form = document.getElementById("event_form");

  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    form.reportValidity();
    return;
  }

  form.classList.add("was-validated");

  const modality = document.getElementById("event_modality").value;

  const eventInfo = {
    id: editingEventId || generateEventId(),
    name: document.getElementById("event_name").value.trim(),
    weekday: document.getElementById("event_weekday").value,
    time: document.getElementById("event_time").value,
    category: document.getElementById("event_category").value,
    modality: modality,
    location:
      modality === "remote"
        ? document.getElementById("event_remote_url").value.trim()
        : document.getElementById("event_location").value.trim(),
    attendees: document
      .getElementById("event_attendees")
      .value.split(",")
      .map(function (name) {
        return name.trim();
      })
      .filter(function (name) {
        return name.length > 0;
      }),
  };

  const existingIndex = events.findIndex(function (e) {
    return e.id === eventInfo.id;
  });

  if (existingIndex !== -1) {
    events[existingIndex] = eventInfo;
  } else {
    events.push(eventInfo);
  }

  addEventToCalendarUI(eventInfo);
  resetEventForm(form);

  const modalEl = document.getElementById("event_modal");
  const modalInstance =
    bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modalInstance.hide();
}

/**
 * Opens the modal pre-filled with an existing event's values so the
 * user can edit it. Saving afterward updates the event in place
 * instead of creating a duplicate.
 */
function openEditModal(id) {
  const eventInfo = events.find(function (e) {
    return e.id === id;
  });
  if (!eventInfo) {
    return;
  }

  editingEventId = id;

  document.getElementById("event_name").value = eventInfo.name;
  document.getElementById("event_weekday").value = eventInfo.weekday;
  document.getElementById("event_time").value = eventInfo.time;
  document.getElementById("event_category").value = eventInfo.category;
  document.getElementById("event_modality").value = eventInfo.modality;

  updateLocationOptions();

  if (eventInfo.modality === "remote") {
    document.getElementById("event_remote_url").value = eventInfo.location;
  } else {
    document.getElementById("event_location").value = eventInfo.location;
  }

  document.getElementById("event_attendees").value =
    eventInfo.attendees.join(", ");

  document.getElementById("event_modal_label").textContent = "Edit event";
  document.getElementById("save_event_btn").textContent = "Save changes";

  const modalEl = document.getElementById("event_modal");
  const modalInstance =
    bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modalInstance.show();
}

/**
 * Builds a single event card as a DOM element from an event's
 * details, but does not attach it anywhere.
 */
function createEventCard(eventDetails) {
  // 1. Create the event container.
  const eventElement = document.createElement("div");

  // 2. Apply CSS classes: a base card class plus one that maps
  //    the event's category to a color (see style.css).
  eventElement.className = "event-card category-" + eventDetails.category;
  eventElement.dataset.eventId = eventDetails.id;
  eventElement.setAttribute("role", "button");
  eventElement.setAttribute("tabindex", "0");
  eventElement.title = "Click to edit this event";

  // 3/4. Create a nested element and build its content from the
  //      event's details with a template literal. User-entered text
  //      is escaped first so it can't inject markup into the page.
  const timeDisplay = formatTime(eventDetails.time);
  const modalityLabel = eventDetails.modality === "remote" ? "Remote" : "In person";
  const attendeesText = eventDetails.attendees.length
    ? eventDetails.attendees.join(", ")
    : "No attendees listed";

  const safeName = escapeHtml(eventDetails.name);
  const safeAttendees = escapeHtml(attendeesText);
  const safeLocation = escapeHtml(eventDetails.location);

  const locationMarkup =
    eventDetails.modality === "remote"
      ? `<a href="${safeLocation}" target="_blank" rel="noopener noreferrer">${safeLocation}</a>`
      : safeLocation;

  const content = document.createElement("div");
  content.className = "event-card-body";
  content.innerHTML = `
    <div class="event-time" data-sort-value="${eventDetails.time}">${timeDisplay}</div>
    <div class="event-name">${safeName}</div>
    <div class="event-modality">${modalityLabel}</div>
    <div class="event-location">${locationMarkup}</div>
    <div class="event-attendees">${safeAttendees}</div>
  `;

  // 5. Append the nested content to the container.
  eventElement.appendChild(content);

  // Clicking the remote URL link should open the link, not the editor.
  const link = content.querySelector("a");
  if (link) {
    link.addEventListener("click", function (evt) {
      evt.stopPropagation();
    });
  }

  // Clicking (or pressing Enter/Space on) a card opens it for editing.
  eventElement.addEventListener("click", function () {
    openEditModal(eventDetails.id);
  });
  eventElement.addEventListener("keydown", function (evt) {
    if (evt.key === "Enter" || evt.key === " ") {
      evt.preventDefault();
      openEditModal(eventDetails.id);
    }
  });

  // 6. Return the completed element.
  return eventElement;
}

/**
 * Places an event's card into the correct weekday column, replacing
 * any existing card for the same event id so updates never create a
 * duplicate.
 */
function addEventToCalendarUI(eventInfo) {
  // 2. Retrieve the correct weekday column.
  const container = document.getElementById("events_" + eventInfo.weekday);
  if (!container) {
    return;
  }

  // Remove any existing card for this event (covers edits, including
  // edits that move an event to a different weekday).
  const existingCard = document.querySelector(
    '.event-card[data-event-id="' + eventInfo.id + '"]'
  );
  if (existingCard) {
    existingCard.remove();
  }

  // 1. Build the card.
  const card = createEventCard(eventInfo);

  // 3. Append it to the correct column.
  container.appendChild(card);

  sortEventsByTime(container);
}

/** Keeps a day column's event cards ordered from earliest to latest. */
function sortEventsByTime(container) {
  const cards = Array.from(container.children);

  cards.sort(function (a, b) {
    const aTime = a.querySelector(".event-time").dataset.sortValue;
    const bTime = b.querySelector(".event-time").dataset.sortValue;
    return aTime.localeCompare(bTime);
  });

  cards.forEach(function (card) {
    container.appendChild(card);
  });
}

/** Converts a 24-hour "HH:MM" time string into a 12-hour display string. */
function formatTime(time24) {
  if (!time24) {
    return "";
  }

  const parts = time24.split(":");
  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12;
  if (hour === 0) {
    hour = 12;
  }

  return hour + ":" + minute + " " + suffix;
}

/** Escapes HTML special characters so user text can't inject markup. */
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

/** Generates a unique id for a new event. */
function generateEventId() {
  eventIdCounter += 1;
  return "evt-" + Date.now() + "-" + eventIdCounter;
}

/** Clears the form and restores default field visibility/state. */
function resetEventForm(form) {
  form.reset();
  form.classList.remove("was-validated");
  updateLocationOptions();
}
