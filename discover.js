
const homeSearchForm = document.querySelector('#search-form');
const homeLocationInput = document.querySelector('#location-search');

homeSearchForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const location = homeLocationInput.value.trim();
  if (!location) {
    homeLocationInput.focus();
    return;
  }

  const destination = `churches.html?location=${encodeURIComponent(location)}`;
  window.location.href = destination;
});
const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const SEARCH_RADIUS_METRES = 5000;

const elements = {
  form: document.querySelector('#church-search-form'),
  location: document.querySelector('#church-location'),
  currentLocation: document.querySelector('#use-current-location'),
  status: document.querySelector('#search-status'),
  grid: document.querySelector('#church-grid'),
  empty: document.querySelector('#empty-state'),
  count: document.querySelector('#result-count'),
  denomination: document.querySelector('#denomination-filter'),
  service: document.querySelector('#service-filter'),
  clear: document.querySelector('#clear-filters'),
  submit: document.querySelector('#church-search-form button[type="submit"]')
};

let churches = [];
let lastSearchCentre = null;
const geocodeCache = new Map();
let lastGeocodeAt = 0;

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function titleCase(value) {
  return String(value || '')
    .replace(/[_-]/g, ' ')
    .split(';')[0]
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDenomination(raw) {
  if (!raw) return 'Denomination not listed';
  const value = String(raw).toLowerCase().replace(/-/g, '_');
  const known = {
    roman_catholic: 'Roman Catholic', catholic: 'Catholic',
    anglican: 'Anglican', methodist: 'Methodist', baptist: 'Baptist',
    pentecostal: 'Pentecostal', lutheran: 'Lutheran',
    presbyterian: 'Presbyterian', adventist: 'Seventh-day Adventist',
    orthodox: 'Orthodox', evangelical: 'Evangelical', reformed: 'Reformed',
    protestant: 'Protestant'
  };
  return known[value] || titleCase(value);
}

function safeWebsite(raw) {
  if (!raw) return '';
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function getArea(tags, fallback) {
  return tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'] ||
    tags['addr:place'] || tags['addr:city'] || tags['addr:town'] || fallback || 'Area not listed';
}

function makeAddress(tags, fallbackArea) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const locality = tags['addr:suburb'] || tags['addr:neighbourhood'] || tags['addr:quarter'] ||
    tags['addr:place'] || fallbackArea;
  const city = tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || '';
  const parts = [street, locality, city].filter((value, index, all) => value && all.indexOf(value) === index);
  return parts.length ? parts.join(', ') : 'Street address not listed';
}

function normaliseChurch(element, fallbackArea) {
  const tags = element.tags || {};
  const coords = element.lat != null && element.lon != null
    ? { lat: Number(element.lat), lng: Number(element.lon) }
    : { lat: Number(element.center?.lat), lng: Number(element.center?.lon) };

  const name = tags.name || tags['name:en'];
  if (!name || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) return null;

  const rawService = tags.service_times || tags['service_times:sunday'] || '';
  const phone = tags['contact:phone'] || tags.phone || '';
  const email = tags['contact:email'] || tags.email || '';
  const website = safeWebsite(tags['contact:website'] || tags.website || '');
  const contactParts = [];
  if (phone) contactParts.push(`<a href="tel:${encodeURIComponent(phone)}">${escapeHTML(phone)}</a>`);
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) contactParts.push(`<a href="mailto:${encodeURIComponent(email)}">${escapeHTML(email)}</a>`);
  if (website) contactParts.push(`<a href="${escapeHTML(website)}" target="_blank" rel="noopener noreferrer">Website ↗</a>`);

  return {
    id: `${element.type}-${element.id}`,
    name,
    denomination: formatDenomination(tags.denomination),
    area: getArea(tags, fallbackArea),
    address: makeAddress(tags, fallbackArea),
    service: rawService ? rawService : 'Service times not listed',
    serviceListed: Boolean(rawService),
    contactHTML: contactParts.length ? contactParts.join(' · ') : 'Contact details not listed',
    lat: coords.lat,
    lng: coords.lng,
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
  };
}

