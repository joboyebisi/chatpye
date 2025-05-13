'use client';

import { useEffect } from 'react';
import { getAuthDomains } from '@/config/domains';

export function DomainVerifier() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const currentDomain = window.location.hostname;
      const allowedDomains = getAuthDomains();
      
      if (!allowedDomains.includes(currentDomain)) {
        console.warn(
          `Current domain (${currentDomain}) is not in the list of authorized domains. ` +
          'Please add it to Firebase Console > Authentication > Settings > Authorized domains'
        );
      }
    }
  }, []);

  return null;
} 