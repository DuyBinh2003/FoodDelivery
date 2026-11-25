'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { MotionListProps } from './types';

export function MotionList({
  children,
  className = '',
  staggerDelay = 0.06,
}: MotionListProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