async function geocodeLocation(query) {
  const key = query.trim().toLowerCase();
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  // Public Nominatim policy: do not exceed one request per second per application.
  const pause = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
  if (pause) await new Promise((resolve) => setTimeout(resolve, pause));

  const url = new URL(NOMINATIM_ENDPOINT);
  url.search = new URLSearchParams({
    q: `${query}, South Africa`,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'za'
  }).toString();

  lastGeocodeAt = Date.now();
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Location search failed (${response.status}). Try again in a moment.`);
  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('We could not find that area. Try a suburb and city, such as “Rosebank, Johannesburg”.');
  }

  const result = {
    lat: Number(results[0].lat),
    lng: Number(results[0].lon),
    name: results[0].name || query,
    displayName: results[0].display_name || query,
    address: results[0].address || {}
  };
  if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) {
    throw new Error('The location service returned an invalid result. Please try another area.');
  }
  geocodeCache.set(key, result);
  return result;
}

async function fetchChurches(lat, lng) {
  const query = `
    [out:json][timeout:25];
    nwr["amenity"="place_of_worship"]["religion"="christian"]["name"](around:${SEARCH_RADIUS_METRES},${lat},${lng});
    out center;
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json'
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal
    });
    if (!response.ok) {
      if ([429, 502, 503, 504].includes(response.status)) {
        throw new Error('The church data service is busy. Wait a moment and search again.');
      }
      throw new Error(`Church listings could not be loaded (${response.status}).`);
    }
    const payload = await response.json();
    if (payload.remark) throw new Error('The map data service could not complete this search. Try a nearby area.');
    return (payload.elements || [])
      .map((item) => normaliseChurch(item, 'your selected area'))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The search took too long. Try again or choose a nearby suburb.');
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function filteredChurches() {
  const denomination = elements.denomination.value;
  const service = elements.service.value;
  return churches.filter((church) => {
    const denominationMatch = !denomination || church.denomination === denomination;
    const serviceMatch = !service || (service === 'listed' ? church.serviceListed : !church.serviceListed);
    return denominationMatch && serviceMatch;
  });
}

