import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";

/**
 * useLoginOnDemand - Hook to gate interactions for unauthenticated users.
 * Returns a function that checks for login status before executing a callback.
 */
const useLoginOnDemand = () => {
  const { isLoggedIn } = useSelector((state) => state.auth);
  const router = useRouter();

  const gateInteraction = (callback) => {
    if (isLoggedIn) {
      if (typeof callback === "function") callback();
    } else {
      router.push("/login");
    }
  };

  return { gateInteraction, isLoggedIn };
};

export default useLoginOnDemand;
