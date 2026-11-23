// Executable build contract compiled from the reviewed goal and planning steps.
export function reservationAppSpec(goal, result) {
  const tasks = result.plan.steps.map(step => step.task).join('\n');
  const intent = [goal, result.language.text, result.plan.goal].filter(Boolean).join('\n');
  const reservation = /reserv|réserv|booking|appointment|schedule|rezerv|takim|rendez-vous/i;
  if (!reservation.test(intent + '\n' + tasks)) return null;
  const barber = /barber|berber|barbier|coiff/i;
  const restaurant = /restaurant|restorant|ristorant/i;
  const subject = barber.test(intent) || restaurant.test(intent) ? intent : tasks;
  if (barber.test(subject) === restaurant.test(subject)) return null;
  const requirements = intent + '\n' + tasks;
  const common = {version:1, rule:'exclusive-time-range'};
  if (barber.test(subject)) {
    const serviceMinutes = {haircut:30, trim:15, styling:60};
    for (const match of requirements.matchAll(/\b(\d{1,3})[ -]minutes?\s+(haircut|trim|styling)s?\b/gi)) {
      const duration = Number(match[1]);
      if (duration > 0) serviceMinutes[match[2].toLowerCase()] = duration;
    }
    return {...common, resource:'barber', serviceMinutes};
  }
  const configuredSeats = [...requirements.matchAll(/\b(\d{1,2})[ -]seat(?:er)?\s+tables?\b/gi)]
    .map(match => Number(match[1])).filter(n => n > 0);
  const seats = configuredSeats.length ? [...new Set(configuredSeats)].slice(0,30) : [2,4,6];
  return {...common, resource:'table', ruleCapacity:'party-fits-table', seats, durationMinutes:90};
}