function cardHTML(church) {
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${church.lat},${church.lng}`;
  return `
    <article class="church-card">
      <div class="card-topline">
        <span class="card-icon" aria-hidden="true">✚</span>
        <span class="card-source">OPENSTREETMAP</span>
      </div>
      <h3 class="card-title">${escapeHTML(church.name)}</h3>
      <p class="card-denomination">${escapeHTML(church.denomination)} · ${escapeHTML(church.area)}</p>
      <p class="card-detail"><span class="detail-icon" aria-hidden="true">⌖</span><span>${escapeHTML(church.address)}</span></p>
      <p class="card-detail"><span class="detail-icon" aria-hidden="true">◷</span><span>${escapeHTML(church.service)}</span></p>
      <p class="card-detail"><span class="detail-icon" aria-hidden="true">↗</span><span>${church.contactHTML}</span></p>
      <div class="card-actions">
        <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer">Get directions ↗</a>
        <a class="osm-link" href="${church.osmUrl}" target="_blank" rel="noopener noreferrer">View OSM record</a>
      </div>
    </article>`;
}

function renderChurches() {
  const results = filteredChurches();
  elements.grid.innerHTML = results.map(cardHTML).join('');
  elements.count.textContent = String(results.length);
  elements.empty.hidden = results.length !== 0 || churches.length === 0;
}

function updateDenominationFilter() {
  const oldValue = elements.denomination.value;
  const options = [...new Set(churches.map((church) => church.denomination))]
    .filter((value) => value !== 'Denomination not listed')
    .sort((a, b) => a.localeCompare(b));
  elements.denomination.innerHTML = '<option value="">All denominations</option>' +
    options.map((name) => `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`).join('');
  elements.denomination.value = options.includes(oldValue) ? oldValue : '';
}

function setBusy(busy) {
  elements.submit.disabled = busy;
  elements.currentLocation.disabled = busy;
  elements.location.disabled = busy;
  elements.submit.textContent = busy ? 'Searching…' : 'Find churches →';
}

async function loadForCoordinates(lat, lng, label) {
  setBusy(true);
  elements.status.className = 'status-message';
  elements.status.textContent = `Searching for Christian churches within ${SEARCH_RADIUS_METRES / 1000} km of ${label}…`;
  elements.grid.innerHTML = '';
  elements.empty.hidden = true;
  elements.count.textContent = '0';
  lastSearchCentre = { lat, lng, label };

  try {
    churches = await fetchChurches(lat, lng);
    updateDenominationFilter();
    renderChurches();
    if (churches.length) {
      elements.status.className = 'status-message success';
      elements.status.textContent = `Found ${churches.length} named Christian place${churches.length === 1 ? '' : 's'} within approximately ${SEARCH_RADIUS_METRES / 1000} km of ${label}. Details depend on what OpenStreetMap contributors have recorded.`;
    } else {
      elements.status.textContent = `No named Christian places were found within approximately ${SEARCH_RADIUS_METRES / 1000} km of ${label}. Coverage may be incomplete; try another nearby suburb.`;
      elements.empty.hidden = false;
    }
  } catch (error) {
    churches = [];
    updateDenominationFilter();
    renderChurches();
    elements.status.className = 'status-message error';
    elements.status.textContent = error.message || 'Something went wrong. Please try again.';
    elements.empty.hidden = false;
  } finally {
    setBusy(false);
  }
}

async function searchByText(query) {
  setBusy(true);
  elements.status.className = 'status-message';
  elements.status.textContent = 'Finding that area…';
  try {
    const place = await geocodeLocation(query);
    await loadForCoordinates(place.lat, place.lng, place.name || query);
  } catch (error) {
    churches = [];
    updateDenominationFilter();
    renderChurches();
    elements.status.className = 'status-message error';
    elements.status.textContent = error.message || 'We could not find that area.';
    elements.empty.hidden = false;
    setBusy(false);
  }
}

elements.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = elements.location.value.trim();
  if (!query) {
    elements.status.className = 'status-message error';
    elements.status.textContent = 'Enter a suburb or city before searching.';
    elements.location.focus();
    return;
  }
  searchByText(query);
});

elements.currentLocation.addEventListener('click', () => {
  if (!navigator.geolocation) {
    elements.status.className = 'status-message error';
    elements.status.textContent = 'Your browser does not support location services. Search by suburb or city instead.';
    return;
  }
  elements.status.className = 'status-message';
  elements.status.textContent = 'Requesting permission to use your location…';
  navigator.geolocation.getCurrentPosition(
    (position) => loadForCoordinates(position.coords.latitude, position.coords.longitude, 'your current location'),
    (error) => {
      const message = error.code === error.PERMISSION_DENIED
        ? 'Location permission was denied. Search by suburb or city instead.'
        : 'We could not determine your location. Search by suburb or city instead.';
      elements.status.className = 'status-message error';
      elements.status.textContent = message;
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
  );
});

elements.denomination.addEventListener('change', renderChurches);
elements.service.addEventListener('change', renderChurches);
elements.clear.addEventListener('click', () => {
  elements.denomination.value = '';
  elements.service.value = '';
  renderChurches();
});

// The homepage can pass its search to this page as ?location=Rosebank%2C%20Johannesburg.
const initialLocation = new URLSearchParams(window.location.search).get('location');
if (initialLocation) {
  elements.location.value = initialLocation;
  searchByText(initialLocation);
}


const heroTimeline = gsap.timeline({
    defaults: {
        ease: "power3.out"
    }
});

// Heading
heroTimeline.from(".hero-title", {
    x: -80,
    opacity: 0,
    duration: 1
});

// Subtitle
heroTimeline.from(".hero-subtitle", {
    x: -60,
    opacity: 0,
    duration: 0.8
}, "-=0.5");

// Search form (starts 1 second after page load)
heroTimeline.from(".search-panel", {
    y: 40,
    opacity: 0,
    duration: 1.5,

}, 1);
