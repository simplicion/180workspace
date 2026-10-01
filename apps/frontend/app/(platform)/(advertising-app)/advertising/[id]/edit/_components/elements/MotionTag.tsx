'use client';
import { motion } from 'framer-motion';

/**
 * Client boundary for animated nodes. Element components render `MotionTag` only when a node has an animation,
 * so server-rendered (public) pages ship framer-motion only for those nodes.
 */
export const MotionTag = motion.div;
