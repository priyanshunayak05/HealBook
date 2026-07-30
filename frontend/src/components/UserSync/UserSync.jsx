import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import API from "../../services/api";

export default function UserSync() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;

    const syncUserToBackend = async () => {
      try {
        const clerkId = user.id;
        const name =
          user.fullName ||
          `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
          "Patient";
        const email =
          user.primaryEmailAddress?.emailAddress ||
          user.emailAddresses?.[0]?.emailAddress ||
          "";
        const image = user.imageUrl || "";

        console.log("Triggering /api/user/sync for Clerk patient:", { clerkId, name, email });

        const res = await API.post("/api/user/sync", {
          clerkId,
          name,
          email,
          image,
        });

        if (res.data?.success && res.data?.user) {
          console.log("Successfully synchronized user to MongoDB users collection:", res.data.user);
          localStorage.setItem("patient_user", JSON.stringify(res.data.user));
          localStorage.setItem("patient_user_synced_clerkId", clerkId);
        }
      } catch (err) {
        console.error("Failed to sync Clerk user to backend:", err?.response?.data || err.message || err);
      }
    };

    syncUserToBackend();
  }, [isLoaded, isSignedIn, user]);

  return null;
}
