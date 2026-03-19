import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword as firebaseUpdatePassword
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../firebase";
import firebaseConfig from "../../firebase-applet-config.json";
import { AuthState, User, Business } from "../types";
import { API_BASE_URL, ROUTES } from "../constants";

export class AuthService {
  private static STORAGE_KEY = "vico_auth_state";

  static async updatePassword(newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");
    
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update password");
      }
    } catch (error) {
      console.error("Update Password Error:", error);
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<AuthState> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Fetch business info
      let businessData: Business | undefined;
      try {
        const businessDoc = await getDoc(doc(db, "businesses", firebaseUser.uid));
        businessData = businessDoc.data() as Business;
      } catch (error: any) {
        console.error("Error fetching business data:", error);
        if (error.code === 'unavailable' || error.message?.includes('offline')) {
          throw new Error("Firestore is currently offline. This may be due to a network issue or the Identity Toolkit API not being enabled in the Google Cloud Console.");
        }
      }

      // Fetch user info from 'users' collection
      let role: "user" | "admin" = firebaseUser.email === "hello.vicoapps@gmail.com" ? "admin" : "user";
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists() && userDoc.data().role === "admin") {
          role = "admin";
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }

      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || "",
        name: firebaseUser.displayName || businessData?.name || "User",
        role,
      };

      const authState: AuthState = {
        user,
        token: await firebaseUser.getIdToken(),
        isAuthenticated: true,
      };

      this.saveAuthState(authState);
      return authState;
    } catch (error: any) {
      console.error("Auth Login Error:", error);
      if (error.code === "auth/network-request-failed") {
        throw new Error("Network error: Firebase could not be reached. This is likely because the 'Identity Toolkit API' is not enabled in your Google Cloud Project. Please enable it at https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=" + firebaseConfig.projectId + " and wait a few minutes.");
      }
      throw error;
    }
  }

  static async register(userData: any): Promise<AuthState> {
    try {
      const { email, password, name, businessName } = userData;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create user document
      await setDoc(doc(db, "users", firebaseUser.uid), {
        email: firebaseUser.email,
        name: name || "User",
        role: firebaseUser.email === "hello.vicoapps@gmail.com" ? "admin" : "user",
        createdAt: serverTimestamp()
      });

      // Create business document
      const businessId = firebaseUser.uid;
      try {
        await setDoc(doc(db, "businesses", businessId), {
          name: businessName || name || "My Business",
          ownerId: firebaseUser.uid,
          email: firebaseUser.email,
          createdAt: serverTimestamp(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          calendarConnected: false,
          plan: "FREE",
          totalMinutes: 60,
          usedMinutes: 0,
          onboardingStep: 1,
        });

        // Initialize a default agent
        await setDoc(doc(db, `businesses/${businessId}/agents`, "default"), {
          name: "Vico Assistant",
          voice: "Zephyr",
          instructions: "You are a professional AI receptionist for " + (businessName || "this business") + ". Your goal is to help customers with inquiries and book appointments. Be polite, helpful, and concise.",
          businessId: businessId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `businesses/${businessId}`);
      }

      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: name || "User",
        role: firebaseUser.email === "hello.vicoapps@gmail.com" ? "admin" : "user",
      };

      const authState: AuthState = {
        user,
        token: await firebaseUser.getIdToken(),
        isAuthenticated: true,
      };

      this.saveAuthState(authState);
      return authState;
    } catch (error: any) {
      console.error("Auth Register Error:", error);
      if (error.code === "auth/network-request-failed") {
        throw new Error("Network error: Firebase could not be reached. This is likely because the 'Identity Toolkit API' is not enabled in your Google Cloud Project. Please enable it at https://console.developers.google.com/apis/api/identitytoolkit.googleapis.com/overview?project=" + firebaseConfig.projectId + " and wait a few minutes.");
      }
      throw error;
    }
  }

  static async logout() {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, { method: "POST" });
      await signOut(auth);
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem(this.STORAGE_KEY);
    window.location.href = ROUTES.HOME;
  }

  static getAuthState(): AuthState {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return { user: null, token: null, isAuthenticated: false };
  }

  private static saveAuthState(state: AuthState) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  }

  static subscribeToAuthChanges(callback: (state: AuthState) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        let businessData: any;
        let userData: any;
        try {
          const [businessDoc, userDoc] = await Promise.all([
            getDoc(doc(db, "businesses", firebaseUser.uid)),
            getDoc(doc(db, "users", firebaseUser.uid))
          ]);
          businessData = businessDoc.data();
          userData = userDoc.data();
        } catch (error) {
          console.error("Auth Change Firestore Error:", error);
        }

        const state: AuthState = {
          user: {
            id: firebaseUser.uid,
            email: firebaseUser.email!,
            name: firebaseUser.displayName || businessData?.name || "User",
            role: (firebaseUser.email === "hello.vicoapps@gmail.com" || userData?.role === "admin") ? "admin" : "user",
          },
          token,
          isAuthenticated: true,
        };
        this.saveAuthState(state);
        callback(state);
      } else {
        const state: AuthState = { user: null, token: null, isAuthenticated: false };
        this.saveAuthState(state);
        callback(state);
      }
    });
  }
}
