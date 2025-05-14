import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Redirect() {
  const router = useRouter();

  useEffect(() => {
    // Check if we're on the main domain
    if (window.location.hostname === 'chatpye.com') {
      // Redirect to the app subdomain
      window.location.href = 'https://app.chatpye.com' + window.location.pathname + window.location.search;
    }
  }, []);

  return null;
} 