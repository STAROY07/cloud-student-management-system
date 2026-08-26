import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile as updateAuthProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { ensureFirestoreSeeded, INITIAL_SEED_DATA } from './seedFirebase';

const DEMO_ACCOUNTS = {
  'admin@university.edu': {
    password: 'Admin@123',
    name: 'System Administrator',
    role: 'ADMIN',
    department: 'Administration',
  },
  'dr.smith@university.edu': {
    password: 'Faculty@123',
    name: 'Dr. Robert Smith',
    role: 'FACULTY',
    department: 'Computer Science',
    designation: 'Professor & HOD',
    employeeId: 'FAC-CS-001',
    facultyId: 'fac-1',
  },
  'prof.davis@university.edu': {
    password: 'Faculty@123',
    name: 'Prof. Sarah Davis',
    role: 'FACULTY',
    department: 'Information Technology',
    designation: 'Associate Professor',
    employeeId: 'FAC-IT-002',
    facultyId: 'fac-2',
  },
  'dr.patel@university.edu': {
    password: 'Faculty@123',
    name: 'Dr. Anita Patel',
    role: 'FACULTY',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    employeeId: 'FAC-CS-003',
    facultyId: 'fac-3',
  },
  'student.alex@university.edu': {
    password: 'Student@123',
    name: 'Alex Johnson',
    role: 'STUDENT',
    department: 'Computer Science',
    rollNo: 'CS2024-001',
    semester: 5,
    admissionYear: 2022,
    studentId: 'stu-1',
    phone: '+1 (555) 234-5678',
  },
  'student.emma@university.edu': {
    password: 'Student@123',
    name: 'Emma Williams',
    role: 'STUDENT',
    department: 'Computer Science',
    rollNo: 'CS2024-002',
    semester: 5,
    admissionYear: 2022,
    studentId: 'stu-2',
    phone: '+1 (555) 345-6789',
  },
  'student.michael@university.edu': {
    password: 'Student@123',
    name: 'Michael Brown',
    role: 'STUDENT',
    department: 'Computer Science',
    rollNo: 'CS2024-003',
    semester: 5,
    admissionYear: 2022,
    studentId: 'stu-3',
    phone: '+1 (555) 456-7890',
  },
  'student.sophia@university.edu': {
    password: 'Student@123',
    name: 'Sophia Taylor',
    role: 'STUDENT',
    department: 'Information Technology',
    rollNo: 'IT2024-001',
    semester: 5,
    admissionYear: 2022,
    studentId: 'stu-4',
    phone: '+1 (555) 567-8901',
  },
  'student.david@university.edu': {
    password: 'Student@123',
    name: 'David Miller',
    role: 'STUDENT',
    department: 'Computer Science',
    rollNo: 'CS2024-004',
    semester: 5,
    admissionYear: 2022,
    studentId: 'stu-5',
    phone: '+1 (555) 678-9012',
  },
};

/**
 * Wraps a Firebase error in a user-facing error while keeping the original
 * code and cause attached for logging and debugging
 */
const authError = (message, cause) =>
  Object.assign(new Error(message), { cause, code: cause?.code });

const WRONG_PASSWORD_CODES = ['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'];

/**
 * Distinguishes a genuinely wrong password from infrastructure failures so that
 * network or rate-limit errors are not reported as bad credentials
 */
const reauthenticationError = (err, suffix) => {
  console.error('[Firebase Auth] Re-authentication failed:', err.code, err.message);

  if (WRONG_PASSWORD_CODES.includes(err.code)) {
    return authError(`Current password is incorrect. ${suffix}`, err);
  }
  if (err.code === 'auth/too-many-requests') {
    return authError('Too many attempts. Please wait before trying again.', err);
  }
  if (err.code === 'auth/network-request-failed') {
    return authError('Could not reach the authentication service. Please check your connection.', err);
  }
  return authError(err.message || 'Identity verification failed.', err);
};

/**
 * Fetch or initialize the user profile document from /users/{uid}
 */
export const getUserProfileDoc = async (uid, fallbackEmail = '') => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { id: uid, ...userSnap.data() };
  }

  // If user document is missing, create from demo metadata or defaults
  const normalizedEmail = (fallbackEmail || auth.currentUser?.email || '').toLowerCase().trim();
  const demoMeta = DEMO_ACCOUNTS[normalizedEmail] || {};

  const initialProfile = {
    uid,
    id: uid,
    email: normalizedEmail,
    name: demoMeta.name || auth.currentUser?.displayName || normalizedEmail.split('@')[0],
    role: demoMeta.role || 'STUDENT',
    status: 'ACTIVE',
    phone: demoMeta.phone || '',
    department: demoMeta.department || 'Computer Science',
    rollNo: demoMeta.rollNo || '',
    designation: demoMeta.designation || '',
    semester: demoMeta.semester || 5,
    facultyId: demoMeta.facultyId || '',
    studentId: demoMeta.studentId || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(userRef, initialProfile, { merge: true });
  } catch (err) {
    // The session can continue with an in-memory profile, but the write failure
    // must be visible because the profile will not survive a reload
    console.error('[Firebase Auth] Could not persist user profile doc:', err.code, err.message);
  }

  return initialProfile;
};

/**
 * Sign In with Firebase Authentication
 */
