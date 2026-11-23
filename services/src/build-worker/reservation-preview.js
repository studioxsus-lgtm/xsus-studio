const minutes = value => Number.isInteger(value) && value > 0 && value <= 1440;
const exactKeys = (value, names) => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).length === names.length &&
  names.every(key => Object.hasOwn(value, key));

export function validReservationSpec(spec) {
  if (spec?.version !== 1 || spec.rule !== 'exclusive-time-range') return false;
  if (spec.resource === 'barber') {
    return exactKeys(spec, ['version','rule','resource','serviceMinutes']) &&
      exactKeys(spec.serviceMinutes, ['haircut','trim','styling']) &&
      Object.values(spec.serviceMinutes).every(minutes);
  }
  return exactKeys(spec, ['version','rule','resource','ruleCapacity','seats','durationMinutes']) &&
    spec.resource === 'table' && spec.ruleCapacity === 'party-fits-table' &&
    minutes(spec.durationMinutes) && Array.isArray(spec.seats) && spec.seats.length > 0 &&
    spec.seats.length <= 30 && spec.seats.every(n => Number.isInteger(n) && n >= 1 && n <= 100);
}

// This function becomes main.js in the standalone app. Keep dependencies inside it.
function reservationApp(spec) {
  const form = document.querySelector('form');
  const fields = form.elements;
  const list = document.querySelector('#bookings');
  const status = document.querySelector('#status');
  const isTable = spec.resource === 'table';
  const resources = isTable ? spec.seats.map((seats,i) => ({
    label:'Table ' + (i+1) + ' · ' + seats + ' seats', seats
  })) : [{label:'Barber 1'},{label:'Barber 2'}];
  const key = 'xsus-reservations-v1:' + JSON.stringify(spec);
  let bookings = [];
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved)) bookings = saved.filter(b => b && typeof b.customer === 'string' &&
      resources[b.resource] && Number.isFinite(b.start) && Number.isFinite(b.end));
  } catch {}
  function save() {
    try { localStorage.setItem(key, JSON.stringify(bookings)); }
    catch { status.textContent += ' Browser storage unavailable.'; }
  }
  function slot() {
    // Treat entries as local wall-clock slots in a single business calendar.
    const start = Date.parse(fields.time.value + 'Z');
    const duration = isTable ? spec.durationMinutes : spec.serviceMinutes[fields.service.value];
    return {start, end:start + duration * 60000};
  }
  function available(index) {
    const {start,end} = slot();
    const party = isTable ? Number(fields.party.value) : 1;
    return Number.isFinite(start) && Number.isFinite(end) && resources[index] &&
      Number.isInteger(party) && party > 0 && (!isTable || party <= resources[index].seats) &&
      !bookings.some(b => b.resource === index && b.start < end && start < b.end);
  }
  function choices() {
    const previous = fields.resource.value;
    fields.resource.replaceChildren();
    resources.forEach((resource,i) => {
      if (available(i)) fields.resource.add(new Option(resource.label,String(i)));
    });
    if ([...fields.resource.options].some(o => o.value === previous)) fields.resource.value = previous;
    const none = !fields.resource.options.length;
    if (none) fields.resource.add(new Option('No available options',''));
    fields.resource.disabled = none;
    form.querySelector('button').disabled = none;
  }
  function render() {
    list.replaceChildren();
    for (const booking of bookings) {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = [booking.customer, resources[booking.resource].label, booking.time.replace('T',' '), booking.detail].join(' · ');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Cancel';
      remove.addEventListener('click', () => {
        bookings = bookings.filter(item => item !== booking);
        status.textContent = 'Booking cancelled.';
        save(); render();
      });
      row.append(label,remove);
      list.append(row);
    }
    choices();
  }
  form.addEventListener('input', choices);
  form.addEventListener('change', choices);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const index = Number(fields.resource.value);
    const customer = fields.customer.value.trim();
    if (!customer || fields.resource.value === '' || !available(index)) {
      status.textContent = 'Choose an available resource for this booking.';
      choices(); return;
    }
    const detail = isTable ? fields.party.value + ' guests' : fields.service.value;
    bookings.push({customer,resource:index,time:fields.time.value,detail,...slot()});
    status.textContent = 'Booking confirmed.';
    save(); form.reset(); render();
  });
  render();
}

export function reservationFiles(spec) {
  if (!validReservationSpec(spec)) throw new TypeError('Invalid reservation AppSpec');
  const isTable = spec.resource === 'table';
  const title = isTable ? 'Restaurant reservations' : 'Barber appointments';
  const details = isTable ? '<label>Party size<input type="number" name="party" min="1" step="1" value="2" required></label>' :
    '<label>Service<select name="service">' + Object.entries(spec.serviceMinutes).map(([service,duration]) =>
      '<option value="'+service+'">'+service+' · '+duration+' min</option>').join('')+'</select></label>';
  const description = isTable ? 'Choose a party size and time to see tables with enough seats. Each reservation lasts '+spec.durationMinutes+' minutes.' :
    'Choose a service and time to see available barbers.';
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><link rel="stylesheet" href="./styles.css"></head><body><main><h1>${title}</h1><p>${description}</p><form><label>Customer name<input name="customer" required maxlength="120"></label>${details}<label>Date and time<input name="time" type="datetime-local" required></label><label>${isTable?'Available table':'Available barber'}<select name="resource" required></select></label><button type="submit">Book</button></form><p id="status" role="status"></p><h2>Bookings</h2><ul id="bookings"></ul></main><script src="./main.js"></script></body></html>`;
  const css = 'body{margin:0;background:#f5f7fb;color:#17243b;font:16px system-ui}main{max-width:46rem;margin:auto;padding:1.25rem}form,li{background:white;border:1px solid #cbd5df;border-radius:.6rem;padding:1rem}form{display:grid;gap:1rem}label{display:grid;gap:.3rem}input,select,button{box-sizing:border-box;min-width:0;padding:.65rem;font:inherit}button{cursor:pointer}ul{padding:0}li{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:.5rem 0}li span{overflow-wrap:anywhere}';
  return [{path:'index.html',content:html},{path:'styles.css',content:css},
    {path:'main.js',content:'('+reservationApp.toString()+')('+JSON.stringify(spec)+');'}];
}
