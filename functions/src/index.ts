// firebase-functions imported via v2 schedulers
import * as admin from 'firebase-admin';
import { patternScanner } from './scheduled/patternScanner';

// Initialize Firebase Admin
admin.initializeApp();

// Export Cloud Functions
export const scheduledPatternScan = patternScanner;