export const loginWithFirebase = async (email, password) => {
  const cleanEmail = (email || '').trim().toLowerCase();

  // Ensure baseline Firestore records exist (best-effort, must not block login)
  ensureFirestoreSeeded().catch((err) => {
    console.error('[Firebase Auth] Firestore baseline seeding failed:', err.code, err.message);
  });

  let userCredential;
  try {
    userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  } catch (err) {
    // If user not found and email is a predefined demo account, auto-provision
    const isDemoAccount = DEMO_ACCOUNTS[cleanEmail];
    if (
      isDemoAccount &&
      (err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials')
    ) {
      try {
        console.info(`[Firebase Auth] Auto-provisioning demo account: ${cleanEmail}`);
        userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        if (isDemoAccount.name) {
          await updateAuthProfile(userCredential.user, { displayName: isDemoAccount.name });
        }
      } catch (createErr) {
        console.error('[Firebase Auth] Demo account provisioning failed:', createErr.code, createErr.message);
        throw authError(createErr.message || 'Failed to create demo credentials.', createErr);
      }
    } else {
      let msg = 'Authentication failed. Please verify your credentials.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid password entered. Please check your credentials.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No registered university account found for this email address.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please try again later.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Could not reach the authentication service. Please check your connection.';
      }
      console.error('[Firebase Auth] Sign-in failed:', err.code, err.message);
      throw authError(msg, err);
    }
  }

  const { user } = userCredential;
  const token = await user.getIdToken();
  const profile = await getUserProfileDoc(user.uid, cleanEmail);

  const mergedUser = {
    ...profile,
    uid: user.uid,
    id: user.uid,
    email: user.email,
  };

  localStorage.setItem('sms_auth_token', token);
  localStorage.setItem('sms_user_data', JSON.stringify(mergedUser));

  return { user: mergedUser, token };
};

/**
 * Sign Out
 */
export const logoutFromFirebase = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    // Local session is always cleared below, but a failed remote sign-out
    // means the Firebase session may still be alive
    console.error('[Firebase Auth] Remote sign-out failed:', err.code, err.message);
  } finally {
    localStorage.removeItem('sms_auth_token');
    localStorage.removeItem('sms_user_data');
  }
  return { success: true };
};

/**
 * Get current session user
 */
export const getFirebaseMe = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    const saved = localStorage.getItem('sms_user_data');
    if (saved) {
      return { user: JSON.parse(saved) };
    }
    throw new Error('Not authenticated');
  }

  const profile = await getUserProfileDoc(currentUser.uid, currentUser.email);
  const token = await currentUser.getIdToken().catch((err) => {
    console.error('[Firebase Auth] Could not refresh ID token:', err.code, err.message);
    return '';
  });
  if (token) localStorage.setItem('sms_auth_token', token);

  const fullUser = {
    ...profile,
    uid: currentUser.uid,
    id: currentUser.uid,
    email: currentUser.email,
  };

  localStorage.setItem('sms_user_data', JSON.stringify(fullUser));
  return { user: fullUser };
};

/**
 * Change Firebase Password with Re-authentication
 */
export const changeFirebasePassword = async (currentPassword, newPassword) => {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('User session is not active. Please sign in again.');
  }

  // 1. Reauthenticate
  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  try {
    await reauthenticateWithCredential(currentUser, credential);
  } catch (err) {
    throw reauthenticationError(err, 'Please re-enter your existing password.');
  }

  // 2. Update Password
  try {
    await updatePassword(currentUser, newPassword);
    return { success: true, message: 'Password updated successfully in Firebase Authentication.' };
  } catch (err) {
    console.error('[Firebase Auth] Password update failed:', err.code, err.message);
    throw authError(err.message || 'Failed to update password.', err);
  }
};

/**
 * Change Firebase Email with Re-authentication
 */
export const changeFirebaseEmail = async (newEmail, currentPassword) => {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) {
    throw new Error('User session is not active. Please sign in again.');
  }

  const cleanNewEmail = newEmail.trim().toLowerCase();

  // 1. Reauthenticate
  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  try {
    await reauthenticateWithCredential(currentUser, credential);
  } catch (err) {
    throw reauthenticationError(err, 'Identity verification failed.');
  }

  // 2. Update Firebase Auth Email
  try {
    await updateEmail(currentUser, cleanNewEmail);
  } catch (err) {
    console.error('[Firebase Auth] Email update failed:', err.code, err.message);
    throw authError(err.message || 'Failed to update email address in Firebase Authentication.', err);
  }

  // 3. Update Firestore User Document
  const userRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userRef, {
    email: cleanNewEmail,
    updatedAt: serverTimestamp(),
  });

  const updatedProfile = await getUserProfileDoc(currentUser.uid, cleanNewEmail);
  localStorage.setItem('sms_user_data', JSON.stringify(updatedProfile));

  return { success: true, user: updatedProfile, data: { user: updatedProfile } };
};

/**
 * Update Profile Information
 */
export const updateFirebaseProfile = async (updatedFields) => {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;

  if (!uid) {
    throw new Error('User session not found');
  }

  const userRef = doc(db, 'users', uid);
  const dataToUpdate = {
    ...updatedFields,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(userRef, dataToUpdate);

  // If displayName changed, update Auth profile
  if (updatedFields.name && currentUser) {
    await updateAuthProfile(currentUser, { displayName: updatedFields.name }).catch((err) => {
      console.error('[Firebase Auth] Display name update failed:', err.code, err.message);
    });
  }

  const fresh = await getUserProfileDoc(uid);
  localStorage.setItem('sms_user_data', JSON.stringify(fresh));

  return { success: true, user: fresh, data: { user: fresh } };
};
