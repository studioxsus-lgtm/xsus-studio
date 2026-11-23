import {it, expect} from 'vitest';
import {reservationAppSpec} from '../../assets/js/xsus-app/app-specification/reservations.js';

function reviewed(goal, task) {
  return {language:{text:goal}, plan:{goal,steps:[{task}]}};
}
it('uses a duration in the reviewed requirements for barber bookings',()=>{
  const goal='Book barber appointments';
  const spec=reservationAppSpec(goal,reviewed(goal,'Offer 45-minute haircuts'));
  expect(spec.serviceMinutes.haircut).toBe(45);
});
it('uses table sizes from the restaurant plan',()=>{
  const goal='Build a restaurant booking app';
  const spec=reservationAppSpec(goal,reviewed(goal,'Offer 4-seat tables and 8-seat tables'));
  expect(spec.seats).toEqual([4,8]);
});
it('retains generic builders for unrelated or ambiguous goals',()=>{
  for (const goal of ['Build a restaurant inventory','Build a booking manager','Book a restaurant or a barber']){
    expect(reservationAppSpec(goal,reviewed(goal,'List records'))).toBeNull();
  }
});
