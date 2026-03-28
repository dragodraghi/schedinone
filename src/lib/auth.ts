import { signInAnonymously, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "./firebase";

export async function loginAnonymously(): Promise<User> {
  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
