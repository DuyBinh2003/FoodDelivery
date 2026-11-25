'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { MotionListItemProps } from './types';

export function MotionListItem({ children, className = '' }: MotionListItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 18 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.38,
            ease: [0.16, 1, 0.3, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
