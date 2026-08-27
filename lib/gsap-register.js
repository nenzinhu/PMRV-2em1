'use client';

import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Flip } from 'gsap/Flip';
import { SplitText } from 'gsap/SplitText';
import { Observer } from 'gsap/Observer';
import { CustomEase } from 'gsap/CustomEase';

let registered = false;

export function registerGsap() {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(useGSAP, Flip, SplitText, Observer, CustomEase);
  if (!CustomEase.get('pmrv')) {
    CustomEase.create('pmrv', 'M0,0 C0.16,1 0.3,1 1,1');
  }
  registered = true;
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export { gsap, useGSAP, Flip, SplitText, Observer, CustomEase };
