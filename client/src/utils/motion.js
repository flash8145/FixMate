/**
 * FixMate Motion System Primitives
 * Defined per design specifications:
 * Easing: cubic-bezier(0.22, 1, 0.36, 1)
 * Page: 250-350ms | Modals: 250-350ms | Drawers: 300-400ms | Cards: 150-220ms
 */

export const TRANSITION_EASE = [0.22, 1, 0.36, 1]

export const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.25,
      ease: TRANSITION_EASE,
    },
  },
}

export const modalOverlayVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.25, ease: TRANSITION_EASE },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: TRANSITION_EASE },
  },
}

export const modalVariants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: {
      duration: 0.22,
      ease: TRANSITION_EASE,
    },
  },
}

export const drawerVariants = {
  initial: { x: '100%', opacity: 0.8 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: TRANSITION_EASE,
    },
  },
  exit: {
    x: '100%',
    opacity: 0.8,
    transition: {
      duration: 0.28,
      ease: TRANSITION_EASE,
    },
  },
}

export const leftDrawerVariants = {
  initial: { x: '-100%', opacity: 0.8 },
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.35,
      ease: TRANSITION_EASE,
    },
  },
  exit: {
    x: '-100%',
    opacity: 0.8,
    transition: {
      duration: 0.28,
      ease: TRANSITION_EASE,
    },
  },
}

export const cardHoverVariants = {
  initial: { y: 0, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' },
  hover: {
    y: -3,
    boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
    transition: {
      duration: 0.2,
      ease: TRANSITION_EASE,
    },
  },
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.06,
    },
  },
}

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: TRANSITION_EASE,
    },
  },
}
