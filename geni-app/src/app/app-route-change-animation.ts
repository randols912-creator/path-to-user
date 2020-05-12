import {
  animate,
  animateChild,
  group,
  query,
  style,
  transition,
  trigger,
} from '@angular/animations';

export const routeChangeAnimation = trigger('routeChangeAnimation', [
  transition('* => menu', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: '0%',
        left: '0%',
        width: '100%',
        height: '100%',
      }),
    ]),
    query(':enter', [style({ top: '-100%', zIndex: 1 })]),
    query(':leave', animateChild()),
    group([
      query(':leave', [
        animate('600ms ease-out', style({ top: '100%', zIndex: -1 })),
      ]),
      query(':enter', [animate('600ms ease-out', style({ top: '0%' }))]),
    ]),
    query(':enter', animateChild()),
  ]),
  transition('menu => *', [
    query(':enter, :leave', [
      style({
        position: 'absolute',
        top: '0%',
        left: '0%',
        width: '100%',
        height: '100%',
      }),
    ]),
    query(':enter', [style({ top: '100%', zIndex: 1 })]),
    query(':leave', animateChild()),
    group([
      query(':leave', [
        animate('600ms ease-out', style({ top: '-100%', zIndex: -1 })),
      ]),
      query(':enter', [animate('600ms ease-out', style({ top: '0%' }))]),
    ]),
    query(':enter', animateChild()),
  ]),
]);
