import { db } from '../firebase/firebase';
import { collection, doc } from 'firebase/firestore';

export function userDoc(uid: string) {
  return doc(db, 'users', uid);
}

export function classRoot(classId: string = 'default') {
  return doc(db, 'classes', classId);
}

export function attendanceEntriesRef(classId: string, ymd: string) {
  // classes/{classId}/attendance/{ymd}/entries/*
  return collection(db, 'classes', classId, 'attendance', ymd, 'entries');
}

export function marksStudentsRef(classId: string, subject: string) {
  // classes/{classId}/marks/{subject}/students/*
  return collection(db, 'classes', classId, 'marks', subject, 'students');
}

export function timetableDocRef(classId: string) {
  return doc(db, 'classes', classId, 'config', 'timetable');
}

export function eventsCollection() {
  return collection(db, 'events');
}

export function transportRoutesCollection() {
  return collection(db, 'transport', 'routes', 'list');
}


