// -----------------------------------------
// BUFF MOTION — Single entry point
// Import all scripts here in the order they should run.
// -----------------------------------------

// Theme flash prevention — runs immediately at bundle load time
import './theme-toggle.js';

// Core transition system (Barba + GSAP + Lenis)
// Also imports and registers all components in the function registry
import './transitions.js';
