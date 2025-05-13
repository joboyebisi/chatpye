'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';

export function FirebaseTest() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try to get the current user to test the connection
        await auth.currentUser;
        setStatus('connected');
      } catch (error) {
        console.error('Firebase connection error:', error);
        setStatus('error');
      }
    };

    checkConnection();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-white rounded-lg shadow-lg">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          status === 'checking' ? 'bg-yellow-500' :
          status === 'connected' ? 'bg-green-500' :
          'bg-red-500'
        }`} />
        <span className="text-sm">
          {status === 'checking' ? 'Checking Firebase...' :
           status === 'connected' ? 'Firebase Connected' :
           'Firebase Error'}
        </span>
      </div>
    </div>
  );
} 