import { db, auth } from '../firebase/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Initialize Firestore Database
 * Run this script once to create initial collections and structure
 */

export async function initializeFirestore() {
  try {
    console.log('Initializing Firestore database...');

    // Get current user (should be admin)
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('User must be logged in to initialize database');
    }

    // Set current user as admin if not already set
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        displayName: currentUser.displayName || 'Admin',
        role: 'admin',
        updatedAt: serverTimestamp(),
      }, { merge: true });
      console.log('✓ Set current user as admin');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        throw new Error('Permission denied. Please deploy Firestore rules first. See DEPLOY_RULES.md');
      }
      throw err;
    }

    // Create a sample class
    const classId = 'class-cse-1st-year';
    try {
      await setDoc(doc(db, 'classes', classId), {
        name: 'CSE - 1st Year',
        department: 'CSE',
        year: '1st Year',
        createdAt: serverTimestamp(),
      });
      console.log('✓ Created sample class');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        throw new Error('Permission denied. Please deploy Firestore rules first. See DEPLOY_RULES.md');
      }
      throw err;
    }

    // Create timetable for the class
    try {
      await setDoc(doc(db, 'classes', classId, 'config', 'timetable'), {
        classId,
        rows: [
          { day: 'Mon', slots: ['Maths', 'CSE', 'Physics', 'Library'] },
          { day: 'Tue', slots: ['Chemistry', 'CSE Lab', 'Electronics', 'Sports'] },
          { day: 'Wed', slots: ['CSE', 'Maths', 'English', 'Workshop'] },
          { day: 'Thu', slots: ['Physics', 'CSE', 'Library', 'Seminar'] },
          { day: 'Fri', slots: ['CSE', 'Chemistry', 'Electronics', 'Club'] },
        ],
        updatedAt: serverTimestamp(),
      });
      console.log('✓ Created timetable');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        console.warn('⚠️ Could not create timetable (permission denied). This is optional and can be created later.');
        // Continue with other initialization
      } else {
        throw err;
      }
    }

    // Create sample transport routes
    try {
      const routes = [
        { route: 'R1', origin: 'Kompally', time: '07:15', stops: ['Suchitra', 'Bollaram', 'Patancheru'] },
        { route: 'R2', origin: 'Kukatpally', time: '07:20', stops: ['JNTU', 'Miyapur', 'BHEL'] },
        { route: 'R3', origin: 'LB Nagar', time: '07:10', stops: ['Dilshuknagar', 'Kothapet', 'Chaderghat'] },
      ];

      for (const route of routes) {
        await setDoc(doc(db, 'transport', 'routes', 'list', route.route), {
          ...route,
          updatedAt: serverTimestamp(),
        });
      }
      console.log('✓ Created transport routes');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        console.warn('⚠️ Could not create transport routes (permission denied). This is optional.');
      } else {
        throw err;
      }
    }

    // Create sample placement
    try {
      await setDoc(doc(collection(db, 'placements'), 'placement-1'), {
        company: 'TCS',
        role: 'Software Engineer',
        date: '2025-12-05',
        ctc: '₹ 7 LPA',
        apply: 'https://nextstep.tcs.com',
        createdAt: serverTimestamp(),
      });
      console.log('✓ Created sample placement');
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        console.warn('⚠️ Could not create placement (permission denied). This is optional.');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Firestore initialization complete!');
    console.log('\nNext steps:');
    console.log('1. Create users in Firebase Authentication');
    console.log('2. Set user roles in Firestore users collection:');
    console.log('   - Add document with user uid');
    console.log('   - Set role: "student" | "teacher" | "admin"');
    console.log('   - Set classId for students and teachers');
    console.log('3. Deploy Firestore rules: firebase deploy --only firestore:rules');
    
    return true;
  } catch (error: any) {
    console.error('Error initializing Firestore:', error);
    // Re-throw with a more helpful message
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please deploy Firestore security rules first. Go to Firebase Console → Firestore → Rules and deploy the rules from firestore.rules file.');
    }
    throw error; // Re-throw the original error so it can be displayed
  }
}

// Helper function to set user role (call this after user signs up)
export async function setUserRole(uid: string, role: 'student' | 'teacher' | 'admin', classId?: string) {
  try {
    await setDoc(doc(db, 'users', uid), {
      role,
      classId: classId || null,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`✓ Set user ${uid} role to ${role}`);
    return true;
  } catch (error) {
    console.error('Error setting user role:', error);
    return false;
  }
}

// Helper function to create a class
export async function createClass(name: string, department: string, year: string) {
  try {
    const classRef = doc(collection(db, 'classes'));
    await setDoc(classRef, {
      name,
      department,
      year,
      createdAt: serverTimestamp(),
    });
    console.log(`✓ Created class: ${name} (${classRef.id})`);
    return classRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    return null;
  }
}

