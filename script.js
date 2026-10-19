
const API_URL = "https://overfast-api.tekrop.fr";

// Get HTML elements
const gallery = document.querySelector("#heroGallery");
const searchInput = document.querySelector("#search");
const roleFilter = document.querySelector("#roleFilter");
const heroCount = document.querySelector("#heroCount");
const alphabet = document.querySelector("#alphabet");
const modal = document.querySelector("#heroModal");
const modalContent = document.querySelector("#modalContent");
const closeModal = document.querySelector("#closeModal");

// Store hero data
let heroes = [];
let activeLetter = "";

// Fetch all heroes from the API
async function initGallery() {
  try {
    gallery.textContent = "Loading heroes...";

    const response = await fetch(`${API_URL}/heroes`);

    console.log("API response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    // Handle either an array or a wrapped response
    heroes = Array.isArray(data) ? data : data.heroes;

    if (!Array.isArray(heroes)) {
      throw new Error("The API did not return a hero array.");
    }

    console.log("Heroes received:", heroes);
    console.log("Number of heroes:", heroes.length);

    renderHeroes();
  } catch (error) {
    console.error("Could not load heroes:", error);
    gallery.textContent =
      "Unable to load heroes. Check the browser console and try again.";
  }
}

// Filter, sort, and display heroes
function renderHeroes() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedRole = roleFilter.value;

  const filteredHeroes = heroes
    .filter(hero => {
      const matchesName = (hero.name || "")
        .toLowerCase()
        .includes(searchTerm);

      const matchesRole =
        selectedRole === "all" ||
        (Array.isArray(hero.role)
          ? hero.role.includes(selectedRole)
          : hero.role === selectedRole);

      return matchesName && matchesRole;
    })
    .filter(hero =>
      !activeLetter ||
      (hero.name || "").toUpperCase().startsWith(activeLetter)
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  gallery.replaceChildren();

  if (filteredHeroes.length === 0) {
    gallery.textContent = "No heroes found. Try another search.";
  }

  filteredHeroes.forEach(hero => {
    const card = document.createElement("button");
    card.className = "hero-card";
    card.type = "button";
    card.setAttribute("aria-label", `View ${hero.name} details`);

    const image = document.createElement("img");
    image.src = hero.portrait;
    image.alt = `${hero.name} portrait`;
    image.loading = "lazy";

    // Show a fallback if the portrait fails to load
    image.addEventListener("error", () => {
      image.alt = `Portrait unavailable for ${hero.name}`;
    });

    const name = document.createElement("h2");
    name.textContent = hero.name;

    const role = document.createElement("p");
    role.textContent = Array.isArray(hero.role)
      ? hero.role.join(", ")
      : hero.role || "Role unknown";

    card.append(image, name, role);

    card.addEventListener("click", () => {
      openHeroModal(hero);
    });

    gallery.append(card);
  });

  heroCount.textContent =
    `${filteredHeroes.length} heroes found`;

  renderAlphabet(filteredHeroes);
}

// Generate A-Z alphabetical index
function renderAlphabet(filteredHeroes) {
  alphabet.replaceChildren();

  const availableLetters = new Set(
    filteredHeroes.map(hero =>
      (hero.name || "")[0]?.toUpperCase()
    )
  );

  const allButton = document.createElement("button");
  allButton.textContent = "All";
  allButton.type = "button";
  allButton.setAttribute("aria-pressed", String(!activeLetter));

  allButton.addEventListener("click", () => {
    activeLetter = "";
    renderHeroes();
  });

  alphabet.append(allButton);

  for (let code = 65; code <= 90; code++) {
    const letter = String.fromCharCode(code);
    const button = document.createElement("button");

    button.textContent = letter;
    button.type = "button";
    button.disabled = !availableLetters.has(letter);

    button.setAttribute(
      "aria-pressed",
      String(activeLetter === letter)
    );

    button.addEventListener("click", () => {
      activeLetter = letter;
      renderHeroes();
    });

    alphabet.append(button);
  }
}

// Fetch detailed information when a hero is clicked
async function openHeroModal(hero) {
  modalContent.replaceChildren();

  const loading = document.createElement("p");
  loading.textContent = `Loading ${hero.name}...`;
  modalContent.append(loading);

  if (!modal.open) {
    modal.showModal();
  }

  try {
    const response = await fetch(
      `${API_URL}/heroes/${encodeURIComponent(hero.key)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const details = await response.json();

    console.log("Hero details:", details);

    modalContent.replaceChildren();

    const title = document.createElement("h2");
    title.textContent = details.name || hero.name;

    const image = document.createElement("img");
    image.src = details.portrait || hero.portrait;
    image.alt = `${details.name || hero.name} portrait`;
    image.className = "modal-portrait";

    const role = document.createElement("p");
    role.textContent = `Role: ${
      Array.isArray(details.role)
        ? details.role.join(", ")
        : details.role || hero.role || "Unknown"
    }`;

    modalContent.append(title, image, role);

    // Add the description if available
    if (details.description) {
      const heading = document.createElement("h3");
      heading.textContent = "Description";

      const description = document.createElement("p");
      description.textContent = details.description;

      modalContent.append(heading, description);
    }

    // Add story information if the API provides it
    if (details.story) {
      const heading = document.createElement("h3");
      heading.textContent = "Story";

      const story = document.createElement("div");

      if (typeof details.story === "string") {
        story.textContent = details.story;
      } else if (Array.isArray(details.story)) {
        details.story.forEach(item => {
          const paragraph = document.createElement("p");
          paragraph.textContent =
            typeof item === "string"
              ? item
              : item.title || item.summary || item.content || "";
          story.append(paragraph);
        });
      } else {
        story.textContent =
          details.story.summary ||
          details.story.content ||
          details.story.description ||
          "";
      }

      if (story.textContent || story.children.length > 0) {
        modalContent.append(heading, story);
      }
    }

    // Add abilities if available
    if (Array.isArray(details.abilities) &&
        details.abilities.length > 0) {
      const heading = document.createElement("h3");
      heading.textContent = "Abilities";
      modalContent.append(heading);

      details.abilities.forEach(ability => {
        const abilityName = document.createElement("h4");
        abilityName.textContent = ability.name || "Ability";

        const abilityDescription = document.createElement("p");
        abilityDescription.textContent =
          ability.description || "";

        modalContent.append(abilityName, abilityDescription);
      });
    }

    // Display any other available fields in the console
    console.log("Full details for", hero.name, details);

  } catch (error) {
    console.error("Could not load hero details:", error);

    modalContent.replaceChildren();

    const title = document.createElement("h2");
    title.textContent = hero.name;

    const message = document.createElement("p");
    message.textContent =
      "Could not load full details. Please try again later.";

    modalContent.append(title, message);
  }
}

// Search and role-filter events
searchInput.addEventListener("input", renderHeroes);
roleFilter.addEventListener("change", renderHeroes);

// Close the modal
closeModal.addEventListener("click", () => {
  modal.close();
});

// Close the modal when clicking its backdrop
modal.addEventListener("click", event => {
  if (event.target === modal) {
    modal.close();
  }
});

// Start the application
initGallery();
